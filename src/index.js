import axios from "axios";
import dayjs from "dayjs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import isOnline from "is-online";
import { base64, encode, get_md5, get_sha1, say_something } from "./util.js";

const GATEWAY_URL = "http://192.168.9.8";

const yarg = yargs(hideBin(process.argv));

// 命令行参数设置
const argv = yarg
  .option("interval", {
    alias: "i",
    description: "设置登录间隔时间（单位：秒）",
    type: "number",
    default: 5, // 默认间隔5秒钟, 登录请求过快可能会导致"speed_limit_error", 给联网设备或者路由器更换MAC地址就能恢复正常
  })
  .option("username", {
    alias: "u",
    description: "登录账户名",
    type: "string",
  })
  .option("password", {
    alias: "p",
    description: "密码",
    type: "string",
  })
  .check((argv) => {
    if (argv.interval <= 0) {
      throw new Error("无效的时间间隔，必须大于零");
    }
    if (!argv.username) {
      throw new Error("必须填写账户名");
    }
    if (!argv.password) {
      throw new Error("必须填写账户名");
    }
    return true;
  }).argv;

console.log(
  `Loaded with config: [username: ${argv.username}, password: ${argv.password}, interval: ${argv.interval} second(s)]`
);

// 用来ping的主机, 用于测试网络连通性
const host = "www.baidu.com";

const profile = {
  interval: argv.interval * 1000,

  /*
    关于用户名
    该字段的结构为"[学号]@[账户类型]", 譬如, 在泥电使用教育网出口, 典型的用户名为"1919810@uestc"
  */
  username: argv.username,
  password: argv.password,
  ip: "",
  /*
    实际上字段n、acid、type、enc字段都有可能根据业务和学校的不同而改变
    不过目前大部分深澜认证系统都没改enc、n字段
    这里硬编码的值为泥电沙河校区使用的值, 请根据实际情况修改
  */
  enc: "srun_bx1",
  n: 200,
  type: 1,
  acId: "",
  token: "",
  md5: "",
  chksum: "",
  info: "",
};

const instance = axios.create({
  baseURL: GATEWAY_URL,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    config.params = config.params || {};
    config.params.callback = "jQuery" + say_something() + dayjs().unix();
    config.params._ = dayjs().unix();
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
  (resp) => {
    const json_data = resp.data.match(/\w+\((.+)\)/)[1];
    resp.data = JSON.parse(json_data);
    return resp;
  },
  (error) => {
    console.error("请求错误", error);
    return Promise.reject(error);
  }
);

// 封装请求函数
const request = async (url, params = {}, method = "GET") => {
  try {
    const resp = await instance.request({ url, params, method });
    return resp.data;
  } catch (error) {
    console.error(`请求失败: ${url}`, error);
    throw error;
  }
};

const test_online = async () => {
  // 请求太快可能会导致"speed_limit_error"
  // try {
  //   const json_data = await request("/cgi-bin/rad_user_info");
  //   if (json_data.error === "ok") {
  //     return true;
  //   } else return false;
  // } catch (error) {}
  return await isOnline();
};

// 获取当前ip和ac_id
const getIpAndAcId = async () => {
  try {
    const json_data = await request("/cgi-bin/rad_user_info");
    const error = json_data.error;
    if (error === "not_online_error") {
      if (json_data.online_ip) {
        profile.ip = json_data.online_ip;
      } else {
        throw new Error("获取登录IP失败");
      }
    } else {
      // 校园网已经登录，可能为其他原因引发的网络连接故障
      if (error === "ok") {
        return 1;
      }
      throw new Error(
        "未定义该响应体错误消息对应的操作, 需要手动介入: " + error
      );
    }
    const gatewayResp = await axios.get(GATEWAY_URL);
    const params = new URLSearchParams(
      gatewayResp.request.res.responseUrl.split("?")[1]
    );
    profile.acId = params.get("ac_id");

    // console.log(`ac_id: ${profile.acId}`);
    return null;
  } catch (error) {
    console.error("获取 IP 或 ac_id 失败:", error);
    throw error;
  }
};

// 登录过程
const login = async () => {
  try {
    const retVal = await getIpAndAcId();
    if (retVal === 1) {
      return;
    }

    // 获取 token
    const challengeData = await request("/cgi-bin/get_challenge", {
      username: profile.username,
      ip: profile.ip,
    });
    profile.token = challengeData.challenge;

    // console.log(`token: ${profile.token}`);

    // 获取密码md5
    profile.md5 = get_md5(profile.password, profile.token);
    // console.log(`md5: ${profile.md5}`);

    // 获取 info
    profile.info =
      "{SRBX1}" +
      base64.encode(
        encode(
          JSON.stringify({
            username: profile.username,
            password: profile.password,
            acid: profile.acId,
            ip: profile.ip,
            enc_ver: profile.enc,
          }),
          profile.token
        )
      );
    // console.log(`info: ${profile.info}`);

    // 计算 chksum
    const str = [
      profile.token + profile.username,
      profile.token + profile.md5,
      profile.token + profile.acId,
      profile.token + profile.ip,
      profile.token + profile.n,
      profile.token + profile.type,
      profile.token + profile.info,
    ].join("");

    profile.chksum = get_sha1(str);

    // 发送登录请求
    const loginResp = await request("/cgi-bin/srun_portal", {
      action: "login",
      username: profile.username,
      password: "{MD5}" + profile.md5,
      os: "Windows+10",
      name: "Windows",
      double_stack: 0,
      chksum: profile.chksum,
      info: profile.info,
      ac_id: profile.acId,
      ip: profile.ip,
      n: profile.n,
      type: profile.type,
    });

    if (loginResp.error === "ok") {
      console.log(`[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] 登录成功! q(≧▽≦q)`);
    } else {
      console.log("登录失败, 返回信息如下:");
      console.log(loginResp);
    }
  } catch (error) {
    console.error("登录过程失败", error);
  }
};

const testAndLogin = async () => {
  const result = await test_online();
  if (!result) {
    console.log(`[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] 网络连接故障`);
    await login();
  }
};

testAndLogin();
setInterval(testAndLogin, profile.interval);

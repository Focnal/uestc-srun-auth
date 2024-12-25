# UESTC校园网认证脚本

自从泥电沙河校园网12月《升级设备》后，本人所在宿舍观察到每隔约2小时的校园网账户掉线现象，这导致本人宿舍的米家生态设备可用性降低

该脚本用于定时自动进行校园网身份验证，用法如下，详见注释

```shell
pnpm run start -u <your-user-name> -p <your-password> -i <interval-between-every-run>
```

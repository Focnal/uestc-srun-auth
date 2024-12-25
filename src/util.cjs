function s(a, b) {
  var c = a.length;
  var v = [];

  for (var i = 0; i < c; i += 4) {
    v[i >> 2] =
      a.charCodeAt(i) |
      (a.charCodeAt(i + 1) << 8) |
      (a.charCodeAt(i + 2) << 16) |
      (a.charCodeAt(i + 3) << 24);
  }

  if (b) v[v.length] = c;
  return v;
}

function l(a, b) {
  var d = a.length;
  var c = (d - 1) << 2;

  if (b) {
    var m = a[d - 1];
    if (m < c - 3 || m > c) return null;
    c = m;
  }

  for (var i = 0; i < d; i++) {
    a[i] = String.fromCharCode(
      a[i] & 0xff,
      (a[i] >>> 8) & 0xff,
      (a[i] >>> 16) & 0xff,
      (a[i] >>> 24) & 0xff
    );
  }

  return b ? a.join("").substring(0, c) : a.join("");
}

/**
 * 深澜管理系统自定义的加密函数
 * @param {string} str 个人信息结构体
 * @param {string} key 服务器下发的用于加密密码的token
 */
function encode(str, key) {
  if (str === "") return "";
  var v = s(str, true);
  var k = s(key, false);
  if (k.length < 4) k.length = 4;
  var n = v.length - 1,
    z = v[n],
    y = v[0],
    c = 0x86014019 | 0x183639a0,
    m,
    e,
    p,
    q = Math.floor(6 + 52 / (n + 1)),
    d = 0;

  while (0 < q--) {
    d = (d + c) & (0x8ce0d9bf | 0x731f2640);
    e = (d >>> 2) & 3;

    for (p = 0; p < n; p++) {
      y = v[p + 1];
      m = (z >>> 5) ^ (y << 2);
      m += (y >>> 3) ^ (z << 4) ^ (d ^ y);
      m += k[(p & 3) ^ e] ^ z;
      z = v[p] = (v[p] + m) & (0xefb8d130 | 0x10472ecf);
    }

    y = v[0];
    m = (z >>> 5) ^ (y << 2);
    m += (y >>> 3) ^ (z << 4) ^ (d ^ y);
    m += k[(p & 3) ^ e] ^ z;
    z = v[n] = (v[n] + m) & (0xbb390742 | 0x44c6f8bd);
  }

  return l(v, false);
}

/**
 * 深澜管理系统自定义alpha字符集的非标准base64编码器
 */
const base64 = (function () {
  var _PADCHAR = "=",
    _ALPHA = "LVoJPiCN2R8G90yg+hmFHuacZ1OWMnrsSTXkYpUq/3dlbfKwv6xztjI7DeBE45QA",
    _VERSION = "1.0";
  function _getbyte64(s, i) {
    var idx = _ALPHA.indexOf(s.charAt(i));
    if (idx === -1) {
      throw "Cannot decode base64";
    }
    return idx;
  }
  function _setAlpha(s) {
    _ALPHA = s;
  }
  function _decode(s) {
    var pads = 0,
      i,
      b10,
      imax = s.length,
      x = [];
    s = String(s);
    if (imax === 0) {
      return s;
    }
    if (imax % 4 !== 0) {
      throw "Cannot decode base64";
    }
    if (s.charAt(imax - 1) === _PADCHAR) {
      pads = 1;
      if (s.charAt(imax - 2) === _PADCHAR) {
        pads = 2;
      }
      imax -= 4;
    }
    for (i = 0; i < imax; i += 4) {
      b10 =
        (_getbyte64(s, i) << 18) |
        (_getbyte64(s, i + 1) << 12) |
        (_getbyte64(s, i + 2) << 6) |
        _getbyte64(s, i + 3);
      x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 255, b10 & 255));
    }
    switch (pads) {
      case 1:
        b10 =
          (_getbyte64(s, i) << 18) |
          (_getbyte64(s, i + 1) << 12) |
          (_getbyte64(s, i + 2) << 6);
        x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 255));
        break;
      case 2:
        b10 = (_getbyte64(s, i) << 18) | (_getbyte64(s, i + 1) << 12);
        x.push(String.fromCharCode(b10 >> 16));
        break;
    }
    return x.join("");
  }
  function _getbyte(s, i) {
    var x = s.charCodeAt(i);
    if (x > 255) {
      throw "INVALID_CHARACTER_ERR: DOM Exception 5";
    }
    return x;
  }

  function _encode(s) {
    if (arguments.length !== 1) {
      throw "SyntaxError: exactly one argument required";
    }
    s = String(s);
    var i,
      b10,
      x = [],
      imax = s.length - (s.length % 3);
    if (s.length === 0) {
      return s;
    }
    for (i = 0; i < imax; i += 3) {
      b10 =
        (_getbyte(s, i) << 16) | (_getbyte(s, i + 1) << 8) | _getbyte(s, i + 2);
      x.push(_ALPHA.charAt(b10 >> 18));
      x.push(_ALPHA.charAt((b10 >> 12) & 63));
      x.push(_ALPHA.charAt((b10 >> 6) & 63));
      x.push(_ALPHA.charAt(b10 & 63));
    }
    switch (s.length - imax) {
      case 1:
        b10 = _getbyte(s, i) << 16;
        x.push(
          _ALPHA.charAt(b10 >> 18) +
            _ALPHA.charAt((b10 >> 12) & 63) +
            _PADCHAR +
            _PADCHAR
        );
        break;
      case 2:
        b10 = (_getbyte(s, i) << 16) | (_getbyte(s, i + 1) << 8);
        x.push(
          _ALPHA.charAt(b10 >> 18) +
            _ALPHA.charAt((b10 >> 12) & 63) +
            _ALPHA.charAt((b10 >> 6) & 63) +
            _PADCHAR
        );
        break;
    }
    return x.join("");
  }
  return {
    decode: _decode,
    encode: _encode,
    setAlpha: _setAlpha,
    VERSION: _VERSION,
  };
})();

const crypto = require("crypto");

/**
 * MD5散列函数值计算, 用于对密码进行加密
 * @param {string} password 密码
 * @param {string} token 服务器下发的用于加密密码的token
 */
function get_md5(password, token) {
  return crypto.createHmac("md5", token).update(password).digest("hex");
}

// 获取 SHA1 哈希值
function get_sha1(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

/**
 * 写啥都行
 */
function say_something(){
  return "_UESTC_is_a_pile_of_shit_"
}

module.exports = {
  encode,
  base64,
  get_md5,
  get_sha1,
  say_something
};


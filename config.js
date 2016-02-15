/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

module.exports = {
  // maximum number of distinct cache objects (each having different expire time)
  "cacheMaxPoolSize": 15,

  // maximum number of objects that lru-cache (server side cashe) can retain
  "cacheMaxItems": 1000,

  // if set to false, it will not allow parameters without the hungarian notation
  // thus effectively forcing all parameters to have type checking
  "allowedUntyped": true,

  // for purpose of development
  "disable304Caching": false,

  // the default httpCache is 60 seconds
  "httpCache": 60,

  // values of 0,1,2
  "httpVerbose": 1,

  // the default cookie secret, it is advisable to use setOptions with a new cookieSecret
  "cookieSecret": "1234567890QWERTY",

  // session timeout
  "cookieMaxAgeMinutes": 30,

  // crash log file
  "crashLog": "/var/log/nodetastic-crash.log",

  // cb names
  "cbNames": ["cb", "done", "next"],

  // function name resolve case insensitive (the searched functions should be all lower letters)
  "functionNamesCaseInsensitive": false
};


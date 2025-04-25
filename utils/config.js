/**
 * 全局配置
 */
const config = {
  //开发版
  'develop': {
    //请求的地址
    baseUrl: 'http://192.168.31.233:8080',
    ysUrl: 'http://192.168.31.233:8080/api/'
  },
  //体验版
  'trial': {
    //请求的地址
    baseUrl: 'http://localhost:8080',
    ysUrl: 'http://14.103.193.11:8080/api/'
  },
  //正式版
  'release': {
    //请求的地址
    baseUrl: 'http://14.103.193.11:8080',
    ysUrl: 'http://14.103.193.11:8080/api/'
  }
}[wx.getAccountInfoSync().miniProgram.envVersion];

/**
 * 全局配置
 */
module.exports = {
  config
}

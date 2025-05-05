/**
 * 全局配置
 */
const config = {
  //开发版
  'develop': {
    //请求的地址
    baseUrl: 'https://yavin.and-tech.cn',
    ysUrl: 'https://yavin.and-tech.cn/yishao-api/'
  },
  //体验版
  'trial': {
    //请求的地址
    baseUrl: 'https://and-tech.cn',
    ysUrl: 'https://and-tech.cn/yishao-api/'
  },
  //正式版
  'release': {
    //请求的地址
    baseUrl: 'https://and-tech.cn',
    ysUrl: 'https://and-tech.cn/yishao-api/'
  }
}[wx.getAccountInfoSync().miniProgram.envVersion];

/**
 * 全局配置
 */
module.exports = {
  config
}

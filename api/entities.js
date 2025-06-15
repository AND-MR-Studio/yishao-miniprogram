/**
 * API响应结果类
 */
export class ApiResult {
    constructor(code, data, msg) {
        this.code = code;
        this.data = data;
        this.msg = msg;
    }

    /**
     * 创建失败响应
     * @param {String} msg 错误信息
     * @returns {ApiResult} 失败响应对象
     */
    static onError(msg) {
        return new ApiResult(-1, null, msg);
    }

    static onNull() {
        return new ApiResult(0, null, null);
    }

    /**
     * 判断请求是否成功
     * @returns {boolean} true表示成功，false表示失败
     */
    success() {
        return this.code === 200 || this.code === 0;
    }
}
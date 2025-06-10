/**
 * 环境配置管理
 * 支持手动切换开发/正式环境，方便开发调试
 */
// 定义环境常量
const ENV_DEV = "dev";
const ENV_PROD = "prod";
// ==================== 环境配置开关 ====================
// 手动环境切换开关 - 开发时可以手动指定环境
// 设置为 null 时自动根据小程序版本判断环境
// 设置为 'dev' 或 'prod' 时强制使用指定环境
const MANUAL_ENV = ENV_DEV; // 可选值: null, ENV_DEV, ENV_PROD

const isDevelopment = true;

// ==================== 环境判断逻辑 ====================
/**
 * 获取当前运行环境
 * @returns {string} 'dev' | 'prod'
 */
function getCurrentEnvironment() {
    // 如果手动指定了环境，直接返回
    if (MANUAL_ENV) {
        if (MANUAL_ENV !== ENV_DEV && MANUAL_ENV !== ENV_PROD) {
            throw new Error(
                `Invalid MANUAL_ENV: ${MANUAL_ENV}. Must be 'dev' or 'prod'.`
            );
        }
        console.log(`🔧 手动指定环境: ${MANUAL_ENV}`);
        return MANUAL_ENV;
    }

    // 根据小程序版本自动判断
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
    console.log(`当前小程序版本: ${envVersion}`);
    switch (envVersion) {
        case "develop":
            return ENV_DEV;
        case "trial":
        case "release":
            return ENV_PROD;
        default:
            console.warn(`未知的小程序环境: ${envVersion}，默认使用开发环境`);
            return ENV_DEV;
    }
}

/**
 * 全局配置导出
 */
module.exports = {

    // 环境管理工具
    getCurrentEnvironment,

    // 环境切换工具函数
    isDevelopment: getCurrentEnvironment() === ENV_DEV,
};

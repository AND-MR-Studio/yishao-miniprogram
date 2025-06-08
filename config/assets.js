/**
 * !!!!!!!!!!!!!!该类后续废弃，请使用 api-dev/api-prod/url 代替!!!!!!!!!!!!!!
 */
const assetsBaseUrl = "http://oss.and-tech.cn";
const imagesUi = "images/ui";
const imagesCovers = "images/covers";
// 资源管理
const assets = {
    // 本地静态资源
    local: {
        avatar: '/static/images/default-avatar.jpg',
        shareImage: ''
    },

    // 远程资源
    remote: {

        // UI资源
        ui: {
            get: (filename) => `${assetsBaseUrl}/${imagesUi}/${filename}`,
            notFound: `${assetsBaseUrl}/${imagesUi}/404.webp`,
            xiaoshao_avatar: `${assetsBaseUrl}/${imagesUi}/xiaoshao.heif`,
            popup: `${assetsBaseUrl}/${imagesUi}/popup.png`
        },

        // 海龟汤配图资源
        cover: {
            get: (soupId) => `${assetsBaseUrl}/${imagesCovers}${soupId}.jpeg`
        }
    }
};

module.exports = {

    // 导出资源管理
    assets
};
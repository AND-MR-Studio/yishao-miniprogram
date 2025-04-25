const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs_extra = require('fs-extra');

// 导入服务模块
const dialogService = require('./services/dialogService');
const userService = require('./services/userService');
const soupService = require('./services/soupService');

const app = express();
const PORT = 8080;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 提供管理页面静态文件
app.use(express.static(path.join(__dirname, 'html')));

// API文档服务
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// 初始化汤面服务路由
soupService.initSoupRoutes(app);

// 初始化对话服务路由
dialogService.initDialogRoutes(app);

// 初始化用户服务路由
userService.initUserRoutes(app);

// 初始化服务
async function initServices() {
  try {
    // 确保依赖的 fs-extra 模块可用
    if (!fs_extra) {
      console.error('缺少依赖模块 fs-extra，请先安装: npm install fs-extra');
      process.exit(1);
    }

    // 初始化汤面服务
    await soupService.init();

    // 初始化对话服务
    await dialogService.init();

    // 初始化用户服务
    await userService.init();

    console.log('所有服务初始化完成');
  } catch (error) {
    console.error('服务初始化失败:', error);
    process.exit(1);
  }
}

// 启动服务器
initServices().then(() => {
  // 监听所有网络接口，而不仅仅是 localhost
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`本地服务器运行在 http://localhost:${PORT}`);
    console.log(`局域网访问地址: http://192.168.31.233:${PORT}`);
    console.log(`管理后台:`);
    console.log(`  - 海龟汤管理: http://localhost:${PORT}/soup.html`);
    console.log(`  - 对话记录: http://localhost:${PORT}/dialog.html`);
    console.log(`  - 用户管理: http://localhost:${PORT}/user.html`);
  });
});
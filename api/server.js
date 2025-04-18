const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 导入服务路由
const soupService = require('./soupService');
const userService = require('./userService');

const app = express();

// 中间件配置
app.use(cors());
app.use(bodyParser.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../html')));

// 注册路由服务
app.use('/api', soupService);
app.use('/api', userService);

// 端口配置
const PORT = process.env.PORT || 8089;

// 启动服务器
app.listen(PORT, 'localhost', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 
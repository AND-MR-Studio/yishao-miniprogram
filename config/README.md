# 环境配置使用说明

## 概述

本项目支持灵活的环境切换机制，可以方便地在开发环境和正式环境之间切换，特别适合开发调试新功能时需要连接不同环境的云端服务。

## 环境配置

### 支持的环境

- **开发环境 (development)**
  - 域名：`https://and-tech.cn`
  - 用途：开发调试、新功能验证
  - 特点：开启调试模式，详细日志输出

- **正式环境 (production)**
  - 域名：`https://yavin.and-tech.cn`
  - 用途：正式发布、生产环境
  - 特点：关闭调试模式，仅输出错误日志

## 环境切换方法

### 方法一：手动指定环境（推荐用于开发调试）

1. 打开 `config/config.js` 文件
2. 找到 `MANUAL_ENV` 配置项
3. 修改为你需要的环境：

```javascript
// 强制使用开发环境
const MANUAL_ENV = 'development';

// 强制使用正式环境
const MANUAL_ENV = 'production';

// 自动根据小程序版本判断（默认）
const MANUAL_ENV = null;
```

### 方法二：自动环境判断（默认行为）

当 `MANUAL_ENV = null` 时，系统会根据小程序版本自动选择环境：

- 开发版 (`develop`) → 开发环境
- 体验版 (`trial`) → 正式环境
- 正式版 (`release`) → 正式环境

## 使用场景示例

### 场景1：验证新功能

当你需要验证一个新功能，想要连接开发环境的云端服务：

1. 修改 `config/config.js`：
   ```javascript
   const MANUAL_ENV = 'development';
   ```

2. 重新编译运行小程序

3. 查看控制台输出确认环境切换成功

### 场景2：测试正式环境

当你需要在开发版中测试正式环境的接口：

1. 修改 `config/config.js`：
   ```javascript
   const MANUAL_ENV = 'production';
   ```

2. 重新编译运行小程序

### 场景3：恢复自动判断

完成调试后，恢复自动环境判断：

1. 修改 `config/config.js`：
   ```javascript
   const MANUAL_ENV = null;
   ```

## 环境信息查看

启动小程序后，控制台会输出详细的环境配置信息：

```
==================== 环境配置信息 ====================
🏷️  小程序版本: develop
🌍 当前环境: 开发环境
🔧 环境标识: development
🌐 基础URL: https://and-tech.cn
🥄 一勺服务URL: https://and-tech.cn/yishao-api/
💾 Memory服务URL: http://alex.and-tech.cn/memory
📁 资源基础URL: http://oss.and-tech.cn
🐛 调试模式: 开启
📝 日志级别: debug
================================================
```

## 代码中使用环境配置

### 获取当前环境配置

```javascript
// 在页面或组件中
const app = getApp();
const config = app.globalData.config;

console.log('当前基础URL:', config.baseUrl);
console.log('当前环境名称:', config.name);
```

### 环境判断

```javascript
// 在页面或组件中
const app = getApp();

// 判断是否为开发环境
if (app.globalData.isDevelopment()) {
  console.log('当前是开发环境');
}

// 判断是否为正式环境
if (app.globalData.isProduction()) {
  console.log('当前是正式环境');
}
```

### 获取指定环境配置

```javascript
// 获取开发环境配置
const devConfig = app.globalData.environments.development;

// 获取正式环境配置
const prodConfig = app.globalData.environments.production;
```

## 注意事项

1. **修改配置后需要重新编译**：修改 `MANUAL_ENV` 后需要重新编译小程序才能生效

2. **提交代码前检查配置**：提交代码前请确保 `MANUAL_ENV` 设置为 `null`，避免影响其他开发者

3. **环境切换日志**：手动指定环境时，控制台会显示 "🔧 手动指定环境" 的提示

4. **向后兼容**：新的配置系统完全兼容原有的 API 调用方式

## 配置文件结构

```
config/
├── config.js          # 主配置文件（环境管理）
├── api.js            # API 接口定义
└── README.md         # 本说明文档
```

## 常见问题

**Q: 为什么修改了 MANUAL_ENV 但环境没有切换？**
A: 需要重新编译小程序，热重载可能不会重新执行 app.js 中的初始化代码。

**Q: 如何确认当前使用的是哪个环境？**
A: 查看控制台输出的环境配置信息，或者检查 `app.globalData.config.name`。

**Q: 可以添加更多环境吗？**
A: 可以在 `environments` 对象中添加新的环境配置，并相应修改环境判断逻辑。
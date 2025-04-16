# 汤面服务（soupService）

## 功能说明
汤面服务是小程序的核心数据服务，负责处理汤面数据的获取和管理逻辑。现已实现前后端分离，后端服务部署在远程服务器上。

## 服务器配置

### 后端服务器
- 服务器地址：http://71.137.1.230:8081
- API基础路径：/api/soups
- 管理后台：http://71.137.1.230:8081/admin.html

### 启动服务
1. **启动后端服务**
   ```bash
   # 进入服务器目录
   cd /path/to/server
   
   # 启动Node.js服务器
   node server.js
   ```

## 当前实现

### 数据结构
```javascript
{
    soupId: string,       // 汤面唯一标识
    title: string,        // 汤面标题
    contentLines: string[]  // 汤面内容行数组，
    truth: string         // 汤底内容（只有在回答正确后才会显示）
}
```

### 核心方法 (Promise风格)

#### 获取汤面数据
```javascript
// 使用Promise风格API获取汤面数据
async function loadSoup() {
  try {
    // 不指定soupId则返回第一个汤面
    const soupData = await soupService.getSoupDataAsync('default_001');
    console.log('获取成功:', soupData);
  } catch (error) {
    console.error('获取失败:', error);
  }
}
```

#### 刷新数据
```javascript
// 刷新所有汤面数据
async function refreshAllSoups() {
  try {
    const soups = await soupService.refreshSoupsAsync();
    console.log('刷新成功，获取到', soups.length, '个汤面');
  } catch (error) {
    console.error('刷新失败:', error);
  }
}
```

#### 导航汤面
```javascript
// 获取下一个汤面ID
const nextSoupId = soupService.getNextSoupId('default_001');

// 根据ID获取特定汤面
const soup = soupService.getSoupById('default_002');
```

#### 汤面集合操作
```javascript
// 获取汤面总数
const count = soupService.getSoupCount();

// 获取所有汤面数据
async function getAllSoups() {
  const allSoups = await soupService.getAllSoupsAsync();
  console.log('获取所有汤面:', allSoups.length);
}
```

#### 辅助方法
```javascript
// 获取指定汤面的索引
const index = soupService.getSoupIndex('default_001');
```

### 错误处理
所有异步API都使用了Promise，支持try/catch错误处理:
```javascript
async function loadSoupWithErrorHandling() {
  try {
    const soupData = await soupService.getSoupDataAsync('invalid_id');
    // 成功处理
  } catch (error) {
    // 错误处理
    console.error('加载失败:', error);
  } finally {
    // 无论成功失败都会执行
    console.log('加载流程完成');
  }
}
```

## 后端 TODO

### API 需求
1. 获取汤面列表
   ```
   GET /api/v1/soups
   响应格式：
   {
     "success": true,
     "data": {
       "soups": [
         {
           "soupId": string,
           "title": string,
           "contentLines": string[],
           "createTime": string,
           "updateTime": string,
           "isAnswered": boolean,    // 当前用户是否回答过
           "isCorrect": boolean,     // 当前用户是否回答正确
           "isViewed": boolean       // 当前用户是否查看过
         }
       ],
       "total": number
     }
   }
   ```

2. 获取单个汤面
   ```
   GET /api/v1/soups/:soupId
   响应格式：
   {
     "success": true,
     "data": {
       "soupId": string,
       "title": string,
       "contentLines": string[],
       "createTime": string,
       "updateTime": string,
       "isAnswered": boolean,    // 当前用户是否回答过
       "isCorrect": boolean,     // 当前用户是否回答正确
       "isViewed": boolean,      // 当前用户是否查看过
       "viewTime": string        // 首次查看时间
     }
   }
   ```

3. 获取随机汤面
   ```
   GET /api/v1/soups/random
   响应格式：同获取单个汤面
   ```

4. 提交汤面回答
   ```
   POST /api/v1/soups/:soupId/answer
   请求体：
   {
     "answer": string,    // 用户的回答内容
   }
   响应格式：
   {
     "success": true,
     "data": {
       "isCorrect": boolean,     // 回答是否正确
       "correctAnswer": string,   // 正确答案
       "explanation": string,     // 解释说明（可选）
       "score": number           // 获得的分数（可选）
     }
   }
   ```

5. 获取用户汤面回答状态
   ```
   GET /api/v1/soups/status
   响应格式：
   {
     "success": true,
     "data": {
       "answeredSoups": [
         {
           "soupId": string,
           "isCorrect": boolean,
           "answerTime": string,
         }
       ],
       "totalAnswered": number,
       "totalCorrect": number,
     }
   }
   ```

6. 标记汤面为已查看
   ```
   POST /api/v1/soups/:soupId/view
   请求体：
   {
     "deviceInfo": string,    // 设备信息（可选）
     "viewDuration": number   // 查看时长（毫秒，可选）
   }
   响应格式：
   {
     "success": true,
     "data": {
       "viewTime": string,    // 查看时间
       "isFirstView": boolean // 是否首次查看
     }
   }
   ```

7. 获取用户汤面查看状态
   ```
   GET /api/v1/soups/view-status
   响应格式：
   {
     "success": true,
     "data": {
       "viewedSoups": [
         {
           "soupId": string,
           "firstViewTime": string,  // 首次查看时间
           "lastViewTime": string,   // 最后查看时间
           "viewCount": number       // 查看次数
         }
       ],
       "totalViewed": number,      // 总查看数
       "todayViewed": number       // 今日查看数
     }
   }
   ```

### 未来计划
- [ ] 实现本地数据缓存
- [ ] 添加数据版本控制
- [ ] 实现增量更新机制
- [ ] 定义错误码规范
- [ ] 实现网络错误重试机制
- [ ] 添加本地缓存兜底策略
- [ ] 实现数据预加载
- [ ] 添加请求队列管理
- [ ] 优化缓存策略
- [ ] 添加请求签名机制
- [ ] 实现数据加密传输
- [ ] 添加防刷机制

## 最佳实践
1. **使用异步API**：优先使用Promise风格的API，搭配async/await使用
2. **错误处理**：使用try/catch处理异步操作中可能的错误
3. **集合操作**：使用`getAllSoupsAsync()`获取汤面列表，避免直接访问`soups`属性
4. **导航操作**：使用`getNextSoupId`进行汤面导航，确保顺序一致性

## 注意事项
- 用户状态：
  - 需要维护用户的回答历史
  - 回答状态需要与用户账号绑定
  - 支持多设备同步回答状态
  - 需要记录用户查看历史
  - 支持查看次数统计和时长分析

## 服务初始化
```javascript
// 使用Promise风格初始化
async function initService() {
  try {
    const soups = await soupService.loadSoupsAsync();
    console.log('汤面数据加载完成：', soups.length);
  } catch (error) {
    console.error('汤面数据加载失败:', error);
  }
}

// 切换生产环境
soupService.switchEnvironment('production');
```

## 环境配置
```javascript
// 切换到开发环境
soupService.switchEnvironment('development');

// 切换到生产环境
soupService.switchEnvironment('production');

// 获取当前环境的API基础URL
const apiUrl = soupService.API_BASE_URL;
```

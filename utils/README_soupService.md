# 海龟汤服务（soupService）

## 功能说明
海龟汤服务是小程序的核心数据服务，负责处理海龟汤数据的获取和管理逻辑。采用RESTful API设计，提供简洁易用的接口，实现前后端分离。

## 服务器配置

### 后端服务器
- 本地开发环境：http://localhost:8080
- API基础路径：/api/soup
- 本地管理页面：http://localhost:8080/html/admin.html

### 启动服务
1. **启动本地开发服务**
   ```bash
   # 进入服务器目录
   cd local-server

   # 启动Node.js服务器
   node server.js
   ```

## 数据结构

### 海龟汤数据结构
```javascript
{
    soupId: string,         // 海龟汤唯一标识
    title: string,          // 海龟汤标题
    contentLines: string[], // 海龟汤内容行数组
    truth: string,          // 汤底内容（只有在回答正确后才会显示）
    createTime: string,     // 创建时间（ISO格式）
    updateTime: string      // 更新时间（ISO格式）
}
```

## RESTful API接口

### 前端接口（utils/soupService.js）

#### 获取海龟汤数据
```javascript
// 获取所有海龟汤
const allSoups = await soupService.getSoup();

// 获取指定ID的海龟汤
const soup = await soupService.getSoup('soup_001');

// 获取多个指定ID的海龟汤
const soups = await soupService.getSoup(['soup_001', 'soup_002']);
```

#### 获取随机海龟汤
```javascript
// 获取随机海龟汤
const randomSoup = await soupService.getRandomSoup();
```

#### 创建海龟汤
```javascript
// 创建新海龟汤
const newSoup = await soupService.createSoup({
  title: '新海龟汤标题',
  contentLines: ['第一行', '第二行', '第三行'],
  truth: '汤底内容'
});
```

#### 更新海龟汤
```javascript
// 更新海龟汤
const updatedSoup = await soupService.updateSoup('soup_001', {
  title: '更新后的标题',
  contentLines: ['更新的第一行', '更新的第二行']
});
```

#### 删除海龟汤
```javascript
// 删除单个海龟汤
const result = await soupService.deleteSoup('soup_001');

// 批量删除海龟汤
const batchResult = await soupService.deleteSoups(['soup_001', 'soup_002']);
```

### 错误处理
所有API都返回Promise，支持try/catch错误处理:
```javascript
async function loadSoupWithErrorHandling() {
  try {
    const soupData = await soupService.getSoup('invalid_id');
    if (soupData) {
      // 成功处理
      console.log('海龟汤数据:', soupData);
    } else {
      console.warn('未找到海龟汤');
    }
  } catch (error) {
    // 错误处理
    console.error('加载失败:', error);
  } finally {
    // 无论成功失败都会执行
    console.log('加载流程完成');
  }
}
```

## 后端API接口（local-server/soupService.js）

### 接口概览

| 方法   | 路径                  | 描述                   |
|--------|----------------------|----------------------|
| GET    | /api/soup            | 获取所有海龟汤或指定ID的海龟汤 |
| GET    | /api/soup/:soupId    | 获取指定ID的海龟汤        |
| GET    | /api/soup/random     | 获取随机海龟汤            |
| POST   | /api/soup            | 创建新海龟汤              |
| PUT    | /api/soup/:soupId    | 更新指定ID的海龟汤        |
| DELETE | /api/soup/:soupId    | 删除指定ID的海龟汤        |
| DELETE | /api/soup?ids=id1,id2| 批量删除多个海龟汤        |

### 详细接口说明

#### 1. 获取海龟汤列表或指定海龟汤
```
GET /api/soup
GET /api/soup?id=soup_001
GET /api/soup?id=soup_001,soup_002

响应格式：
{
  "success": true,
  "data": [
    {
      "soupId": "soup_001",
      "title": "海龟汤标题",
      "contentLines": ["第一行", "第二行"],
      "truth": "汤底内容",
      "createTime": "2023-04-21T08:00:00.000Z",
      "updateTime": "2023-04-21T08:00:00.000Z"
    },
    ...
  ]
}
```

#### 2. 获取单个海龟汤
```
GET /api/soup/:soupId

响应格式：
{
  "success": true,
  "data": {
    "soupId": "soup_001",
    "title": "海龟汤标题",
    "contentLines": ["第一行", "第二行"],
    "truth": "汤底内容",
    "createTime": "2023-04-21T08:00:00.000Z",
    "updateTime": "2023-04-21T08:00:00.000Z"
  }
}
```

#### 3. 获取随机海龟汤
```
GET /api/soup/random

响应格式：同获取单个海龟汤
```

#### 4. 创建新海龟汤
```
POST /api/soup
请求体：
{
  "title": "新海龟汤标题",
  "contentLines": ["第一行", "第二行", "第三行"],
  "truth": "汤底内容"
}

响应格式：
{
  "success": true,
  "data": {
    "soupId": "generated_id",
    "title": "新海龟汤标题",
    "contentLines": ["第一行", "第二行", "第三行"],
    "truth": "汤底内容",
    "createTime": "2023-04-21T08:00:00.000Z",
    "updateTime": "2023-04-21T08:00:00.000Z"
  }
}
```

#### 5. 更新海龟汤
```
PUT /api/soup/:soupId
请求体：
{
  "title": "更新后的标题",
  "contentLines": ["更新的第一行", "更新的第二行"],
  "truth": "更新的汤底内容"
}

响应格式：
{
  "success": true,
  "data": {
    "soupId": "soup_001",
    "title": "更新后的标题",
    "contentLines": ["更新的第一行", "更新的第二行"],
    "truth": "更新的汤底内容",
    "createTime": "2023-04-21T08:00:00.000Z",
    "updateTime": "2023-04-21T09:00:00.000Z"
  }
}
```

#### 6. 删除海龟汤
```
DELETE /api/soup/:soupId

响应格式：
{
  "success": true,
  "data": {
    "message": "删除成功",
    "deletedSoup": {
      "soupId": "soup_001",
      "title": "海龟汤标题",
      ...
    }
  }
}
```

#### 7. 批量删除海龟汤
```
DELETE /api/soup?ids=soup_001,soup_002

响应格式：
{
  "success": true,
  "data": {
    "message": "成功删除 2 个海龟汤",
    "deletedCount": 2
  }
}
```

## 最佳实践

### 前端使用建议
1. **使用异步API**：所有API都返回Promise，建议搭配async/await使用
2. **错误处理**：使用try/catch处理异步操作中可能的错误
3. **批量操作**：需要获取多个海龟汤时，优先使用ID数组而不是多次调用单个获取方法
4. **随机获取**：使用`getRandomSoup()`获取随机海龟汤，而不是自行实现随机逻辑

### 后端实现说明
1. **RESTful设计**：API遵循RESTful设计规范，使用HTTP方法表达操作语义
2. **统一响应格式**：所有API返回统一的响应格式，包含success字段和data/error字段
3. **错误处理**：所有API都有完善的错误处理，返回合适的HTTP状态码和错误信息
4. **数据验证**：所有写操作都有输入验证，确保数据完整性

## 未来计划
- [ ] 添加用户相关功能（回答记录、查看历史等）
- [ ] 实现本地数据缓存
- [ ] 添加数据版本控制
- [ ] 实现增量更新机制
- [ ] 优化错误处理和重试机制
- [ ] 添加数据预加载功能

## 注意事项
- 本地开发环境下，数据存储在`local-server/soups.json`文件中
- 所有时间字段均使用ISO格式字符串
- 海龟汤ID在创建时自动生成，格式为`local_时间戳`
- 批量操作时注意控制数据量，避免请求过大

# 汤面服务（soupService）

## 功能说明
汤面服务是小程序的核心数据服务，负责处理汤面数据的获取和轮播逻辑。目前采用前端模拟数据的方式实现，后续需要对接后端API。

## 当前实现
### 数据结构
```javascript
{
    soupId: string,     // 汤面唯一标识
    title: string,      // 汤面标题
    contentLines: string[]  // 汤面内容行数组
}
```

### 核心方法
- `getNextSoup()`: 获取下一个汤面数据
- `getSoupData(options)`: 异步获取汤面数据，模拟网络请求

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

### 数据同步机制
- [ ] 实现本地数据缓存
- [ ] 添加数据版本控制
- [ ] 实现增量更新机制

### 错误处理
- [ ] 定义错误码规范
- [ ] 实现网络错误重试机制
- [ ] 添加本地缓存兜底策略

### 性能优化
- [ ] 实现数据预加载
- [ ] 添加请求队列管理
- [ ] 优化缓存策略

### 安全性
- [ ] 添加请求签名机制
- [ ] 实现数据加密传输
- [ ] 添加防刷机制

## 注意事项
   -用户状态：
   - 需要维护用户的回答历史
   - 回答状态需要与用户账号绑定
   - 支持多设备同步回答状态
   - 需要记录用户查看历史
   - 支持查看次数统计和时长分析

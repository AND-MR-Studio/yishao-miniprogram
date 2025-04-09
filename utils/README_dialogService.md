# DialogService 对话服务

`DialogService` 是一个负责处理用户与系统对话的服务类，提供消息发送、存储和加载等功能。

## 主要功能

1. **消息发送**：调用后端API发送用户消息并处理回复
2. **消息格式化**：将不同格式的API响应转换为统一格式
3. **对话状态管理**：跟踪当前对话的汤面ID和消息变更状态
4. **本地存储**：保存和加载用户对话历史记录

## 使用方法

### 导入服务

```javascript
const dialogService = require('../../utils/dialogService');
```

### 设置当前汤面ID

在开始对话前，必须设置当前的汤面ID：

```javascript
dialogService.setCurrentSoupId('soup_001');
```

### 发送消息

```javascript
async function sendMessage() {
  try {
    const response = await dialogService.sendMessage({
      message: '用户的问题'
    });
    // response 格式: {type: 'normal', content: '回复内容'}
    console.log(response);
  } catch (error) {
    console.error('发送失败:', error);
  }
}
```

### 保存对话记录

```javascript
// 传入汤面ID和消息数组
const success = dialogService.saveDialogMessages('soup_001', messages);

// 或使用当前设置的汤面ID
const success = dialogService.saveDialogMessages(null, messages);
```

### 加载对话记录

```javascript
dialogService.loadDialogMessages({
  soupId: 'soup_001', // 可选，如不传则使用当前设置的汤面ID
  success: (messages) => {
    console.log('加载成功:', messages);
  },
  fail: (error) => {
    console.error('加载失败:', error);
  },
  complete: () => {
    // 完成处理
  }
});
```

### 删除对话记录

```javascript
const success = dialogService.deleteDialogMessages('soup_001');
```

## 消息类型

服务处理以下几种消息类型：

- `user`: 用户发送的消息
- `normal`: 系统回复的普通消息
- `system`: 系统初始化消息(不会被存储)
- `hint`: 提示类消息

## 存储行为

- `system` 类型的消息不会被存储，用于减少存储空间占用
- 其他类型的消息(如 `user`, `normal`, `hint`)会被正常存储
- 存储使用微信小程序的 `wx.setStorageSync` API，以汤面ID为唯一标识

## 最佳实践

1. **始终设置汤面ID**：在对话开始前设置正确的汤面ID
2. **定期保存**：在关键操作后保存对话记录，如发送/接收消息后
3. **页面卸载前保存**：在页面的 `onHide` 和 `onUnload` 生命周期中保存对话
4. **初始化消息分离**：初始化的欢迎/引导消息应在页面层处理，不要依赖服务层

## 错误处理

服务中的主要方法都有错误处理和返回值，建议检查返回值以确保操作成功：

```javascript
const saveResult = dialogService.saveDialogMessages(soupId, messages);
if (!saveResult) {
  // 处理保存失败的情况
}
```

## 后端 TODO

### API 需求

1. 获取对话历史
   ```
   GET /api/v1/dialogs/:soupId
   响应格式：
   {
     "success": true,
     "data": {
       "messages": [
         {
           "id": string,           // 消息唯一标识
           "type": string,         // 消息类型：user/normal/system/hint
           "content": string,      // 消息内容
           "createTime": string,   // 创建时间
           "soupId": string,      // 关联的汤面ID
           "userId": string,      // 用户ID
           "deviceInfo": string,  // 设备信息
           "metadata": {          // 元数据
             "isEdited": boolean,  // 是否被编辑过
             "editTime": string,   // 最后编辑时间
             "version": number     // 消息版本号
           }
         }
       ],
       "total": number,
       "hasMore": boolean
     }
   }
   ```

2. 保存对话消息
   ```
   POST /api/v1/dialogs/:soupId/messages
   请求体：
   {
     "messages": [
       {
         "type": string,
         "content": string,
         "metadata": object      // 可选的元数据
       }
     ],
     "deviceInfo": string      // 设备信息
   }
   响应格式：
   {
     "success": true,
     "data": {
       "savedCount": number,    // 成功保存的消息数
       "messageIds": string[]   // 新保存消息的ID列表
     }
   }
   ```

3. 删除对话历史//不需要
   ```
   DELETE /api/v1/dialogs/:soupId
   响应格式：
   {
     "success": true,
     "data": {
       "deletedCount": number   // 删除的消息数量
     }
   }
   ```

4. 获取对话统计
   ```
   GET /api/v1/dialogs/stats
   响应格式：
   {
     "success": true,
     "data": {
       "totalDialogs": number,     // 总对话数
       "totalMessages": number,    // 总消息数
       "messagesByType": {         // 各类型消息数量
         "user": number,
         "normal": number,
         "system": number,
         "hint": number
       },
       "activeDialogs": number,    // 活跃对话数（24小时内）
       "averageLength": number     // 平均对话长度
     }
   }
   ```

5. 同步对话数据
   ```
   POST /api/v1/dialogs/sync
   请求体：
   {
     "lastSyncTime": string,     // 上次同步时间
     "deviceInfo": string,       // 设备信息
     "localChanges": [           // 本地变更记录
       {
         "soupId": string,
         "messages": array,
         "version": number
       }
     ]
   }
   响应格式：
   {
     "success": true,
     "data": {
       "updates": [              // 需要更新的对话
         {
           "soupId": string,
           "messages": array,
           "version": number
         }
       ],
       "conflicts": [            // 存在冲突的对话
         {
           "soupId": string,
           "serverVersion": number,
           "clientVersion": number
         }
       ],
       "syncTime": string       // 本次同步时间
     }
   }
   ```



*注意：对话服务是一个单例，导入后可以直接使用，无需实例化。*

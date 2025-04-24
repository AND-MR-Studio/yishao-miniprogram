# 用户服务 API 文档

## 概述

用户服务提供用户管理相关的 API，包括用户登录、注册、信息更新、签到等功能。

## 基础路径

所有 API 的基础路径为 `/api/user`。

## API 列表

### 1. 用户登录/注册

- **URL**: `/api/user/login`
- **方法**: `POST`
- **描述**: 用户登录或注册
- **请求参数**:
  - `code`: 微信登录 code
  - `userInfo`: 用户信息对象（可选）
    - `avatarUrl`: 头像 URL
    - `nickName`: 昵称
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "openid": "用户openid",
        "userInfo": {
          "avatarUrl": "头像URL",
          "nickName": "昵称"
        },
        "level": {
          "level": 1,
          "levelTitle": "见习侦探",
          "experience": 0,
          "maxExperience": 1000
        },
        "answers": {
          "remainingAnswers": 10,
          "maxDailyAnswers": 10
        },
        "points": {
          "total": 0,
          "signInCount": 0,
          "lastSignInDate": null
        }
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 2. 更新用户信息

- **URL**: `/api/user/update`
- **方法**: `POST`
- **描述**: 更新用户信息
- **请求参数**:
  - `openid`: 用户 openid
  - `avatarUrl`: 头像 URL（可选）
  - `nickName`: 昵称（可选）
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "userInfo": {
          "avatarUrl": "头像URL",
          "nickName": "昵称"
        }
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 3. 获取用户信息

- **URL**: `/api/user/info`
- **方法**: `GET`
- **描述**: 获取用户信息
- **请求参数**:
  - `openid`: 用户 openid
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "userInfo": {
          "avatarUrl": "头像URL",
          "nickName": "昵称"
        },
        "stats": {
          "totalAnswered": 0,
          "totalCorrect": 0,
          "totalViewed": 0,
          "todayViewed": 0,
          "unsolvedCount": 0,
          "solvedCount": 0,
          "creationCount": 0,
          "favoriteCount": 0
        },
        "level": {
          "level": 1,
          "levelTitle": "见习侦探",
          "experience": 0,
          "maxExperience": 1000
        },
        "answers": {
          "remainingAnswers": 10,
          "maxDailyAnswers": 10
        },
        "points": {
          "total": 0,
          "signInCount": 0,
          "lastSignInDate": null
        }
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 4. 获取用户汤面记录

- **URL**: `/api/user/soups`
- **方法**: `GET`
- **描述**: 获取用户汤面记录
- **请求参数**:
  - `openid`: 用户 openid
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "answeredSoups": [],
        "viewedSoups": []
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 5. 更新用户汤面记录

- **URL**: `/api/user/soups/update`
- **方法**: `POST`
- **描述**: 更新用户汤面记录
- **请求参数**:
  - `openid`: 用户 openid
  - `soupId`: 汤面 ID
  - `type`: 记录类型，`answer` 或 `view`
  - `data`: 记录数据
    - 当 `type` 为 `answer` 时:
      - `answer`: 用户回答
      - `isCorrect`: 是否正确
      - `deviceInfo`: 设备信息（可选）
    - 当 `type` 为 `view` 时:
      - `deviceInfo`: 设备信息（可选）
      - `viewDuration`: 查看时长（可选）
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "message": "更新成功"
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 6. 获取所有用户列表

- **URL**: `/api/user/list`
- **方法**: `GET`
- **描述**: 获取所有用户列表
- **请求参数**: 无
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": [
        {
          "openid": "用户openid",
          "nickName": "昵称",
          "avatarUrl": "头像URL",
          "createTime": "创建时间",
          "updateTime": "更新时间",
          "totalAnswered": 0,
          "totalCorrect": 0,
          "totalViewed": 0,
          "todayViewed": 0,
          "level": 1,
          "experience": 0,
          "points": 0,
          "signInCount": 0
        }
      ]
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 7. 用户签到

- **URL**: `/api/user/signin`
- **方法**: `POST`
- **描述**: 用户签到
- **请求参数**:
  - `openid`: 用户 openid
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "success": true,
        "message": "签到成功",
        "points": 10,
        "signInCount": 1,
        "levelUp": false,
        "level": 1,
        "levelTitle": "见习侦探",
        "experience": 20,
        "maxExperience": 1000
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

### 8. 删除用户

- **URL**: `/api/user/delete`
- **方法**: `POST`
- **描述**: 删除用户
- **请求参数**:
  - `openid`: 用户 openid
- **响应**:
  - 成功:
    ```json
    {
      "success": true,
      "data": {
        "message": "删除成功"
      }
    }
    ```
  - 失败:
    ```json
    {
      "success": false,
      "error": "错误信息"
    }
    ```

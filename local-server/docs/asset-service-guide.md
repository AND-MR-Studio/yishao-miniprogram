# 资源管理服务使用指南

## 简介

资源管理服务是一个简单的工具，用于管理小程序中使用的各种资源，如图标、横幅、图片和字体等。该服务提供了一个直观的Web界面，允许管理员上传、编辑和删除资源，无需编写代码即可管理小程序的静态资源。

## 功能特点

- **简单易用**：直观的Web界面，无需技术背景即可操作
- **资源分类**：支持图标、横幅、图片和字体等多种资源类型
- **资源过滤**：可按类型快速筛选资源
- **预览功能**：上传和编辑时可预览资源效果
- **轻量级**：专为管理少量资源（二三十个）设计，避免过度复杂

## 访问资源管理页面

资源管理页面位于：`http://your-server-address/html/asset.html`

> 注意：该页面不需要登录验证，因为假定所有能够访问该页面的用户都是管理员。

## 使用方法

### 查看资源

1. 访问资源管理页面
2. 页面将显示所有已上传的资源，包括预览图、名称、类型和描述
3. 使用顶部的类型过滤按钮（全部、图标、横幅、图片、字体）可以快速筛选特定类型的资源

### 上传新资源

1. 点击页面右上角的"上传资源"按钮
2. 在弹出的模态框中填写以下信息：
   - 资源名称（必填）
   - 资源类型（图标、横幅、图片或字体）
   - 选择要上传的文件
   - 资源描述（可选）
   - 如果选择了"横幅"类型，还需选择页面位置（首页、我的、煮汤）
3. 点击"上传"按钮完成上传

### 编辑资源

1. 在资源卡片上点击"编辑"按钮
2. 在弹出的模态框中可以修改：
   - 资源名称
   - 资源描述
   - 如果是横幅类型，还可以修改页面位置
3. 点击"保存"按钮保存更改

### 删除资源

1. 在资源卡片上点击"删除"按钮
2. 确认删除操作
3. 资源将被永久删除（包括服务器上的文件）

## API接口说明

资源管理服务提供了以下RESTful API接口，可用于程序化管理资源：

### 获取资源列表

```
GET /api/agent/api/system/assets
```

查询参数：
- `type`: 资源类型（icon, banner, image, font）
- `page`: 页码，默认为1
- `pageSize`: 每页数量，默认为20
- `keyword`: 搜索关键词
- `sortBy`: 排序字段，默认为createTime
- `sortOrder`: 排序方向（asc, desc），默认为desc
- `status`: 资源状态，默认为active

### 获取单个资源

```
GET /api/agent/api/system/assets/:id
```

### 获取指定页面的横幅

```
GET /api/agent/api/system/banner?page=页面名称
```

页面名称可以是：index（首页）、mine（我的）、gensoup（煮汤）

### 获取指定类型的图标

```
GET /api/agent/api/system/icons?category=分类名称
```

### 上传资源

```
POST /api/agent/api/system/assets
```

使用`multipart/form-data`格式提交以下字段：
- `file`: 文件数据
- `name`: 资源名称
- `type`: 资源类型（icon, banner, image, font）
- `description`: 资源描述（可选）
- `page`: 页面名称（仅当type=banner时需要）

### 更新资源

```
PUT /api/agent/api/system/assets/:id
```

请求体（JSON格式）：
```json
{
  "name": "资源名称",
  "description": "资源描述",
  "page": "页面名称（仅当资源类型为banner时）"
}
```

### 删除资源

```
DELETE /api/agent/api/system/assets/:id
```

### 批量更新资源排序

```
PUT /api/agent/api/system/assets/order
```

请求体（JSON格式）：
```json
{
  "items": [
    {"id": "资源ID1", "sortOrder": 1},
    {"id": "资源ID2", "sortOrder": 2},
    ...
  ]
}
```

## 文件存储结构

上传的资源文件存储在以下目录结构中：

```
local-server/html/uploads/
  ├── icons/      # 图标文件
  ├── banners/    # 横幅图片
  ├── images/     # 普通图片
  ├── fonts/      # 字体文件
  └── others/     # 其他类型资源
```

资源元数据存储在 `local-server/data/assets.json` 文件中。

## 注意事项

1. 资源管理页面不包含身份验证，请确保该页面只对管理员开放
2. 上传文件大小限制为10MB
3. 支持的图片格式：JPG、PNG、GIF、SVG等常见图片格式
4. 支持的字体格式：TTF、OTF、WOFF、WOFF2等
5. 删除资源操作不可撤销，请谨慎操作
6. 该服务设计用于管理少量资源（二三十个），不建议用于管理大量资源

## 故障排除

如果遇到问题，请检查：

1. 服务器日志中的错误信息
2. 确保uploads目录及其子目录存在且有写入权限
3. 确保data目录存在且有写入权限
4. 检查assets.json文件是否存在且格式正确

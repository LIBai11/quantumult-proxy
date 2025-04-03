# Quantumult X 代理服务器

一个用于Quantumult X的HTTP代理服务器，用于捕获和修改HTTP请求和响应。

## 功能特性

- 捕获Quantumult X的请求和响应
- 支持请求和响应修改
- 使用JSON Server作为轻量级数据库存储捕获的数据
- 简单易用的API接口

## 安装

```bash
git clone https://github.com/yourusername/quantumult-proxy.git
cd quantumult-proxy
npm install
```

## 使用方法

### 启动服务器

```bash
npm start
```

服务器将在两个端口上启动：
- 主服务: 默认端口3000 (可通过环境变量PORT修改)
- JSON Server数据库: 端口3001

### API接口

- `POST /api/capture/request`: 捕获请求
- `POST /api/capture/response`: 捕获响应
- `POST /api/capture/response/modify`: 修改响应

### 数据库访问

访问JSON Server API来查询捕获的请求和响应：

- `GET http://localhost:3001/api/requests`: 获取所有捕获的请求
- `GET http://localhost:3001/api/responses`: 获取所有捕获的响应
- `GET http://localhost:3001/api/modified_responses`: 获取所有修改过的响应

## 配置

可通过`.env`文件或环境变量配置：

```
PORT=3000
LOG_LEVEL=debug
BODY_LIMIT=10mb
RETENTION_DAYS=7
```

## 开发

### 目录结构

```
/
├── src/
│   ├── controllers/    # 控制器
│   ├── models/         # 数据模型
│   ├── routes/         # 路由
│   ├── utils/          # 工具函数
│   ├── config/         # 配置
│   ├── middleware/     # 中间件
│   ├── app.js          # Express应用
│   └── index.js        # 应用入口
├── db.json             # 数据库文件
├── .env                # 环境变量
└── package.json        # 项目配置
```

## 许可证

MIT 

## 数据库存储

项目使用轻量级JSON文件数据库存储数据，优化了数据库结构：

- 采用分散式存储，将不同类型的数据存储到独立的文件中
  - `db/requests.json` - 存储捕获的请求
  - `db/responses.json` - 存储捕获的响应 
  - `db/modified_responses.json` - 存储修改后的响应

这种分离存储的方式可以提高性能，特别是当数据量较大时。

### 数据库API

通过以下API可以访问存储的数据：

#### 内部API (主应用)

- `GET /admin/requests` - 获取所有捕获的请求
- `GET /admin/requests/:id` - 获取指定ID的请求
- `GET /admin/responses` - 获取所有捕获的响应
- `GET /admin/responses/:requestId` - 获取指定请求ID的响应
- `GET /admin/modified-responses` - 获取所有修改后的响应
- `GET /admin/status` - 获取数据库状态信息

#### JSON Server API (数据库服务)

- `GET http://localhost:3001/api/requests` - 获取所有捕获的请求
- `GET http://localhost:3001/api/requests/:id` - 获取指定ID的请求
- `GET http://localhost:3001/api/responses` - 获取所有捕获的响应
- `GET http://localhost:3001/api/responses/:requestId` - 获取指定请求ID的响应
- `GET http://localhost:3001/api/modified_responses` - 获取所有修改后的响应

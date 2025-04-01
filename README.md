# Quantumult X HTTP Backend 请求捕获服务器

[![Docker镜像构建](https://github.com/你的用户名/quantumult-proxy/actions/workflows/docker-image.yml/badge.svg)](https://github.com/你的用户名/quantumult-proxy/actions/workflows/docker-image.yml)
[![构建并部署](https://github.com/你的用户名/quantumult-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/你的用户名/quantumult-proxy/actions/workflows/ci.yml)

这是一个简单的服务器，用于捕获所有发送到它的 HTTP 请求并将它们保存到文件中。特别适合用于 Quantumult X HTTP Backend 请求的调试和分析。

## 功能特性

- 捕获所有 HTTP 方法的请求（GET, POST, PUT, DELETE 等）
- 保存完整的请求信息（包括头部、查询参数、请求体等）
- 为每个请求生成唯一 ID
- 支持查看请求统计信息
- 健康检查端点
- **新增：通过重写（rewrite）功能捕获所有请求和响应数据**

## 安装

```bash
# 克隆仓库
git clone https://github.com/你的用户名/quantumult-proxy.git
cd quantumult-proxy

# 安装依赖
npm install
```

## 使用方法

### 启动服务器

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

默认情况下，服务器将在端口 3000 上运行。可以通过设置环境变量 `PORT` 来更改端口。

### 查看请求统计

访问 `/stats` 端点可以查看请求统计信息：

```
http://localhost:3000/stats
```

### 在 Quantumult X 中使用

#### HTTP Backend 方式（仅捕获请求）

1. 在 Quantumult X 的配置文件中添加以下内容：

```
[http_backend]
https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/example-script.js, tag=请求捕获, path=^/api/, enabled=true
```

2. 在 JavaScript 脚本中将请求发送到捕获服务器：

```javascript
// 示例：在 Quantumult X HTTP Backend 脚本中使用捕获服务器
const captureServerUrl = 'http://your-server:3000';

// 发送请求
$httpClient.get({
  url: captureServerUrl + '/any/path',
  headers: {
    // 你的请求头
  }
}, (error, response, data) => {
  // 处理响应
});
```

#### 重写方式（同时捕获请求和响应）

1. 在 Quantumult X 的配置文件中添加以下内容：

```
[rewrite_local]
^http(s?)://.* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
^http(s?)://.* url script-response-body https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
```

2. 详细使用说明请参考 [重写捕获功能使用指南](./examples/rewrite-usage-guide.md)

## 保存的请求格式

每个请求将被保存为 JSON 文件，包含以下信息：

```json
{
  "id": "1620000000000-abcdef123456",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "method": "GET",
  "url": "/api/data",
  "path": "/api/data",
  "params": {},
  "query": { "param1": "value1" },
  "headers": { "user-agent": "...", ... },
  "body": { ... },
  "ip": "127.0.0.1",
  "originalUrl": "/api/data?param1=value1"
}
```

重写捕获的响应数据格式：

```json
{
  "request_id": "req_1620000000000_abcdef123456",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "url": "https://example.com/api/data",
  "status": 200,
  "headers": { "content-type": "application/json", ... },
  "body": { ... },
  "body_size": 1024
}
```

## 配置项

可以通过环境变量或 `.env` 文件配置以下选项：

- `PORT`: 服务器端口（默认：3000）
- `LOG_LEVEL`: 日志级别（默认：info）
- `BODY_LIMIT`: 请求体大小限制（默认：10mb）

## 部署

### 使用 Docker

```bash
# 从GitHub容器仓库拉取
docker pull ghcr.io/你的用户名/quantumult-proxy:latest

# 运行容器
docker run -d -p 3000:3000 -v ./requests:/app/requests --name quantumult-proxy ghcr.io/你的用户名/quantumult-proxy:latest
```

### 本地构建并运行

```bash
# 构建 Docker 镜像
docker build -t quantumult-proxy .

# 运行容器
docker run -d -p 3000:3000 --name quantumult-proxy quantumult-proxy
```

### 使用 Railway

1. Fork 这个仓库到你的 GitHub 账号
2. 访问 https://railway.app/
3. 选择 "Deploy from GitHub repo"
4. 选择你 fork 的仓库
5. Railway 会自动部署应用

### 使用 Heroku

```bash
# 安装 Heroku CLI
brew install heroku/brew/heroku

# 登录 Heroku
heroku login

# 创建 Heroku 应用
heroku create quantumult-proxy

# 推送代码到 Heroku
git push heroku main
``` 
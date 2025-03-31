# Quantumult X HTTP Backend 请求捕获服务器

这是一个简单的服务器，用于捕获所有发送到它的 HTTP 请求并将它们保存到文件中。特别适合用于 Quantumult X HTTP Backend 请求的调试和分析。

## 功能特性

- 捕获所有 HTTP 方法的请求（GET, POST, PUT, DELETE 等）
- 保存完整的请求信息（包括头部、查询参数、请求体等）
- 为每个请求生成唯一 ID
- 支持查看请求统计信息
- 健康检查端点

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

1. 在 Quantumult X 的配置文件中添加以下内容：

```
[http_backend]
https://raw.githubusercontent.com/your-repo/your-script.js, tag=Your Script, path=^/your-path/, enabled=true
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

## 配置项

可以通过环境变量或 `.env` 文件配置以下选项：

- `PORT`: 服务器端口（默认：3000）
- `LOG_LEVEL`: 日志级别（默认：info）
- `BODY_LIMIT`: 请求体大小限制（默认：10mb）

## 部署

### 使用 Docker

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
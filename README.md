# Quantumult X HTTP Backend 代理服务器

这是一个用于代理 Quantumult X HTTP Backend 请求的服务器。它可以将请求转发到指定的目标 URL，并返回响应结果。

## 功能特性

- 支持所有 HTTP 方法（GET, POST, PUT, DELETE 等）
- 自动转发请求头和请求体
- 完整的日志记录
- 支持通过查询参数或请求头指定目标 URL
- 可配置的超时和重定向设置
- 健康检查端点

## 安装

```bash
# 克隆仓库
git clone <repository-url>
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

### 发送请求

有两种方式指定目标 URL：

1. 通过查询参数：

```
http://localhost:3000/?url=https://example.com/api/data
```

2. 通过请求头：

```
X-Target-URL: https://example.com/api/data
```

### 在 Quantumult X 中使用

1. 在 Quantumult X 的配置文件中添加以下内容：

```
[http_backend]
https://raw.githubusercontent.com/your-repo/your-script.js, tag=Your Script, path=^/your-path/, enabled=true
```

2. 在 JavaScript 脚本中使用代理服务器：

```javascript
// 示例：在 Quantumult X HTTP Backend 脚本中使用代理
const proxyUrl = 'http://your-proxy-server:3000';
const targetUrl = 'https://example.com/api/data';

// 发送请求
$httpClient.get({
  url: `${proxyUrl}/?url=${encodeURIComponent(targetUrl)}`,
  headers: {
    // 你的请求头
  }
}, (error, response, data) => {
  // 处理响应
});
```

## 配置项

可以通过修改 `src/index.js` 文件来调整以下配置：

- 超时时间（默认：30000 毫秒）
- 最大重定向次数（默认：5）
- 请求体大小限制（默认：10MB）

## 日志

日志将同时输出到控制台和 `proxy.log` 文件中，记录每个请求的方法、URL、状态码和响应时间。 
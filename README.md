# Quantumult X HTTP Backend 请求捕获服务器

这是一个简单的服务器，用于捕获所有发送到它的 HTTP 请求并将它们保存到文件中。特别适合用于 Quantumult X HTTP Backend 请求的调试和分析。

## 功能特性

- 捕获所有 HTTP 方法的请求（GET, POST, PUT, DELETE 等）
- 保存完整的请求信息（包括头部、查询参数、请求体等）
- 通过重写（rewrite）功能捕获所有请求和响应数据

## 安装

```bash
# 克隆仓库
git clone https://github.com/LIBai11/quantumult-proxy.git
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

### 在 Quantumult X 中使用

#### 重写方式（同时捕获请求和响应）

1. 在 Quantumult X 的配置文件中添加以下内容：

```
[rewrite_local]
^http(s?)://.* url script-request-header https://raw.githubusercontent.com/LIBai11/quantumult-proxy/main/examples/rewrite-capture.js
^http(s?)://.* url script-response-body https://raw.githubusercontent.com/LIBai11/quantumult-proxy/main/examples/rewrite-capture.js
```

2. 详细使用说明请参考 [重写捕获功能使用指南](./examples/rewrite-usage-guide.md)

## 保存的请求格式

每个请求将被保存为 JSON 文件，包含以下信息：

```json
{
  "id": "20230101_120000_001",
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
  "request_id": "req_20230101_120000_001",
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
- `LOG_LEVEL`: 日志级别（默认：debug）
- `BODY_LIMIT`: 请求体大小限制（默认：10mb）
- `RETENTION_DAYS`: 请求保留天数（默认：7）

## 贡献

欢迎提交问题报告和改进建议！如果你想贡献代码，请：

1. Fork 这个仓库
2. 创建一个新的分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的改动 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开一个 Pull Request

## 许可证

该项目基于 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件 

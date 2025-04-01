# Quantumult X 请求捕获实例 - 捕获百度API请求

本文档演示如何使用重写功能来捕获外部网站（如百度）的API请求和响应。

## 前提条件

1. 已安装并配置 Quantumult X
2. 已部署捕获服务器（本地或远程）
3. 已下载 `rewrite-capture.js` 脚本

## 实例目标

捕获发送到 `https://baidu.com/api/get` 的请求及其响应数据。

## 步骤一：配置重写规则

打开 Quantumult X，编辑配置文件，添加以下规则：

### 捕获所有百度API请求

```
[rewrite_local]
# 捕获百度API请求
^https?:\/\/baidu\.com\/api\/.* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
^https?:\/\/baidu\.com\/api\/.* url script-response-body https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js

[mitm]
hostname = baidu.com
```

### 捕获所有请求（谨慎使用）

如果你想捕获所有HTTP请求，可以使用：

```
[rewrite_local]
# 捕获所有HTTP请求（谨慎使用，可能影响性能）
^http(s?)://.* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
^http(s?)://.* url script-response-body https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js

[mitm]
hostname = *
```

**注意**：捕获所有请求会显著增加网络延迟并消耗更多资源。建议只在必要时使用，并尽快关闭。

## 步骤二：修改捕获服务器地址

1. 复制 `rewrite-capture.js` 到你的设备上
2. 修改脚本中的 `captureServerUrl` 变量：

```javascript
const captureServerUrl = 'http://你的服务器地址:3000';
```

如果使用本地服务器：
```javascript
const captureServerUrl = 'http://192.168.1.100:3000';
```

## 步骤三：配置MITM（中间人攻击）

Quantumult X 需要 MITM 功能才能捕获 HTTPS 请求。请确保：

1. 已在设备上安装并信任 Quantumult X 的 CA 证书
2. 在配置中启用了 MITM 功能
3. 正确配置了 `hostname` 参数

## 步骤四：测试捕获

1. 启动你的捕获服务器
2. 在 Quantumult X 中启用配置的重写规则
3. 使用手机浏览器或应用访问 `https://baidu.com/api/get`
4. 查看捕获服务器日志确认请求被捕获

## 实际案例演示

### 场景：捕获百度搜索API请求

1. 配置重写规则捕获 baidu.com 的请求
2. 在手机浏览器中访问 `https://www.baidu.com/s?wd=quantumult`
3. 捕获服务器将记录：
   - 请求头部（包含搜索关键词）
   - 请求方法（GET）
   - 响应状态码
   - 响应头部
   - 响应体（HTML或JSON）

### 查看捕获结果

捕获的请求和响应会以JSON格式保存在服务器的 `requests` 目录中：

**请求文件** (`req_1234567890_abc123_req.json`):
```json
{
  "id": "req_1234567890_abc123",
  "timestamp": "2023-04-01T10:15:30.000Z",
  "method": "GET",
  "url": "https://www.baidu.com/s?wd=quantumult",
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "Accept": "text/html,application/xhtml+xml...",
    ...
  },
  "body": null
}
```

**响应文件** (`req_1234567890_abc123_res.json`):
```json
{
  "request_id": "req_1234567890_abc123",
  "timestamp": "2023-04-01T10:15:30.500Z",
  "url": "https://www.baidu.com/s?wd=quantumult",
  "status": 200,
  "headers": {
    "Content-Type": "text/html;charset=utf-8",
    "Server": "BWS/1.1",
    ...
  },
  "body": "<!DOCTYPE html>...",
  "body_size": 123456
}
```

## 常见问题

### 1. HTTPS请求未被捕获

请确认：
- MITM功能已正确配置
- CA证书已安装并信任
- 目标域名已添加到 `hostname` 参数中

### 2. 请求被捕获但响应为空

可能原因：
- 响应体太大（超过限制）
- 响应格式不被支持
- 请求被重定向

### 3. 影响网络性能

捕获请求会对性能有一定影响，尤其是捕获所有请求时。如果遇到性能问题：
- 限制只捕获特定域名或路径
- 调低日志级别（设置 `debugMode = false`）
- 完成调试后立即禁用重写规则

## 安全注意事项

1. 请勿在处理敏感信息时开启捕获功能
2. 捕获的数据可能包含隐私信息，注意保管
3. 使用后及时关闭捕获功能 
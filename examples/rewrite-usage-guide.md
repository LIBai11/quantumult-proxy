# Quantumult X 重写请求捕获使用指南

本指南将帮助你设置和使用 Quantumult X 的重写功能来捕获所有请求和响应信息。

## 一、功能概述

此功能允许你：

- 捕获任何 HTTP/HTTPS 请求的详细信息
- 捕获对应的响应数据
- 将请求和响应信息发送到捕获服务器进行分析和保存
- 不影响原始请求的正常处理

## 二、配置步骤

### 1. 准备捕获服务器

确保你的捕获服务器已经运行，你可以通过以下任一方式设置服务器：

- 本地运行: `npm start` 或 `npm run dev`
- Docker: `docker-compose up -d`
- 远程服务器: 使用 Ngrok 或类似服务进行转发

### 2. 修改重写脚本

1. 打开 `examples/rewrite-capture.js` 文件
2. 修改 `captureServerUrl` 变量为你的捕获服务器地址：

```javascript
const captureServerUrl = 'http://你的服务器地址:3000';
```

如果你使用 Ngrok：

```javascript
const captureServerUrl = 'https://你的ngrok地址.ngrok-free.app';
```

### 3. 配置 Quantumult X

将以下内容添加到你的 Quantumult X 配置文件中：

```
[rewrite_local]
# 捕获所有请求头和响应体
^http(s?)://.* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
^http(s?)://.* url script-response-body https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
```

如果你想限制只捕获特定域名或路径的请求：

```
# 只捕获 example.com 的请求
^http(s?)://.*\.example\.com/.* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
^http(s?)://.*\.example\.com/.* url script-response-body https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
```

### 4. 激活配置

1. 在 Quantumult X 中保存配置
2. 重启 Quantumult X

## 三、查看捕获结果

### 1. 服务器端

捕获的请求和响应会保存在 `requests` 目录下，文件命名格式：

- 请求：`[请求ID]_req.json`
- 响应：`[请求ID]_res.json`

你可以查看服务器日志了解更多信息：

```bash
tail -f logs/proxy.log
```

### 2. 查看统计信息

访问捕获服务器的统计端点：

```
http://你的服务器地址:3000/stats
```

### 3. 查看特定请求

如果你知道请求ID，可以直接查看：

```
http://你的服务器地址:3000/request/[请求ID]
```

## 四、调试

### 1. 检查日志

Quantumult X 内的日志可以通过以下方式查看：

1. 在脚本内部设置 `debugMode = true`
2. 在 Quantumult X 中，点击右下角 "日志" 按钮

### 2. 持久化日志

重写脚本会将日志保存到持久化存储，可以通过以下方式查看：

```javascript
$persistentStore.read('rewrite_capture_log')
```

### 3. 查看 BoxJS 中的日志

如果你使用 BoxJS，可以添加捕获脚本到 BoxJS 中查看日志。

## 五、常见问题

### 1. 请求未被捕获

可能的原因：
- 确保配置中的脚本URL正确
- 检查是否启用了MitM（中间人攻击）功能
- 确认捕获服务器地址是否正确

### 2. 响应捕获为空

可能的原因：
- 请求被阻止或重定向
- 响应体太大
- 响应格式不支持（如二进制数据）

### 3. 性能问题

如果发现手机性能下降：
- 限制只捕获特定网站或API的请求
- 暂时禁用重写规则
- 减少同时开启的其他规则

## 六、进阶用法

### 1. 筛选特定类型的请求

如果你只想捕获某些类型的请求，可以修改重写规则：

```
# 只捕获 JSON API 请求
^http(s?)://.*\.(json|api).* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
```

### 2. 自定义处理逻辑

你可以修改 `rewrite-capture.js` 脚本来实现自定义逻辑，例如：
- 过滤敏感信息
- 只捕获特定内容类型
- 将捕获数据发送到其他服务器

## 七、安全注意事项

1. 请不要在生产环境或处理敏感信息时使用此功能
2. 捕获的数据可能包含敏感信息，确保妥善保管
3. 在共享捕获数据之前，请移除所有敏感信息（如认证令牌、密码等） 
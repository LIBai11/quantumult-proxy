# Quantumult X HTTP Backend 配置问题排查指南

如果你在配置和使用 Quantumult X HTTP Backend 时遇到了问题，例如脚本未生效或请求未被捕获，可以按照以下步骤进行排查。

## 一、检查基本配置

### 1. 确认 HTTP Backend 已正确配置

在 Quantumult X 配置文件中，确保有类似以下配置：

```
[http_backend]
https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/example-script.js, tag=请求捕获脚本, path=^/api/, enabled=true
```

重要参数解释：
- `path`: 匹配要捕获的路径，必须以 `/` 开头
- `enabled`: 必须设置为 `true`

### 2. 检查脚本是否能被访问到

在浏览器中直接访问脚本URL，确保能够正常获取脚本内容。

### 3. 重启 Quantumult X

配置更改后，需要完全重启 Quantumult X 应用（从后台彻底关闭后重新打开）。

## 二、测试脚本是否正常工作

### 1. 自测脚本

在 Quantumult X 中，进入"工具"选项卡，找到"HTTP Backend"部分，确认你的脚本已列出并显示"运行中"状态。

点击脚本URL查看脚本初始化响应，应该看到类似以下内容：

```json
{
  "message": "请求捕获脚本已启动",
  "timestamp": "2023-01-01T12:34:56.789Z",
  "version": "1.0.1",
  "debug": true,
  "capture_url": "http://your-server:3000"
}
```

### 2. 发送测试请求

使用浏览器或API工具（如Postman）发送请求到：

```
http://你的设备IP:9999/api/test
```

其中`9999`是Quantumult X的HTTP Backend默认端口，`/api/test`是你在path参数中匹配的路径。

## 三、日志和调试

### 1. 检查请求日志

在我们的示例脚本中，已添加了详细的日志功能。查看日志方法：

1. 在Quantumult X中打开"工具"选项卡
2. 选择"配置文件"
3. 点击右上角"..."，选择"日志"
4. 查找与HTTP Backend相关的日志条目

### 2. 检查持久化日志

我们的脚本使用`$persistentStore`保存日志，可以在BoxJs中查看：

1. 在BoxJs中添加以下订阅：`https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/boxjs.json`
2. 找到"QX请求捕获调试"应用
3. 查看"调试日志"字段

或使用以下命令查看：

```javascript
$persistentStore.read("qx_debug_log")
```

### 3. 运行测试服务器

我们提供了一个简单的测试服务器，可以帮助确认HTTP Backend是否正常工作：

```bash
cd quantumult-proxy
node src/express-test-server.js
```

然后将示例脚本中的`CAPTURE_URL`改为测试服务器地址（如`http://你的电脑IP:3001`）。

## 四、常见问题和解决方案

### 1. 请求未被捕获

可能的原因：
- 路径匹配不正确：确保HTTP Backend的`path`参数正确匹配你的请求路径
- 脚本未激活：检查HTTP Backend状态是否为"运行中"
- 端口被占用：默认端口9999被其他程序占用

### 2. 网络连接问题

可能的原因：
- 防火墙阻止：确保设备防火墙允许端口9999的通信
- 代理冲突：确保代理设置不会干扰HTTP Backend的通信
- 局域网隔离：确保发送请求的设备和运行Quantumult X的设备在同一网络

### 3. 无法连接到捕获服务器

可能的原因：
- 服务器地址错误：检查`CAPTURE_URL`是否配置正确
- 服务器未运行：确保捕获服务器正在运行
- 网络限制：检查设备是否能访问捕获服务器（可以用浏览器测试）

## 五、高级调试方法

### 1. 查看网络请求

使用Charles或Proxyman等工具抓包，监控Quantumult X发出的请求。

### 2. 修改测试脚本

创建一个更简单的测试脚本，例如：

```javascript
// 简单测试脚本
$done({
  response: {
    body: JSON.stringify({
      message: "测试脚本响应",
      time: new Date().toISOString()
    })
  }
});
```

### 3. 手动构造请求

使用curl命令直接发送请求：

```bash
curl -v "http://你的设备IP:9999/api/test"
```

## 六、联系支持

如果以上方法都无法解决问题，请提供以下信息联系支持：

1. Quantumult X版本号
2. 设备系统版本
3. 完整的配置（可隐去敏感信息）
4. 错误日志
5. 问题的详细描述

通过GitHub Issues提交问题：https://github.com/你的用户名/quantumult-proxy/issues 
// Quantumult X HTTP Backend 示例脚本
// 用于演示如何使用请求捕获服务器进行请求捕获和调试

// 捕获服务器地址（替换为你的实际地址）
const CAPTURE_URL = 'http://your-server:3000';

// 处理 GET 请求
function handleGetRequest(request) {
  // 发送请求到捕获服务器
  $httpClient.get({
    url: `${CAPTURE_URL}/api/captured/get`,
    headers: {
      // 添加原始请求的信息作为自定义头部，便于查看
      'X-Original-URL': request.url,
      'X-Request-Type': 'GET',
      ...request.headers  // 使用原始请求的头部
    }
  }, (error, response, data) => {
    if (error) {
      // 处理错误
      $done({
        response: {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: error.message })
        }
      });
      return;
    }
    
    // 解析响应
    let responseData;
    try {
      responseData = JSON.parse(data);
    } catch (e) {
      responseData = { error: "解析响应数据失败" };
    }
    
    // 返回捕获结果
    $done({
      response: {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "请求已被捕获",
          request_id: responseData.request_id || "未知",
          capture_server: CAPTURE_URL
        })
      }
    });
  });
}

// 处理 POST 请求
function handlePostRequest(request) {
  // 将原始请求体转发到捕获服务器
  $httpClient.post({
    url: `${CAPTURE_URL}/api/captured/post`,
    headers: {
      'X-Original-URL': request.url,
      'X-Request-Type': 'POST',
      ...request.headers
    },
    body: request.body  // 转发原始请求体
  }, (error, response, data) => {
    if (error) {
      // 处理错误
      $done({
        response: {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: error.message })
        }
      });
      return;
    }
    
    // 解析响应
    let responseData;
    try {
      responseData = JSON.parse(data);
    } catch (e) {
      responseData = { error: "解析响应数据失败" };
    }
    
    // 返回捕获结果
    $done({
      response: {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "POST请求已被捕获",
          request_id: responseData.request_id || "未知",
          capture_server: CAPTURE_URL
        })
      }
    });
  });
}

// 主入口点 - 路由请求
function onRequest(request) {
  const urlPath = new URL(request.url).pathname;
  
  // 根据路径路由请求
  if (request.method === 'GET') {
    handleGetRequest(request);
  } else if (request.method === 'POST') {
    handlePostRequest(request);
  } else {
    // 处理其他类型的请求
    $httpClient.request(request.method, {
      url: `${CAPTURE_URL}/api/captured/other`,
      headers: {
        'X-Original-URL': request.url,
        'X-Request-Type': request.method,
        ...request.headers
      },
      body: request.body
    }, (error, response, data) => {
      // 返回捕获结果
      $done({
        response: {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `${request.method}请求已被捕获`,
            capture_server: CAPTURE_URL
          })
        }
      });
    });
  }
}

// QuantumultX HTTP Backend 入口点
// 配置示例：https://raw.githubusercontent.com/your-repo/example-script.js, tag=请求捕获脚本, path=^/api/, enabled=true
$done({ response: { body: JSON.stringify({ message: "请求捕获脚本已启动" }) } }); 
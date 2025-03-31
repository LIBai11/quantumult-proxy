// Quantumult X HTTP Backend 示例脚本
// 用于演示如何通过代理服务器转发请求

// 代理服务器地址（替换为你的实际地址）
const PROXY_URL = 'http://your-proxy-server:3000';

// 处理 GET 请求
function handleGetRequest(request) {
  const targetUrl = "https://api.example.com/data";
  const proxyUrl = `${PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;
  
  // 转发请求到代理服务器
  $httpClient.get({
    url: proxyUrl,
    headers: request.headers  // 使用原始请求的头部
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
    
    // 返回响应
    $done({
      response: {
        status: response.status,
        headers: response.headers,
        body: data
      }
    });
  });
}

// 处理 POST 请求
function handlePostRequest(request) {
  const targetUrl = "https://api.example.com/data";
  const proxyUrl = `${PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;
  
  // 转发请求到代理服务器
  $httpClient.post({
    url: proxyUrl,
    headers: request.headers,
    body: request.body
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
    
    // 返回响应
    $done({
      response: {
        status: response.status,
        headers: response.headers,
        body: data
      }
    });
  });
}

// 处理动态目标 URL 的请求
function handleDynamicRequest(request) {
  // 从请求URL参数中获取目标URL
  const urlParams = new URL(request.url);
  const targetUrl = urlParams.searchParams.get('target');
  
  if (!targetUrl) {
    $done({
      response: {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "缺少目标URL参数" })
      }
    });
    return;
  }
  
  const proxyUrl = `${PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;
  
  // 转发请求到代理服务器
  $httpClient.get({
    url: proxyUrl,
    headers: request.headers
  }, (error, response, data) => {
    if (error) {
      $done({
        response: {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: error.message })
        }
      });
      return;
    }
    
    $done({
      response: {
        status: response.status,
        headers: response.headers,
        body: data
      }
    });
  });
}

// 主入口点 - 路由请求
function onRequest(request) {
  const urlPath = new URL(request.url).pathname;
  
  // 根据路径路由请求
  if (urlPath.startsWith('/api/get')) {
    handleGetRequest(request);
  } else if (urlPath.startsWith('/api/post')) {
    handlePostRequest(request);
  } else if (urlPath.startsWith('/api/dynamic')) {
    handleDynamicRequest(request);
  } else {
    // 未知路径，返回 404
    $done({
      response: {
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "路径不存在" })
      }
    });
  }
}

// QuantumultX HTTP Backend 入口点
// 配置示例：https://raw.githubusercontent.com/your-repo/example-script.js, tag=示例脚本, path=^/api/, enabled=true
$done({ response: { body: JSON.stringify({ message: "脚本已启动" }) } }); 
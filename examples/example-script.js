// Quantumult X HTTP Backend 示例脚本
// 用于演示如何使用请求捕获服务器进行请求捕获和调试

// 捕获服务器地址（替换为你的实际地址）
const CAPTURE_URL = 'https://upward-gibbon-genuinely.ngrok-free.app';

// 调试函数，将信息写入日志
function debugLog(message, obj = null) {
  const logMsg = obj ? `${message}: ${JSON.stringify(obj)}` : message;
  console.log(logMsg);
  $persistentStore.write(new Date().toISOString() + " - " + logMsg + "\n", "qx_debug_log", true);
}

// 初始化时执行
function initialize() {
  debugLog("脚本初始化", {
    time: new Date().toISOString(),
    captureUrl: CAPTURE_URL,
    version: "1.0.1"
  });

  try {
    // 检查配置
    const deviceInfo = {
      network: $network.v4.primaryAddress || "未知",
      dns: $network.dns || "未知",
      ssid: $network.wifi?.ssid || "未知",
      proxy: typeof $environment !== 'undefined' ? "已启用" : "未启用"
    };
    
    debugLog("设备信息", deviceInfo);
    
    // 尝试连接捕获服务器
    testConnection();
  } catch (e) {
    debugLog("初始化错误", { error: e.message, stack: e.stack });
  }
}

// 测试与捕获服务器的连接
function testConnection() {
  const testUrl = `${CAPTURE_URL}/health`;
  debugLog(`测试连接捕获服务器: ${testUrl}`);
  
  $httpClient.get({
    url: testUrl,
    timeout: 5000
  }, (error, response, data) => {
    if (error) {
      debugLog("连接服务器失败", { error: error.message });
    } else {
      try {
        const responseData = JSON.parse(data);
        debugLog("连接服务器成功", { 
          status: response.status,
          responseData
        });
      } catch (e) {
        debugLog("解析响应失败", { error: e.message, data });
      }
    }
  });
}

// 处理 GET 请求
function handleGetRequest(request) {
  debugLog("收到GET请求", { 
    url: request.url,
    headers: request.headers
  });
  
  // 发送请求到捕获服务器
  const captureUrl = `${CAPTURE_URL}/api/captured/get`;
  debugLog(`发送请求到捕获服务器: ${captureUrl}`);
  
  $httpClient.get({
    url: captureUrl,
    headers: {
      // 添加原始请求的信息作为自定义头部，便于查看
      'X-Original-URL': request.url,
      'X-Request-Type': 'GET',
      'X-Debug-Info': 'true',
      ...request.headers  // 使用原始请求的头部
    }
  }, (error, response, data) => {
    if (error) {
      debugLog("发送到捕获服务器失败", { error: error.message });
      
      // 处理错误
      $done({
        response: {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            error: error.message,
            debug_info: "请检查捕获服务器是否正常运行"
          })
        }
      });
      return;
    }
    
    debugLog("捕获服务器响应", { 
      status: response.status,
      headers: response.headers,
      data
    });
    
    // 解析响应
    let responseData;
    try {
      responseData = JSON.parse(data);
      debugLog("解析响应成功", responseData);
    } catch (e) {
      debugLog("解析响应数据失败", { error: e.message, data });
      responseData = { error: "解析响应数据失败" };
    }
    
    // 返回捕获结果
    $done({
      response: {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-Powered-By": "Quantumult-Proxy",
          "X-Debug-Enabled": "true"
        },
        body: JSON.stringify({
          message: "请求已被捕获",
          request_id: responseData.request_id || "未知",
          capture_server: CAPTURE_URL,
          timestamp: new Date().toISOString(),
          debug_info: "如果能看到此信息，说明脚本正常工作"
        })
      }
    });
  });
}

// 处理 POST 请求
function handlePostRequest(request) {
  debugLog("收到POST请求", { 
    url: request.url,
    headers: request.headers,
    bodyLength: request.body ? request.body.length : 0
  });
  
  // 将原始请求体转发到捕获服务器
  const captureUrl = `${CAPTURE_URL}/api/captured/post`;
  debugLog(`发送请求到捕获服务器: ${captureUrl}`);
  
  $httpClient.post({
    url: captureUrl,
    headers: {
      'X-Original-URL': request.url,
      'X-Request-Type': 'POST',
      'X-Debug-Info': 'true',
      ...request.headers
    },
    body: request.body  // 转发原始请求体
  }, (error, response, data) => {
    if (error) {
      debugLog("发送到捕获服务器失败", { error: error.message });
      
      // 处理错误
      $done({
        response: {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            error: error.message,
            debug_info: "请检查捕获服务器是否正常运行"
          })
        }
      });
      return;
    }
    
    debugLog("捕获服务器响应", { 
      status: response.status,
      headers: response.headers,
      data
    });
    
    // 解析响应
    let responseData;
    try {
      responseData = JSON.parse(data);
      debugLog("解析响应成功", responseData);
    } catch (e) {
      debugLog("解析响应数据失败", { error: e.message, data });
      responseData = { error: "解析响应数据失败" };
    }
    
    // 返回捕获结果
    $done({
      response: {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-Powered-By": "Quantumult-Proxy",
          "X-Debug-Enabled": "true"
        },
        body: JSON.stringify({
          message: "POST请求已被捕获",
          request_id: responseData.request_id || "未知",
          capture_server: CAPTURE_URL,
          timestamp: new Date().toISOString(),
          debug_info: "如果能看到此信息，说明脚本正常工作"
        })
      }
    });
  });
}

// 主入口点 - 路由请求
function onRequest(request) {
  debugLog("onRequest函数被调用", { method: request.method, url: request.url });
  
  try {
    if (request.method === 'GET') {
      handleGetRequest(request);
    } else if (request.method === 'POST') {
      handlePostRequest(request);
    } else {
      // 处理其他类型的请求
      debugLog(`收到${request.method}请求`, { url: request.url });
      
      $httpClient.request(request.method, {
        url: `${CAPTURE_URL}/api/captured/other`,
        headers: {
          'X-Original-URL': request.url,
          'X-Request-Type': request.method,
          'X-Debug-Info': 'true',
          ...request.headers
        },
        body: request.body
      }, (error, response, data) => {
        debugLog(`${request.method}请求处理完成`, { 
          error: error ? error.message : null,
          responseStatus: response ? response.status : null
        });
        
        // 返回捕获结果
        $done({
          response: {
            status: 200,
            headers: { 
              "Content-Type": "application/json",
              "X-Powered-By": "Quantumult-Proxy",
              "X-Debug-Enabled": "true"
            },
            body: JSON.stringify({
              message: `${request.method}请求已被捕获`,
              capture_server: CAPTURE_URL,
              timestamp: new Date().toISOString(),
              debug_info: "如果能看到此信息，说明脚本正常工作"
            })
          }
        });
      });
    }
  } catch (e) {
    debugLog("处理请求时出错", { error: e.message, stack: e.stack });
    $done({
      response: {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "内部错误",
          message: e.message,
          timestamp: new Date().toISOString(),
          debug_info: "脚本执行异常，请检查日志"
        })
      }
    });
  }
}

// 调用初始化函数
initialize();

// QuantumultX HTTP Backend 入口点
// 配置示例：https://raw.githubusercontent.com/你的GitHub用户名/quantumult-proxy/main/examples/example-script.js, tag=请求捕获脚本, path=^/api/, enabled=true
$done({ 
  response: { 
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: "请求捕获脚本已启动",
      timestamp: new Date().toISOString(),
      version: "1.0.1",
      debug: true,
      capture_url: CAPTURE_URL
    }) 
  } 
}); 
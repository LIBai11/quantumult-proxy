/**
* @fileoverview Example to deploy a HTTP backend and capture incoming requests.
*
* [http_backend]
* https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-backend.js, tag=Backend Example, path=^/example/v1/
*
* You can visit through http://quantumult-x:9999/example/v1/ or http://127.0.0.1:9999/example/v1/ or http://localhost:9999/example/v1/
* You can also deploy a lot of different backends for your own usage, such as remote resource combination backend, task perferences manager backend, file converting backend ...
* The requests only will be sent to the related backends with the matching (regex) path.
* Further more you can use a signature or any other validation method to verify if the request is legitimate or not.
* Since the NE has the memory limitation, you should keep the backend as tiny as possible.
*
* @supported Quantumult X (v1.0.14-build358)
*/

// 需要捕获的请求信息
const captureServerUrl = 'https://upward-gibbon-genuinely.ngrok-free.app';

// 获取当前时间
function getCurrentTime() {
  return new Date().toISOString();
}

// 记录日志信息
function logRequestInfo(request) {
  console.log(`[${getCurrentTime()}] 请求路径: ${request.path}`);
  console.log(`[${getCurrentTime()}] 请求方法: ${request.method}`);
  console.log(`[${getCurrentTime()}] 请求头: ${JSON.stringify(request.headers)}`);
  console.log(`[${getCurrentTime()}] 请求体: ${request.body ? request.body : '无请求体'}`);
}

// 创建响应数据
function createResponse(request) {
  const responseBody = {
    success: true,
    message: "请求已成功捕获",
    timestamp: getCurrentTime(),
    path: request.path,
    method: request.method,
    capture_server: captureServerUrl,
  };

  return {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Connection": "Close",
    },
    body: JSON.stringify(responseBody),
  };
}

// HTTP Backend 入口点
if ($request) {
  try {
    // 捕获请求信息
    logRequestInfo($request);

    // 创建并返回响应
    const response = createResponse($request);
    $done(response);
  } catch (error) {
    console.log(`[ERROR] 处理请求失败: ${error.message}`);
    $done({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "处理请求失败",
        message: error.message,
        timestamp: getCurrentTime(),
      }),
    });
  }
} else {
  // 如果没有请求，返回一个简单的初始化响应
  $done({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "捕获脚本已启动，等待请求...",
      timestamp: getCurrentTime(),
      version: "1.0.0",
    }),
  });
}
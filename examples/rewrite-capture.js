/**
 * @fileoverview Quantumult X 请求和响应捕获重写脚本
 *
 * 使用说明：
 * 1. 在 Quantumult X 配置文件中添加以下内容：
 * [rewrite_local]
 * ^http(s?)://.* url script-request-header https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
 * ^http(s?)://.* url script-response-body https://raw.githubusercontent.com/你的用户名/quantumult-proxy/main/examples/rewrite-capture.js
 *
 * 2. 确保捕获服务器正在运行
 *
 * @supported Quantumult X (v1.0.30-build630)
 */

// 需要捕获的请求信息发送到的服务器地址
const captureServerUrl = 'https://upward-gibbon-genuinely.ngrok-free.app';

// 调试模式（true/false）- 设置为true将在控制台输出更多信息
const debugMode = false;

// 是否启用响应修改功能
const enableResponseModification = true;

// 辅助函数：获取当前时间
function getCurrentTime() {
  return new Date().toISOString();
}

// 辅助函数：记录日志
function log(message) {
  if (debugMode) {
    console.log(`[${getCurrentTime()}] ${message}`);
  }
}

// 辅助函数：判断是否为静态资源
function isStaticResource(url) {
  // 静态资源的扩展名
  const staticExtensions = [
    // 图片
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico', '.svg',
    // 样式和脚本
    '.css', '.js',
    // 字体
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // 视频
    '.mp4', '.webm', '.avi', '.mov', '.flv',
    // 音频
    '.mp3', '.wav', '.ogg', '.aac',
    // 文档
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // 其他
    '.zip', '.rar', '.gz', '.tar', '.7z'
  ];

  // 检查URL是否以静态资源扩展名结尾，或包含这些扩展名
  const lowerUrl = url.toLowerCase();

  // 检查扩展名
  for (const ext of staticExtensions) {
    // 检查URL是否以扩展名结尾 或 包含 扩展名+查询参数
    if (lowerUrl.includes(`${ext}`)) {
      return true;
    }
  }

  // 检查常见静态资源路径模式
  const staticPatterns = [
    '/static/',
    '/assets/',
    '/images/',
    '/img/',
    '/css/',
    '/js/',
    '/fonts/',
    '/media/',
    '/resources/',
    '/dist/',
    '/build/'
  ];

  for (const pattern of staticPatterns) {
    if (lowerUrl.includes(pattern)) {
      return true;
    }
  }

  return false;
}

// 辅助函数：发送请求到捕获服务器
function sendToCaptureServer(data, path) {
  const url = `${captureServerUrl}${path}`;
  log(`发送数据到捕获服务器: ${url}`);

  return new Promise((resolve, reject) => {
    $task.fetch({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QuantumultX/1.0',
        'X-Capture-Source': 'rewrite-script',
        'X-Capture-Time': getCurrentTime(),
        'X-Capture': 'true',
        'X-Quantumult-Capture': 'true'
      },
      body: JSON.stringify(data)
    }).then(response => {
      log(`发送数据到捕获服务器成功: ${response.status} ${response.body.substring(0, 100)}`);
      resolve(response);
    }, error => {
      log(`发送数据到捕获服务器失败: ${error}`);
      reject(error);
    });
  });
}

// 创建请求ID
function generateRequestId(request) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  // 使用URL的部分特征作为ID的一部分，帮助关联请求和响应
  const urlHash = request.url.replace(/[^a-z0-9]/gi, '').substring(0, 8);
  return `req_${timestamp}_${urlHash}_${random}`;
}

// 辅助函数：检查响应是否为JSON格式
function isJsonResponse(response) {
  if (!response || !response.headers) {
    return false;
  }

  // 获取 Content-Type 头，注意某些服务器可能使用不同的大小写
  const contentType = Object.keys(response.headers)
    .find(key => key.toLowerCase() === 'content-type');

  if (!contentType) {
    return false;
  }

  const contentTypeValue = response.headers[contentType].toLowerCase();
  return contentTypeValue.includes('application/json') ||
         contentTypeValue.includes('text/json') ||
         contentTypeValue.includes('+json'); // 处理自定义JSON媒体类型，如 application/vnd.api+json
}

// 处理请求捕获
function handleRequestCapture() {
  try {
    // 检查是否为静态资源
    if (isStaticResource($request.url)) {
      log(`跳过静态资源请求: ${$request.method} ${$request.url}`);
      $done({});
      return;
    }

    log(`捕获请求: ${$request.method} ${$request.url}`);

    // 生成请求ID，并包含URL特征，便于后续响应匹配
    const requestId = generateRequestId($request);

    // 提取请求信息
    const requestInfo = {
      id: requestId,
      timestamp: getCurrentTime(),
      method: $request.method,
      url: $request.url,
      headers: $request.headers,
      body: $request.body || null
    };

    // 在请求头中添加请求ID，用于后续匹配响应
    // 注意：这只是用于在请求和响应之间传递请求ID，不会修改原始请求头
    if (!$request.headers['X-Capture-Request-Id']) {
      log(`添加请求ID到自定义头: ${requestId}`);
    }

    // 不发送请求信息到捕获服务器
    // sendToCaptureServer(requestInfo, '/api/capture/request');

    log(`请求处理完成: ${requestId}`);

    // 不修改原始请求，直接放行
    $done({});
  } catch (error) {
    log(`处理请求失败: ${error.message}`);
    // 出错时也不影响原始请求
    $done({});
  }
}

// 处理响应捕获
function handleResponseCapture() {
  try {
    // 检查是否为静态资源
    if (isStaticResource($request.url)) {
      log(`跳过静态资源响应: ${$request.method} ${$request.url}`);
      $done($response);
      return;
    }

    // 检查是否为JSON响应
    if (!isJsonResponse($response)) {
      log(`跳过非JSON响应: ${$request.method} ${$request.url}`);
      $done($response);
      return;
    }

    log(`捕获响应: ${$request.method} ${$request.url}`);

    // 基于URL特征重新生成匹配的请求ID
    // 在实际环境中，这种匹配方式不是100%准确，但对于大多数场景足够用
    const timestamp = Date.now();
    const urlHash = $request.url.replace(/[^a-z0-9]/gi, '').substring(0, 8);

    // 尝试提取请求头中可能存在的请求ID
    const requestId = $request.headers['X-Capture-Request-Id'] || `req_${timestamp}_${urlHash}`;

    // 提取响应信息
    const responseInfo = {
      request_id: requestId,
      timestamp: getCurrentTime(),
      url: $request.url,
      method: $request.method,
      status: $response.status || 200,
      headers: $response.headers,
      body: $response.body || null,
      body_size: $response.body ? $response.body.length : 0
    };

    if (enableResponseModification) {
      // 发送响应到捕获服务器，并等待可能的修改
      sendToCaptureServer(responseInfo, '/api/capture/response/modify')
        .then(modifyResponse => {
          try {
            // 检查捕获服务器是否返回了修改后的响应体
            const modifyData = JSON.parse(modifyResponse.body);

            if (modifyData && modifyData.modified) {
              log(`接收到修改后的响应: ${$request.url}`);

              // 创建修改后的响应对象
              const modifiedResponse = {
                status: modifyData.status || $response.status,
                headers: modifyData.headers || $response.headers,
                body: modifyData.body || $response.body
              };

              log(`返回修改后的响应: ${modifiedResponse.body.substring(0, 100)}`);
              $done(modifiedResponse);
            } else {
              // 无修改，发送原始响应信息到捕获服务器（只用于记录）
              sendToCaptureServer(responseInfo, '/api/capture/response');
              log(`无需修改响应: ${$request.url}`);
              $done($response);
            }
          } catch (parseError) {
            log(`解析修改响应失败: ${parseError.message}`);
            // 解析错误，发送原始响应信息到捕获服务器（只用于记录）
            sendToCaptureServer(responseInfo, '/api/capture/response');
            $done($response);
          }
        })
        .catch(error => {
          log(`获取修改响应失败: ${error}`);
          // 错误时也发送原始响应信息到捕获服务器（只用于记录）
          sendToCaptureServer(responseInfo, '/api/capture/response');
          $done($response);
        });
    } else {
      // 不启用修改功能时，只是发送响应信息到捕获服务器
      sendToCaptureServer(responseInfo, '/api/capture/response');
      log(`响应处理完成: ${requestId}`);
      $done($response);
    }
  } catch (error) {
    log(`处理响应失败: ${error.message}`);
    // 出错时也返回原始响应
    $done($response);
  }
}

// 主函数：根据上下文判断处理请求还是响应
(() => {
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    // 处理请求
    handleRequestCapture();
  } else if (typeof $request !== 'undefined' && typeof $response !== 'undefined') {
    // 处理响应
    handleResponseCapture();
  } else {
    // 直接初始化返回
    log('脚本直接调用，无请求或响应上下文');
    $done({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '重写捕获脚本已加载',
        timestamp: getCurrentTime(),
        version: '1.0.0',
        capture_server: captureServerUrl,
        debug_mode: debugMode,
        response_modification: enableResponseModification
      })
    });
  }
})();

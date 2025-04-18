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

// 辅助函数：获取格式化的日期时间
function getFormattedDateTime() {
  const now = new Date();
  return now.toISOString();
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
      requestTime: getFormattedDateTime(),
      method: $request.method,
      url: $request.url,
      headers: $request.headers,
      body: $request.body || null
    };
    
    // 在请求头中添加请求ID，用于后续响应匹配
    // 注意：不创建新对象，直接修改原始请求头，确保一致性
    $request.headers['X-Capture-Request-Id'] = requestId;
    $request.headers['X-Capture-Request-Time'] = getFormattedDateTime();

    // 发送请求到捕获服务器并等待拦截判断
    sendToCaptureServer(requestInfo, '/api/capture/request')
      .then(response => {
        try {
          const result = JSON.parse(response.body);
          
          // 如果需要拦截请求
          if (result.intercepted) {
            log(`请求被拦截: ${requestId}`);
            
            // 如果有修改的请求头或请求体
            const modifiedRequest = {};
            
            if (result.headers) {
              modifiedRequest.headers = result.headers;
              // 确保修改后的请求仍然包含请求ID
              modifiedRequest.headers['X-Capture-Request-Id'] = requestId;
              modifiedRequest.headers['X-Capture-Request-Time'] = getFormattedDateTime();
            } else {
              // 使用添加了请求ID的请求头
              modifiedRequest.headers = $request.headers;
            }
            
            if (result.body) {
              modifiedRequest.body = result.body;
            }
            
            // 如果请求被拒绝（不允许发送到目标服务器）
            if (result.rejected) {
              log(`请求被拒绝: ${requestId}`);
              $done({
                response: {
                  status: result.status || 403,
                  headers: { 
                    'Content-Type': 'application/json',
                    'X-Capture-Request-Id': requestId,
                    'X-Capture-Request-Time': getFormattedDateTime()
                  },
                  body: JSON.stringify({
                    error: 'Request intercepted and rejected',
                    requestId: requestId
                  })
                }
              });
              return;
            }
            
            // 如果请求被修改，使用修改后的请求
            if (Object.keys(modifiedRequest).length > 0) {
              log(`使用修改后的请求: ${requestId}`);
              $done(modifiedRequest);
              return;
            }
          }
          
          // 请求未被拦截或无需修改，直接放行，但添加请求ID头
          log(`请求处理完成: ${requestId}`);
          $done({
            headers: $request.headers
          });
        } catch (parseError) {
          log(`解析拦截响应失败: ${parseError.message}`);
          // 即使解析失败，也添加请求ID头
          $done({
            headers: $request.headers
          });
        }
      })
      .catch(error => {
        log(`请求拦截服务调用失败: ${error}`);
        // 即使服务调用失败，也添加请求ID头
        $done({
          headers: $request.headers
        });
      });
  } catch (error) {
    log(`处理请求失败: ${error.message}`);
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

    // 尝试从请求头中获取请求ID
    const requestId = $request.headers['X-Capture-Request-Id'];
    
    // 如果无法获取请求ID，则生成一个基于URL的ID
    const fallbackId = (() => {
      const timestamp = Date.now();
      const urlHash = $request.url.replace(/[^a-z0-9]/gi, '').substring(0, 8);
      return `req_${timestamp}_${urlHash}`;
    })();
    
    const actualRequestId = requestId || fallbackId;
    
    // 获取请求时间和响应时间
    const requestTime = $request.headers['X-Capture-Request-Time'] || null;
    const responseTime = getFormattedDateTime();
    
    log(`响应关联到请求ID: ${actualRequestId}`);

    // 提取响应信息
    const responseInfo = {
      request_id: actualRequestId,
      timestamp: getCurrentTime(),
      url: $request.url,
      method: $request.method,
      status: $response.status || 200,
      headers: $response.headers,
      body: $response.body || null,
      body_size: $response.body ? $response.body.length : 0,
      requestTime: requestTime,
      responseTime: responseTime
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

              // 确保修改后的响应保留关联的请求ID和时间信息
              modifiedResponse.headers = modifiedResponse.headers || {};
              modifiedResponse.headers['X-Capture-Request-Id'] = actualRequestId;
              modifiedResponse.headers['X-Capture-Request-Time'] = requestTime;
              modifiedResponse.headers['X-Capture-Response-Time'] = responseTime;
              modifiedResponse.headers['X-Capture-Release-Type'] = modifyData.releaseType || 'auto';
              modifiedResponse.headers['X-Capture-Released-At'] = modifyData.releasedAt || responseTime;

              log(`返回修改后的响应: ${modifiedResponse.body.substring(0, 100)}`);
              $done(modifiedResponse);
            } else {
              // 无修改，发送原始响应信息到捕获服务器（只用于记录）
              sendToCaptureServer(responseInfo, '/api/capture/response')
                .then(() => {
                  log(`响应已记录并关联到请求ID: ${actualRequestId}`);
                })
                .catch(err => {
                  log(`记录响应出错: ${err.message}`);
                });
              
              // 添加请求ID和时间信息到响应头，方便后续跟踪
              const enhancedResponse = { ...$response };
              enhancedResponse.headers = enhancedResponse.headers || {};
              enhancedResponse.headers['X-Capture-Request-Id'] = actualRequestId;
              enhancedResponse.headers['X-Capture-Request-Time'] = requestTime;
              enhancedResponse.headers['X-Capture-Response-Time'] = responseTime;
              
              // 如果是自动放行的请求，添加放行信息
              if (modifyData && modifyData.autoReleased) {
                enhancedResponse.headers['X-Capture-Release-Type'] = 'auto';
                enhancedResponse.headers['X-Capture-Released-At'] = modifyData.releasedAt || responseTime;
              }
              
              log(`无需修改响应: ${$request.url}`);
              $done(enhancedResponse);
            }
          } catch (parseError) {
            log(`解析修改响应失败: ${parseError.message}`);
            // 解析错误，发送原始响应信息到捕获服务器（只用于记录）
            sendToCaptureServer(responseInfo, '/api/capture/response');
            
            // 添加请求ID和时间信息到响应头
            const enhancedResponse = { ...$response };
            enhancedResponse.headers = enhancedResponse.headers || {};
            enhancedResponse.headers['X-Capture-Request-Id'] = actualRequestId;
            enhancedResponse.headers['X-Capture-Request-Time'] = requestTime;
            enhancedResponse.headers['X-Capture-Response-Time'] = responseTime;
            
            $done(enhancedResponse);
          }
        })
        .catch(error => {
          log(`获取修改响应失败: ${error}`);
          // 错误时也发送原始响应信息到捕获服务器（只用于记录）
          sendToCaptureServer(responseInfo, '/api/capture/response');
          
          // 添加请求ID和时间信息到响应头
          const enhancedResponse = { ...$response };
          enhancedResponse.headers = enhancedResponse.headers || {};
          enhancedResponse.headers['X-Capture-Request-Id'] = actualRequestId;
          enhancedResponse.headers['X-Capture-Request-Time'] = requestTime;
          enhancedResponse.headers['X-Capture-Response-Time'] = responseTime;
          
          $done(enhancedResponse);
        });
    } else {
      // 不启用修改功能时，只是发送响应信息到捕获服务器
      sendToCaptureServer(responseInfo, '/api/capture/response')
        .then(() => {
          log(`响应已记录并关联到请求ID: ${actualRequestId}`);
        })
        .catch(err => {
          log(`记录响应出错: ${err.message}`);
        });
      
      // 添加请求ID和时间信息到响应头
      const enhancedResponse = { ...$response };
      enhancedResponse.headers = enhancedResponse.headers || {};
      enhancedResponse.headers['X-Capture-Request-Id'] = actualRequestId;
      enhancedResponse.headers['X-Capture-Request-Time'] = requestTime;
      enhancedResponse.headers['X-Capture-Response-Time'] = responseTime;
      
      log(`响应处理完成: ${actualRequestId}`);
      $done(enhancedResponse);
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
import logger from '../utils/logger.js';
import { generateRequestId } from '../utils/helpers.js';

/**
 * 请求日志中间件
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = generateRequestId();
  
  // 为每个请求添加ID，便于跟踪
  req.requestId = requestId;
  
  // 记录请求体大小
  let requestSize = 0;
  if (req.headers['content-length']) {
    requestSize = parseInt(req.headers['content-length'], 10);
  }
  
  logger.info(`[${requestId}] 开始处理请求: ${req.method} ${req.url} (${requestSize} bytes)`);
  
  // 捕获响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    let responseSize = 0;
    
    if (res.getHeader('content-length')) {
      responseSize = parseInt(res.getHeader('content-length'), 10);
    }
    
    logger.info(`[${requestId}] 完成请求: ${req.method} ${req.url} ${res.statusCode} - ${duration}ms (响应: ${responseSize} bytes)`);
  });
  
  // 捕获响应关闭事件（客户端中断）
  res.on('close', () => {
    if (!res.finished) {
      const duration = Date.now() - start;
      logger.warn(`[${requestId}] 请求被客户端中断: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  
  next();
}

/**
 * 基本日志中间件
 */
export function basicLogger(req, res, next) {
  logger.debug(`收到请求: ${req.method} ${req.url}`);
  logger.debug(`客户端IP: ${req.ip}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  next();
} 
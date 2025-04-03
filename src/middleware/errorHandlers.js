import logger from '../utils/logger.js';

/**
 * 处理404错误
 */
export function notFoundHandler(req, res, next) {
  logger.warn(`[${req.requestId}] 404: ${req.method} ${req.url}`);
  res.status(404).json({
    error: '未找到',
    message: `找不到路径: ${req.url}`,
    request_id: req.requestId
  });
}

/**
 * 全局错误处理
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  logger.error(`[${req.requestId}] 服务器错误: ${err.message}`);
  logger.error(`[${req.requestId}] 错误堆栈: ${err.stack}`);
  
  res.status(statusCode).json({
    error: '服务器错误',
    message: err.message,
    request_id: req.requestId
  });
}

/**
 * 未捕获的Promise拒绝处理程序
 */
export function setupUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的 Promise 拒绝:', reason);
  });
}

/**
 * 未捕获的异常处理程序
 */
export function setupUncaughtExceptionHandler() {
  process.on('uncaughtException', (error) => {
    logger.error(`未捕获的异常: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
  });
} 
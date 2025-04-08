import dotenv from 'dotenv';
import os from 'os';
import app from './app.js';
import config from './config/env.js';
import logger from './utils/logger.js';
import { cleanupOldRequests } from './utils/helpers.js';
import { setupUnhandledRejectionHandler, setupUncaughtExceptionHandler } from './middleware/errorHandlers.js';
import dbServer from './models/dbServer.js';

// 加载环境变量
dotenv.config();

// 设置异常处理器
setupUnhandledRejectionHandler();
setupUncaughtExceptionHandler();

// 启动应用前记录系统信息
logger.info('===== 服务启动 =====');
logger.info(`操作系统: ${os.type()} ${os.release()}`);
logger.info(`主机名: ${os.hostname()}`);
logger.info(`Node.js版本: ${process.version}`);
logger.info(`当前工作目录: ${process.cwd()}`);
logger.info(`请求保存目录: ${config.requestsDir}`);
logger.info(`日志目录: ${config.logsDir}`);
logger.info(`服务器URL: http://localhost:${config.port}`);
logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
logger.info(`日志级别: ${config.logLevel}`);
logger.info(`请求体大小限制: ${config.bodyLimit}`);
logger.info(`请求保留天数: ${config.retentionDays}天`);
logger.info(`ARK_API_KEY: ${process.env.ARK_API_KEY || '未设置'}`);

// 设置未捕获错误处理
setupUnhandledRejectionHandler();
setupUncaughtExceptionHandler();

// 启动服务器
const server = app.listen(config.port, () => {
  logger.info(`Quantumult Proxy 服务已启动: http://localhost:${config.port}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`日志级别: ${logger.level}`);
  logger.info(`请求存储目录: ${config.requestsDir}`);
  logger.info(`日志存储目录: ${config.logsDir}`);

  // 启动JSON Server数据库服务
  try {
    dbServer.startDbServer(3001);
    logger.info('JSON Server数据库服务已启动');
  } catch (error) {
    logger.error(`启动JSON Server失败: ${error.message}`);
  }
});

// 安全关闭
const shutdownGracefully = () => {
  logger.info('正在关闭服务器...');

  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    logger.error('无法正常关闭服务器，强制退出');
    process.exit(1);
  }, 10000);
};

// 注册进程事件
process.on('SIGTERM', shutdownGracefully);
process.on('SIGINT', shutdownGracefully);

// 定期清理
setInterval(() => {
  logger.info(`执行旧请求清理任务 (保留${config.retentionDays}天)`);
  cleanupOldRequests();
}, 24 * 60 * 60 * 1000); // 每24小时清理一次

// 初始执行一次清理
cleanupOldRequests();

export default server;

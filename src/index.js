import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';
import os from 'os';
import app from './app.js';
import config from './config/env.js';
import logger from './utils/logger.js';
import { cleanupOldRequests } from './utils/helpers.js';
import { setupUnhandledRejectionHandler, setupUncaughtExceptionHandler } from './middleware/errorHandlers.js';
import apiRoutes from './routes/api.js';
import * as captureController from './controllers/captureController.js';

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

// 添加请求ID计数器用于处理同一时间点的多个请求
let requestCounter = 0;

/**
 * 生成易读的请求ID
 * 格式: YYYYMMDD_HHMMSS_XXX (XXX为计数器以避免冲突)
 */
function generateRequestId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // 每次生成ID时增加计数器
  requestCounter = (requestCounter + 1) % 1000;
  const counter = String(requestCounter).padStart(3, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${counter}`;
}

// 中间件
app.use((req, res, next) => {
  logger.debug(`收到请求: ${req.method} ${req.url}`);
  logger.debug(`客户端IP: ${req.ip}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  next();
});

app.use(express.json({ 
  limit: config.bodyLimit,
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      logger.warn(`请求体JSON解析失败: ${e.message}`);
      // 不中断请求继续处理
    }
  }
}));

app.use(express.text({ 
  limit: config.bodyLimit,
  type: ['text/plain', 'text/html', 'application/xml'] 
}));

app.use(express.raw({ 
  limit: config.bodyLimit, 
  type: () => true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: config.bodyLimit 
}));

app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true
}));

// 请求日志中间件
app.use((req, res, next) => {
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
});

// 服务静态文件 - 静态文件服务应放在API路由之前
app.use(express.static(path.join(process.cwd(), 'public')));

// 主页重定向到静态页面
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// 使用API路由
app.use('/api', apiRoutes);

// 额外添加捕获端点路由，不包含/api前缀
app.post('/capture/request', (req, res) => captureController.captureRequest(req, res));
app.post('/capture/response', (req, res) => captureController.captureResponse(req, res));
app.post('/capture/response/modify', (req, res) => captureController.modifyResponse(req, res)); 

// 捕获所有请求 - 放在所有API路由后面
app.all('*', async (req, res, next) => {
  try {
    // 检查请求路径是否是前端应用或已处理的API路径
    const isWebOrApiPath = req.path === '/' || 
                          req.path.startsWith('/index.html') || 
                          req.path.startsWith('/styles.css') || 
                          req.path.startsWith('/app.js') || 
                          req.path.startsWith('/capture/') || 
                          req.path.startsWith('/api/') ||
                          req.path.startsWith('/request/') || 
                          req.path.startsWith('/requests') || 
                          req.path.startsWith('/stats') || 
                          req.path.startsWith('/health') || 
                          req.path.startsWith('/debug/');

    // 如果是前端或API路径，不捕获请求，继续下一个中间件
    if (isWebOrApiPath) {
      return next();
    }
    
    // 检查捕获状态，如果已暂停则不捕获
    if (!captureController.isCaptureOn()) {
      logger.debug(`[${req.requestId}] 捕获已暂停，跳过请求: ${req.method} ${req.originalUrl}`);
      return res.status(200).json({ 
        message: '请求捕获功能已暂停',
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查是否来自Quantumult请求（简单判断User-Agent或特定请求头）
    const isQuantumultRequest = req.headers['user-agent']?.toLowerCase().includes('quantumult') || 
                               req.headers['x-quantumult-id'] || 
                               req.query.quantumult === 'true';
    
    // 如果不是Quantumult的请求，返回简单提示但不保存请求
    if (!isQuantumultRequest) {
      logger.debug(`[${req.requestId}] 非Quantumult请求，不保存: ${req.method} ${req.originalUrl}`);
      return res.status(200).json({ 
        message: '此服务仅用于Quantumult请求捕获',
        request_path: req.path,
        timestamp: new Date().toISOString()
      });
    }

    // 检查是否有捕获指令头，只保存带有捕获指令的请求
    const hasCaptureHeader = req.headers['x-capture'] === 'true' || 
                            req.headers['x-quantumult-capture'] === 'true' ||
                            req.query.capture === 'true';
    
    // 如果不是通过捕获接口调用的请求，不保存
    if (!hasCaptureHeader) {
      logger.debug(`[${req.requestId}] 未带捕获标记的请求，不保存: ${req.method} ${req.originalUrl}`);
      // 继续处理请求，但不保存
      return res.status(200).json({ 
        message: '请求已处理，但未保存（缺少捕获标记）',
        request_id: req.requestId,
        timestamp: new Date().toISOString()
      });
    }

    // 生成唯一请求ID
    const requestId = req.requestId || generateRequestId();
    
    logger.debug(`[${requestId}] 开始捕获请求: ${req.method} ${req.originalUrl}`);
    
    // 记录请求体
    let requestBody = req.body;
    if (Buffer.isBuffer(requestBody)) {
      logger.debug(`[${requestId}] 请求体是二进制数据，长度: ${requestBody.length} 字节`);
      // 尝试转换二进制为文本
      try {
        requestBody = requestBody.toString('utf8');
        logger.debug(`[${requestId}] 二进制转文本成功，尝试作为JSON解析`);
        try {
          requestBody = JSON.parse(requestBody);
          logger.debug(`[${requestId}] 解析为JSON成功`);
        } catch (e) {
          logger.debug(`[${requestId}] 不是有效JSON，保持文本格式`);
        }
      } catch (e) {
        logger.debug(`[${requestId}] 无法将二进制转换为文本，保持二进制格式`);
        // 如果无法转为文本，保留为二进制，但转为Base64字符串以便存储
        requestBody = {
          _type: 'binary',
          _encoding: 'base64',
          data: requestBody.toString('base64')
        };
      }
    }
    
    // 构造请求对象
    const requestData = {
      id: requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      headers: req.headers,
      body: requestBody,
      ip: req.ip,
      originalUrl: req.originalUrl,
      protocol: req.protocol,
      host: req.get('host'),
      is_secure: req.secure,
      source: 'quantumult'
    };
    
    // 保存请求
    const filename = path.join(config.requestsDir, `${requestId}.json`);
    fs.writeFile(filename, JSON.stringify(requestData, null, 2), (err) => {
      if (err) {
        logger.error(`[${requestId}] 保存请求失败: ${err.message}`);
      } else {
        logger.info(`[${requestId}] 请求已保存到: ${filename}`);
      }
    });
    
    // 返回确认信息
    return res.status(200).json({ 
      message: '请求已捕获',
      request_id: requestId,
      timestamp: new Date().toISOString(),
      server_info: {
        hostname: os.hostname(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    const requestId = req.requestId || 'unknown';
    logger.error(`[${requestId}] 捕获请求错误: ${error.message}`);
    logger.error(`[${requestId}] 错误堆栈: ${error.stack}`);
    
    return res.status(500).json({
      error: '捕获请求失败',
      message: error.message,
      request_id: requestId
    });
  }
});

// 处理404错误
app.use((req, res, next) => {
  logger.warn(`[${req.requestId}] 404: ${req.method} ${req.url}`);
  res.status(404).json({
    error: '未找到',
    message: `找不到路径: ${req.url}`,
    request_id: req.requestId
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.error(`[${req.requestId}] 服务器错误: ${err.message}`);
  logger.error(`[${req.requestId}] 错误堆栈: ${err.stack}`);
  
  res.status(statusCode).json({
    error: '服务器错误',
    message: err.message,
    request_id: req.requestId
  });
});

// 获取磁盘使用信息
function getDiskUsageInfo() {
  try {
    const stats = fs.statfsSync(config.requestsDir);
    const totalSpace = stats.blocks * stats.bsize;
    const freeSpace = stats.bfree * stats.bsize;
    const usedSpace = totalSpace - freeSpace;
    
    return {
      total_bytes: totalSpace,
      free_bytes: freeSpace,
      used_bytes: usedSpace,
      used_percent: Math.round((usedSpace / totalSpace) * 100)
    };
  } catch (error) {
    logger.warn(`获取磁盘使用信息失败: ${error.message}`);
    return { error: error.message };
  }
}

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
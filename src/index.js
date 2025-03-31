import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'info';
const bodyLimit = process.env.BODY_LIMIT || '10mb';

// 确保存储目录存在
const requestsDir = path.join(process.cwd(), 'requests');
if (!fs.existsSync(requestsDir)) {
  fs.mkdirSync(requestsDir, { recursive: true });
}

// 创建日志记录器
const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'proxy.log' })
  ]
});

// 中间件
app.use(express.json({ limit: bodyLimit }));
app.use(express.text({ limit: bodyLimit }));
app.use(express.raw({ limit: bodyLimit, type: () => true })); // 处理其他类型的请求
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(cors());

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 请求统计端点
app.get('/stats', (req, res) => {
  fs.readdir(requestsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '无法读取请求目录', message: err.message });
    }
    res.status(200).json({
      total_requests: files.length,
      latest_request: files.length > 0 ? new Date(Math.max(...files.map(file => 
        fs.statSync(path.join(requestsDir, file)).mtime
      ))).toISOString() : null
    });
  });
});

// 捕获所有请求
app.all('*', async (req, res) => {
  try {
    // 生成唯一请求ID
    const requestId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15);
    
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
      body: req.body,
      ip: req.ip,
      originalUrl: req.originalUrl
    };
    
    // 保存请求
    const filename = path.join(requestsDir, `${requestId}.json`);
    fs.writeFileSync(filename, JSON.stringify(requestData, null, 2));
    
    logger.info(`请求已捕获并保存: ${requestId}`);
    
    // 返回确认信息
    return res.status(200).json({ 
      message: '请求已捕获',
      request_id: requestId
    });
  } catch (error) {
    logger.error(`捕获请求错误: ${error.message}`);
    return res.status(500).json({
      error: '捕获请求失败',
      message: error.message
    });
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason);
});

// 启动服务器
app.listen(port, () => {
  logger.info(`请求捕获服务器正在运行，端口: ${port}`);
  logger.info(`请求体大小限制: ${bodyLimit}`);
  logger.info(`日志级别: ${logLevel}`);
  logger.info(`请求保存目录: ${requestsDir}`);
}); 
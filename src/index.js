import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'info';
const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
const maxRedirects = parseInt(process.env.MAX_REDIRECTS || '5', 10);
const bodyLimit = process.env.BODY_LIMIT || '10mb';
const verboseLogging = process.env.VERBOSE_LOGGING === 'true';

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

// 版本信息端点
app.get('/version', (req, res) => {
  res.status(200).json({
    name: 'quantumult-proxy',
    version: '1.0.0',
    description: '代理服务器，用于代理 Quantumultx 的 HTTP Backend 请求'
  });
});

// 代理所有请求
app.all('*', async (req, res) => {
  const targetUrl = req.query.url || req.headers['x-target-url'];
  
  if (!targetUrl) {
    return res.status(400).json({ error: '缺少目标URL参数' });
  }

  try {
    logger.info(`代理请求: ${req.method} ${targetUrl}`);
    
    if (verboseLogging) {
      logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        logger.debug(`请求体: ${JSON.stringify(req.body)}`);
      }
    }
    
    // 准备请求头
    const headers = { ...req.headers };
    
    // 移除代理特定的头部
    delete headers.host;
    delete headers['x-target-url'];
    
    // 准备请求配置
    const config = {
      method: req.method,
      url: targetUrl,
      headers,
      // 设置超时时间（毫秒）
      timeout: requestTimeout,
      // 允许重定向
      maxRedirects,
    };
    
    // 添加请求体
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      config.data = req.body;
    }

    // 添加查询参数（如果原始URL中有）
    if (req.query && Object.keys(req.query).length > 0) {
      // 排除'url'参数，因为它是用于指定目标URL的
      const queryParams = { ...req.query };
      delete queryParams.url;
      
      if (Object.keys(queryParams).length > 0) {
        config.params = queryParams;
      }
    }
    
    // 发送请求
    const response = await axios(config);
    
    // 设置响应状态码和头部
    res.status(response.status);
    
    // 设置响应头
    for (const [key, value] of Object.entries(response.headers)) {
      // 跳过某些响应头，以避免冲突
      if (!['content-length', 'connection', 'keep-alive', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }
    
    if (verboseLogging) {
      logger.debug(`响应状态: ${response.status}`);
      logger.debug(`响应头: ${JSON.stringify(response.headers)}`);
    }
    
    // 发送响应体
    return res.send(response.data);
  } catch (error) {
    logger.error(`代理请求错误: ${error.message}`);
    
    if (verboseLogging && error.config) {
      logger.debug(`请求配置: ${JSON.stringify(error.config)}`);
    }
    
    // 如果有响应，返回原始错误状态和数据
    if (error.response) {
      logger.error(`错误状态码: ${error.response.status}`);
      
      // 设置响应头
      for (const [key, value] of Object.entries(error.response.headers || {})) {
        if (!['content-length', 'connection', 'keep-alive', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }
      
      res.status(error.response.status).send(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: '代理请求超时',
        message: `请求超时（${requestTimeout}ms）`
      });
    } else {
      res.status(500).json({
        error: '代理请求失败',
        message: error.message
      });
    }
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
  logger.info(`代理服务器正在运行，端口: ${port}`);
  logger.info(`超时设置: ${requestTimeout}ms, 最大重定向: ${maxRedirects}`);
  logger.info(`请求体大小限制: ${bodyLimit}`);
  logger.info(`日志级别: ${logLevel}`);
  logger.info(`详细日志记录: ${verboseLogging ? '已启用' : '已禁用'}`);
}); 
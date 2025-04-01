import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';
import os from 'os';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || 'debug'; // 设置默认日志级别为debug
const bodyLimit = process.env.BODY_LIMIT || '10mb';

// 确保存储目录存在
const requestsDir = path.join(process.cwd(), 'requests');
if (!fs.existsSync(requestsDir)) {
  fs.mkdirSync(requestsDir, { recursive: true });
}

// 确保日志目录存在
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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
    new transports.File({ 
      filename: path.join(logsDir, 'proxy.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 添加单独的错误日志文件
    new transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// 启动应用前记录系统信息
logger.info('===== 服务启动 =====');
logger.info(`操作系统: ${os.type()} ${os.release()}`);
logger.info(`主机名: ${os.hostname()}`);
logger.info(`Node.js版本: ${process.version}`);
logger.info(`当前工作目录: ${process.cwd()}`);
logger.info(`请求保存目录: ${requestsDir}`);
logger.info(`日志目录: ${logsDir}`);
logger.info(`环境变量: PORT=${port}, LOG_LEVEL=${logLevel}, BODY_LIMIT=${bodyLimit}`);

// 中间件
app.use((req, res, next) => {
  logger.debug(`收到请求: ${req.method} ${req.url}`);
  logger.debug(`客户端IP: ${req.ip}`);
  logger.debug(`请求头: ${JSON.stringify(req.headers)}`);
  next();
});

app.use(express.json({ 
  limit: bodyLimit,
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
  limit: bodyLimit,
  type: ['text/plain', 'text/html', 'application/xml'] 
}));

app.use(express.raw({ 
  limit: bodyLimit, 
  type: () => true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: bodyLimit 
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
  const requestId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15);
  
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

// 健康检查端点
app.get('/health', (req, res) => {
  logger.debug(`[${req.requestId}] 健康检查请求`);
  
  // 检查服务是否正常运行
  const healthStatus = {
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
  
  res.status(200).json(healthStatus);
  logger.debug(`[${req.requestId}] 健康检查响应: ${JSON.stringify(healthStatus)}`);
});

// 请求统计端点
app.get('/stats', (req, res) => {
  logger.debug(`[${req.requestId}] 请求统计信息`);
  
  fs.readdir(requestsDir, (err, files) => {
    if (err) {
      logger.error(`[${req.requestId}] 读取请求目录失败: ${err.message}`);
      return res.status(500).json({ error: '无法读取请求目录', message: err.message });
    }
    
    let latestFile = null;
    let latestTime = 0;
    
    try {
      files.forEach(file => {
        const filePath = path.join(requestsDir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtime.getTime() > latestTime) {
          latestTime = stat.mtime.getTime();
          latestFile = file;
        }
      });
      
      const stats = {
        total_requests: files.length,
        latest_request: latestTime > 0 ? new Date(latestTime).toISOString() : null,
        latest_request_id: latestFile ? latestFile.replace('.json', '') : null,
        disk_usage: getDiskUsageInfo(),
      };
      
      res.status(200).json(stats);
      logger.debug(`[${req.requestId}] 统计信息响应: ${JSON.stringify(stats)}`);
    } catch (error) {
      logger.error(`[${req.requestId}] 生成统计信息失败: ${error.message}`);
      res.status(500).json({ error: '生成统计信息失败', message: error.message });
    }
  });
});

// 获取指定请求的详细信息
app.get('/request/:id', (req, res) => {
  const requestId = req.params.id;
  logger.debug(`[${req.requestId}] 获取请求详情: ${requestId}`);
  
  const filePath = path.join(requestsDir, `${requestId}.json`);
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        logger.warn(`[${req.requestId}] 请求不存在: ${requestId}`);
        return res.status(404).json({ error: '请求不存在', message: `找不到ID为 ${requestId} 的请求` });
      }
      
      logger.error(`[${req.requestId}] 读取请求文件失败: ${err.message}`);
      return res.status(500).json({ error: '读取请求文件失败', message: err.message });
    }
    
    try {
      const requestData = JSON.parse(data);
      res.status(200).json(requestData);
      logger.debug(`[${req.requestId}] 返回请求详情成功: ${requestId}`);
    } catch (error) {
      logger.error(`[${req.requestId}] 解析请求数据失败: ${error.message}`);
      res.status(500).json({ error: '解析请求数据失败', message: error.message });
    }
  });
});

// 列出所有请求
app.get('/requests', (req, res) => {
  logger.debug(`[${req.requestId}] 获取请求列表`);
  
  fs.readdir(requestsDir, (err, files) => {
    if (err) {
      logger.error(`[${req.requestId}] 读取请求目录失败: ${err.message}`);
      return res.status(500).json({ error: '无法读取请求目录', message: err.message });
    }
    
    try {
      const requests = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const id = file.replace('.json', '');
          const filePath = path.join(requestsDir, file);
          const stat = fs.statSync(filePath);
          
          return {
            id: id,
            timestamp: stat.mtime.toISOString(),
            size: stat.size
          };
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.status(200).json(requests);
      logger.debug(`[${req.requestId}] 返回请求列表成功，共 ${requests.length} 个请求`);
    } catch (error) {
      logger.error(`[${req.requestId}] 生成请求列表失败: ${error.message}`);
      res.status(500).json({ error: '生成请求列表失败', message: error.message });
    }
  });
});

// 捕获所有请求
app.all('*', async (req, res) => {
  try {
    // 生成唯一请求ID
    const requestId = req.requestId || (Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15));
    
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
      is_secure: req.secure
    };
    
    // 保存请求
    const filename = path.join(requestsDir, `${requestId}.json`);
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
    const stats = fs.statfsSync(requestsDir);
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

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`);
  logger.error(`错误堆栈: ${error.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason);
});

// 定期清理旧请求记录（每小时检查一次，保留最近7天）
const RETENTION_DAYS = 7;
setInterval(() => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  
  fs.readdir(requestsDir, (err, files) => {
    if (err) {
      return logger.error(`清理旧请求记录错误: ${err.message}`);
    }
    
    files.forEach(file => {
      const filePath = path.join(requestsDir, file);
      fs.stat(filePath, (err, stat) => {
        if (err) {
          return logger.error(`获取文件信息错误: ${err.message}`);
        }
        
        if (stat.mtime < cutoff) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error(`删除旧文件错误: ${err.message}`);
            } else {
              logger.info(`自动清理旧请求: ${file}`);
            }
          });
        }
      });
    });
  });
}, 3600000); // 每小时执行一次

// 启动服务器
const server = app.listen(port, () => {
  logger.info(`请求捕获服务器正在运行，端口: ${port}`);
  logger.info(`请求体大小限制: ${bodyLimit}`);
  logger.info(`日志级别: ${logLevel}`);
  logger.info(`请求保存目录: ${requestsDir}`);
  logger.info(`服务器URL: http://localhost:${port}`);
  logger.info('===== 服务启动完成 =====');
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，优雅关闭服务...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
}); 
// 用于测试QuantumultX HTTP Backend配置的简单测试服务器
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001; // 使用不同于主服务器的端口

// 确保日志目录存在
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'test-server.log');

// 简单日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(logFile, logMessage);
}

// 中间件
app.use(express.json());
app.use(express.text());
app.use(express.raw({ type: () => true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 请求日志中间件
app.use((req, res, next) => {
  const requestId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;
  
  log(`[${requestId}] ${req.method} ${req.url} 收到请求`);
  log(`[${requestId}] 请求头: ${JSON.stringify(req.headers)}`);
  
  if (req.body) {
    if (typeof req.body === 'object') {
      log(`[${requestId}] 请求体: ${JSON.stringify(req.body)}`);
    } else {
      log(`[${requestId}] 请求体: ${req.body}`);
    }
  }
  
  res.on('finish', () => {
    log(`[${requestId}] ${req.method} ${req.url} ${res.statusCode} 请求完成`);
  });
  
  next();
});

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// 测试路由
app.get('/test', (req, res) => {
  log(`[${req.requestId}] GET /test 响应`);
  res.send({
    message: '测试成功',
    timestamp: new Date().toISOString(),
    params: req.query
  });
});

// 模拟请求捕获服务器的路由
app.all('/api/captured/:type', (req, res) => {
  const type = req.params.type;
  log(`[${req.requestId}] ${req.method} /api/captured/${type} 捕获请求`);
  
  // 提取并记录原始URL和请求类型
  const originalUrl = req.headers['x-original-url'] || '未提供';
  const requestType = req.headers['x-request-type'] || req.method;
  
  log(`[${req.requestId}] 原始URL: ${originalUrl}, 请求类型: ${requestType}`);
  
  // 响应请求捕获结果
  res.status(200).json({
    message: `${requestType}请求已被测试服务器捕获`,
    request_id: req.requestId,
    timestamp: new Date().toISOString(),
    original_url: originalUrl,
    request_type: requestType,
    server: 'test-server'
  });
});

// 测试健康检查端点
app.get('/health', (req, res) => {
  log(`[${req.requestId}] 健康检查请求`);
  res.status(200).json({
    status: 'ok',
    version: '测试服务器 1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 捕获所有其他请求
app.all('*', (req, res) => {
  log(`[${req.requestId}] ${req.method} ${req.url} 捕获通配请求`);
  
  res.status(200).json({
    message: '已捕获请求',
    request_id: req.requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    server: 'test-server'
  });
});

// 启动服务器
app.listen(port, () => {
  log(`测试服务器已启动，端口: ${port}`);
  log(`测试服务器URL: http://localhost:${port}`);
  log(`测试健康检查: http://localhost:${port}/health`);
  log(`日志文件位置: ${logFile}`);
}); 
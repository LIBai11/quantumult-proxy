import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 加载环境变量
dotenv.config();

// 基本配置
const config = {
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'debug',
  bodyLimit: process.env.BODY_LIMIT || '10mb',
  retentionDays: parseInt(process.env.RETENTION_DAYS || '7', 10)
};

// 路径配置
const rootDir = process.cwd();
const requestsDir = path.join(rootDir, 'requests');
const logsDir = path.join(rootDir, 'logs');

// 确保存储目录存在
if (!fs.existsSync(requestsDir)) {
  fs.mkdirSync(requestsDir, { recursive: true });
}

// 确保日志目录存在
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default {
  ...config,
  requestsDir,
  logsDir,
  rootDir
}; 
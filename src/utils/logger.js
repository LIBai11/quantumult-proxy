import { createLogger, format, transports } from 'winston';
import path from 'path';
import config from '../config/env.js';

// 创建日志记录器
const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ 
      filename: path.join(config.logsDir, 'proxy.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 添加单独的错误日志文件
    new transports.File({ 
      filename: path.join(config.logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

export default logger; 
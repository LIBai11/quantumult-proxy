import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import config from './config/env.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { requestLogger, basicLogger } from './middleware/loggers.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import adminRoutes from './routes/admin.js';

// 创建Express应用
const app = express();

// 安全相关中间件
app.use(helmet({
  contentSecurityPolicy: false // 禁用CSP以便于开发
}));

// 请求日志中间件
app.use(morgan('dev', {
  stream: {
    write: message => logger.info(message.trim())
  }
}));

// 请求解析中间件
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// 启用压缩
app.use(compression());

// 跨域支持
app.use(cors());

// 自定义请求日志
app.use(requestLogger);

// 调试日志（可选，可在生产环境中禁用）
if (process.env.NODE_ENV !== 'production') {
  app.use(basicLogger);
}

// 注册主路由
app.use(routes);

// 注册管理路由
app.use('/admin', adminRoutes);

// 处理404错误
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

export default app;

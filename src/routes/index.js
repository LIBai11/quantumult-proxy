import express from 'express';
import apiRoutes from './api.js';
import path from 'path';
import config from '../config/env.js';

const router = express.Router();

// 静态文件服务(前端UI)
router.use(express.static(path.join(config.rootDir, 'public')));

// API路由
router.use('/', apiRoutes);

export default router; 
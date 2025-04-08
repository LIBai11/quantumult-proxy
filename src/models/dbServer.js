import { createRequire } from 'module';
import logger from '../utils/logger.js';
import db from './db.js';

// 默认导出对象
let exportObject = {
  startDbServer: () => {
    logger.error('JSON Server初始化失败，无法启动');
  },
  server: null,
  router: null
};
try {
  // 使用createRequire来导入CommonJS模块
  const require = createRequire(import.meta.url);
  const jsonServer = require('json-server');
  const { rootDir: dbDir } = db.getDbPaths();

  // 创建json-server实例
  const server = jsonServer.create();
  
  // 创建路由中间件
  const middlewares = jsonServer.defaults();

  // 配置服务器
  server.use(middlewares);
  server.use(jsonServer.bodyParser);

  // 自定义路由
  server.use((req, res, next) => {
    if (req.method === 'POST') {
      req.body.createdAt = new Date().toISOString();
    }
    next();
  });

  // 针对每种数据类型创建路由
  server.get('/api/requests', async (req, res) => {
    try {
      const requests = await db.getAllRequests();
      res.json(requests);
    } catch (error) {
      logger.error(`获取请求数据错误: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  server.get('/api/responses', async (req, res) => {
    try {
      const responses = await db.getAllResponses();
      res.json(responses);
    } catch (error) {
      logger.error(`获取响应数据错误: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  server.get('/api/modified_responses', async (req, res) => {
    try {
      const modifiedResponses = await db.getAllModifiedResponses();
      res.json(modifiedResponses);
    } catch (error) {
      logger.error(`获取修改响应数据错误: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // 单条数据查询API
  server.get('/api/requests/:id', async (req, res) => {
    try {
      const request = await db.findRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      res.json(request);
    } catch (error) {
      logger.error(`获取请求详情错误: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  server.get('/api/responses/:requestId', async (req, res) => {
    try {
      const response = await db.findResponseByRequestId(req.params.requestId);
      if (!response) {
        return res.status(404).json({ error: 'Response not found' });
      }
      res.json(response);
    } catch (error) {
      logger.error(`获取响应详情错误: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // 启动json-server
  function startDbServer(port = 3001) {
    try {
      server.listen(port, () => {
        logger.info(`JSON Server 运行在 http://localhost:${port}`);
        logger.info(`数据库目录: ${dbDir}`);
      });
    } catch (error) {
      logger.error(`启动JSON Server失败: ${error.message}`);
    }
  }

  // 更新导出对象
  exportObject = {
    startDbServer,
    server
  };
} catch (error) {
  logger.error(`初始化JSON Server失败: ${error.message}`);
}

export default exportObject; 
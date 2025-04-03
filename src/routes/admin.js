import express from 'express';
import db from '../models/db.js';
import logger from '../utils/logger.js';
import fs from 'fs';

const router = express.Router();

// 查询主机列表
router.get('/hosts', async (req, res) => {
  try {
    const hosts = await db.getAllHosts();
    return res.json(hosts);
  } catch (error) {
    logger.error(`获取主机列表错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 分页查询请求列表（支持主机过滤、关键字/正则查询）
router.get('/requests-paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const host = req.query.host || null;
    const keyword = req.query.keyword || null;
    const isRegex = req.query.isRegex === 'true';

    const result = await db.getRequestsPaginated(page, limit, host, keyword, isRegex);
    return res.json(result);
  } catch (error) {
    logger.error(`分页查询请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取所有请求
router.get('/requests', async (req, res) => {
  try {
    const requests = await db.getAllRequests();
    return res.json(requests);
  } catch (error) {
    logger.error(`获取请求列表错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取指定ID的请求
router.get('/requests/:id', async (req, res) => {
  try {
    const request = await db.findRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    return res.json(request);
  } catch (error) {
    logger.error(`获取请求详情错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 删除指定ID的请求及其相关响应
router.delete('/requests/:id', async (req, res) => {
  try {
    const result = await db.deleteRequestById(req.params.id);
    
    if (result.success) {
      return res.json({ success: true, message: `已删除 ${result.deletedCount} 条请求记录及相关响应` });
    } else {
      return res.status(404).json({ success: false, message: '找不到指定请求或删除失败' });
    }
  } catch (error) {
    logger.error(`删除请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 删除指定主机的所有请求及其相关响应
router.delete('/hosts/:hostname/requests', async (req, res) => {
  try {
    const hostname = req.params.hostname;
    const result = await db.deleteRequestsByHost(hostname);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `已删除 ${hostname} 的 ${result.deletedCount} 条请求记录及相关响应`,
        affectedIds: result.affectedIds 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: '删除失败',
        error: result.error 
      });
    }
  } catch (error) {
    logger.error(`删除主机请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取请求统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getRequestsStats();
    return res.json(stats);
  } catch (error) {
    logger.error(`获取请求统计错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取所有响应
router.get('/responses', async (req, res) => {
  try {
    const responses = await db.getAllResponses();
    return res.json(responses);
  } catch (error) {
    logger.error(`获取响应列表错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取指定请求的响应
router.get('/responses/:requestId', async (req, res) => {
  try {
    const response = await db.findResponseByRequestId(req.params.requestId);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    return res.json(response);
  } catch (error) {
    logger.error(`获取响应详情错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取所有修改后的响应
router.get('/modified-responses', async (req, res) => {
  try {
    const modifiedResponses = await db.getAllModifiedResponses();
    return res.json(modifiedResponses);
  } catch (error) {
    logger.error(`获取修改响应列表错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取指定请求的修改后响应
router.get('/modified-responses/:requestId', async (req, res) => {
  try {
    const response = await db.findModifiedResponseByRequestId(req.params.requestId);
    if (!response) {
      return res.status(404).json({ error: 'Modified response not found' });
    }
    return res.json(response);
  } catch (error) {
    logger.error(`获取修改响应详情错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 清空所有数据（谨慎使用）
router.delete('/all-data', async (req, res) => {
  try {
    // 确保请求包含确认标志
    if (req.body.confirm !== 'YES_DELETE_ALL') {
      return res.status(400).json({ 
        success: false, 
        message: '请提供确认标志以删除所有数据' 
      });
    }

    // 清空请求
    await db.requestsDb.read();
    db.requestsDb.data = [];
    await db.requestsDb.write();
    
    // 清空响应
    await db.responsesDb.read();
    db.responsesDb.data = [];
    await db.responsesDb.write();
    
    // 清空修改后的响应
    await db.modifiedResponsesDb.read();
    db.modifiedResponsesDb.data = [];
    await db.modifiedResponsesDb.write();
    
    return res.json({ 
      success: true, 
      message: '所有数据已清空' 
    });
  } catch (error) {
    logger.error(`清空所有数据错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取数据库状态
router.get('/status', async (req, res) => {
  try {
    const paths = db.getDbPaths();
    const status = {
      db_directory: paths.dbDir,
      files: {
        requests: {
          path: paths.requestsDbPath,
          exists: fs.existsSync(paths.requestsDbPath),
          size: fs.existsSync(paths.requestsDbPath) ? fs.statSync(paths.requestsDbPath).size : 0
        },
        responses: {
          path: paths.responsesDbPath,
          exists: fs.existsSync(paths.responsesDbPath),
          size: fs.existsSync(paths.responsesDbPath) ? fs.statSync(paths.responsesDbPath).size : 0
        },
        modified_responses: {
          path: paths.modifiedResponsesDbPath,
          exists: fs.existsSync(paths.modifiedResponsesDbPath),
          size: fs.existsSync(paths.modifiedResponsesDbPath) ? fs.statSync(paths.modifiedResponsesDbPath).size : 0
        }
      }
    };
    return res.json(status);
  } catch (error) {
    logger.error(`获取数据库状态错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 批量删除请求
router.delete('/requests/batch', async (req, res) => {
  try {
    if (!req.body.ids || !Array.isArray(req.body.ids) || req.body.ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供要删除的请求ID数组' 
      });
    }
    
    const ids = req.body.ids;
    const results = [];
    let totalDeleted = 0;
    
    // 逐个删除请求
    for (const id of ids) {
      const result = await db.deleteRequestById(id);
      results.push({
        id,
        success: result.success,
        deletedCount: result.deletedCount
      });
      
      if (result.success) {
        totalDeleted += result.deletedCount;
      }
    }
    
    return res.json({
      success: true,
      message: `成功删除 ${totalDeleted} 条请求记录`,
      details: results
    });
  } catch (error) {
    logger.error(`批量删除请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取当前活跃主机（24小时内有请求的主机）
router.get('/hosts/active', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    await db.requestsDb.read();
    
    const now = new Date();
    const timeLimit = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    // 获取时间范围内的请求
    const recentRequests = db.requestsDb.data.filter(req => {
      if (!req.server_timestamp) return false;
      const reqTime = new Date(req.server_timestamp);
      return reqTime >= timeLimit;
    });
    
    // 提取主机并计数
    const hostMap = {};
    for (const request of recentRequests) {
      if (request.url) {
        try {
          const url = new URL(request.url);
          const hostname = url.hostname;
          
          if (!hostMap[hostname]) {
            hostMap[hostname] = {
              hostname,
              count: 0,
              lastActive: null
            };
          }
          
          hostMap[hostname].count++;
          
          // 更新最后活跃时间
          const timestamp = new Date(request.server_timestamp);
          if (!hostMap[hostname].lastActive || timestamp > new Date(hostMap[hostname].lastActive)) {
            hostMap[hostname].lastActive = request.server_timestamp;
          }
        } catch (e) {
          // 忽略无效URL
        }
      }
    }
    
    // 按请求次数排序
    const sortedHosts = Object.values(hostMap).sort((a, b) => b.count - a.count);
    
    return res.json({
      timeRange: `${hours} 小时`,
      hosts: sortedHosts
    });
  } catch (error) {
    logger.error(`获取活跃主机错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router; 
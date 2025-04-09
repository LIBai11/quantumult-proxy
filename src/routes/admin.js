import express from 'express';
import db from '../models/db.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';

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

// 分页查询主机列表（支持关键字查询）
router.get('/hosts-paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const keyword = req.query.keyword || null;

    const result = await db.getHostsPaginated(page, limit, keyword);
    return res.json(result);
  } catch (error) {
    logger.error(`分页查询主机列表错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 分页查询响应列表（支持主机过滤、关键字/正则查询）
router.get('/responses-paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const host = req.query.host || null;
    const keyword = req.query.keyword || null;
    const isRegex = req.query.isRegex === 'true';

    // 使用相同的分页函数，但针对响应数据
    const result = await db.getResponsesPaginated(page, limit, host, keyword, isRegex);
    return res.json(result);
  } catch (error) {
    logger.error(`分页查询响应错误: ${error.message}`);
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

// 获取指定响应详情
router.get('/responses/:id', async (req, res) => {
  try {
    const response = await db.findResponseById(req.params.id);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    return res.json(response);
  } catch (error) {
    logger.error(`获取响应详情错误: ${error.message}`);
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

// 删除指定ID的响应
router.delete('/responses/:id', async (req, res) => {
  try {
    const result = await db.deleteResponseById(req.params.id);
    
    if (result.success) {
      return res.json({ success: true, message: `已删除 ${result.deletedCount} 条响应记录` });
    } else {
      return res.status(404).json({ success: false, message: '找不到指定响应或删除失败' });
    }
  } catch (error) {
    logger.error(`删除响应错误: ${error.message}`);
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

// 删除指定主机的所有响应
router.delete('/hosts/:hostname/responses', async (req, res) => {
  try {
    const hostname = req.params.hostname;
    const result = await db.deleteResponsesByHost(hostname);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `已删除 ${hostname} 的 ${result.deletedCount} 条响应记录`,
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
    logger.error(`删除主机响应错误: ${error.message}`);
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


// 批量删除响应
router.delete('/responses/batch', async (req, res) => {
  try {
    if (!req.body.ids || !Array.isArray(req.body.ids) || req.body.ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供要删除的响应ID数组' 
      });
    }
    
    const ids = req.body.ids;
    const results = [];
    let totalDeleted = 0;
    
    // 逐个删除响应
    for (const id of ids) {
      const result = await db.deleteResponseById(id);
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
      message: `成功删除 ${totalDeleted} 条响应记录`,
      details: results
    });
  } catch (error) {
    logger.error(`批量删除响应错误: ${error.message}`);
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

// 获取当前活跃主机（24小时内有响应的主机）
router.get('/hosts/active', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    await db.responsesDb.read();
    
    const now = new Date();
    const timeLimit = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    // 获取时间范围内的响应
    const recentResponses = db.responsesDb.data.filter(resp => {
      if (!resp.server_timestamp) return false;
      const respTime = new Date(resp.server_timestamp);
      return respTime >= timeLimit;
    });
    
    // 提取主机并计数
    const hostMap = {};
    for (const response of recentResponses) {
      if (response.url) {
        try {
          const url = new URL(response.url);
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
          const timestamp = new Date(response.server_timestamp);
          if (!hostMap[hostname].lastActive || timestamp > new Date(hostMap[hostname].lastActive)) {
            hostMap[hostname].lastActive = response.server_timestamp;
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

// 获取捕获状态
router.get('/capture-status', (req, res) => {
  try {
    const status = db.getCaptureStatus();
    return res.json(status);
  } catch (error) {
    logger.error(`获取捕获状态错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 设置捕获状态
router.post('/capture-status', (req, res) => {
  try {
    const enabled = req.body.enabled;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: '请提供有效的启用状态（布尔值）' 
      });
    }
    
    const status = db.setCaptureStatus(enabled);
    
    return res.json({
      success: true,
      message: enabled ? '已启用请求捕获' : '已暂停请求捕获',
      status
    });
  } catch (error) {
    logger.error(`设置捕获状态错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取所有捕获规则
router.get('/capture-rules', async (req, res) => {
  try {
    const rules = await db.getAllCaptureRules();
    return res.json(rules);
  } catch (error) {
    logger.error(`获取捕获规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 启用捕获规则
router.patch('/capture-rules/:id/enable', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const result = await db.updateCaptureRuleStatus(ruleId, true);
    
    if (result.success) {
      return res.json({
        success: true,
        message: "规则已启用",
        rule: result.rule
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.message || '未找到指定规则'
      });
    }
  } catch (error) {
    logger.error(`启用捕获规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 禁用捕获规则
router.patch('/capture-rules/:id/disable', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const result = await db.updateCaptureRuleStatus(ruleId, false);
    
    if (result.success) {
      return res.json({
        success: true,
        message: "规则已禁用",
        rule: result.rule
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.message || '未找到指定规则'
      });
    }
  } catch (error) {
    logger.error(`禁用捕获规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 添加捕获规则
router.post('/capture-rules', async (req, res) => {
  try {
    const { host, methods } = req.body;
    
    if (!host) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供主机名(host)' 
      });
    }
    
    // 验证methods是否为有效的HTTP方法数组
    if (methods && Array.isArray(methods)) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      const invalidMethods = methods.filter(m => !validMethods.includes(m.toUpperCase()));
      
      if (invalidMethods.length > 0) {
        return res.status(400).json({
          success: false,
          message: `请求方法无效: ${invalidMethods.join(', ')}`,
          validMethods
        });
      }
    }
    
    const rule = await db.addCaptureRule({ host, methods });
    
    return res.status(201).json({
      success: true,
      message: '已添加捕获规则',
      rule
    });
  } catch (error) {
    logger.error(`添加捕获规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 删除捕获规则
router.delete('/capture-rules/:id', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const result = await db.deleteCaptureRule(ruleId);
    
    if (result.success) {
      return res.json({
        success: true,
        message: '已删除捕获规则'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.message || '未找到指定规则'
      });
    }
  } catch (error) {
    logger.error(`删除捕获规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 清空所有捕获规则
router.delete('/capture-rules', async (req, res) => {
  try {
    // 确保请求包含确认标志
    if (req.body.confirm !== 'YES_DELETE_ALL_RULES') {
      return res.status(400).json({ 
        success: false, 
        message: '请提供确认标志以删除所有捕获规则' 
      });
    }
    
    const result = await db.clearAllCaptureRules();
    
    if (result.success) {
      return res.json({
        success: true,
        message: '已清空所有捕获规则'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || '清空捕获规则失败'
      });
    }
  } catch (error) {
    logger.error(`清空捕获规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------------- 响应修改规则管理 --------------------------

// 获取所有响应修改规则
router.get('/response-rules', async (req, res) => {
  try {
    const rules = await db.getAllResponseRules();
    return res.json(rules);
  } catch (error) {
    logger.error(`获取响应修改规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取单个响应修改规则
router.get('/response-rules/:id', async (req, res) => {
  try {
    const rule = await db.findResponseRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: '找不到指定的响应修改规则' });
    }
    return res.json(rule);
  } catch (error) {
    logger.error(`获取响应修改规则详情错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 创建新的响应修改规则
router.post('/response-rules', async (req, res) => {
  try {
    const result = await db.addResponseRule(req.body);
    if (result.success) {
      return res.status(201).json(result.rule);
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`创建响应修改规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 更新响应修改规则
router.put('/response-rules/:id', async (req, res) => {
  try {
    const result = await db.updateResponseRule(req.params.id, req.body);
    if (result.success) {
      return res.json(result.rule);
    } else {
      return res.status(404).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`更新响应修改规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 删除响应修改规则
router.delete('/response-rules/:id', async (req, res) => {
  try {
    const result = await db.deleteResponseRule(req.params.id);
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `已删除响应修改规则`,
        deletedCount: result.deletedCount 
      });
    } else {
      return res.status(404).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`删除响应修改规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 启用/禁用响应修改规则
router.patch('/response-rules/:id/status', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({ error: '缺少 enabled 参数' });
    }
    
    const result = await db.updateResponseRuleStatus(req.params.id, enabled);
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `规则已${enabled ? '启用' : '禁用'}`,
        rule: result.rule 
      });
    } else {
      return res.status(404).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`更新响应修改规则状态错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------------- 请求拦截规则管理 --------------------------

// 获取所有请求拦截规则
router.get('/intercept-rules', async (req, res) => {
  try {
    const rules = await db.getAllInterceptRules();
    return res.json(rules);
  } catch (error) {
    logger.error(`获取请求拦截规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取单个请求拦截规则
router.get('/intercept-rules/:id', async (req, res) => {
  try {
    const rule = await db.findInterceptRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: '找不到指定的请求拦截规则' });
    }
    return res.json(rule);
  } catch (error) {
    logger.error(`获取请求拦截规则详情错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 创建新的请求拦截规则
router.post('/intercept-rules', async (req, res) => {
  try {
    const result = await db.addInterceptRule(req.body);
    if (result.success) {
      return res.status(201).json(result.rule);
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`创建请求拦截规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 更新请求拦截规则
router.put('/intercept-rules/:id', async (req, res) => {
  try {
    const result = await db.updateInterceptRule(req.params.id, req.body);
    if (result.success) {
      return res.json(result.rule);
    } else {
      return res.status(404).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`更新请求拦截规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 删除请求拦截规则
router.delete('/intercept-rules/:id', async (req, res) => {
  try {
    const result = await db.deleteInterceptRule(req.params.id);
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `已删除请求拦截规则`,
        deletedCount: result.deletedCount 
      });
    } else {
      return res.status(404).json({ error: result.error });
    }
  } catch (error) {
    logger.error(`删除请求拦截规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 启用请求拦截规则
router.patch('/intercept-rules/:id/enable', async (req, res) => {
  try {
    const result = await db.updateInterceptRuleStatus(req.params.id, true);
    if (result.success) {
      return res.json({
        success: true,
        message: "规则已启用",
        rule: result.rule
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.error || '未找到指定规则'
      });
    }
  } catch (error) {
    logger.error(`启用请求拦截规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 禁用请求拦截规则
router.patch('/intercept-rules/:id/disable', async (req, res) => {
  try {
    const result = await db.updateInterceptRuleStatus(req.params.id, false);
    if (result.success) {
      return res.json({
        success: true,
        message: "规则已禁用",
        rule: result.rule
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.error || '未找到指定规则'
      });
    }
  } catch (error) {
    logger.error(`禁用请求拦截规则错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------------- 拦截请求管理 --------------------------

// 分页查询拦截请求列表（支持主机过滤、关键字/正则查询）
router.get('/intercepted-requests-paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const host = req.query.host || null;
    const keyword = req.query.keyword || null;
    const isRegex = req.query.isRegex === 'true';
    const includeAutoReleased = req.query.includeAutoReleased !== 'false'; // 默认为true

    const result = await db.getInterceptedRequestsPaginated(page, limit, host, keyword, isRegex, includeAutoReleased);
    
    // 添加拦截状态信息
    const interceptStatus = db.getInterceptStatus();
    result.interceptStatus = interceptStatus;
    
    return res.json(result);
  } catch (error) {
    logger.error(`分页查询拦截请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取指定ID的拦截请求
router.get('/intercepted-requests/:id', async (req, res) => {
  try {
    const request = await db.findInterceptedRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: '拦截请求不存在' });
    }
    return res.json(request);
  } catch (error) {
    logger.error(`获取拦截请求详情错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 删除指定ID的拦截请求
router.delete('/intercepted-requests/:id', async (req, res) => {
  try {
    const result = await db.deleteInterceptedRequestById(req.params.id);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `已删除拦截请求`, 
        deletedCount: result.deletedCount 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        message: result.message || '找不到指定拦截请求'
      });
    }
  } catch (error) {
    logger.error(`删除拦截请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 放行指定ID的拦截请求
router.post('/intercepted-requests/:id/release', async (req, res) => {
  try {
    const result = await db.releaseInterceptedRequest(req.params.id);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: `已放行拦截请求`,
        request: result.request,
        response: result.response
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        message: result.message || '找不到指定拦截请求'
      });
    }
  } catch (error) {
    logger.error(`放行拦截请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 清空所有拦截请求
router.delete('/intercepted-requests', async (req, res) => {
  try {
    // 确保请求包含确认标志
    if (req.body.confirm !== 'YES_RELEASE_ALL') {
      return res.status(400).json({ 
        success: false, 
        message: '请提供确认标志以清空所有拦截请求' 
      });
    }
    
    const result = await db.clearAllInterceptedRequests();
    
    if (result.success) {
      return res.json({
        success: true,
        message: `已清空所有拦截请求，共 ${result.deletedCount} 条`
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.error || '清空拦截请求失败'
      });
    }
  } catch (error) {
    logger.error(`清空拦截请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 批量放行拦截请求
router.post('/intercepted-requests/batch-release', async (req, res) => {
  try {
    if (!req.body.ids || !Array.isArray(req.body.ids) || req.body.ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供要放行的请求ID数组' 
      });
    }
    
    const ids = req.body.ids;
    const results = [];
    let releasedCount = 0;
    
    // 逐个放行请求
    for (const id of ids) {
      const result = await db.releaseInterceptedRequest(id);
      results.push({
        id,
        success: result.success,
        message: result.message,
        response: result.response
      });
      
      if (result.success) {
        releasedCount++;
      }
    }
    
    return res.json({
      success: true,
      message: `成功放行 ${releasedCount} 条拦截请求`,
      details: results
    });
  } catch (error) {
    logger.error(`批量放行拦截请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取拦截状态
router.get('/intercept-status', (req, res) => {
  try {
    const status = db.getInterceptStatus();
    return res.json(status);
  } catch (error) {
    logger.error(`获取拦截状态错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 设置拦截状态
router.post('/intercept-status', (req, res) => {
  try {
    const enabled = req.body.enabled;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: '请提供有效的启用状态（布尔值）' 
      });
    }
    
    const status = db.setInterceptStatus(enabled);
    
    return res.json({
      success: true,
      message: enabled ? '已启用请求拦截' : '已禁用请求拦截',
      status
    });
  } catch (error) {
    logger.error(`设置拦截状态错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取拦截请求统计信息
router.get('/intercept-stats', async (req, res) => {
  try {
    const stats = await db.getInterceptStats();
    return res.json(stats);
  } catch (error) {
    logger.error(`获取拦截请求统计错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------------- 火山大模型 API --------------------------

// 获取火山大模型列表
router.get('/volcengine/models', async (req, res) => {
  try {
    // 这个接口目前只返回配置好的模型列表
    const models = [
      {
        id: 'doubao-1-5-pro-32k-250115',
        name: '豆包大模型专业版',
        maxTokens: '12k',
        description: '新一代专业版大模型，单价不提升的同时，模型能力有大幅提升，在知识（MMLU_PRO：80.2； GPQA：66.2）、代码（FullStackBench：65.1）、推理（DROP：92.6）、中文（C-Eval：91.5）等相关的多项测评中获得高分，达到行业SOTA水平。'
      }
    ];
    
    return res.json({
      success: true,
      models: models
    });
  } catch (error) {
    logger.error(`获取火山大模型列表错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 调用火山大模型接口
router.post('/volcengine/chat', async (req, res) => {
  try {
    const { model, messages, apiKey, temperature, max_tokens, stream } = req.body;
    
    if (!model) {
      return res.status(400).json({ error: '缺少模型ID参数' });
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '缺少对话消息参数' });
    }

    
    // 优先使用请求中提供的apiKey，否则使用环境变量
    const actualApiKey = apiKey || process.env.ARK_API_KEY;
    
    if (!actualApiKey) {
      return res.status(400).json({ error: '缺少API密钥参数，请在请求中提供apiKey或设置环境变量ARK_API_KEY' });
    }
    
    // 构建请求参数
    const requestData = {
      model: model,
      messages: messages,
      temperature: temperature || 0,
      // max_tokens: max_tokens || 1024
    };
    
    // 如果提供了max_tokens，则添加到请求中
    if (max_tokens) {
      requestData.max_tokens = max_tokens;
    }
    
    // 添加stream参数
    if (stream) {
      requestData.stream = true;
    }
    
    // 处理流式响应
    if (stream) {
      // 设置响应头，支持流式传输
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        // 使用axios发送请求，不使用await以实现真正的流式传输
        axios.post(
          'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${actualApiKey}`
            },
            responseType: 'stream'
          }
        )
        .then(response => {
          // 将火山API的响应流转发给客户端
          response.data.on('data', (chunk) => {
            try {
              const chunkStr = chunk.toString();
              // 火山模型API通常返回data: {json}格式的SSE数据
              res.write(chunkStr + '\n');
              if (res.flush) res.flush();
            } catch (e) {
              logger.error(`处理流式数据出错: ${e.message}`);
            }
          });
          
          response.data.on('end', () => {
            res.end();
          });
          
          response.data.on('error', (err) => {
            logger.error(`流式响应错误: ${err.message}`);
            res.end(`data: [ERROR] ${err.message}\n\n`);
          });
        })
        .catch(error => {
          // 处理流式响应过程中的错误
          const errorMessage = error.response
            ? `API流式处理错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`
            : error.message;
          
          logger.error(`调用火山大模型流式接口错误: ${errorMessage}`);
          res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
          res.end();
        });
        
        // 不要在这里使用return，允许请求继续处理
      } catch (error) {
        // 处理axios初始化错误
        logger.error(`初始化流式请求错误: ${error.message}`);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      // 非流式响应，保持原有逻辑
      try {
        const response = await axios.post(
          'https://ark.cn-beijing.volces.com/api/v3/chat/completions', 
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${actualApiKey}`
            }
          }
        );
        
        return res.json({
          success: true,
          result: response.data
        });
      } catch (error) {
        // 处理API调用错误
        const errorMessage = error.response 
          ? `API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}` 
          : error.message;
        
        logger.error(`调用火山大模型错误: ${errorMessage}`);
        return res.status(error.response ? error.response.status : 500).json({ 
          error: errorMessage 
        });
      }
    }
  } catch (error) {
    logger.error(`处理火山大模型请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 获取文本嵌入向量
router.post('/volcengine/embeddings', async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '缺少文本参数' });
    }
    
    // 优先使用请求中提供的apiKey，否则使用环境变量
    const actualApiKey = apiKey || process.env.ARK_API_KEY;
    
    if (!actualApiKey) {
      return res.status(400).json({ error: '缺少API密钥参数，请在请求中提供apiKey或设置环境变量ARK_API_KEY' });
    }
    
    // 构建请求参数
    const requestData = {
      model: 'doubao-embedding',
      input: Array.isArray(text) ? text : [text]
    };
    
    // 调用火山大模型嵌入API
    try {
      const response = await axios.post(
        'https://ark.cn-beijing.volces.com/api/v3/embeddings', 
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${actualApiKey}`
          }
        }
      );
      
      return res.json({
        success: true,
        result: response.data
      });
    } catch (error) {
      // 处理API调用错误
      const errorMessage = error.response 
        ? `API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}` 
        : error.message;
      
      logger.error(`获取文本嵌入向量错误: ${errorMessage}`);
      return res.status(error.response ? error.response.status : 500).json({ 
        error: errorMessage 
      });
    }
  } catch (error) {
    logger.error(`处理文本嵌入向量请求错误: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router; 
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../config/env.js';
import { generateRequestId } from '../utils/helpers.js';
import db from '../models/db.js';

/**
 * 处理重写请求捕获
 */
export async function captureRequest(req, res) {
  try {
    const requestId = req.requestId || generateRequestId();
    logger.info(`[${requestId}] 接收到重写脚本请求捕获: ${req.body.method} ${req.body.url}`);

    // 保存捕获的请求信息
    const capturedRequest = {
      ...req.body,
      capture_type: 'rewrite_request',
      server_timestamp: new Date().toISOString(),
      server_request_id: requestId
    };

    // 保存请求到数据库
    await db.saveRequest(capturedRequest);
    logger.info(`[${requestId}] 重写捕获请求已保存到数据库`);

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '请求捕获成功',
      request_id: capturedRequest.id || requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${req.requestId}] 处理重写请求捕获错误: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '处理请求捕获失败',
      error: error.message
    });
  }
}

/**
 * 处理重写响应捕获
 */
export async function captureResponse(req, res) {
  try {
    const requestId = req.requestId || generateRequestId();
    logger.info(`[${requestId}] 接收到重写脚本响应捕获: ${req.body.url}`);

    // 保存捕获的响应信息
    const capturedResponse = {
      ...req.body,
      method: req.body.method || 'UNKNOWN', // 确保保存请求方法
      capture_type: 'rewrite_response',
      server_timestamp: new Date().toISOString(),
      server_request_id: requestId
    };

    // 保存响应到数据库
    await db.saveResponse(capturedResponse);
    logger.info(`[${requestId}] 重写捕获响应已保存到数据库`);

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '响应捕获成功',
      request_id: capturedResponse.request_id || requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[${req.requestId}] 处理重写响应捕获错误: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '处理响应捕获失败',
      error: error.message
    });
  }
}

/**
 * 处理重写响应修改
 */
export async function modifyResponse(req, res) {
  try {
    const requestId = req.requestId || generateRequestId();
    const originalUrl = req.body.url;
    logger.info(`[${requestId}] 接收到重写脚本响应修改请求: ${originalUrl}`);

    // 保存捕获的响应信息
    const capturedResponse = {
      ...req.body,
      method: req.body.method || 'UNKNOWN', // 确保保存请求方法
      capture_type: 'rewrite_response_modify',
      server_timestamp: new Date().toISOString(),
      server_request_id: requestId
    };

    // 保存响应到数据库
    await db.saveResponse(capturedResponse);
    logger.debug(`[${requestId}] 重写捕获响应修改请求已保存到数据库`);

    // 应用响应修改规则
    const modifiedResponse = await db.applyResponseRules(capturedResponse);

    // 如果找到了匹配的规则并进行了修改
    if (modifiedResponse) {
      // 记录修改后的响应到数据库
      modifiedResponse.request_id = capturedResponse.request_id || requestId;
      await db.saveModifiedResponse(modifiedResponse);
      
      // 记录规则匹配信息
      if (modifiedResponse.matchedRulesCount > 1) {
        logger.info(`[${requestId}] 匹配到多个规则，使用最新的规则: ${modifiedResponse.ruleName} (ID: ${modifiedResponse.matchedRule})`);
        logger.info(`[${requestId}] 共匹配 ${modifiedResponse.matchedRulesCount} 个规则`);
      } else {
        logger.info(`[${requestId}] 匹配到规则: ${modifiedResponse.ruleName} (ID: ${modifiedResponse.matchedRule})`);
      }
      
      logger.debug(`[${requestId}] 修改后的响应已保存到数据库`);

      // 清理返回给客户端的响应，移除内部属性
      const clientResponse = {
        modified: modifiedResponse.modified,
        status: modifiedResponse.status,
        headers: modifiedResponse.headers,
        body: modifiedResponse.body
      };

      logger.info(`[${requestId}] 返回修改后的响应`);
      return res.status(200).json(clientResponse);
    } else {
      // 不修改响应
      logger.info(`[${requestId}] 未匹配到任何响应修改规则，不修改响应`);
      return res.status(200).json({
        modified: false
      });
    }
  } catch (error) {
    logger.error(`[${req.requestId}] 处理响应修改错误: ${error.message}`);
    // 出错时，返回不修改的标志
    return res.status(200).json({
      modified: false,
      error: error.message
    });
  }
}

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
      capture_type: 'rewrite_response_modify',
      server_timestamp: new Date().toISOString(),
      server_request_id: requestId
    };

    // 保存响应到数据库
    await db.saveResponse(capturedResponse);
    logger.debug(`[${requestId}] 重写捕获响应修改请求已保存到数据库`);

    // 应用响应修改规则
    let modifiedResponse = null;
    let shouldModify = false;

    // 从URL中提取关键信息
    const urlObj = new URL(originalUrl);

    // URL匹配规则 - 根据需要添加更多规则
    // 示例规则1：修改 baidu.com/get/1 返回
    if (urlObj.hostname.includes('baidu.com') && urlObj.pathname === '/get/1') {
      shouldModify = true;
      logger.info(`[${requestId}] 匹配规则：百度 /get/1 接口`);

      try {
        // 解析原始响应体
        const originalBody = req.body.body ? JSON.parse(req.body.body) : {};

        // 修改响应体
        const modifiedBody = {
          ...originalBody,
          text: 2  // 修改值
        };

        modifiedResponse = {
          modified: true,
          status: req.body.status || 200,
          headers: req.body.headers || {},
          body: JSON.stringify(modifiedBody)
        };

        logger.info(`[${requestId}] 已修改响应体：${JSON.stringify(modifiedBody)}`);
      } catch (parseError) {
        logger.error(`[${requestId}] 响应体JSON解析失败: ${parseError.message}`);
        // 解析失败时，不修改响应
        shouldModify = false;
      }
    }

    // 示例规则2：特定API响应修改
    else if (urlObj.pathname.includes('/api/example')) {
      shouldModify = true;
      logger.info(`[${requestId}] 匹配规则：特定API响应修改`);

      // 完全替换响应体
      modifiedResponse = {
        modified: true,
        status: 200,
        headers: req.body.headers || {},
        body: JSON.stringify({
          success: true,
          message: "这是一个被修改的响应",
          data: {
            id: 12345,
            name: "修改后的数据",
            timestamp: new Date().toISOString()
          }
        })
      };
    }

    // 如果应用规则后决定修改响应
    if (shouldModify && modifiedResponse) {
      // 记录修改后的响应到数据库
      modifiedResponse.request_id = capturedResponse.request_id || requestId;
      modifiedResponse.original_url = originalUrl;
      await db.saveModifiedResponse(modifiedResponse);
      logger.debug(`[${requestId}] 修改后的响应已保存到数据库`);

      logger.info(`[${requestId}] 返回修改后的响应`);
      return res.status(200).json(modifiedResponse);
    } else {
      // 不修改响应
      logger.info(`[${requestId}] 不需要修改响应`);
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

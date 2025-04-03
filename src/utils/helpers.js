import fs from 'fs';
import path from 'path';
import config from '../config/env.js';
import logger from './logger.js';

// 添加请求ID计数器用于处理同一时间点的多个请求
let requestCounter = 0;

/**
 * 生成易读的请求ID
 * 格式: YYYYMMDD_HHMMSS_XXX (XXX为计数器以避免冲突)
 */
export function generateRequestId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // 每次生成ID时增加计数器
  requestCounter = (requestCounter + 1) % 1000;
  const counter = String(requestCounter).padStart(3, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${counter}`;
}

/**
 * 获取磁盘使用信息
 */
export function getDiskUsageInfo() {
  try {
    const stats = fs.statfsSync(config.requestsDir);
    const totalSpace = stats.blocks * stats.bsize;
    const freeSpace = stats.bfree * stats.bsize;
    const usedSpace = totalSpace - freeSpace;
    
    return {
      total_bytes: totalSpace,
      free_bytes: freeSpace,
      used_bytes: usedSpace,
      used_percent: Math.round((usedSpace / totalSpace) * 100)
    };
  } catch (error) {
    logger.warn(`获取磁盘使用信息失败: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * 清理旧请求文件
 */
export function cleanupOldRequests() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.retentionDays);
  
  fs.readdir(config.requestsDir, (err, files) => {
    if (err) {
      return logger.error(`清理旧请求记录错误: ${err.message}`);
    }
    
    files.forEach(file => {
      const filePath = path.join(config.requestsDir, file);
      fs.stat(filePath, (err, stat) => {
        if (err) {
          return logger.error(`获取文件信息错误: ${err.message}`);
        }
        
        if (stat.mtime < cutoff) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error(`删除旧文件错误: ${err.message}`);
            } else {
              logger.info(`自动清理旧请求: ${file}`);
            }
          });
        }
      });
    });
  });
} 
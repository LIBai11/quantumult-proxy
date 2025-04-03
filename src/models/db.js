import { join } from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import config from '../config/env.js';
import fs from 'fs';
import path from 'path';

// 创建数据库目录
const dbDir = join(config.rootDir, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库文件路径
const requestsDbPath = join(dbDir, 'requests.json');
const responsesDbPath = join(dbDir, 'responses.json');
const modifiedResponsesDbPath = join(dbDir, 'modified_responses.json');

// 确保各数据库文件存在
function ensureDbFile(filePath, initialData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
  }
}

// 确保所有数据库文件存在
ensureDbFile(requestsDbPath, []);
ensureDbFile(responsesDbPath, []);
ensureDbFile(modifiedResponsesDbPath, []);

// 创建各数据库适配器和实例
const requestsAdapter = new JSONFile(requestsDbPath);
const responsesAdapter = new JSONFile(responsesDbPath);
const modifiedResponsesAdapter = new JSONFile(modifiedResponsesDbPath);

const requestsDb = new Low(requestsAdapter, []);
const responsesDb = new Low(responsesAdapter, []);
const modifiedResponsesDb = new Low(modifiedResponsesAdapter, []);

// 初始化数据库结构
async function initDb() {
  try {
    // 读取所有数据库
    await Promise.all([
      requestsDb.read(),
      responsesDb.read(),
      modifiedResponsesDb.read()
    ]);
    
    // 初始化默认值
    requestsDb.data ||= [];
    responsesDb.data ||= [];
    modifiedResponsesDb.data ||= [];
    
    // 保存数据
    await Promise.all([
      requestsDb.write(),
      responsesDb.write(),
      modifiedResponsesDb.write()
    ]);
  } catch (error) {
    console.error('初始化数据库错误:', error);
  }
}

// 保存请求
async function saveRequest(request) {
  try {
    await requestsDb.read();
    requestsDb.data.push(request);
    await requestsDb.write();
    return request;
  } catch (error) {
    console.error('保存请求错误:', error);
    return request;
  }
}

// 保存响应
async function saveResponse(response) {
  try {
    await responsesDb.read();
    responsesDb.data.push(response);
    await responsesDb.write();
    return response;
  } catch (error) {
    console.error('保存响应错误:', error);
    return response;
  }
}

// 保存修改后的响应
async function saveModifiedResponse(response) {
  try {
    await modifiedResponsesDb.read();
    modifiedResponsesDb.data.push(response);
    await modifiedResponsesDb.write();
    return response;
  } catch (error) {
    console.error('保存修改响应错误:', error);
    return response;
  }
}

// 查询请求
async function findRequestById(requestId) {
  try {
    await requestsDb.read();
    return requestsDb.data.find(req => req.id === requestId || req.server_request_id === requestId);
  } catch (error) {
    console.error('查询请求错误:', error);
    return null;
  }
}

// 查询响应
async function findResponseByRequestId(requestId) {
  try {
    await responsesDb.read();
    return responsesDb.data.find(res => res.request_id === requestId);
  } catch (error) {
    console.error('查询响应错误:', error);
    return null;
  }
}

// 查询所有请求
async function getAllRequests() {
  try {
    await requestsDb.read();
    return requestsDb.data;
  } catch (error) {
    console.error('查询所有请求错误:', error);
    return [];
  }
}

// 查询所有响应
async function getAllResponses() {
  try {
    await responsesDb.read();
    return responsesDb.data;
  } catch (error) {
    console.error('查询所有响应错误:', error);
    return [];
  }
}

// 查询所有修改后的响应
async function getAllModifiedResponses() {
  try {
    await modifiedResponsesDb.read();
    return modifiedResponsesDb.data;
  } catch (error) {
    console.error('查询所有修改响应错误:', error);
    return [];
  }
}

// 获取所有主机列表
async function getAllHosts() {
  try {
    await requestsDb.read();
    // 提取所有请求中的主机，并去重
    const hosts = new Set();
    for (const request of requestsDb.data) {
      if (request.url) {
        try {
          const url = new URL(request.url);
          hosts.add(url.hostname);
        } catch (urlError) {
          // 忽略无效URL
        }
      }
    }
    return Array.from(hosts);
  } catch (error) {
    console.error('获取主机列表错误:', error);
    return [];
  }
}

// 分页查询请求
async function getRequestsPaginated(page = 1, limit = 20, host = null, keyword = null, isRegex = false) {
  try {
    await requestsDb.read();
    let filteredRequests = [...requestsDb.data];
    
    // 按主机筛选
    if (host) {
      filteredRequests = filteredRequests.filter(req => {
        if (req.url) {
          try {
            const url = new URL(req.url);
            return url.hostname === host;
          } catch (e) {
            return false;
          }
        }
        return false;
      });
    }
    
    // 按关键字筛选
    if (keyword) {
      if (isRegex) {
        // 使用正则表达式搜索
        try {
          const regex = new RegExp(keyword, 'i');
          filteredRequests = filteredRequests.filter(req => 
            regex.test(req.url) || 
            regex.test(req.method) || 
            regex.test(JSON.stringify(req.headers)) || 
            (req.body && regex.test(req.body))
          );
        } catch (regexError) {
          console.error('正则表达式错误:', regexError);
          // 正则表达式无效时，退回到普通搜索
          filteredRequests = filteredRequests.filter(req => 
            req.url?.includes(keyword) || 
            req.method?.includes(keyword) || 
            JSON.stringify(req.headers)?.includes(keyword) || 
            (req.body && req.body.includes(keyword))
          );
        }
      } else {
        // 普通关键字搜索
        filteredRequests = filteredRequests.filter(req => 
          req.url?.includes(keyword) || 
          req.method?.includes(keyword) || 
          JSON.stringify(req.headers)?.includes(keyword) || 
          (req.body && req.body.includes(keyword))
        );
      }
    }
    
    // 计算分页数据
    const total = filteredRequests.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // 按时间倒序排序（最新的在前面）
    filteredRequests.sort((a, b) => {
      const dateA = a.server_timestamp ? new Date(a.server_timestamp) : new Date(0);
      const dateB = b.server_timestamp ? new Date(b.server_timestamp) : new Date(0);
      return dateB - dateA;
    });
    
    // 获取当前页的数据
    const pageItems = filteredRequests.slice(startIndex, endIndex);
    
    return {
      data: pageItems,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  } catch (error) {
    console.error('分页查询请求错误:', error);
    return {
      data: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    };
  }
}

// 删除指定ID的请求及其响应
async function deleteRequestById(requestId) {
  try {
    // 删除请求
    await requestsDb.read();
    const initialLength = requestsDb.data.length;
    requestsDb.data = requestsDb.data.filter(req => req.id !== requestId && req.server_request_id !== requestId);
    await requestsDb.write();
    
    // 删除响应
    await responsesDb.read();
    responsesDb.data = responsesDb.data.filter(res => res.request_id !== requestId && res.server_request_id !== requestId);
    await responsesDb.write();
    
    // 删除修改后的响应
    await modifiedResponsesDb.read();
    modifiedResponsesDb.data = modifiedResponsesDb.data.filter(res => res.request_id !== requestId && res.server_request_id !== requestId);
    await modifiedResponsesDb.write();
    
    // 判断是否成功删除
    const deletedCount = initialLength - requestsDb.data.length;
    return {
      success: deletedCount > 0,
      deletedCount
    };
  } catch (error) {
    console.error('删除请求错误:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message
    };
  }
}

// 删除指定主机的所有请求及其响应
async function deleteRequestsByHost(host) {
  try {
    // 找出该主机的所有请求ID
    await requestsDb.read();
    const requestIds = [];
    const initialLength = requestsDb.data.length;
    
    requestsDb.data = requestsDb.data.filter(req => {
      if (req.url) {
        try {
          const url = new URL(req.url);
          if (url.hostname === host) {
            // 记录要删除的请求ID
            requestIds.push(req.id || req.server_request_id);
            return false; // 从数组中移除
          }
        } catch (e) {
          // URL解析错误，保留该记录
        }
      }
      return true; // 保留记录
    });
    
    await requestsDb.write();
    
    // 删除相关响应
    await responsesDb.read();
    responsesDb.data = responsesDb.data.filter(res => 
      !requestIds.includes(res.request_id) && !requestIds.includes(res.server_request_id)
    );
    await responsesDb.write();
    
    // 删除相关修改后的响应
    await modifiedResponsesDb.read();
    modifiedResponsesDb.data = modifiedResponsesDb.data.filter(res => 
      !requestIds.includes(res.request_id) && !requestIds.includes(res.server_request_id)
    );
    await modifiedResponsesDb.write();
    
    // 判断是否成功删除
    const deletedCount = initialLength - requestsDb.data.length;
    return {
      success: true,
      deletedCount,
      affectedIds: requestIds
    };
  } catch (error) {
    console.error('删除主机请求错误:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message
    };
  }
}

// 获取请求统计信息
async function getRequestsStats() {
  try {
    await requestsDb.read();
    await responsesDb.read();
    await modifiedResponsesDb.read();
    
    // 提取所有主机
    const hostMap = {};
    let totalRequests = requestsDb.data.length;
    let totalResponses = responsesDb.data.length;
    let totalModifiedResponses = modifiedResponsesDb.data.length;
    
    // 计算每个主机的请求数
    for (const request of requestsDb.data) {
      if (request.url) {
        try {
          const url = new URL(request.url);
          const hostname = url.hostname;
          
          if (!hostMap[hostname]) {
            hostMap[hostname] = {
              hostname,
              requestCount: 0,
              responseCount: 0,
              modifiedCount: 0,
              methods: {}
            };
          }
          
          hostMap[hostname].requestCount++;
          
          // 统计请求方法
          const method = request.method || 'UNKNOWN';
          if (!hostMap[hostname].methods[method]) {
            hostMap[hostname].methods[method] = 0;
          }
          hostMap[hostname].methods[method]++;
          
        } catch (e) {
          // 忽略无效URL
        }
      }
    }
    
    // 计算每个主机的响应数和修改响应数
    for (const response of responsesDb.data) {
      if (response.url) {
        try {
          const url = new URL(response.url);
          const hostname = url.hostname;
          
          if (hostMap[hostname]) {
            hostMap[hostname].responseCount++;
          }
        } catch (e) {
          // 忽略无效URL
        }
      }
    }
    
    for (const modResponse of modifiedResponsesDb.data) {
      if (modResponse.url) {
        try {
          const url = new URL(modResponse.url);
          const hostname = url.hostname;
          
          if (hostMap[hostname]) {
            hostMap[hostname].modifiedCount++;
          }
        } catch (e) {
          // 忽略无效URL
        }
      }
    }
    
    return {
      totalRequests,
      totalResponses,
      totalModifiedResponses,
      hosts: Object.values(hostMap),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取请求统计错误:', error);
    return {
      totalRequests: 0,
      totalResponses: 0,
      totalModifiedResponses: 0,
      hosts: [],
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
}

// 获取数据库路径
function getDbPaths() {
  return {
    requestsDbPath,
    responsesDbPath,
    modifiedResponsesDbPath,
    dbDir
  };
}

// 初始化数据库
initDb();

export default {
  saveRequest,
  saveResponse,
  saveModifiedResponse,
  findRequestById,
  findResponseByRequestId,
  getAllRequests,
  getAllResponses,
  getAllModifiedResponses,
  getDbPaths,
  getAllHosts,
  getRequestsPaginated,
  deleteRequestById,
  deleteRequestsByHost,
  getRequestsStats,
  requestsDb,
  responsesDb,
  modifiedResponsesDb
}; 
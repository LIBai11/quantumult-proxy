import { join } from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import config from '../config/env.js';
import fs from 'fs';

// 创建数据库目录
const dbDir = join(config.rootDir, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库文件路径
const requestsDbPath = join(dbDir, 'requests.json');
const responsesDbPath = join(dbDir, 'responses.json');
const modifiedResponsesDbPath = join(dbDir, 'modified_responses.json');
const captureRulesDbPath = join(dbDir, 'capture_rules.json');
const responseRulesDbPath = join(dbDir, 'response_rules.json');

// 捕获状态 - true表示正在捕获，false表示暂停
let captureEnabled = true;

// 捕获规则列表 - 用于存储特定主机和请求方法的捕获规则
let captureRules = [];

// 响应修改规则列表 - 用于存储特定URL的响应修改规则
let responseRules = [];

// 获取当前捕获状态
function getCaptureStatus() {
  return {
    enabled: captureEnabled,
    status: captureEnabled ? 'active' : 'paused',
    timestamp: new Date().toISOString()
  };
}

// 设置捕获状态
function setCaptureStatus(enabled) {
  captureEnabled = !!enabled;
  return getCaptureStatus();
}

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
ensureDbFile(captureRulesDbPath, []);
ensureDbFile(responseRulesDbPath, []);

// 创建各数据库适配器和实例
const requestsAdapter = new JSONFile(requestsDbPath);
const responsesAdapter = new JSONFile(responsesDbPath);
const modifiedResponsesAdapter = new JSONFile(modifiedResponsesDbPath);
const captureRulesAdapter = new JSONFile(captureRulesDbPath);
const responseRulesAdapter = new JSONFile(responseRulesDbPath);

const requestsDb = new Low(requestsAdapter, []);
const responsesDb = new Low(responsesAdapter, []);
const modifiedResponsesDb = new Low(modifiedResponsesAdapter, []);
const captureRulesDb = new Low(captureRulesAdapter, []);
const responseRulesDb = new Low(responseRulesAdapter, []);

// 初始化数据库结构
async function initDb() {
  try {
    // 读取所有数据库
    await Promise.all([
      requestsDb.read(),
      responsesDb.read(),
      modifiedResponsesDb.read(),
      captureRulesDb.read(),
      responseRulesDb.read()
    ]);
    
    // 初始化默认值
    requestsDb.data ||= [];
    responsesDb.data ||= [];
    modifiedResponsesDb.data ||= [];
    captureRulesDb.data ||= [];
    responseRulesDb.data ||= [];
    
    // 将捕获规则加载到内存中
    captureRules = [...captureRulesDb.data];
    
    // 将响应修改规则加载到内存中
    responseRules = [...responseRulesDb.data];
    
    // 保存数据
    await Promise.all([
      requestsDb.write(),
      responsesDb.write(),
      modifiedResponsesDb.write(),
      captureRulesDb.write(),
      responseRulesDb.write()
    ]);
  } catch (error) {
    console.error('初始化数据库错误:', error);
  }
}

// 保存请求
async function saveRequest(request) {
  try {
    // 如果捕获被暂停，直接返回请求而不保存
    if (!captureEnabled) {
      return request;
    }
    
    // 检查是否匹配任何捕获规则
    if (captureRules.length > 0 && !matchesCaptureRules(request)) {
      return request;
    }
    
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
    // 如果捕获被暂停，直接返回响应而不保存
    if (!captureEnabled) {
      return response;
    }
    
    // 检查是否匹配任何捕获规则
    if (captureRules.length > 0 && !matchesCaptureRules(response)) {
      return response;
    }
    
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
    // 如果捕获被暂停，直接返回响应而不保存
    if (!captureEnabled) {
      return response;
    }
    
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
    await responsesDb.read();
    // 提取所有响应中的主机，并去重
    const hosts = new Set();
    for (const response of responsesDb.data) {
      if (response.url) {
        try {
          const url = new URL(response.url);
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

// 获取分页主机列表（支持关键字搜索）
async function getHostsPaginated(page = 1, limit = 20, keyword = null) {
  try {
    // 获取所有主机
    const allHosts = await getAllHosts();
    
    // 按关键字筛选
    let filteredHosts = allHosts;
    if (keyword) {
      filteredHosts = allHosts.filter(host => 
        host.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    
    // 计算分页数据
    const total = filteredHosts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // 按字母顺序排序
    filteredHosts.sort((a, b) => a.localeCompare(b));
    
    // 获取当前页的数据
    const pageItems = filteredHosts.slice(startIndex, endIndex);
    
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
    console.error('分页查询主机错误:', error);
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
    await responsesDb.read();
    await modifiedResponsesDb.read();
    
    // 提取所有主机
    const hostMap = {};
    let totalResponses = responsesDb.data.length;
    let totalModifiedResponses = modifiedResponsesDb.data.length;
    
    // 计算每个主机的响应数
    for (const response of responsesDb.data) {
      if (response.url) {
        try {
          const url = new URL(response.url);
          const hostname = url.hostname;
          
          if (!hostMap[hostname]) {
            hostMap[hostname] = {
              hostname,
              responseCount: 0,
              modifiedCount: 0,
              methods: {}
            };
          }
          
          hostMap[hostname].responseCount++;
          
          // 统计请求方法
          const method = response.method || 'UNKNOWN';
          if (!hostMap[hostname].methods[method]) {
            hostMap[hostname].methods[method] = 0;
          }
          hostMap[hostname].methods[method]++;
          
        } catch (e) {
          // 忽略无效URL
        }
      }
    }
    
    // 计算每个主机的修改响应数
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
      totalResponses,
      totalModifiedResponses,
      hosts: Object.values(hostMap),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取响应统计错误:', error);
    return {
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
    rootDir: dbDir,
    requestsDbPath,
    responsesDbPath,
    modifiedResponsesDbPath,
    captureRulesDbPath,
    responseRulesDbPath
  };
}

// 分页查询响应
async function getResponsesPaginated(page = 1, limit = 20, host = null, keyword = null, isRegex = false) {
  try {
    await responsesDb.read();
    let filteredResponses = [...responsesDb.data];
    
    // 按主机筛选
    if (host) {
      filteredResponses = filteredResponses.filter(resp => {
        if (resp.url) {
          try {
            const url = new URL(resp.url);
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
          filteredResponses = filteredResponses.filter(resp => 
            regex.test(resp.url) || 
            regex.test(JSON.stringify(resp.headers)) || 
            (resp.body && regex.test(resp.body)) ||
            (resp.status && regex.test(String(resp.status)))
          );
        } catch (regexError) {
          console.error('正则表达式错误:', regexError);
          // 正则表达式无效时，退回到普通搜索
          filteredResponses = filteredResponses.filter(resp => 
            resp.url?.includes(keyword) || 
            JSON.stringify(resp.headers)?.includes(keyword) || 
            (resp.body && resp.body.includes(keyword)) ||
            (resp.status && String(resp.status).includes(keyword))
          );
        }
      } else {
        // 普通关键字搜索
        filteredResponses = filteredResponses.filter(resp => 
          resp.url?.includes(keyword) || 
          JSON.stringify(resp.headers)?.includes(keyword) || 
          (resp.body && resp.body.includes(keyword)) ||
          (resp.status && String(resp.status).includes(keyword))
        );
      }
    }
    
    // 计算分页数据
    const total = filteredResponses.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // 按时间倒序排序（最新的在前面）
    filteredResponses.sort((a, b) => {
      const dateA = a.server_timestamp ? new Date(a.server_timestamp) : new Date(0);
      const dateB = b.server_timestamp ? new Date(b.server_timestamp) : new Date(0);
      return dateB - dateA;
    });
    
    // 获取当前页的数据
    const pageItems = filteredResponses.slice(startIndex, endIndex);
    
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
    console.error('分页查询响应错误:', error);
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

// 根据ID查找响应
async function findResponseById(id) {
  try {
    await responsesDb.read();
    return responsesDb.data.find(resp => resp.request_id === id || resp.server_request_id === id);
  } catch (error) {
    console.error('查询响应详情错误:', error);
    return null;
  }
}

// 删除指定ID的响应
async function deleteResponseById(id) {
  try {
    await responsesDb.read();
    const initialLength = responsesDb.data.length;
    responsesDb.data = responsesDb.data.filter(resp => resp.id !== id && resp.server_request_id !== id);
    await responsesDb.write();
    
    // 判断是否成功删除
    const deletedCount = initialLength - responsesDb.data.length;
    return {
      success: deletedCount > 0,
      deletedCount
    };
  } catch (error) {
    console.error('删除响应错误:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message
    };
  }
}

// 删除指定主机的所有响应
async function deleteResponsesByHost(host) {
  try {
    await responsesDb.read();
    const responseIds = [];
    const initialLength = responsesDb.data.length;
    
    responsesDb.data = responsesDb.data.filter(resp => {
      if (resp.url) {
        try {
          const url = new URL(resp.url);
          if (url.hostname === host) {
            // 记录要删除的响应ID
            responseIds.push(resp.id || resp.server_request_id);
            return false; // 从数组中移除
          }
        } catch (e) {
          // URL解析错误，保留该记录
        }
      }
      return true; // 保留记录
    });
    
    await responsesDb.write();
    
    // 判断是否成功删除
    const deletedCount = initialLength - responsesDb.data.length;
    return {
      success: true,
      deletedCount,
      affectedIds: responseIds
    };
  } catch (error) {
    console.error('删除主机响应错误:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message
    };
  }
}

// 检查请求/响应是否匹配捕获规则
function matchesCaptureRules(reqOrRes) {
  // 如果没有规则，则默认捕获所有
  if (captureRules.length === 0) {
    return true;
  }

  try {
    // 从请求/响应中获取URL和方法
    const url = reqOrRes.url;
    const method = reqOrRes.method?.toUpperCase() || '';
    
    if (!url) {
      return false;
    }
    
    // 解析URL获取主机名
    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch (error) {
      return false;
    }
    
    // 遍历所有规则，检查是否匹配
    for (const rule of captureRules) {
      // 检查主机名是否匹配
      if (rule.host && !hostname.includes(rule.host)) {
        continue;
      }
      
      // 检查方法是否匹配
      if (rule.methods && rule.methods.length > 0 && !rule.methods.includes(method)) {
        continue;
      }
      
      // 如果主机名和方法都匹配，则返回true
      return true;
    }
    
    // 如果没有匹配的规则，则返回false
    return false;
  } catch (error) {
    console.error('匹配捕获规则错误:', error);
    return true; // 出错时默认捕获
  }
}

// 获取所有捕获规则
async function getAllCaptureRules() {
  try {
    await captureRulesDb.read();
    return captureRulesDb.data;
  } catch (error) {
    console.error('获取捕获规则错误:', error);
    return [];
  }
}

// 添加捕获规则
async function addCaptureRule(rule) {
  try {
    if (!rule.host) {
      throw new Error('捕获规则必须包含主机名');
    }

    // 确保methods是数组
    if (rule.methods && !Array.isArray(rule.methods)) {
      rule.methods = [rule.methods];
    }
    
    // 将方法名转为大写
    if (rule.methods) {
      rule.methods = rule.methods.map(m => m.toUpperCase());
    }
    
    // 添加唯一ID和创建时间
    const newRule = {
      ...rule,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      enabled: true
    };
    
    await captureRulesDb.read();
    captureRulesDb.data.push(newRule);
    await captureRulesDb.write();
    
    // 更新内存中的规则列表
    captureRules = [...captureRulesDb.data];
    
    return newRule;
  } catch (error) {
    console.error('添加捕获规则错误:', error);
    throw error;
  }
}

// 删除捕获规则
async function deleteCaptureRule(ruleId) {
  try {
    await captureRulesDb.read();
    const initialLength = captureRulesDb.data.length;
    captureRulesDb.data = captureRulesDb.data.filter(rule => rule.id !== ruleId);
    
    if (captureRulesDb.data.length === initialLength) {
      return { success: false, message: '未找到指定规则' };
    }
    
    await captureRulesDb.write();
    
    // 更新内存中的规则列表
    captureRules = [...captureRulesDb.data];
    
    return { success: true, message: '已删除捕获规则' };
  } catch (error) {
    console.error('删除捕获规则错误:', error);
    return { success: false, error: error.message };
  }
}

// 清空所有捕获规则
async function clearAllCaptureRules() {
  try {
    await captureRulesDb.read();
    captureRulesDb.data = [];
    await captureRulesDb.write();
    
    // 更新内存中的规则列表
    captureRules = [];
    
    return { success: true, message: '已清空所有捕获规则' };
  } catch (error) {
    console.error('清空捕获规则错误:', error);
    return { success: false, error: error.message };
  }
}

// 更新捕获规则状态
async function updateCaptureRuleStatus(ruleId, enabled) {
  try {
    await captureRulesDb.read();
    
    // 查找规则
    const ruleIndex = captureRulesDb.data.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return { success: false, message: '未找到指定规则' };
    }
    
    // 更新规则状态
    captureRulesDb.data[ruleIndex].enabled = enabled;
    captureRulesDb.data[ruleIndex].updated_at = new Date().toISOString();
    
    await captureRulesDb.write();
    
    // 更新内存中的规则列表
    captureRules = [...captureRulesDb.data];
    
    return { 
      success: true, 
      rule: captureRulesDb.data[ruleIndex]
    };
  } catch (error) {
    console.error('更新捕获规则状态错误:', error);
    return { success: false, error: error.message };
  }
}

// 以下是响应修改规则相关的功能函数

/**
 * 获取所有响应修改规则
 */
async function getAllResponseRules() {
  try {
    await responseRulesDb.read();
    return responseRulesDb.data;
  } catch (error) {
    console.error('获取所有响应修改规则错误:', error);
    return [];
  }
}

/**
 * 根据ID查找响应修改规则
 */
async function findResponseRuleById(ruleId) {
  try {
    await responseRulesDb.read();
    return responseRulesDb.data.find(rule => rule.id === ruleId);
  } catch (error) {
    console.error('查找响应修改规则错误:', error);
    return null;
  }
}

/**
 * 添加新的响应修改规则
 * @param {Object} rule 规则对象, 包含:
 *   - id: 自动生成, 规则唯一标识
 *   - name: 规则名称
 *   - host: 主机名匹配
 *   - pathRegex: 路径正则表达式匹配
 *   - method: HTTP方法匹配(GET, POST等)
 *   - enabled: 是否启用
 *   - responseBody: 替换的响应体
 *   - responseStatus: 替换的状态码
 *   - responseHeaders: 替换的响应头
 *   - createdAt: 创建时间
 *   - updatedAt: 更新时间
 */
async function addResponseRule(rule) {
  try {
    await responseRulesDb.read();
    
    // 验证必填字段
    if (!rule.name || !rule.host || !rule.pathRegex || !rule.method) {
      throw new Error('缺少必要的规则字段');
    }
    
    // 检查pathRegex是否为有效的正则表达式
    try {
      new RegExp(rule.pathRegex);
    } catch(e) {
      throw new Error('无效的路径正则表达式');
    }
    
    // 创建完整的规则对象
    const newRule = {
      id: rule.id || `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: rule.name,
      host: rule.host,
      pathRegex: rule.pathRegex,
      method: rule.method,
      enabled: rule.enabled ?? true,
      responseBody: rule.responseBody || null,
      responseStatus: rule.responseStatus || 200,
      responseHeaders: rule.responseHeaders || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 添加到数据库和内存中
    responseRulesDb.data.push(newRule);
    await responseRulesDb.write();
    
    // 更新内存中的规则列表
    responseRules = [...responseRulesDb.data];
    
    return { success: true, rule: newRule };
  } catch (error) {
    console.error('添加响应修改规则错误:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新响应修改规则
 */
async function updateResponseRule(ruleId, updatedRule) {
  try {
    await responseRulesDb.read();
    
    // 查找规则索引
    const ruleIndex = responseRulesDb.data.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      return { success: false, error: '找不到指定规则' };
    }
    
    // 检查pathRegex是否为有效的正则表达式
    if (updatedRule.pathRegex) {
      try {
        new RegExp(updatedRule.pathRegex);
      } catch(e) {
        throw new Error('无效的路径正则表达式');
      }
    }
    
    // 更新规则
    const existingRule = responseRulesDb.data[ruleIndex];
    const newRule = {
      ...existingRule,
      ...updatedRule,
      updatedAt: new Date().toISOString()
    };
    
    // 保存到数据库
    responseRulesDb.data[ruleIndex] = newRule;
    await responseRulesDb.write();
    
    // 更新内存中的规则列表
    responseRules = [...responseRulesDb.data];
    
    return { success: true, rule: newRule };
  } catch (error) {
    console.error('更新响应修改规则错误:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 删除响应修改规则
 */
async function deleteResponseRule(ruleId) {
  try {
    await responseRulesDb.read();
    
    // 查找并删除规则
    const initialLength = responseRulesDb.data.length;
    responseRulesDb.data = responseRulesDb.data.filter(rule => rule.id !== ruleId);
    
    if (responseRulesDb.data.length === initialLength) {
      return { success: false, error: '找不到指定规则' };
    }
    
    // 保存到数据库
    await responseRulesDb.write();
    
    // 更新内存中的规则列表
    responseRules = [...responseRulesDb.data];
    
    return { success: true, deletedCount: initialLength - responseRulesDb.data.length };
  } catch (error) {
    console.error('删除响应修改规则错误:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新响应修改规则状态（启用/禁用）
 */
async function updateResponseRuleStatus(ruleId, enabled) {
  try {
    await responseRulesDb.read();
    
    // 查找规则索引
    const ruleIndex = responseRulesDb.data.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      return { success: false, error: '找不到指定规则' };
    }
    
    // 更新规则状态
    responseRulesDb.data[ruleIndex].enabled = !!enabled;
    responseRulesDb.data[ruleIndex].updatedAt = new Date().toISOString();
    
    // 保存到数据库
    await responseRulesDb.write();
    
    // 更新内存中的规则列表
    responseRules = [...responseRulesDb.data];
    
    return { success: true, rule: responseRulesDb.data[ruleIndex] };
  } catch (error) {
    console.error('更新响应修改规则状态错误:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 匹配URL并应用相应的响应修改规则
 * @param {Object} requestInfo 请求信息，包含url, method等
 * @returns {Object|null} 修改后的响应或null(不需要修改)
 */
async function applyResponseRules(requestInfo) {
  try {
    if (!requestInfo || !requestInfo.url || !requestInfo.method) {
      return null;
    }
    
    // 解析URL
    const urlObj = new URL(requestInfo.url);
    const host = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    const method = requestInfo.method.toUpperCase();
    
    // 记录所有匹配的规则
    let matchedRules = [];
    
    // 检查是否有匹配的规则
    for (const rule of responseRules) {
      // 跳过已禁用规则
      if (!rule.enabled) continue;
      
      // 检查主机名是否匹配
      if (rule.host !== '*' && !host.includes(rule.host)) continue;
      
      // 检查请求方法是否匹配
      if (rule.method !== '*' && rule.method !== method) continue;
      
      // 检查路径是否匹配规则的正则表达式
      try {
        const pathRegex = new RegExp(rule.pathRegex);
        if (!pathRegex.test(path)) continue;
        
        // 匹配成功，添加到匹配规则列表
        matchedRules.push(rule);
      } catch (regexError) {
        console.error(`规则 ${rule.id} 的正则表达式无效:`, regexError);
        continue;
      }
    }
    
    // 如果没有匹配的规则，返回null
    if (matchedRules.length === 0) {
      return null;
    }
    
    // 按更新时间降序排序，取最新的规则
    matchedRules.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
    
    // 使用最新的规则
    const newestRule = matchedRules[0];
    console.log(`应用最新的规则: ${newestRule.id} (${newestRule.name}), 共匹配 ${matchedRules.length} 个规则`);
    
    // 创建修改后的响应
    let responseBody = newestRule.responseBody;
    
    // 如果原始响应是JSON格式，处理模板替换
    if (requestInfo.body && requestInfo.headers && (
        requestInfo.headers['content-type']?.includes('application/json') || 
        requestInfo.headers['Content-Type']?.includes('application/json')
    )) {
      try {
        // 尝试解析原始响应体
        const originalBody = JSON.parse(requestInfo.body);
        
        // 如果规则的响应体是JSON字符串，解析它
        if (typeof responseBody === 'string' && responseBody.trim().startsWith('{')) {
          responseBody = JSON.parse(responseBody);
          
          // 可以在这里处理模板变量替换等逻辑，根据需求扩展
        }
        
        // 重新转换为字符串
        if (typeof responseBody !== 'string') {
          responseBody = JSON.stringify(responseBody);
        }
      } catch (parseError) {
        console.error('处理响应体时出错:', parseError);
        // 解析错误时，使用原始规则的响应体
      }
    }
    
    // 返回修改后的响应
    return {
      modified: true,
      status: newestRule.responseStatus || requestInfo.status || 200,
      headers: newestRule.responseHeaders || requestInfo.headers || {},
      body: responseBody,
      matchedRule: newestRule.id,
      ruleName: newestRule.name,
      matchedRulesCount: matchedRules.length,
      original_url: requestInfo.url
    };
  } catch (error) {
    console.error('应用响应修改规则错误:', error);
    return null;
  }
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
  getHostsPaginated,
  getRequestsPaginated,
  getResponsesPaginated,
  findResponseById,
  deleteResponseById,
  deleteResponsesByHost,
  deleteRequestById,
  deleteRequestsByHost,
  getRequestsStats,
  getCaptureStatus,
  setCaptureStatus,
  requestsDb,
  responsesDb,
  modifiedResponsesDb,
  getAllCaptureRules,
  addCaptureRule,
  deleteCaptureRule,
  clearAllCaptureRules,
  updateCaptureRuleStatus,
  getAllResponseRules,
  findResponseRuleById,
  addResponseRule,
  updateResponseRule,
  deleteResponseRule,
  updateResponseRuleStatus,
  applyResponseRules
}; 
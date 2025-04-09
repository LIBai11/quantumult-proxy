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
const requestsDbPath = join(dbDir, 'requests.json'); // 捕获的 request 信息
const responsesDbPath = join(dbDir, 'responses.json'); // 捕获的 response 信息
const modifiedResponsesDbPath = join(dbDir, 'modified_responses.json'); // 修改后的 response 信息
const captureRulesDbPath = join(dbDir, 'capture_rules.json'); // response 捕获规则
const responseRulesDbPath = join(dbDir, 'response_rules.json'); // response 修改规则
const interceptRulesDbPath = join(dbDir, 'intercept_rules.json'); // request 拦截规则
const interceptedRequestsDbPath = join(dbDir, 'intercepted_requests.json');  // 捕获的 request 信息

// 捕获状态 - true表示正在捕获，false表示暂停
let captureEnabled = true;

// 捕获规则列表 - 用于存储特定主机和请求方法的捕获规则
let captureRules = [];

// 响应修改规则列表 - 用于存储特定URL的响应修改规则
let responseRules = [];

// 请求拦截规则列表 - 用于拦截并修改请求
let interceptRules = [];

// 请求拦截状态 - true表示启用拦截，false表示禁用
let interceptEnabled = true;

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

// 获取当前拦截状态
function getInterceptStatus() {
  return {
    enabled: interceptEnabled,
    status: interceptEnabled ? 'active' : 'paused',
    timestamp: new Date().toISOString()
  };
}

// 设置拦截状态
function setInterceptStatus(enabled) {
  interceptEnabled = !!enabled;
  return getInterceptStatus();
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
ensureDbFile(interceptRulesDbPath, []);
ensureDbFile(interceptedRequestsDbPath, []);

// 创建各数据库适配器和实例
const requestsAdapter = new JSONFile(requestsDbPath);
const responsesAdapter = new JSONFile(responsesDbPath);
const modifiedResponsesAdapter = new JSONFile(modifiedResponsesDbPath);
const captureRulesAdapter = new JSONFile(captureRulesDbPath);
const responseRulesAdapter = new JSONFile(responseRulesDbPath);
const interceptRulesAdapter = new JSONFile(interceptRulesDbPath);
const interceptedRequestsAdapter = new JSONFile(interceptedRequestsDbPath);

const requestsDb = new Low(requestsAdapter, []);
const responsesDb = new Low(responsesAdapter, []);
const modifiedResponsesDb = new Low(modifiedResponsesAdapter, []);
const captureRulesDb = new Low(captureRulesAdapter, []);
const responseRulesDb = new Low(responseRulesAdapter, []);
const interceptRulesDb = new Low(interceptRulesAdapter, []);
const interceptedRequestsDb = new Low(interceptedRequestsAdapter, []);

// 初始化数据库结构
async function initDb() {
  try {
    // 读取所有数据库
    await Promise.all([
      requestsDb.read(),
      responsesDb.read(),
      modifiedResponsesDb.read(),
      captureRulesDb.read(),
      responseRulesDb.read(),
      interceptRulesDb.read(),
      interceptedRequestsDb.read()
    ]);
    
    // 初始化默认值
    requestsDb.data ||= [];
    responsesDb.data ||= [];
    modifiedResponsesDb.data ||= [];
    captureRulesDb.data ||= [];
    responseRulesDb.data ||= [];
    interceptRulesDb.data ||= [];
    interceptedRequestsDb.data ||= [];
    
    // 将捕获规则加载到内存中
    captureRules = [...captureRulesDb.data];
    
    // 将响应修改规则加载到内存中
    responseRules = [...responseRulesDb.data];
    
    // 将请求拦截规则加载到内存中
    interceptRules = [...interceptRulesDb.data];
    
    // 保存数据
    await Promise.all([
      requestsDb.write(),
      responsesDb.write(),
      modifiedResponsesDb.write(),
      captureRulesDb.write(),
      responseRulesDb.write(),
      interceptRulesDb.write(),
      interceptedRequestsDb.write()
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
      !requestIds.includes(res.request_id) && !res.server_request_id
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
    responseRulesDbPath,
    interceptRulesDbPath,
    interceptedRequestsDbPath
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

// --------------------- 请求拦截规则操作 ---------------------

/**
 * 获取所有请求拦截规则
 */
async function getAllInterceptRules() {
  try {
    await interceptRulesDb.read();
    return interceptRulesDb.data;
  } catch (error) {
    console.error('获取请求拦截规则错误:', error);
    return [];
  }
}

/**
 * 根据ID查找请求拦截规则
 */
async function findInterceptRuleById(ruleId) {
  try {
    await interceptRulesDb.read();
    return interceptRulesDb.data.find(rule => rule.id === ruleId);
  } catch (error) {
    console.error('查询请求拦截规则错误:', error);
    return null;
  }
}

/**
 * 添加请求拦截规则
 */
async function addInterceptRule(rule) {
  try {
    if (!rule || !rule.host) {
      return {
        success: false,
        error: '规则必须包含host字段'
      };
    }

    await interceptRulesDb.read();
    
    // 创建新规则对象
    const newRule = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      enabled: rule.enabled !== undefined ? rule.enabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 规则参数
      host: rule.host,
      method: rule.method || '*',
      pathRegex: rule.pathRegex || '.*',
      // 请求修改参数
      modifyHeaders: rule.modifyHeaders || null,
      modifyBody: rule.modifyBody || null,
      description: rule.description || '',
      name: rule.name || `规则 ${interceptRulesDb.data.length + 1}`
    };
    
    // 添加到数据库
    interceptRulesDb.data.push(newRule);
    await interceptRulesDb.write();
    
    // 更新内存中的规则列表
    interceptRules = [...interceptRulesDb.data];
    
    return {
      success: true,
      rule: newRule
    };
  } catch (error) {
    console.error('添加请求拦截规则错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 更新请求拦截规则
 */
async function updateInterceptRule(ruleId, updatedRule) {
  try {
    await interceptRulesDb.read();
    
    const index = interceptRulesDb.data.findIndex(rule => rule.id === ruleId);
    if (index === -1) {
      return {
        success: false,
        error: '找不到指定的拦截规则'
      };
    }
    
    // 保留原规则的ID和创建时间
    const originalRule = interceptRulesDb.data[index];
    const mergedRule = {
      ...originalRule,
      ...updatedRule,
      id: originalRule.id,
      createdAt: originalRule.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    // 更新规则
    interceptRulesDb.data[index] = mergedRule;
    await interceptRulesDb.write();
    
    // 更新内存中的规则列表
    interceptRules = [...interceptRulesDb.data];
    
    return {
      success: true,
      rule: mergedRule
    };
  } catch (error) {
    console.error('更新请求拦截规则错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 删除请求拦截规则
 */
async function deleteInterceptRule(ruleId) {
  try {
    await interceptRulesDb.read();
    
    const initialLength = interceptRulesDb.data.length;
    interceptRulesDb.data = interceptRulesDb.data.filter(rule => rule.id !== ruleId);
    
    if (interceptRulesDb.data.length === initialLength) {
      return {
        success: false,
        error: '找不到指定的拦截规则'
      };
    }
    
    await interceptRulesDb.write();
    
    // 更新内存中的规则列表
    interceptRules = [...interceptRulesDb.data];
    
    return {
      success: true,
      deletedCount: initialLength - interceptRulesDb.data.length,
      message: '拦截规则已删除'
    };
  } catch (error) {
    console.error('删除请求拦截规则错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 更新拦截规则状态
 */
async function updateInterceptRuleStatus(ruleId, enabled) {
  try {
    await interceptRulesDb.read();
    
    const rule = interceptRulesDb.data.find(rule => rule.id === ruleId);
    if (!rule) {
      return {
        success: false,
        error: '找不到指定的拦截规则'
      };
    }
    
    // 更新状态
    rule.enabled = enabled;
    rule.updatedAt = new Date().toISOString();
    await interceptRulesDb.write();
    
    // 更新内存中的规则列表
    interceptRules = [...interceptRulesDb.data];
    
    return {
      success: true,
      rule,
      message: `规则已${enabled ? '启用' : '禁用'}`
    };
  } catch (error) {
    console.error('更新拦截规则状态错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 检查请求是否匹配拦截规则并应用修改
 */
async function applyInterceptRules(requestInfo) {
  try {
    if (!requestInfo || !requestInfo.url || !requestInfo.method) {
      return null;
    }
    
    // 如果拦截功能被禁用，不进行拦截
    if (!interceptEnabled) {
      return null;
    }
    
    // 如果没有启用的规则，不需要拦截
    const activeRules = interceptRules.filter(rule => rule.enabled);
    if (activeRules.length === 0) {
      return null;
    }
    
    // 解析URL
    const urlObj = new URL(requestInfo.url);
    const host = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    const method = requestInfo.method.toUpperCase();
    
    // 检查是否有匹配的规则
    let matchedRule = null;
    
    for (const rule of activeRules) {
      // 检查主机名是否匹配
      if (rule.host !== '*' && !host.includes(rule.host)) continue;
      
      // 检查请求方法是否匹配
      if (rule.method !== '*' && rule.method !== method) continue;
      
      // 检查路径是否匹配规则的正则表达式
      try {
        const pathRegex = new RegExp(rule.pathRegex);
        if (!pathRegex.test(path)) continue;
        
        // 找到匹配的规则
        matchedRule = rule;
        break;
      } catch (regexError) {
        console.error(`规则 ${rule.id} 的正则表达式无效:`, regexError);
        continue;
      }
    }
    
    // 如果没有匹配的规则，不需要拦截
    if (!matchedRule) {
      return null;
    }
    
    // 拦截并修改请求
    const interceptedRequest = {
      ...requestInfo,
      intercepted: true,
      interceptedAt: new Date().toISOString(),
      originalRequest: {
        url: requestInfo.url,
        method: requestInfo.method,
        headers: { ...requestInfo.headers },
        body: requestInfo.body
      },
      matchedRuleId: matchedRule.id,
      ruleName: matchedRule.name
    };
    
    // 应用请求头修改
    if (matchedRule.modifyHeaders) {
      interceptedRequest.headers = {
        ...interceptedRequest.headers,
        ...matchedRule.modifyHeaders
      };
    }
    
    // 应用请求体修改
    if (matchedRule.modifyBody) {
      interceptedRequest.body = matchedRule.modifyBody;
    }
    
    // 保存拦截的请求
    await saveInterceptedRequest(interceptedRequest);
    
    return interceptedRequest;
  } catch (error) {
    console.error('应用请求拦截规则错误:', error);
    return null;
  }
}

// --------------------- 拦截请求操作 ---------------------

/**
 * 保存拦截的请求
 */
async function saveInterceptedRequest(request) {
  try {
    // 如果拦截功能未启用，直接返回
    if (!interceptEnabled) {
      return {
        success: false,
        message: '请求拦截功能未启用'
      };
    }

    await interceptedRequestsDb.read();
    
    // 生成请求ID
    const requestId = `intercept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 保存原始请求
    const originalRequest = { ...request };
    delete originalRequest.id;
    
    // 应用拦截规则
    const ruleResult = await applyInterceptRules(request);
    
    // 构建拦截请求记录
    const interceptedRequest = {
      id: requestId,
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      body: request.body,
      intercepted: true,
      interceptedAt: new Date().toISOString(),
      originalRequest,
      autoReleased: !ruleResult.matched, // 如果没有匹配规则，标记为自动放行
      released: !ruleResult.matched, // 如果没有匹配规则，直接标记为已放行
      releasedAt: !ruleResult.matched ? new Date().toISOString() : null,
      matchedRuleId: ruleResult.ruleId || null,
      ruleName: ruleResult.ruleName || null,
      modified: ruleResult.modified || false
    };
    
    // 如果是自动放行的请求，获取并记录响应
    let responseData = null;
    if (interceptedRequest.autoReleased) {
      try {
        // 发送请求获取实际响应
        const headers = { ...request.headers };
        delete headers['content-length']; // 避免长度不匹配问题
        
        const response = await fetch(request.url, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
        });
        
        // 读取响应数据
        const responseBody = await response.text();
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        // 创建响应对象
        responseData = {
          id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          request_id: requestId,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          timestamp: new Date().toISOString()
        };
        
        // 将响应保存到拦截请求中
        interceptedRequest.response = responseData;
        
        // 同时保存到响应数据库
        await responsesDb.read();
        responsesDb.data.push(responseData);
        await responsesDb.write();
      } catch (error) {
        console.error('自动放行请求获取响应错误:', error);
        // 创建错误响应
        responseData = {
          id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          request_id: requestId,
          status: 500,
          statusText: 'Error',
          headers: {},
          body: `获取响应失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          error: true
        };
        
        // 将错误响应保存到拦截请求中
        interceptedRequest.response = responseData;
        interceptedRequest.responseError = error.message;
      }
    }
    
    // 保存到数据库
    interceptedRequestsDb.data.push(interceptedRequest);
    await interceptedRequestsDb.write();
    
    return {
      success: true,
      message: ruleResult.matched ? '请求已拦截' : '请求已自动放行',
      request: interceptedRequest,
      matched: ruleResult.matched,
      response: responseData
    };
  } catch (error) {
    console.error('保存拦截请求错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 分页获取拦截请求列表
 */
async function getInterceptedRequestsPaginated(page = 1, limit = 20, host = null, keyword = null, isRegex = false, includeAutoReleased = true) {
  try {
    // 根据 includeAutoReleased 参数决定使用哪个数据库
    let allRequests;
    if (includeAutoReleased) {
      await requestsDb.read();
      allRequests = [...requestsDb.data];
    } else {
      await interceptedRequestsDb.read();
      allRequests = [...interceptedRequestsDb.data];
    }

    // 应用过滤条件
    let filteredRequests = [...allRequests];

    // 按主机过滤
    if (host) {
      filteredRequests = filteredRequests.filter(req => {
        try {
          const url = new URL(req.url);
          return url.hostname === host;
        } catch (e) {
          return false;
        }
      });
    }

    // 按关键字过滤
    if (keyword) {
      if (isRegex) {
        try {
          const regex = new RegExp(keyword, 'i');
          filteredRequests = filteredRequests.filter(req => regex.test(req.url));
        } catch (e) {
          console.error('Invalid regex:', e);
        }
      } else {
        const lowercaseKeyword = keyword.toLowerCase();
        filteredRequests = filteredRequests.filter(req => 
          req.url.toLowerCase().includes(lowercaseKeyword)
        );
      }
    }

    // 按时间倒序排序
    filteredRequests.sort((a, b) => {
      const dateA = a.timestamp || a.interceptedAt || new Date(0);
      const dateB = b.timestamp || b.interceptedAt || new Date(0);
      return new Date(dateB) - new Date(dateA);
    });

    // 计算分页
    const total = filteredRequests.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

    return {
      requests: paginatedRequests,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    console.error('获取拦截请求分页数据错误:', error);
    throw error;
  }
}

/**
 * 根据ID获取拦截请求
 */
async function findInterceptedRequestById(requestId) {
  try {
    await interceptedRequestsDb.read();
    return interceptedRequestsDb.data.find(req => req.id === requestId);
  } catch (error) {
    console.error('查询拦截请求错误:', error);
    return null;
  }
}

/**
 * 删除指定ID的拦截请求
 */
async function deleteInterceptedRequestById(requestId) {
  try {
    await interceptedRequestsDb.read();
    
    const initialLength = interceptedRequestsDb.data.length;
    interceptedRequestsDb.data = interceptedRequestsDb.data.filter(req => req.id !== requestId);
    
    if (interceptedRequestsDb.data.length === initialLength) {
      return {
        success: false,
        message: '找不到指定的拦截请求'
      };
    }
    
    await interceptedRequestsDb.write();
    
    return {
      success: true,
      deletedCount: initialLength - interceptedRequestsDb.data.length,
      message: '拦截请求已删除'
    };
  } catch (error) {
    console.error('删除拦截请求错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 删除所有拦截请求
 */
async function clearAllInterceptedRequests() {
  try {
    await interceptedRequestsDb.read();
    
    const deletedCount = interceptedRequestsDb.data.length;
    interceptedRequestsDb.data = [];
    await interceptedRequestsDb.write();
    
    return {
      success: true,
      deletedCount,
      message: '所有拦截请求已删除'
    };
  } catch (error) {
    console.error('清空拦截请求错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 放行拦截请求
 */
async function releaseInterceptedRequest(requestId) {
  try {
    await interceptedRequestsDb.read();
    
    const request = interceptedRequestsDb.data.find(req => req.id === requestId);
    if (!request) {
      return {
        success: false,
        message: '找不到指定的拦截请求'
      };
    }
    
    // 为被放行的请求添加放行标记
    request.released = true;
    request.releasedAt = new Date().toISOString();
    
    // 构造并保存响应信息
    let responseData = null;
    
    try {
      // 这里发送请求获取实际响应
      // 注意：这里应根据实际项目需求实现发送请求的逻辑
      // 以下是一个简单的示例，使用fetch API发送请求
      const headers = { ...request.headers };
      delete headers['content-length']; // 避免长度不匹配问题
      
      const response = await fetch(request.url, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
      });
      
      // 读取响应数据
      const responseBody = await response.text();
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      // 创建响应对象
      responseData = {
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request_id: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timestamp: new Date().toISOString()
      };
      
      // 将响应保存到拦截请求中
      request.response = responseData;
      
      // 同时保存到响应数据库
      await responsesDb.read();
      responsesDb.data.push(responseData);
      await responsesDb.write();
    } catch (error) {
      console.error('获取请求响应错误:', error);
      // 创建错误响应
      responseData = {
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request_id: request.id,
        status: 500,
        statusText: 'Error',
        headers: {},
        body: `获取响应失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: true
      };
      
      // 将错误响应保存到拦截请求中
      request.response = responseData;
      request.responseError = error.message;
    }
    
    // 保存回拦截请求数据库
    await interceptedRequestsDb.write();
    
    return {
      success: true,
      message: '请求已放行',
      request,
      response: responseData
    };
  } catch (error) {
    console.error('放行拦截请求错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取拦截请求统计信息
 */
async function getInterceptStats() {
  try {
    await interceptedRequestsDb.read();
    
    const allIntercepted = interceptedRequestsDb.data || [];
    const totalIntercepted = allIntercepted.length;
    
    // 已放行的请求
    const releasedRequests = allIntercepted.filter(req => req.released === true);
    const releasedCount = releasedRequests.length;
    
    // 仍被拦截的请求（未放行）
    const stillInterceptedCount = totalIntercepted - releasedCount;
    
    // 被修改的请求（请求头或请求体被修改）
    const modifiedRequests = allIntercepted.filter(req => {
      // 检查是否有originalRequest对比字段
      if (!req.originalRequest) return false;
      
      // 检查请求头是否被修改
      const headersModified = req.originalRequest.headers && 
        JSON.stringify(req.headers) !== JSON.stringify(req.originalRequest.headers);
      
      // 检查请求体是否被修改
      const bodyModified = req.originalRequest.body !== undefined && 
        req.body !== req.originalRequest.body;
      
      return headersModified || bodyModified;
    });
    
    const modifiedCount = modifiedRequests.length;
    
    // 统计各主机的拦截请求
    const hostStats = {};
    allIntercepted.forEach(req => {
      if (req.url) {
        try {
          const url = new URL(req.url);
          const hostname = url.hostname;
          
          if (!hostStats[hostname]) {
            hostStats[hostname] = {
              hostname,
              interceptedCount: 0,
              releasedCount: 0,
              stillInterceptedCount: 0,
              modifiedCount: 0
            };
          }
          
          hostStats[hostname].interceptedCount++;
          
          if (req.released) {
            hostStats[hostname].releasedCount++;
          } else {
            hostStats[hostname].stillInterceptedCount++;
          }
          
          // 检查是否被修改
          if (req.originalRequest) {
            const headersModified = req.originalRequest.headers && 
              JSON.stringify(req.headers) !== JSON.stringify(req.originalRequest.headers);
            
            const bodyModified = req.originalRequest.body !== undefined && 
              req.body !== req.originalRequest.body;
            
            if (headersModified || bodyModified) {
              hostStats[hostname].modifiedCount++;
            }
          }
        } catch (e) {
          // 忽略无效URL
        }
      }
    });
    
    return {
      totalIntercepted,
      releasedCount,
      stillInterceptedCount,
      modifiedCount,
      hosts: Object.values(hostStats).sort((a, b) => b.interceptedCount - a.interceptedCount),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取拦截请求统计错误:', error);
    return {
      totalIntercepted: 0,
      releasedCount: 0,
      stillInterceptedCount: 0,
      modifiedCount: 0,
      hosts: [],
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * 更新拦截请求信息
 */
async function updateInterceptedRequest(requestId, updatedRequest) {
  try {
    await interceptedRequestsDb.read();
    
    const index = interceptedRequestsDb.data.findIndex(req => req.id === requestId);
    if (index === -1) {
      return {
        success: false,
        message: '找不到指定的拦截请求'
      };
    }
    
    // 更新拦截请求
    interceptedRequestsDb.data[index] = {
      ...interceptedRequestsDb.data[index],
      ...updatedRequest,
      updatedAt: new Date().toISOString()
    };
    
    // 保存回数据库
    await interceptedRequestsDb.write();
    
    return {
      success: true,
      message: '拦截请求已更新',
      request: interceptedRequestsDb.data[index]
    };
  } catch (error) {
    console.error('更新拦截请求错误:', error);
    return {
      success: false,
      error: error.message
    };
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
  getInterceptStatus,
  setInterceptStatus,
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
  applyResponseRules,
  getAllInterceptRules,
  findInterceptRuleById,
  addInterceptRule,
  updateInterceptRule,
  deleteInterceptRule,
  updateInterceptRuleStatus,
  applyInterceptRules,
  saveInterceptedRequest,
  getInterceptedRequestsPaginated,
  findInterceptedRequestById,
  deleteInterceptedRequestById,
  clearAllInterceptedRequests,
  releaseInterceptedRequest,
  getInterceptStats,
  updateInterceptedRequest
}; 
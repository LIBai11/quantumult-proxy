// 全局变量
let allRequests = [];
let filteredRequests = []; // 过滤后的请求
let currentFilter = {
  host: 'all',
  method: 'all',
  search: ''
};
let hostGroups = new Map(); // 存储按主机分组的请求
let isLoading = false; // 全局加载状态
let activeButtons = new Set(); // 正在执行操作的按钮

// 分页相关变量
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;

// 工具函数
function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}天 `;
  if (hours > 0) result += `${hours}小时 `;
  if (minutes > 0) result += `${minutes}分钟 `;
  if (secs > 0 || result === '') result += `${secs}秒`;
  
  return result;
}

function getStatusClass(statusCode) {
  if (!statusCode) return '';
  if (statusCode >= 200 && statusCode < 300) return 'status-success';
  if (statusCode >= 300 && statusCode < 400) return 'status-redirect';
  if (statusCode >= 400 && statusCode < 500) return 'status-client-error';
  if (statusCode >= 500) return 'status-server-error';
  return '';
}

function getMethodClass(method) {
  switch (method?.toUpperCase()) {
    case 'GET': return 'method-get';
    case 'POST': return 'method-post';
    case 'PUT': return 'method-put';
    case 'DELETE': return 'method-delete';
    default: return 'bg-secondary text-white';
  }
}

function getHostFromUrl(url) {
  if (!url) return 'unknown';
  
  try {
    let parsedUrl;
    if (url.startsWith('http')) {
      parsedUrl = new URL(url);
    } else {
      // 如果URL不完整，尝试从headers中获取host
      return 'local';
    }
    return parsedUrl.hostname || 'unknown';
  } catch (error) {
    console.error('解析URL失败:', error);
    return 'unknown';
  }
}

function prettyPrintJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return '无法解析JSON';
  }
}

// API请求函数
async function fetchServerStats() {
  try {
    showElement('requests-loading');
    const response = await fetch('/stats');
    const data = await response.json();
    
    const totalRequestsElement = document.getElementById('total-requests');
    if (totalRequestsElement) {
      totalRequestsElement.textContent = data.total_requests || 0;
    }
    
    const serverUptimeElement = document.getElementById('server-uptime');
    if (serverUptimeElement) {
      serverUptimeElement.textContent = formatUptime(data.uptime || 0);
    }
    
    hideElement('requests-loading');
    return data;
  } catch (error) {
    console.error('获取服务器统计信息失败:', error);
    
    const totalRequestsElement = document.getElementById('total-requests');
    if (totalRequestsElement) {
      totalRequestsElement.textContent = '获取失败';
    }
    
    const serverUptimeElement = document.getElementById('server-uptime');
    if (serverUptimeElement) {
      serverUptimeElement.textContent = '获取失败';
    }
    
    hideElement('requests-loading');
  }
}

async function fetchAllRequests() {
  try {
    isLoading = true;
    showElement('requests-loading');
    hideElement('no-requests');
    
    // 设置加载中显示
    const loadingElement = document.getElementById('requests-loading');
    if (loadingElement) {
      loadingElement.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
    }
    
    const response = await fetch('/requests');
    allRequests = await response.json();
    
    // 获取每个请求的详细信息以提取方法
    const requestDetailsPromises = allRequests.map(async request => {
      try {
        const detailResponse = await fetch(`/request/${request.id}`);
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          return {
            ...request,
            method: detailData.method || 'GET',
            url: detailData.url || request.id,
            status: detailData.status || (detailData.headers ? detailData.headers['status-code'] : null)
          };
        }
        return request;
      } catch (e) {
        console.warn(`获取请求详情失败: ${request.id}`, e);
        return request;
      }
    });
    
    // 更新请求列表
    allRequests = await Promise.all(requestDetailsPromises);
    
    // 按时间降序排序
    allRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 处理主机分组
    processHostGroups(allRequests);
    
    // 应用过滤并显示
    applyFiltersAndRender();
    
    isLoading = false;
    hideElement('requests-loading');
    
    if (allRequests.length === 0) {
      showElement('no-requests');
    }
    
    return allRequests;
  } catch (error) {
    console.error('获取请求列表失败:', error);
    hideElement('requests-loading');
    showElement('no-requests');
    isLoading = false;
    
    const noRequestsElement = document.querySelector('#no-requests p');
    if (noRequestsElement) {
      noRequestsElement.textContent = '加载请求数据失败';
    }
  }
}

async function fetchRequestDetail(requestId) {
  try {
    const response = await fetch(`/request/${requestId}`);
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }
    const requestData = await response.json();
    return requestData;
  } catch (error) {
    console.error(`获取请求详情失败 (ID: ${requestId}):`, error);
    return null;
  }
}

async function tryFetchResponseData(requestId) {
  try {
    // 尝试获取对应的响应数据
    const responseId = requestId.includes('_req') 
      ? requestId.replace('_req', '_res') 
      : `${requestId}_res`;
    
    const response = await fetch(`/request/${responseId}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('获取响应数据失败:', error);
    return null;
  }
}

// UI操作函数
function showElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.remove('d-none');
    // 添加淡入效果
    element.classList.add('fade-in');
    setTimeout(() => {
      element.classList.remove('fade-in');
    }, 300);
  } else {
    console.warn(`尝试显示不存在的元素: ${id}`);
  }
}

function hideElement(id) {
  const element = document.getElementById(id);
  if (element) {
    // 添加淡出效果
    element.classList.add('fade-out');
    // 延迟添加d-none
    setTimeout(() => {
      element.classList.add('d-none');
      element.classList.remove('fade-out');
    }, 300);
  } else {
    console.warn(`尝试隐藏不存在的元素: ${id}`);
  }
}

function clearRequestsTable() {
  const tableBody = document.getElementById('requests-table');
  if (tableBody) {
    tableBody.innerHTML = '';
  }
}

function renderRequestsTable(requests) {
  clearRequestsTable();
  
  // 更新过滤后的请求列表
  filteredRequests = requests;
  
  // 计算总页数
  totalPages = Math.ceil(requests.length / pageSize);
  
  // 确保当前页在有效范围内
  if (currentPage > totalPages) {
    currentPage = totalPages > 0 ? totalPages : 1;
  }
  
  // 计算当前页的起始和结束索引
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, requests.length);
  
  // 只渲染当前页的请求
  const currentPageRequests = requests.slice(startIndex, endIndex);
  
  const tableBody = document.getElementById('requests-table');
  
  if (!tableBody) {
    console.error('找不到请求表格元素');
    return;
  }
  
  if (currentPageRequests.length === 0) {
    showElement('no-requests');
    hideElement('requests-loading');
    
    // 更新分页信息
    updatePaginationInfo(0, 0, requests.length);
    return;
  }
  
  hideElement('no-requests');
  
  // 更新分页信息
  updatePaginationInfo(startIndex + 1, endIndex, requests.length);
  
  // 渲染当前页的请求
  currentPageRequests.forEach(request => {
    // 提取主机名
    const host = getHostFromUrl(request.url);
    const method = request.method || 'GET';
    
    // 创建表格行
    const row = document.createElement('tr');
    
    // 添加时间单元格
    const timeCell = document.createElement('td');
    timeCell.textContent = formatDateTime(request.timestamp);
    row.appendChild(timeCell);
    
    // 添加方法单元格
    const methodCell = document.createElement('td');
    const methodBadge = document.createElement('span');
    methodBadge.className = `badge ${getMethodClass(method)}`;
    methodBadge.textContent = method;
    methodCell.appendChild(methodBadge);
    row.appendChild(methodCell);
    
    // 添加URL单元格
    const urlCell = document.createElement('td');
    urlCell.className = 'url-cell';
    urlCell.textContent = request.url || '未知URL';
    row.appendChild(urlCell);
    
    // 添加状态码单元格
    const statusCell = document.createElement('td');
    if (request.status) {
      const statusBadge = document.createElement('span');
      statusBadge.className = `status-code ${getStatusClass(request.status)}`;
      statusBadge.textContent = request.status;
      statusCell.appendChild(statusBadge);
    } else {
      statusCell.textContent = '未知';
    }
    row.appendChild(statusCell);
    
    // 添加大小单元格
    const sizeCell = document.createElement('td');
    sizeCell.textContent = formatBytes(request.size || 0);
    row.appendChild(sizeCell);
    
    // 添加操作单元格
    const actionCell = document.createElement('td');
    
    // 查看按钮
    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-sm btn-primary action-btn me-1';
    viewButton.innerHTML = '<i class="bi bi-eye"></i>';
    viewButton.title = '查看详情';
    viewButton.addEventListener('click', () => viewRequestDetail(request.id));
    actionCell.appendChild(viewButton);
    
    // 删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-sm btn-danger action-btn';
    deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
    deleteButton.title = '删除请求';
    deleteButton.addEventListener('click', () => deleteRequest(request.id));
    actionCell.appendChild(deleteButton);
    
    row.appendChild(actionCell);
    
    tableBody.appendChild(row);
  });
  
  // 更新分页控件状态
  updatePaginationControls();
}

// 添加更新分页信息的函数
function updatePaginationInfo(start, end, total) {
  const pageInfoElement = document.getElementById('page-info');
  if (pageInfoElement) {
    pageInfoElement.textContent = total > 0 ? `${start}-${end} 共 ${total}` : '0-0 共 0';
  }
}

// 添加更新分页控件状态的函数
function updatePaginationControls() {
  const prevPageElement = document.getElementById('prev-page');
  const nextPageElement = document.getElementById('next-page');
  
  if (prevPageElement) {
    const prevPageItem = prevPageElement.parentElement;
    if (currentPage > 1) {
      prevPageItem.classList.remove('disabled');
    } else {
      prevPageItem.classList.add('disabled');
    }
  }
  
  if (nextPageElement) {
    const nextPageItem = nextPageElement.parentElement;
    if (currentPage < totalPages) {
      nextPageItem.classList.remove('disabled');
    } else {
      nextPageItem.classList.add('disabled');
    }
  }
}

async function viewRequestDetail(requestId) {
  try {
    // 显示加载中
    showElement('detail-loading');
    showElement('request-detail-card');
    
    const requestData = await fetchRequestDetail(requestId);
    if (!requestData) {
      alert('获取请求详情失败');
      hideElement('detail-loading');
      return;
    }
    
    // 获取响应数据
    const responseDataObj = await tryFetchResponseData(requestId);
    
    // 隐藏加载中
    hideElement('detail-loading');
    
    // 基本信息选项卡
    const requestInfo = document.getElementById('request-info');
    if (!requestInfo) {
      console.error('找不到请求信息元素');
      return;
    }
    
    let infoHtml = '<table class="info-table">';
    infoHtml += `<tr><td>请求ID</td><td>${requestData.id || '-'}</td></tr>`;
    infoHtml += `<tr><td>时间</td><td>${formatDateTime(requestData.timestamp) || '-'}</td></tr>`;
    infoHtml += `<tr><td>方法</td><td>${requestData.method || '-'}</td></tr>`;
    infoHtml += `<tr><td>URL</td><td>${requestData.url || '-'}</td></tr>`;
    infoHtml += `<tr><td>主机</td><td>${getHostFromUrl(requestData.url) || '-'}</td></tr>`;
    infoHtml += `<tr><td>IP地址</td><td>${requestData.ip || '-'}</td></tr>`;
    infoHtml += `<tr><td>协议</td><td>${requestData.protocol || '-'}</td></tr>`;
    
    if (responseDataObj) {
      infoHtml += `<tr><td>响应状态</td><td>${responseDataObj.status || '-'}</td></tr>`;
      infoHtml += `<tr><td>响应大小</td><td>${formatBytes(responseDataObj.body_size || 0)}</td></tr>`;
    }
    
    infoHtml += '</table>';
    requestInfo.innerHTML = infoHtml;
    
    // 请求头选项卡
    const requestHeaders = document.getElementById('request-headers');
    if (requestHeaders) {
      requestHeaders.innerHTML = `<pre>${prettyPrintJson(requestData.headers || {})}</pre>`;
    }
    
    // 请求体选项卡
    const requestBody = document.getElementById('request-body');
    if (requestBody) {
      requestBody.innerHTML = `<pre>${prettyPrintJson(requestData.body || {})}</pre>`;
    }
    
    // 响应数据选项卡
    const responseTab = document.getElementById('response-tab');
    const responseDataElement = document.getElementById('response-data');
    
    if (responseDataElement) {
      if (responseDataObj) {
        responseDataElement.innerHTML = `<pre>${prettyPrintJson(responseDataObj || {})}</pre>`;
        
        // 显示响应选项卡
        if (responseTab) {
          responseTab.classList.remove('d-none');
        }
      } else {
        responseDataElement.innerHTML = '<div class="alert alert-info">无响应数据</div>';
        
        // 隐藏响应选项卡
        if (responseTab) {
          responseTab.classList.add('d-none');
        }
      }
    }
    
    // 激活第一个选项卡
    const firstTab = document.querySelector('#requestTabs .nav-link');
    if (firstTab) {
      firstTab.click();
    }
    
  } catch (error) {
    console.error('显示请求详情失败:', error);
    alert('显示请求详情时发生错误');
    hideElement('detail-loading');
  }
}

function processHostGroups(requests) {
  // 清空主机分组
  hostGroups.clear();
  
  // 添加所有请求计数
  hostGroups.set('all', requests.length);
  
  // 按主机分组请求
  requests.forEach(request => {
    const host = getHostFromUrl(request.url);
    if (!hostGroups.has(host)) {
      hostGroups.set(host, 0);
    }
    hostGroups.set(host, hostGroups.get(host) + 1);
  });
  
  renderHostGroups();
}

function renderHostGroups() {
  const container = document.getElementById('host-groups');
  
  if (!container) {
    console.error('找不到主机分组容器元素');
    return;
  }
  
  // 保留"全部"选项
  const allItem = container.querySelector('[data-host="all"]');
  if (allItem) {
    const badge = allItem.querySelector('.badge');
    if (badge) {
      badge.textContent = hostGroups.get('all') || 0;
    }
  }
  
  // 移除其他主机选项
  const hostItems = container.querySelectorAll(':not([data-host="all"])');
  hostItems.forEach(item => {
    if (!item.id || item.id !== 'host-loading') {
      item.remove();
    }
  });
  
  // 按主机名排序
  const sortedHosts = Array.from(hostGroups.entries())
    .filter(([host]) => host !== 'all')
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  // 为每个主机创建列表项
  sortedHosts.forEach(([host, count]) => {
    const listItem = document.createElement('a');
    listItem.href = '#';
    listItem.className = 'list-group-item list-group-item-action';
    listItem.dataset.host = host;
    listItem.title = host; // 添加tooltip
    
    if (currentFilter.host === host) {
      listItem.classList.add('active');
    }
    
    // 创建主机名和数量badge的结构
    const hostSpan = document.createElement('span');
    hostSpan.className = 'host-name';
    hostSpan.textContent = host;
    
    const countBadge = document.createElement('span');
    countBadge.className = 'badge bg-primary rounded-pill';
    countBadge.textContent = count;
    
    listItem.appendChild(hostSpan);
    listItem.appendChild(countBadge);
    
    container.appendChild(listItem);
  });
  
  // 为所有主机选项添加事件监听
  container.querySelectorAll('[data-host]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const host = item.getAttribute('data-host');
      
      // 移除所有active类
      container.querySelectorAll('[data-host]').forEach(h => {
        h.classList.remove('active');
      });
      
      // 添加active类
      item.classList.add('active');
      
      // 更新过滤条件并重新渲染
      currentFilter.host = host;
      const currentViewElement = document.getElementById('current-view');
      if (currentViewElement) {
        currentViewElement.textContent = 
          host === 'all' ? '全部请求' : `主机: ${host}`;
      }
      
      applyFiltersAndRender();
    });
  });
}

function applyFiltersAndRender() {
  // 应用过滤器
  let filteredRequests = allRequests;
  
  // 主机过滤
  if (currentFilter.host !== 'all') {
    filteredRequests = filteredRequests.filter(request => {
      return getHostFromUrl(request.url) === currentFilter.host;
    });
  }
  
  // HTTP方法过滤
  if (currentFilter.method !== 'all') {
    filteredRequests = filteredRequests.filter(request => {
      return request.method?.toUpperCase() === currentFilter.method;
    });
  }
  
  // 搜索过滤
  if (currentFilter.search) {
    const searchTerm = currentFilter.search.toLowerCase();
    filteredRequests = filteredRequests.filter(request => {
      return request.url?.toLowerCase().includes(searchTerm);
    });
  }
  
  // 渲染过滤后的请求
  renderRequestsTable(filteredRequests);
}

async function deleteRequest(requestId) {
  if (!confirm('确定要删除此请求?')) {
    return;
  }
  
  try {
    // 显示删除中状态
    isLoading = true;
    showElement('requests-loading');
    
    // 对于使用X-Quantumult-ID标头的请求，路径可能不同
    const isQuantumultRequest = requestId.includes('_req') || requestId.includes('_res');
    
    const response = await fetch(`/request/${requestId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '删除请求失败');
    }
    
    // 重新加载请求列表
    await fetchAllRequests();
  } catch (error) {
    console.error('删除请求失败:', error);
    alert(`删除请求失败: ${error.message}`);
    isLoading = false;
    hideElement('requests-loading');
  }
}

// 设置按钮加载状态
function setButtonLoading(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    // 保存原始内容
    button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    button.disabled = true;
    activeButtons.add(button);
  } else {
    // 恢复原始内容
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    }
    button.disabled = false;
    activeButtons.delete(button);
  }
}

// 显示通知
function showNotification(message, type = 'success', duration = 3000) {
  // 移除所有现有通知，避免堆积
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    notification.remove();
  });
  
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} fade-in notification`;
  notification.innerHTML = message;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 设置定时消失
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 初始化加载提示
    const requestsLoadingElement = document.getElementById('requests-loading');
    if (requestsLoadingElement) {
      requestsLoadingElement.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
    }
    
    const detailLoadingElement = document.createElement('div');
    detailLoadingElement.id = 'detail-loading';
    detailLoadingElement.className = 'loading-overlay d-none';
    detailLoadingElement.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
    document.body.appendChild(detailLoadingElement);
    
    // 初始加载数据
    await Promise.all([
      fetchServerStats(),
      fetchAllRequests()
    ]);
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async (e) => {
        setButtonLoading(refreshBtn, true);
        await Promise.all([
          fetchServerStats(),
          fetchAllRequests()
        ]);
        setButtonLoading(refreshBtn, false);
      });
    }
    
    // 关闭详情按钮
    const closeDetailBtn = document.getElementById('close-detail-btn');
    if (closeDetailBtn) {
      closeDetailBtn.addEventListener('click', () => {
        hideElement('request-detail-card');
      });
    }
    
    // 应用过滤器按钮
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', (e) => {
        setButtonLoading(applyFiltersBtn, true);
        
        const methodFilter = document.getElementById('method-filter');
        const searchFilter = document.getElementById('search-filter');
        
        currentFilter.method = methodFilter ? methodFilter.value : 'all';
        currentFilter.search = searchFilter ? searchFilter.value : '';
        
        applyFiltersAndRender();
        
        setTimeout(() => {
          setButtonLoading(applyFiltersBtn, false);
        }, 300); // 添加短暂延迟以显示加载状态
      });
    }
    
    // 清空请求按钮
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async (e) => {
        const currentHost = currentFilter.host;
        const confirmMessage = currentHost === 'all' 
          ? '确定要清空所有请求?' 
          : `确定要清空主机 "${currentHost}" 的所有请求?`;
          
        if (!confirm(confirmMessage)) {
          return;
        }
        
        setButtonLoading(clearAllBtn, true);
        showElement('requests-loading');
        
        try {
          // 根据当前筛选的主机构建请求URL
          const url = currentHost === 'all' 
            ? '/request/clear-all?action=delete_all' 
            : `/request/clear-all?action=delete_host&host=${encodeURIComponent(currentHost)}`;
          
          const response = await fetch(url, {
            method: 'GET'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '清空请求失败');
          }
          
          const result = await response.json();
          
          // 使用带过渡的通知
          showNotification(`成功清空请求: 删除了 ${result.stats?.deleted || '所有'} 个文件`, 'success');
          
          // 重新加载请求列表
          await fetchAllRequests();
        } catch (error) {
          console.error('清空请求失败:', error);
          showNotification(`清空请求失败: ${error.message}`, 'danger');
        } finally {
          setButtonLoading(clearAllBtn, false);
          hideElement('requests-loading');
        }
      });
    }
    
    // 设置自动刷新
    setInterval(async () => {
      await fetchServerStats();
    }, 30000); // 每30秒刷新一次服务器状态
    
    // 分页控件事件监听
    const pageSizeSelect = document.getElementById('page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value, 10);
        currentPage = 1; // 更改页大小后重置为第一页
        applyFiltersAndRender();
      });
    }
    
    const prevPageElement = document.getElementById('prev-page');
    if (prevPageElement) {
      prevPageElement.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
          currentPage--;
          applyFiltersAndRender();
        }
      });
    }
    
    const nextPageElement = document.getElementById('next-page');
    if (nextPageElement) {
      nextPageElement.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
          currentPage++;
          applyFiltersAndRender();
        }
      });
    }
  } catch (error) {
    console.error('初始化页面时发生错误:', error);
  }
}); 
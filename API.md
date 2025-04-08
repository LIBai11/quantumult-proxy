# Quantumult Proxy 管理面板 API 文档

## 基础信息

- **基础URL**: `http://localhost:3000/admin/`
- **内容类型**: 所有POST请求需要设置 `Content-Type: application/json`
- **响应格式**: 所有API响应均为JSON格式

## 主机相关接口

### 获取所有主机列表

- **URL**: `GET /hosts`
- **描述**: 获取系统中所有出现过的主机列表
- **参数**: 无
- **响应示例**:
  ```json
  [
    "api.example.com",
    "www.example.org",
    "images.example.net"
  ]
  ```

### 获取活跃主机列表

- **URL**: `GET /hosts/active`
- **描述**: 获取在指定时间范围内有响应的活跃主机
- **参数**:
  - `hours`: 时间范围，以小时为单位，默认24小时
- **响应示例**:
  ```json
  {
    "timeRange": "24 小时",
    "hosts": [
      {
        "hostname": "api.example.com",
        "count": 42,
        "lastActive": "2023-09-01T12:34:56.789Z"
      },
      {
        "hostname": "www.example.org",
        "count": 18,
        "lastActive": "2023-09-01T10:22:33.444Z"
      }
    ]
  }
  ```

## 响应相关接口

### 获取所有响应

- **URL**: `GET /responses`
- **描述**: 获取所有已捕获的响应
- **参数**: 无
- **注意**: 该接口可能返回大量数据，建议使用分页接口代替
- **响应示例**:
  ```json
  [
    {
      "id": "res123",
      "url": "https://api.example.com/users",
      "status": 200,
      "headers": {
        "content-type": "application/json"
      },
      "body": "{\"success\":true,\"data\":{}}",
      "server_timestamp": "2023-09-01T12:34:56.890Z"
    },
    // ...更多响应
  ]
  ```

### 分页查询响应列表

- **URL**: `GET /responses-paginated`
- **描述**: 分页获取响应列表，支持主机过滤、关键字/正则查询
- **参数**:
  - `page`: 页码，默认1
  - `limit`: 每页条数，默认20
  - `host`: 按主机名过滤，可选
  - `keyword`: 关键字搜索，可选
  - `isRegex`: 是否使用正则表达式搜索，可选，'true'或'false'
- **响应示例**:
  ```json
  {
    "data": [
      {
        "id": "res123",
        "url": "https://api.example.com/users",
        "status": 200,
        "headers": {
          "content-type": "application/json"
        },
        "body": "{\"success\":true,\"data\":{}}",
        "server_timestamp": "2023-09-01T12:34:56.890Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
  ```

### 获取指定响应详情

- **URL**: `GET /responses/:id`
- **描述**: 获取指定ID的响应详情
- **参数**:
  - `id`: 响应ID，URL路径参数
- **响应示例**:
  ```json
  {
    "id": "res123",
    "url": "https://api.example.com/users",
    "status": 200,
    "headers": {
      "content-type": "application/json"
    },
    "body": "{\"success\":true,\"data\":{}}",
    "server_timestamp": "2023-09-01T12:34:56.890Z"
  }
  ```

### 删除指定响应

- **URL**: `DELETE /responses/:id`
- **描述**: 删除指定ID的响应
- **参数**:
  - `id`: 响应ID，URL路径参数
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "已删除 1 条响应记录"
  }
  ```

### 批量删除响应

- **URL**: `DELETE /responses/batch`
- **描述**: 批量删除多个响应
- **请求体**:
  ```json
  {
    "ids": ["res123", "res456", "res789"]
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "成功删除 3 条响应记录",
    "details": [
      {
        "id": "res123",
        "success": true,
        "deletedCount": 1
      },
      {
        "id": "res456",
        "success": true,
        "deletedCount": 1
      },
      {
        "id": "res789",
        "success": true,
        "deletedCount": 1
      }
    ]
  }
  ```

### 删除指定主机的响应

- **URL**: `DELETE /hosts/:hostname/responses`
- **描述**: 删除指定主机的所有响应
- **参数**:
  - `hostname`: 主机名，URL路径参数
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "已删除 api.example.com 的 24 条响应记录",
    "affectedIds": ["res123", "res456", "res789"]
  }
  ```

### 获取指定请求的修改后响应

- **URL**: `GET /modified-responses/:requestId`
- **描述**: 获取指定请求ID的修改后响应数据
- **参数**:
  - `requestId`: 请求ID，URL路径参数
- **响应示例**:
  ```json
  {
    "id": "modres123",
    "request_id": "req123",
    "status": 200,
    "headers": {
      "content-type": "application/json"
    },
    "body": "{\"success\":true,\"data\":{\"modified\":true}}",
    "server_timestamp": "2023-09-01T12:34:56.899Z"
  }
  ```

## 响应修改规则接口

### 获取所有响应修改规则

- **URL**: `GET /response-rules`
- **描述**: 获取所有响应修改规则
- **参数**: 无
- **响应示例**:
```json
[
  {
    "id": "rule_1631234567890_123",
    "name": "修改特定API返回值",
    "host": "api.example.com",
    "pathRegex": "^/api/v1/users/\\d+$",
    "method": "GET",
    "enabled": true,
    "responseBody": "{\"success\":true,\"data\":{\"id\":123,\"name\":\"Modified User\"}}",
    "responseStatus": 200,
    "responseHeaders": {"content-type": "application/json"},
    "createdAt": "2023-09-01T12:34:56.789Z",
    "updatedAt": "2023-09-01T12:34:56.789Z"
  }
]
```

### 获取单个响应修改规则

- **URL**: `GET /response-rules/:id`
- **描述**: 获取指定ID的响应修改规则详情
- **参数**:
- `id`: 规则ID，URL路径参数
- **响应示例**:
```json
{
  "id": "rule_1631234567890_123",
  "name": "修改特定API返回值",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/users/\\d+$",
  "method": "GET",
  "enabled": true,
  "responseBody": "{\"success\":true,\"data\":{\"id\":123,\"name\":\"Modified User\"}}",
  "responseStatus": 200,
  "responseHeaders": {"content-type": "application/json"},
  "createdAt": "2023-09-01T12:34:56.789Z",
  "updatedAt": "2023-09-01T12:34:56.789Z"
}
```

### 创建响应修改规则

- **URL**: `POST /response-rules`
- **描述**: 创建新的响应修改规则
- **请求体**:
```json
{
  "name": "修改特定API返回值",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/users/\\d+$",
  "method": "GET",
  "enabled": true,
  "responseBody": "{\"success\":true,\"data\":{\"id\":123,\"name\":\"Modified User\"}}",
  "responseStatus": 200,
  "responseHeaders": {"content-type": "application/json"}
}
```
- **参数说明**:
- `name`: 规则名称（必填）
- `host`: 主机名匹配，使用 '*' 匹配所有主机（必填）
- `pathRegex`: 路径正则表达式匹配（必填）
- `method`: HTTP方法匹配，使用 '*' 匹配所有方法（必填）
- `enabled`: 是否启用，默认为true（可选）
- `responseBody`: 替换的响应体（可选）
- `responseStatus`: 替换的状态码，默认200（可选）
- `responseHeaders`: 替换的响应头（可选）
- **响应示例**:
```json
{
  "id": "rule_1631234567890_123",
  "name": "修改特定API返回值",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/users/\\d+$",
  "method": "GET",
  "enabled": true,
  "responseBody": "{\"success\":true,\"data\":{\"id\":123,\"name\":\"Modified User\"}}",
  "responseStatus": 200,
  "responseHeaders": {"content-type": "application/json"},
  "createdAt": "2023-09-01T12:34:56.789Z",
  "updatedAt": "2023-09-01T12:34:56.789Z"
}
```

### 更新响应修改规则

- **URL**: `PUT /response-rules/:id`
- **描述**: 更新指定ID的响应修改规则
- **参数**:
- `id`: 规则ID，URL路径参数
- **请求体**:
```json
{
  "name": "修改后的规则名称",
  "pathRegex": "^/api/v1/users/\\d+/details$",
  "responseBody": "{\"success\":true,\"data\":{\"id\":456,\"name\":\"Updated User\"}}"
}
```
- **响应示例**:
```json
{
  "id": "rule_1631234567890_123",
  "name": "修改后的规则名称",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/users/\\d+/details$",
  "method": "GET",
  "enabled": true,
  "responseBody": "{\"success\":true,\"data\":{\"id\":456,\"name\":\"Updated User\"}}",
  "responseStatus": 200,
  "responseHeaders": {"content-type": "application/json"},
  "createdAt": "2023-09-01T12:34:56.789Z",
  "updatedAt": "2023-09-01T14:35:46.123Z"
}
```

### 删除响应修改规则

- **URL**: `DELETE /response-rules/:id`
- **描述**: 删除指定ID的响应修改规则
- **参数**:
- `id`: 规则ID，URL路径参数
- **响应示例**:
```json
{
  "success": true,
  "message": "已删除响应修改规则",
  "deletedCount": 1
}
```

### 启用/禁用响应修改规则

- **URL**: `PATCH /response-rules/:id/status`
- **描述**: 更新指定规则的启用状态
- **参数**:
- `id`: 规则ID，URL路径参数
- **请求体**:
```json
{
  "enabled": false
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "规则已禁用",
  "rule": {
    "id": "rule_1631234567890_123",
    "name": "修改特定API返回值",
    "host": "api.example.com",
    "pathRegex": "^/api/v1/users/\\d+$",
    "method": "GET",
    "enabled": false,
    "responseBody": "{\"success\":true,\"data\":{\"id\":123,\"name\":\"Modified User\"}}",
    "responseStatus": 200,
    "responseHeaders": {"content-type": "application/json"},
    "createdAt": "2023-09-01T12:34:56.789Z",
    "updatedAt": "2023-09-01T15:45:23.456Z"
  }
}
```

## 统计相关接口

### 获取响应统计信息

- **URL**: `GET /stats`
- **描述**: 获取响应和修改响应的统计信息
- **参数**: 无
- **响应示例**:
  ```json
  {
    "totalRequests": 100,
    "totalResponses": 95,
    "totalModifiedResponses": 10,
    "hosts": [
      {
        "hostname": "api.example.com",
        "requestCount": 60,
        "responseCount": 58,
        "modifiedCount": 5,
        "methods": {
          "GET": 40,
          "POST": 15,
          "PUT": 5
        }
      },
      {
        "hostname": "www.example.org",
        "requestCount": 40,
        "responseCount": 37,
        "modifiedCount": 5,
        "methods": {
          "GET": 35,
          "POST": 5
        }
      }
    ],
    "lastUpdated": "2023-09-01T12:34:56.789Z"
  }
  ```

## 系统相关接口

### 获取数据库状态

- **URL**: `GET /status`
- **描述**: 获取系统数据库状态
- **参数**: 无
- **响应示例**:
  ```json
  {
    "db_directory": "/path/to/data/db",
    "files": {
      "requests": {
        "path": "/path/to/data/db/requests.json",
        "exists": true,
        "size": 1024000
      },
      "responses": {
        "path": "/path/to/data/db/responses.json",
        "exists": true,
        "size": 2048000
      },
      "modified_responses": {
        "path": "/path/to/data/db/modified_responses.json",
        "exists": true,
        "size": 51200
      }
    }
  }
  ```

### 清空所有数据

- **URL**: `DELETE /all-data`
- **描述**: 清空所有请求、响应和修改响应数据（谨慎使用）
- **请求体**:
  ```json
  {
    "confirm": "YES_DELETE_ALL"
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "所有数据已清空"
  }
  ```

## 请求相关接口（辅助功能）

虽然项目主要关注响应捕获，但以下请求相关接口也可用于特殊情况：

### 获取所有请求

- **URL**: `GET /requests`
- **描述**: 获取所有已捕获的请求
- **参数**: 无

### 分页查询请求列表

- **URL**: `GET /requests-paginated`
- **描述**: 分页获取请求列表，支持主机过滤、关键字/正则查询
- **参数**:
  - `page`: 页码，默认1
  - `limit`: 每页条数，默认20
  - `host`: 按主机名过滤，可选
  - `keyword`: 关键字搜索，可选
  - `isRegex`: 是否使用正则表达式搜索，可选，'true'或'false'

### 获取指定请求详情

- **URL**: `GET /requests/:id`
- **描述**: 获取指定ID的请求详情
- **参数**:
  - `id`: 请求ID，URL路径参数

### 删除指定请求

- **URL**: `DELETE /requests/:id`
- **描述**: 删除指定ID的请求及相关响应
- **参数**:
  - `id`: 请求ID，URL路径参数

### 删除指定主机的请求

- **URL**: `DELETE /hosts/:hostname/requests`
- **描述**: 删除指定主机的所有请求及相关响应
- **参数**:
  - `hostname`: 主机名，URL路径参数

## 错误响应

所有API在发生错误时会返回HTTP错误状态码和错误信息：

- **400 Bad Request**: 请求参数错误
- **404 Not Found**: 请求的资源不存在
- **500 Internal Server Error**: 服务器内部错误

**错误响应示例**:
```json
{
  "error": "错误消息描述"
}
```

## 请求拦截规则管理

请求拦截规则用于拦截匹配条件的请求，可以选择修改请求头和请求体。拦截的请求会被存储，不会被发送到目标服务器。

### 获取拦截状态

- **URL**: `GET /intercept-status`
- **描述**: 获取当前请求拦截功能的启用状态
- **参数**: 无
- **响应示例**:
```json
{
  "enabled": true,
  "status": "active",
  "timestamp": "2023-09-01T12:34:56.789Z"
}
```

### 设置拦截状态

- **URL**: `POST /intercept-status`
- **描述**: 启用或禁用请求拦截功能
- **请求体**:
```json
{
  "enabled": true
}
```
- **参数说明**:
  - `enabled`: 是否启用拦截功能，布尔值（必填）
- **响应示例**:
```json
{
  "success": true,
  "message": "已启用请求拦截",
  "status": {
    "enabled": true,
    "status": "active",
    "timestamp": "2023-09-01T12:34:56.789Z"
  }
}
```

### 获取所有请求拦截规则

- **URL**: `GET /intercept-rules`
- **描述**: 获取所有请求拦截规则
- **参数**: 无
- **响应示例**:
```json
[
  {
    "id": "rule_1631234567890_123",
    "name": "拦截敏感API请求",
    "host": "api.example.com",
    "pathRegex": "^/api/v1/sensitive/.*$",
    "method": "POST",
    "enabled": true,
    "modifyHeaders": {
      "X-Modified-Header": "intercepted"
    },
    "modifyBody": "{\"modified\":true}",
    "description": "拦截包含敏感信息的API请求",
    "createdAt": "2023-09-01T12:34:56.789Z",
    "updatedAt": "2023-09-01T12:34:56.789Z"
  }
]
```

### 获取单个请求拦截规则

- **URL**: `GET /intercept-rules/:id`
- **描述**: 获取指定ID的请求拦截规则详情
- **参数**:
  - `id`: 规则ID，URL路径参数
- **响应示例**:
```json
{
  "id": "rule_1631234567890_123",
  "name": "拦截敏感API请求",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/sensitive/.*$",
  "method": "POST",
  "enabled": true,
  "modifyHeaders": {
    "X-Modified-Header": "intercepted"
  },
  "modifyBody": "{\"modified\":true}",
  "description": "拦截包含敏感信息的API请求",
  "createdAt": "2023-09-01T12:34:56.789Z",
  "updatedAt": "2023-09-01T12:34:56.789Z"
}
```

### 创建请求拦截规则

- **URL**: `POST /intercept-rules`
- **描述**: 创建新的请求拦截规则
- **请求体**:
```json
{
  "name": "拦截敏感API请求",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/sensitive/.*$",
  "method": "POST",
  "enabled": true,
  "modifyHeaders": {
    "X-Modified-Header": "intercepted"
  },
  "modifyBody": "{\"modified\":true}",
  "description": "拦截包含敏感信息的API请求"
}
```
- **参数说明**:
  - `name`: 规则名称（必填）
  - `host`: 主机名匹配，使用 '*' 匹配所有主机（必填）
  - `pathRegex`: 路径正则表达式匹配（必填）
  - `method`: HTTP方法匹配，使用 '*' 匹配所有方法（必填）
  - `enabled`: 是否启用，默认为true（可选）
  - `modifyHeaders`: 修改的请求头（可选）
  - `modifyBody`: 修改的请求体（可选）
  - `description`: 规则描述（可选）
- **响应示例**:
```json
{
  "id": "rule_1631234567890_123",
  "name": "拦截敏感API请求",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/sensitive/.*$",
  "method": "POST",
  "enabled": true,
  "modifyHeaders": {
    "X-Modified-Header": "intercepted"
  },
  "modifyBody": "{\"modified\":true}",
  "description": "拦截包含敏感信息的API请求",
  "createdAt": "2023-09-01T12:34:56.789Z",
  "updatedAt": "2023-09-01T12:34:56.789Z"
}
```

### 更新请求拦截规则

- **URL**: `PUT /intercept-rules/:id`
- **描述**: 更新指定ID的请求拦截规则
- **参数**:
  - `id`: 规则ID，URL路径参数
- **请求体**:
```json
{
  "name": "更新后的拦截规则",
  "pathRegex": "^/api/v1/sensitive/data/.*$",
  "modifyHeaders": {
    "X-Modified-Header": "updated-value"
  }
}
```
- **响应示例**:
```json
{
  "id": "rule_1631234567890_123",
  "name": "更新后的拦截规则",
  "host": "api.example.com",
  "pathRegex": "^/api/v1/sensitive/data/.*$",
  "method": "POST",
  "enabled": true,
  "modifyHeaders": {
    "X-Modified-Header": "updated-value"
  },
  "modifyBody": "{\"modified\":true}",
  "description": "拦截包含敏感信息的API请求",
  "createdAt": "2023-09-01T12:34:56.789Z",
  "updatedAt": "2023-09-01T14:35:46.123Z"
}
```

### 删除请求拦截规则

- **URL**: `DELETE /intercept-rules/:id`
- **描述**: 删除指定ID的请求拦截规则
- **参数**:
  - `id`: 规则ID，URL路径参数
- **响应示例**:
```json
{
  "success": true,
  "message": "已删除请求拦截规则",
  "deletedCount": 1
}
```

### 启用请求拦截规则

- **URL**: `PATCH /intercept-rules/:id/enable`
- **描述**: 启用指定的请求拦截规则
- **参数**:
  - `id`: 规则ID，URL路径参数
- **响应示例**:
```json
{
  "success": true,
  "message": "规则已启用",
  "rule": {
    "id": "rule_1631234567890_123",
    "name": "拦截敏感API请求",
    "host": "api.example.com",
    "pathRegex": "^/api/v1/sensitive/.*$",
    "method": "POST",
    "enabled": true,
    "modifyHeaders": {
      "X-Modified-Header": "intercepted"
    },
    "modifyBody": "{\"modified\":true}",
    "description": "拦截包含敏感信息的API请求",
    "createdAt": "2023-09-01T12:34:56.789Z",
    "updatedAt": "2023-09-01T15:45:23.456Z"
  }
}
```

### 禁用请求拦截规则

- **URL**: `PATCH /intercept-rules/:id/disable`
- **描述**: 禁用指定的请求拦截规则
- **参数**:
  - `id`: 规则ID，URL路径参数
- **响应示例**:
```json
{
  "success": true,
  "message": "规则已禁用",
  "rule": {
    "id": "rule_1631234567890_123",
    "name": "拦截敏感API请求",
    "host": "api.example.com",
    "pathRegex": "^/api/v1/sensitive/.*$",
    "method": "POST",
    "enabled": false,
    "modifyHeaders": {
      "X-Modified-Header": "intercepted"
    },
    "modifyBody": "{\"modified\":true}",
    "description": "拦截包含敏感信息的API请求",
    "createdAt": "2023-09-01T12:34:56.789Z",
    "updatedAt": "2023-09-01T15:45:23.456Z"
  }
}
```

## 拦截请求管理

拦截请求管理API用于查询和管理被拦截的请求。

### 获取拦截请求统计信息

- **URL**: `GET /intercept-stats`
- **描述**: 获取拦截请求的统计信息，包括总数、已放行数、仍被拦截数以及修改的请求数
- **参数**: 无
- **响应示例**:
```json
{
  "totalIntercepted": 42,
  "releasedCount": 15,
  "stillInterceptedCount": 27,
  "modifiedCount": 35,
  "hosts": [
    {
      "hostname": "api.example.com",
      "interceptedCount": 25,
      "releasedCount": 10,
      "stillInterceptedCount": 15,
      "modifiedCount": 20
    },
    {
      "hostname": "other.example.org",
      "interceptedCount": 17,
      "releasedCount": 5,
      "stillInterceptedCount": 12,
      "modifiedCount": 15
    }
  ],
  "lastUpdated": "2023-09-01T12:34:56.789Z"
}
```

### 分页获取拦截请求列表

- **URL**: `GET /intercepted-requests-paginated`
- **描述**: 分页获取拦截请求列表，支持主机过滤、关键字/正则查询，可选择是否包含自动放行的请求
- **参数**:
  - `page`: 页码，默认1
  - `limit`: 每页条数，默认20
  - `host`: 按主机名过滤，可选
  - `keyword`: 关键字搜索，可选
  - `isRegex`: 是否使用正则表达式搜索，可选，'true'或'false'
  - `includeAutoReleased`: 是否包含自动放行的请求，可选，默认为'true'
- **响应示例**:
```json
{
  "totalItems": 42,
  "totalPages": 3,
  "currentPage": 1,
  "pageSize": 20,
  "interceptStatus": {
    "enabled": true,
    "status": "active",
    "timestamp": "2024-03-21T12:34:56.789Z"
  },
  "data": [
    {
      "id": "intercept_1631234567890_123",
      "url": "https://api.example.com/api/v1/sensitive/data",
      "method": "POST",
      "headers": {
        "content-type": "application/json",
        "x-modified-header": "intercepted"
      },
      "body": "{\"modified\":true}",
      "intercepted": true,
      "interceptedAt": "2023-09-01T12:34:56.890Z",
      "autoReleased": false,
      "released": false,
      "releasedAt": null,
      "originalRequest": {
        "url": "https://api.example.com/api/v1/sensitive/data",
        "method": "POST",
        "headers": {
          "content-type": "application/json"
        },
        "body": "{\"username\":\"test\",\"password\":\"secret\"}"
      },
      "matchedRuleId": "rule_1631234567890_123",
      "ruleName": "拦截敏感API请求"
    }
  ]
}
```

### 获取拦截请求详情

- **URL**: `GET /intercepted-requests/:id`
- **描述**: 获取指定ID的拦截请求详情
- **参数**:
  - `id`: 请求ID，URL路径参数
- **响应示例**:
```json
{
  "id": "intercept_1631234567890_123",
  "url": "https://api.example.com/api/v1/sensitive/data",
  "method": "POST",
  "headers": {
    "content-type": "application/json",
    "x-modified-header": "intercepted"
  },
  "body": "{\"modified\":true}",
  "intercepted": true,
  "interceptedAt": "2023-09-01T12:34:56.890Z",
  "originalRequest": {
    "url": "https://api.example.com/api/v1/sensitive/data",
    "method": "POST",
    "headers": {
      "content-type": "application/json"
    },
    "body": "{\"username\":\"test\",\"password\":\"secret\"}"
  },
  "matchedRuleId": "rule_1631234567890_123",
  "ruleName": "拦截敏感API请求"
}
```

### 删除拦截请求

- **URL**: `DELETE /intercepted-requests/:id`
- **描述**: 删除指定ID的拦截请求
- **参数**:
  - `id`: 请求ID，URL路径参数
- **响应示例**:
```json
{
  "success": true,
  "message": "已删除拦截请求",
  "deletedCount": 1
}
```

### 放行拦截请求

- **URL**: `POST /intercepted-requests/:id/release`
- **描述**: 放行指定ID的拦截请求，将请求标记为已放行
- **参数**:
  - `id`: 请求ID，URL路径参数
- **响应示例**:
```json
{
  "success": true,
  "message": "已放行拦截请求",
  "request": {
    "id": "intercept_1631234567890_123",
    "url": "https://api.example.com/api/v1/sensitive/data",
    "method": "POST",
    "headers": {
      "content-type": "application/json",
      "x-modified-header": "intercepted"
    },
    "body": "{\"modified\":true}",
    "intercepted": true,
    "interceptedAt": "2023-09-01T12:34:56.890Z",
    "released": true,
    "releasedAt": "2023-09-01T13:45:23.456Z",
    "originalRequest": {
      "url": "https://api.example.com/api/v1/sensitive/data",
      "method": "POST",
      "headers": {
        "content-type": "application/json"
      },
      "body": "{\"username\":\"test\",\"password\":\"secret\"}"
    },
    "matchedRuleId": "rule_1631234567890_123",
    "ruleName": "拦截敏感API请求"
  }
}
```

### 批量放行拦截请求

- **URL**: `POST /intercepted-requests/batch-release`
- **描述**: 批量放行多个拦截请求
- **请求体**:
```json
{
  "ids": ["intercept_1631234567890_123", "intercept_1631234567890_456"]
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "成功放行 2 条拦截请求",
  "details": [
    {
      "id": "intercept_1631234567890_123",
      "success": true,
      "message": "请求已放行"
    },
    {
      "id": "intercept_1631234567890_456",
      "success": true,
      "message": "请求已放行"
    }
  ]
}
```

### 清空所有拦截请求

- **URL**: `DELETE /intercepted-requests`
- **描述**: 删除所有拦截请求
- **请求体**:
```json
{
  "confirm": "YES_RELEASE_ALL"
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "已清空所有拦截请求，共 42 条"
}
```

## 火山大模型 API

以下接口提供与火山方舟大模型服务的交互能力，支持获取模型列表、调用大模型生成内容以及获取文本的嵌入向量表示。

### 获取支持的大模型列表

- **URL**: `GET /volcengine/models`
- **描述**: 获取系统支持的火山大模型列表
- **参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "models": [
      {
        "id": "doubao-1-5-pro-32k-250115",
        "name": "豆包大模型专业版",
        "maxTokens": "12k",
        "description": "新一代专业版大模型，单价不提升的同时，模型能力有大幅提升，在知识（MMLU_PRO：80.2； GPQA：66.2）、代码（FullStackBench：65.1）、推理（DROP：92.6）、中文（C-Eval：91.5）等相关的多项测评中获得高分，达到行业SOTA水平。"
      }
    ]
  }
  ```

### 调用大模型生成回复

- **URL**: `POST /volcengine/chat`
- **描述**: 调用火山大模型进行对话生成
- **请求体**:
  ```json
  {
    "model": "doubao-1-5-pro-32k-250115",
    "messages": [
      {
        "role": "user",
        "content": "你好，请介绍一下自己"
      }
    ],
    "temperature": 0,
    "max_tokens": 1024
  }
  ```
- **参数说明**:
  - `model`: 模型ID，必填
  - `messages`: 对话消息数组，必填
  - `apiKey`: 火山方舟API密钥，可选（如未提供将使用环境变量ARK_API_KEY）
  - `temperature`: 温度参数，控制随机性，可选，默认0
  - `max_tokens`: 最大生成token数，可选
- **响应示例**:
  ```json
  {
    "success": true,
    "result": {
      "id": "chatcmpl-123456789",
      "object": "chat.completion",
      "created": 1677858242,
      "model": "doubao-1-5-pro-32k-250115",
      "usage": {
        "prompt_tokens": 13,
        "completion_tokens": 126,
        "total_tokens": 139
      },
      "choices": [
        {
          "message": {
            "role": "assistant",
            "content": "你好！我是豆包大模型，一个由字节跳动研发的人工智能助手。我能够理解和生成人类语言，回答问题，提供信息，协助完成各种任务。我的知识截止到训练数据的最后更新日期，所以关于更新后的事件可能无法提供准确信息。有什么我可以帮助你的吗？"
          },
          "finish_reason": "stop",
          "index": 0
        }
      ]
    }
  }
  ```

### 获取文本嵌入向量

- **URL**: `POST /volcengine/embeddings`
- **描述**: 将文本转换为嵌入向量表示
- **请求体**:
  ```json
  {
    "text": "这是一段需要向量化的文本"
  }
  ```
- **参数说明**:
  - `text`: 需要转换的文本，可以是字符串或字符串数组，必填
  - `apiKey`: 火山方舟API密钥，可选（如未提供将使用环境变量ARK_API_KEY）
- **响应示例**:
  ```json
  {
    "success": true,
    "result": {
      "object": "list",
      "data": [
        {
          "object": "embedding",
          "embedding": [0.002359, -0.007719, 0.000664, ...],
          "index": 0
        }
      ],
      "model": "doubao-embedding",
      "usage": {
        "prompt_tokens": 11,
        "total_tokens": 11
      }
    }
  }
  ```

## 注意事项

1. 调用火山大模型API需要API密钥，可以通过以下两种方式提供：
   - 在请求中的`apiKey`参数
   - 环境变量`ARK_API_KEY`
2. 模型调用会消耗Token，请注意控制使用量以避免超出配额
3. 请求中的messages格式需要符合OpenAI Chat格式规范
4. API响应时间可能较长，请设置合理的请求超时时间 
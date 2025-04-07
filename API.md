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
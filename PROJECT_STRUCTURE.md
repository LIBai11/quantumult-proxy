# 项目结构

```
quantumult-proxy/
├── src/                   # 源代码
│   └── index.js           # 主入口文件
├── examples/              # 示例文件
│   └── example-script.js  # 示例 QuantumultX HTTP Backend 脚本
├── logs/                  # 日志目录
├── .env.example           # 示例环境变量文件
├── Dockerfile             # Docker 构建文件
├── docker-compose.yml     # Docker Compose 配置
├── .dockerignore          # Docker 忽略文件
├── .gitignore             # Git 忽略文件
├── package.json           # 项目依赖和脚本
└── README.md              # 项目说明文档
```

## 关键文件说明

- **src/index.js**: 代理服务器的核心实现
- **examples/example-script.js**: 演示如何在 QuantumultX 脚本中使用代理服务器
- **.env.example**: 环境变量示例，使用前复制为 `.env` 并根据需要修改
- **Dockerfile**: 用于构建 Docker 镜像
- **docker-compose.yml**: 用于在本地运行 Docker 容器 
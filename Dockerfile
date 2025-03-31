FROM node:18-alpine

# 创建工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --production

# 复制源代码
COPY . .

# 创建日志目录并设置权限
RUN mkdir -p /var/log/proxy && \
    chown -R node:node /var/log/proxy /app

# 暴露端口
EXPOSE 3000

# 使用非 root 用户运行
USER node

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "src/index.js"] 
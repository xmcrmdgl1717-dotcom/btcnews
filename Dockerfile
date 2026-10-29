FROM node:20-alpine

WORKDIR /app

# 先复制 package.json 和 lock 文件，利用 Docker 缓存
COPY package*.json ./

# 安装依赖 (如果存在 package-lock.json，推荐用 npm ci；否则用 npm install)
RUN npm install

# 复制其余项目文件
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

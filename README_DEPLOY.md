# LiveForm 系统部署指南

## 📋 目录结构

```
LiveForm/
├── start.bat           # Windows 启动脚本
├── stop.bat            # Windows 关闭脚本
├── start.sh            # Linux/macOS 启动脚本
├── stop.sh             # Linux/macOS 关闭脚本
├── docker-compose.yml  # Docker Compose 配置
├── Dockerfile.backend  # 后端 Docker 镜像
├── nginx.conf          # Nginx 配置 (生产环境)
├── frontend/
│   └── Dockerfile      # 前端 Docker 镜像
└── README_DEPLOY.md    # 本文件
```

## 🚀 快速启动

### Windows 系统

双击运行：
- **启动**: `start.bat`
- **关闭**: `stop.bat`

或在命令行中：
```cmd
start.bat
```

### Linux / macOS 系统

首次运行需要添加执行权限：
```bash
chmod +x start.sh stop.sh
```

然后运行：
```bash
./start.sh  # 启动
./stop.sh   # 关闭
```

### Docker 部署 (推荐用于 NAS)

#### 开发环境
```bash
docker-compose up -d
```

#### 生产环境 (包含 Nginx)
```bash
docker-compose --profile production up -d
```

#### 查看日志
```bash
docker-compose logs -f
```

#### 停止服务
```bash
docker-compose down
```

## 🔧 系统要求

### 本地部署
- **Python**: 3.8 或更高版本
- **Node.js**: 16 或更高版本
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 500MB 可用空间

### Docker 部署
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.0 或更高版本
- **内存**: 至少 4GB RAM
- **磁盘**: 至少 2GB 可用空间

## 🌐 访问地址

### 本地部署
- **前端**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

### Docker 部署
- **前端**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **Nginx (生产)**: http://localhost

## 📦 NAS 部署指南

### Synology NAS

1. 安装 Docker 套件
2. 上传项目文件到 NAS
3. SSH 连接到 NAS
4. 运行 Docker Compose：
   ```bash
   cd /volume1/docker/LiveForm
   docker-compose up -d
   ```

### QNAP NAS

1. 安装 Container Station
2. 导入 `docker-compose.yml`
3. 启动容器

### 其他 NAS

只要支持 Docker，都可以使用 Docker Compose 部署。

## 🔐 安全建议

### 生产环境部署

1. **修改默认端口**
   ```yaml
   # docker-compose.yml
   ports:
     - "8080:8000"  # 后端
     - "3000:5173"  # 前端
   ```

2. **使用环境变量**
   创建 `.env` 文件：
   ```env
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=sqlite:///./liveform.db
   ALLOWED_ORIGINS=http://your-domain.com
   ```

3. **启用 HTTPS**
   - 使用 Let's Encrypt 证书
   - 配置 Nginx SSL

4. **数据备份**
   ```bash
   # 备份数据库
   docker cp liveform-backend:/app/liveform.db ./backup/
   
   # 备份上传文件
   docker cp liveform-backend:/app/uploads ./backup/
   ```

## 🐛 故障排查

### 端口被占用
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:8000 | xargs kill -9
```

### Docker 容器无法启动
```bash
# 查看日志
docker-compose logs backend
docker-compose logs frontend

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 数据库锁定
```bash
# 停止所有服务
docker-compose down

# 删除数据库锁文件
rm liveform.db-shm liveform.db-wal

# 重新启动
docker-compose up -d
```

## 📝 更新系统

### 本地部署
```bash
git pull
pip install -r requirements.txt
cd frontend && npm install
```

### Docker 部署
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## 🆘 获取帮助

如遇问题，请检查：
1. 日志文件 (`backend.log`, `frontend.log`)
2. Docker 日志 (`docker-compose logs`)
3. 系统资源使用情况

## 📄 许可证

本项目仅供学习使用。

# LiveForm 系统 - 更新日志

## v2.0.0 - 2025-12-23

### 🎉 新增功能

#### 一键启动/关闭脚本
- ✅ **Windows**: `start.bat` / `stop.bat`
- ✅ **Linux/macOS**: `start.sh` / `stop.sh`
- ✅ **自动安装依赖**: 未检测到 Python/Node.js 时自动从国内镜像下载安装
- ✅ **国内镜像加速**:
  - Python: 华为云镜像 (https://repo.huaweicloud.com)
  - Node.js: 淘宝镜像 (https://registry.npmmirror.com)
  - pip: 清华镜像 (https://pypi.tuna.tsinghua.edu.cn)
  - npm: 淘宝镜像 (https://registry.npmmirror.com)

#### Docker 支持
- ✅ **跨平台部署**: Windows、Linux、macOS、NAS
- ✅ **Docker Compose**: 一键启动完整系统
- ✅ **生产环境**: 包含 Nginx 反向代理配置
- ✅ **健康检查**: 自动监控服务状态

#### 用户管理优化
- ✅ **右键菜单**: 删除用户、重置密码
- ✅ **确认弹窗**: 所有危险操作使用自定义 Modal 确认
- ✅ **成功提示**: 使用 Modal 替代浏览器 alert
- ✅ **批量导入**: Excel 批量导入用户，带确认弹窗
- ✅ **中文提示**: 所有提示信息完全中文化

#### 任务管理优化
- ✅ **删除确认**: 自定义 Modal 确认删除
- ✅ **成功提示**: Toast 通知替代 alert
- ✅ **URL 修复**: 修复了所有 URL 模板字符串的空格问题

#### 性能优化
- ✅ **多进程支持**: 后端使用 4 workers 提升并发能力
- ✅ **压力测试**: 通过 100 并发请求测试 (100% 成功率)
- ✅ **实时监控**: 压力测试脚本支持实时显示结果

### 🐛 Bug 修复
- ✅ 修复任务删除 URL 错误 (空格问题)
- ✅ 修复导航链接 URL 错误
- ✅ 修复 Toast 样式错误
- ✅ 修复批量导入成功提示包含英文的问题

### 📚 文档
- ✅ **部署指南**: `README_DEPLOY.md` 完整部署文档
- ✅ **多平台支持**: Windows、Linux、macOS、NAS 部署说明
- ✅ **故障排查**: 常见问题解决方案

### 🔧 技术改进
- ✅ 虚拟环境支持 (Python venv)
- ✅ 自动配置国内镜像源
- ✅ 依赖自动安装
- ✅ 日志文件输出

---

## 使用说明

### Windows 用户
```cmd
start.bat  # 启动系统
stop.bat   # 关闭系统
```

### Linux/macOS 用户
```bash
chmod +x start.sh stop.sh  # 首次运行
./start.sh  # 启动系统
./stop.sh   # 关闭系统
```

### Docker 用户
```bash
docker-compose up -d        # 启动
docker-compose down         # 关闭
docker-compose logs -f      # 查看日志
```

---

## 系统要求

### 本地部署
- Python 3.8+ (脚本会自动安装)
- Node.js 16+ (脚本会自动安装)
- 2GB+ RAM
- 500MB+ 磁盘空间

### Docker 部署
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 2GB+ 磁盘空间

---

## 访问地址

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

---

## 下一步计划

- [ ] 数据库迁移到 PostgreSQL (更好的并发支持)
- [ ] 添加用户权限管理
- [ ] 支持更多导入格式 (CSV, JSON)
- [ ] 添加数据可视化图表
- [ ] 支持多语言 (i18n)

---

**感谢使用 LiveForm！**

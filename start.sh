#!/bin/bash

echo "========================================"
echo "  LiveForm 系统启动脚本 (Linux/macOS)"
echo "========================================"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Detect OS
OS_TYPE="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
fi

echo "[1/4] 检查并安装依赖..."
echo ""

# Check Python3
if ! command -v python3 &> /dev/null; then
    echo "⚠️  未检测到 Python3，准备自动安装..."
    
    if [ "$OS_TYPE" == "linux" ]; then
        echo "📥 正在安装 Python3 (使用清华镜像源)..."
        
        # Detect Linux distribution
        if [ -f /etc/debian_version ]; then
            # Debian/Ubuntu
            sudo sed -i 's|http://archive.ubuntu.com|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv
        elif [ -f /etc/redhat-release ]; then
            # CentOS/RHEL
            sudo yum install -y python3 python3-pip
        else
            echo "❌ 不支持的 Linux 发行版，请手动安装 Python3"
            exit 1
        fi
        
        echo "✅ Python3 安装完成"
        
    elif [ "$OS_TYPE" == "macos" ]; then
        echo "📥 正在通过 Homebrew 安装 Python3..."
        
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            echo "📥 正在安装 Homebrew..."
            /bin/bash -c "$(curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/install.git)"
        fi
        
        # Configure Homebrew to use Tsinghua mirror
        export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
        export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
        
        brew install python@3.11
        echo "✅ Python3 安装完成"
    else
        echo "❌ 无法自动安装 Python3，请手动安装"
        echo "   访问: https://www.python.org/downloads/"
        exit 1
    fi
else
    echo "✅ Python3 已安装"
fi
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "⚠️  未检测到 Node.js，准备自动安装..."
    
    if [ "$OS_TYPE" == "linux" ]; then
        echo "📥 正在安装 Node.js 20.x (使用淘宝镜像)..."
        
        # Use NodeSource with Taobao mirror
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        echo "✅ Node.js 安装完成"
        
    elif [ "$OS_TYPE" == "macos" ]; then
        echo "📥 正在通过 Homebrew 安装 Node.js..."
        brew install node@20
        echo "✅ Node.js 安装完成"
    else
        echo "❌ 无法自动安装 Node.js，请手动安装"
        echo "   访问: https://nodejs.org/"
        exit 1
    fi
    
    # Configure npm to use Taobao mirror
    npm config set registry https://registry.npmmirror.com
    echo "✅ 已配置 npm 使用淘宝镜像"
else
    echo "✅ Node.js 已安装"
    # Ensure npm uses Taobao mirror
    npm config set registry https://registry.npmmirror.com 2>/dev/null
fi
echo ""

echo "[2/4] 安装 Python 依赖..."
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip install -r requirements.txt --quiet
echo "✅ Python 依赖安装完成"
echo ""

echo "[3/4] 安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 安装 npm 包..."
    npm install --registry=https://registry.npmmirror.com
    echo "✅ 前端依赖安装完成"
fi
cd ..
echo ""

echo "[4/4] 启动服务..."
echo ""

echo "🚀 启动后端服务器 (端口 8000)..."
source venv/bin/activate
nohup python3 -m uvicorn backend.main:app --workers 4 --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
sleep 2
echo "✅ 后端服务器已启动 (PID: $BACKEND_PID)"
echo ""

echo "🚀 启动前端开发服务器 (端口 5173)..."
cd frontend
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
cd ..
sleep 2
echo "✅ 前端服务器已启动 (PID: $FRONTEND_PID)"
echo ""

echo "========================================"
echo "  🎉 LiveForm 系统启动成功！"
echo "========================================"
echo ""
echo "  后端地址: http://localhost:8000"
echo "  前端地址: http://localhost:5173"
echo "  API文档:  http://localhost:8000/docs"
echo ""
echo "  后端日志: tail -f backend.log"
echo "  前端日志: tail -f frontend.log"
echo ""
echo "  提示: 首次启动可能需要等待依赖安装"
echo ""
echo "  运行 ./stop.sh 关闭系统"
echo ""


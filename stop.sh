#!/bin/bash

echo "========================================"
echo "  LiveForm 系统关闭脚本 (Linux/macOS)"
echo "========================================"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "[1/2] 关闭后端服务器..."
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ 后端服务器已关闭 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端服务器进程不存在"
    fi
    rm -f backend.pid
else
    echo "⚠️  未找到 backend.pid 文件"
    # Try to kill by port
    PID=$(lsof -ti:8000)
    if [ ! -z "$PID" ]; then
        kill $PID
        echo "✅ 已关闭端口 8000 上的进程"
    fi
fi
echo ""

echo "[2/2] 关闭前端服务器..."
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ 前端服务器已关闭 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端服务器进程不存在"
    fi
    rm -f frontend.pid
else
    echo "⚠️  未找到 frontend.pid 文件"
    # Try to kill by port
    PID=$(lsof -ti:5173)
    if [ ! -z "$PID" ]; then
        kill $PID
        echo "✅ 已关闭端口 5173 上的进程"
    fi
fi
echo ""

echo "========================================"
echo "  🎉 LiveForm 系统已完全关闭"
echo "========================================"
echo ""
sleep 1

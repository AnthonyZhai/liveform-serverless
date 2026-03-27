@echo off
chcp 65001 >nul
echo ========================================
echo   LiveForm 系统启动脚本 (Windows)
echo ========================================
echo.

echo [1/4] 检查并安装依赖...
echo.

REM Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未检测到 Python，准备自动安装...
    echo 📥 正在从华为云镜像下载 Python 3.11.7 安装包...
    
    set PYTHON_URL=https://repo.huaweicloud.com/python/3.11.7/python-3.11.7-amd64.exe
    set PYTHON_INSTALLER=%TEMP%\python-installer.exe
    
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_INSTALLER%' -UseBasicParsing}"
    
    if exist "%PYTHON_INSTALLER%" (
        echo ✅ 下载完成，开始安装 Python...
        echo 📝 安装选项: 添加到 PATH, 安装 pip
        "%PYTHON_INSTALLER%" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1
        timeout /t 30 /nobreak >nul
        del "%PYTHON_INSTALLER%"
        echo ✅ Python 安装完成
        
        REM Refresh environment variables
        call refreshenv >nul 2>&1
    ) else (
        echo ❌ Python 下载失败，请手动安装: https://www.python.org/downloads/
        echo 或访问华为云镜像: https://repo.huaweicloud.com/python/
        pause
        exit /b 1
    )
) else (
    echo ✅ Python 已安装
)
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未检测到 Node.js，准备自动安装...
    echo 📥 正在从淘宝镜像下载 Node.js 20.11.0 安装包...
    
    set NODE_URL=https://registry.npmmirror.com/-/binary/node/v20.11.0/node-v20.11.0-x64.msi
    set NODE_INSTALLER=%TEMP%\node-installer.msi
    
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_INSTALLER%' -UseBasicParsing}"
    
    if exist "%NODE_INSTALLER%" (
        echo ✅ 下载完成，开始安装 Node.js...
        msiexec /i "%NODE_INSTALLER%" /quiet /norestart
        timeout /t 30 /nobreak >nul
        del "%NODE_INSTALLER%"
        echo ✅ Node.js 安装完成
        
        REM Configure npm to use Taobao mirror
        call npm config set registry https://registry.npmmirror.com
        echo ✅ 已配置 npm 使用淘宝镜像
        
        REM Refresh environment variables
        call refreshenv >nul 2>&1
    ) else (
        echo ❌ Node.js 下载失败，请手动安装: https://nodejs.org/
        echo 或访问淘宝镜像: https://registry.npmmirror.com/
        pause
        exit /b 1
    )
) else (
    echo ✅ Node.js 已安装
    REM Ensure npm uses Taobao mirror
    call npm config set registry https://registry.npmmirror.com >nul 2>&1
)
echo.

echo [2/4] 安装 Python 依赖...
if not exist "venv" (
    echo 📦 创建虚拟环境...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip install -r requirements.txt --quiet
echo ✅ Python 依赖安装完成
echo.

echo [3/4] 安装前端依赖...
cd frontend
if not exist "node_modules" (
    echo 📦 安装 npm 包...
    call npm install --registry=https://registry.npmmirror.com
    echo ✅ 前端依赖安装完成
)
cd ..
echo.

echo [4/4] 启动服务...
echo.

echo 🚀 启动后端服务器 (端口 8000)...
start "LiveForm Backend" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --workers 4 --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
echo ✅ 后端服务器已启动
echo.

echo 🚀 启动前端开发服务器 (端口 5173)...
start "LiveForm Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul
echo ✅ 前端服务器已启动
echo.

echo ========================================
echo   🎉 LiveForm 系统启动成功！
echo ========================================
echo.
echo   后端地址: http://localhost:8000
echo   前端地址: http://localhost:5173
echo   API文档:  http://localhost:8000/docs
echo.
echo   提示: 首次启动可能需要等待依赖安装
echo.
echo   按任意键关闭此窗口...
pause >nul


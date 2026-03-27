@echo off
chcp 65001 >nul
echo ========================================
echo   LiveForm 系统关闭脚本 (Windows)
echo ========================================
echo.

echo [1/2] 关闭后端服务器...
taskkill /F /FI "WINDOWTITLE eq LiveForm Backend*" >nul 2>&1
taskkill /F /IM python.exe /FI "MEMUSAGE gt 10000" >nul 2>&1
echo ✅ 后端服务器已关闭
echo.

echo [2/2] 关闭前端服务器...
taskkill /F /FI "WINDOWTITLE eq LiveForm Frontend*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo ✅ 前端服务器已关闭
echo.

echo ========================================
echo   🎉 LiveForm 系统已完全关闭
echo ========================================
echo.
timeout /t 2 /nobreak >nul

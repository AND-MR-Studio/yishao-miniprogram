@echo off
echo 正在启动本地汤面服务器...
cd /d %~dp0
cd local-server
node server.js
pause
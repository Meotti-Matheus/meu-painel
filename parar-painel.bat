@echo off
rem Desliga o servidor do painel (o processo que usa a porta 3001)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "127.0.0.1:3001" ^| findstr LISTENING') do taskkill /PID %%p /F
echo Painel desligado.
timeout /t 2 >nul
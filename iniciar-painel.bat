@echo off
title Meu Painel
rem Vai para a pasta onde este arquivo está (dashboard)
cd /d "%~dp0"

echo.
echo  [1/3] Preparando o site...
cd web
call npm run build
if errorlevel 1 (
  echo.
  echo  Erro ao preparar o site. Veja a mensagem acima.
  pause
  exit /b 1
)
cd ..

echo.
echo  [2/3] Abrindo o navegador em 3 segundos...
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3001"

echo.
echo  [3/3] Ligando o servidor. NAO feche esta janela (pode minimizar).
echo.
cd server
call npm start

rem Se o servidor parar por erro, a janela fica aberta para ler a mensagem
pause
' Liga o servidor do painel sem abrir janela
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Pasta onde este arquivo está (dashboard)
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = pasta & "\server"

' 0 = janela escondida. As mensagens do servidor vão para o arquivo painel.log
shell.Run "cmd /c npm start > ..\painel.log 2>&1", 0, False
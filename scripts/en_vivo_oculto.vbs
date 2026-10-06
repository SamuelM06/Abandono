' Doble clic aqui: arranca el modo en vivo SIN abrir ventanas de PowerShell.
Set sh = CreateObject("Wscript.Shell")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(root)
ps1 = root & "\scripts\en_vivo.ps1"
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """", 0, False

Option Explicit

Dim shell, files, project, electron, environment
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
project = files.GetParentFolderName(files.GetParentFolderName(WScript.ScriptFullName))
electron = files.BuildPath(project, "node_modules\electron\dist\electron.exe")

If Not files.FileExists(electron) Or Not files.FileExists(files.BuildPath(project, "dist\main\index.js")) Then
  MsgBox "Run npm install and npm run build in the PCpet folder first.", vbExclamation, "PCpet"
  WScript.Quit 1
End If

Set environment = shell.Environment("Process")
environment("PET_LOCAL_SPECIES_ROOT") = files.BuildPath(project, "personal-species")
environment("PET_DEFAULT_SPECIES_ID") = "black-wizard-cat"
If Len(environment("ELECTRON_RUN_AS_NODE")) > 0 Then environment.Remove "ELECTRON_RUN_AS_NODE"
shell.CurrentDirectory = project
shell.Run Chr(34) & electron & Chr(34) & " " & Chr(34) & project & Chr(34), 0, False

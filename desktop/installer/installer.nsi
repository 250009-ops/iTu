; iTestU Windows bootstrap installer — opens the web app in app mode via Edge/Chrome.
; Full Tauri shell can replace this artifact when Rust CI builds are available.

!include "MUI2.nsh"

Name "iTestU"
OutFile "..\..\dist\desktop\iTestU_1.0.0_x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\iTestU"
RequestExecutionLevel user
Unicode true

!define MUI_ABORTWARNING

Page directory
Page instfiles

Section "Install"
  SetOutPath "$INSTDIR"
  File "launcher.bat"

  CreateDirectory "$SMPROGRAMS\iTestU"
  CreateShortcut "$SMPROGRAMS\iTestU\iTestU.lnk" "$INSTDIR\launcher.bat" "" "$INSTDIR\launcher.bat" 0
  CreateShortcut "$DESKTOP\iTestU.lnk" "$INSTDIR\launcher.bat" "" "$INSTDIR\launcher.bat" 0

  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\iTestU" "DisplayName" "iTestU"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\iTestU" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\iTestU" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\iTestU" "Publisher" "iTestU"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\launcher.bat"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$SMPROGRAMS\iTestU\iTestU.lnk"
  Delete "$DESKTOP\iTestU.lnk"
  RMDir "$SMPROGRAMS\iTestU"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\iTestU"
SectionEnd

# Sakura Mist - uninstall from the profile bundle list (keeps sources)
# Delegates to qa/manage.mjs (UTF-8 safe; ASCII wrapper for Windows PowerShell 5.1).
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'manage.mjs') uninstall
exit $LASTEXITCODE

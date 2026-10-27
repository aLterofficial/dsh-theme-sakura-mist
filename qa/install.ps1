# Sakura Mist - install/repair as a formal profile bundle
# Delegates to qa/manage.mjs (UTF-8 safe; ASCII wrapper for Windows PowerShell 5.1).
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'manage.mjs') install
exit $LASTEXITCODE

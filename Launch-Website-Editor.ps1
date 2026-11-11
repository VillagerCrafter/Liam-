$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$port = 8765
while ($port -le 8795) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) { break }
    $port++
}
if ($port -gt 8795) {
    throw "No available preview port was found in the range 8765-8795."
}

$rubyCommand = Get-Command ruby.exe -ErrorAction SilentlyContinue
if ($rubyCommand) {
    $ruby = $rubyCommand.Source
} elseif (Test-Path "C:\Ruby33-x64\bin\ruby.exe") {
    $ruby = "C:\Ruby33-x64\bin\ruby.exe"
} else {
    throw "Ruby 3.3 or newer is required. Install RubyInstaller and the Jekyll gems first."
}

$secret = Read-Host "Administrator password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if ($password.Length -lt 12) {
    $password = $null
    throw "The administrator password must contain at least 12 characters."
}

$env:LIAM_ADMIN_PASSWORD = $password
$env:LIAM_PREVIEW_PORT = "$port"
$password = $null
$secret.Dispose()
$secret = $null
$aiSecret = Read-Host "Optional Anthropic API key for AI suggestions (press Enter to skip)" -AsSecureString
$aiBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($aiSecret)
try {
    $anthropicApiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($aiBstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($aiBstr)
}
$previousAnthropicApiKey = $env:LIAM_ANTHROPIC_API_KEY
if ($anthropicApiKey) {
    $env:LIAM_ANTHROPIC_API_KEY = $anthropicApiKey
} else {
    Remove-Item Env:\LIAM_ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
}
$anthropicApiKey = $null
$aiSecret.Dispose()
$aiSecret = $null
$previewDirectory = Join-Path $root "_admin_preview"
New-Item -ItemType Directory -Force $previewDirectory | Out-Null
$server = Start-Process -FilePath $ruby -ArgumentList "local_preview.rb" -WorkingDirectory $root -PassThru `
    -RedirectStandardOutput (Join-Path $root "_admin_preview\server.log") `
    -RedirectStandardError (Join-Path $root "_admin_preview\server-error.log")
Remove-Item Env:\LIAM_ADMIN_PASSWORD
Remove-Item Env:\LIAM_PREVIEW_PORT
if ($null -ne $previousAnthropicApiKey) {
    $env:LIAM_ANTHROPIC_API_KEY = $previousAnthropicApiKey
} else {
    Remove-Item Env:\LIAM_ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
}
$previousAnthropicApiKey = $null

$ready = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ($server.HasExited) {
        throw "The local server stopped during startup. Check _admin_preview\server-error.log."
    }
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 2
        $ready = $true
        break
    } catch {
        Start-Sleep -Milliseconds 500
    }
}
if (-not $ready) {
    Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
    throw "The local editor did not start responding on port $port."
}

$urls = @("http://localhost:$port/", "http://localhost:$port/admin")
$browser = $null
$browserArguments = @()
$edgePaths = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
)
$chromePaths = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)
foreach ($candidate in @($edgePaths + $chromePaths)) {
    if (Test-Path $candidate) {
        $browser = $candidate
        break
    }
}

if ($browser) {
    foreach ($url in $urls) {
        Start-Process -FilePath $browser -ArgumentList @("--new-window", $url) | Out-Null
    }
} else {
    Write-Warning "Edge or Chrome was not found. Opening both preview URLs with your default browser; it may reuse an existing window."
    foreach ($url in $urls) {
        Start-Process $url | Out-Null
    }
}

Write-Host ""
Write-Host "Public preview:  http://localhost:$port/"
Write-Host "Administrator:   http://localhost:$port/admin"
Write-Host "Server PID:      $($server.Id)"
Write-Host "Keep this Ruby server running while you edit. Stop it with Stop-Process -Id $($server.Id)."

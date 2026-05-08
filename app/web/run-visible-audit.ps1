param(
  [Parameter(Mandatory = $true)]
  [string]$AuditScript,
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$siteRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $siteRoot)

$job = Start-Job -ScriptBlock {
  param($root, $listenPort)
  Set-Location $root
  python -m http.server $listenPort --bind 127.0.0.1
} -ArgumentList $siteRoot, $Port

try {
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    try {
      Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port" | Out-Null
      $ready = $true
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $ready) {
    throw "Server did not start on 127.0.0.1:$Port"
  }

  Set-Location $repoRoot
  node $AuditScript
} finally {
  Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job $job -ErrorAction SilentlyContinue | Out-Null
}

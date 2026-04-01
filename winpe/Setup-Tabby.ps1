#Requires -Version 3.0
<#
.SYNOPSIS
    Downloads (on first boot) and starts Tabby ML v0.32.0 for NVIDIA CUDA 12.4 in WinPE.

.DESCRIPTION
    Placed at X:\Setup-Tabby.ps1 inside the WinPE image by Build-NightmareOS-PE.ps1.
    Called from startnet.cmd with -DataPartition pointing to the NightmareOS-Data volume.

    First boot  : downloads tabby_x86_64-windows-msvc-cuda124.zip (~160 MB) from
                  GitHub, extracts it, then starts the server.
    Later boots : reuses the cached binary immediately.

    Tabby server URL : http://localhost:9090
    Models cache     : <DataPartition>\TabbyModels\   (persists across reboots)

.PARAMETER DataPartition
    Root path of the NightmareOS-Data partition.  Default: D:\NightmareOS-Data
#>
param(
    [string]$DataPartition = "D:\NightmareOS-Data"
)

$tabbyVersion = "v0.32.0"
$tabbyUrl     = "https://github.com/TabbyML/tabby/releases/download/$tabbyVersion/tabby_x86_64-windows-msvc-cuda124.zip"
$tabbyDir     = Join-Path $DataPartition "Tabby"
$tabbyExe     = Join-Path $tabbyDir "tabby.exe"
$tabbyModels  = Join-Path $DataPartition "TabbyModels"
$tabbyPort    = 9090

Write-Host "=== Tabby AI Setup ($tabbyVersion) ===" -ForegroundColor Cyan
Write-Host "Data partition : $DataPartition"
Write-Host "Binary         : $tabbyExe"
Write-Host "Models dir     : $tabbyModels"
Write-Host "Server port    : $tabbyPort"
Write-Host ""

# Ensure directories exist
foreach ($dir in @($tabbyDir, $tabbyModels)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir"
    }
}

# Download on first boot
if (-not (Test-Path $tabbyExe)) {
    Write-Host "[*] Downloading Tabby $tabbyVersion for NVIDIA CUDA 12.4..." -ForegroundColor Yellow
    Write-Host "    $tabbyUrl"
    Write-Host "    (~160 MB — this takes 1-3 min on a fast connection)"
    $zipPath = Join-Path $tabbyDir "tabby.zip"
    try {
        Invoke-WebRequest -Uri $tabbyUrl -OutFile $zipPath
        Write-Host "[*] Extracting..." -ForegroundColor Yellow
        try {
            Expand-Archive -Path $zipPath -DestinationPath $tabbyDir -Force
        } catch {
            # Fallback: use .NET ZipFile (does not require PS Archive module)
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tabbyDir)
        }
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Write-Host "[+] Tabby extracted to: $tabbyDir" -ForegroundColor Green
    } catch {
        Write-Host ("[!] Download/extract failed: " + $_.Exception.Message) -ForegroundColor Red
        Write-Host "    Check network connectivity and try again."
        Read-Host "Press Enter to close"
        exit 1
    }
}

if (-not (Test-Path $tabbyExe)) {
    Write-Host "[!] tabby.exe not found after extraction: $tabbyExe" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

# Start Tabby as an independent process (outlives this script window)
Write-Host "[*] Starting Tabby AI server on port $tabbyPort (NVIDIA CUDA)..." -ForegroundColor Yellow
$env:TABBY_ROOT = $tabbyModels
Start-Process -FilePath $tabbyExe -ArgumentList @("serve", "--device", "cuda", "--port", "$tabbyPort")
Write-Host "[+] Tabby AI server started: http://localhost:$tabbyPort" -ForegroundColor Green
Write-Host "[+] Models stored at: $tabbyModels" -ForegroundColor Green
Write-Host ""
Write-Host "On first use, Tabby will download the selected model." -ForegroundColor Cyan
Write-Host "Open the Tabby AI app on the NightmareOS desktop and configure:"
Write-Host "  Server URL : http://localhost:$tabbyPort"

#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Validates prerequisites for building Nightmare OS Windows PE.

.DESCRIPTION
    This script checks that all required software and components are installed
    before attempting to build the Windows PE image.

.EXAMPLE
    .\Check-Prerequisites.ps1
    Checks all prerequisites and reports status
#>

[CmdletBinding()]
param()

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Check {
    param([string]$Message)
    Write-Host "Checking $Message... " -NoNewline
}

function Write-Pass {
    Write-ColorOutput "✓ PASS" "Green"
}

function Write-Fail {
    Write-ColorOutput "✗ FAIL" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

# Banner
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Nightmare OS - Prerequisites Check                   ║
║     ==================================                    ║
║                                                           ║
║     Validating build environment                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$allChecksPassed = $true

# Check 1: Administrator privileges
Write-Check "administrator privileges"
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Pass
} else {
    Write-Fail
    Write-Host "  → Run PowerShell as Administrator"
    $allChecksPassed = $false
}

# Check 2: Windows version
Write-Check "Windows version"
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -ge 10) {
    Write-Pass
    Write-Host "  → Windows $($osVersion.Major).$($osVersion.Minor)" -ForegroundColor Gray
} else {
    Write-Fail
    Write-Host "  → Windows 10 or 11 required, found: $osVersion"
    $allChecksPassed = $false
}

# Check 3: Windows ADK
Write-Check "Windows ADK installation"
$adkPath = "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit"
if (Test-Path $adkPath) {
    Write-Pass
    Write-Host "  → Found at: $adkPath" -ForegroundColor Gray
} else {
    Write-Fail
    Write-Host "  → Install from: https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install"
    $allChecksPassed = $false
}

# Check 4: Windows PE add-on
Write-Check "Windows PE add-on"
$winPEPath = "$adkPath\Windows Preinstallation Environment"
if (Test-Path $winPEPath) {
    Write-Pass
    Write-Host "  → Found at: $winPEPath" -ForegroundColor Gray
} else {
    Write-Fail
    Write-Host "  → Install Windows PE add-on for Windows ADK"
    $allChecksPassed = $false
}

# Check 5: copype.cmd
Write-Check "copype.cmd tool"
$copypePath = "$winPEPath\amd64\copype.cmd"
if (Test-Path $copypePath) {
    Write-Pass
} else {
    Write-Fail
    Write-Host "  → copype.cmd not found at expected location"
    $allChecksPassed = $false
}

# Check 6: DISM
Write-Check "DISM (Deployment Image Servicing)"
$dismPath = "$adkPath\Deployment Tools\amd64\DISM\dism.exe"
if (Test-Path $dismPath) {
    Write-Pass
} else {
    Write-Fail
    Write-Host "  → DISM not found"
    $allChecksPassed = $false
}

# Check 7: MakeWinPEMedia
Write-Check "MakeWinPEMedia tool"
$makeWinPEMediaPath = "$winPEPath\MakeWinPEMedia.cmd"
if (Test-Path $makeWinPEMediaPath) {
    Write-Pass
} else {
    Write-Fail
    Write-Host "  → MakeWinPEMedia.cmd not found"
    $allChecksPassed = $false
}

# Check 8: Source files
Write-Check "Nightmare OS source files"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Split-Path -Parent $scriptPath
$requiredFiles = @("index.html", "manifest.json", "sw.js")
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path "$sourceDir\$file")) {
        $missingFiles += $file
    }
}
if ($missingFiles.Count -eq 0) {
    Write-Pass
    Write-Host "  → Source directory: $sourceDir" -ForegroundColor Gray
} else {
    Write-Fail
    Write-Host "  → Missing files: $($missingFiles -join ', ')"
    $allChecksPassed = $false
}

# Check 9: Disk space
Write-Check "available disk space"
$drive = Get-PSDrive -Name C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
if ($freeSpaceGB -ge 20) {
    Write-Pass
    Write-Host "  → $freeSpaceGB GB available" -ForegroundColor Gray
} else {
    Write-Fail
    Write-Host "  → $freeSpaceGB GB available (20 GB required)"
    $allChecksPassed = $false
}

# Check 10: PowerShell version
Write-Check "PowerShell version"
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5) {
    Write-Pass
    Write-Host "  → PowerShell $($psVersion.Major).$($psVersion.Minor)" -ForegroundColor Gray
} else {
    Write-Fail
    Write-Host "  → PowerShell 5.0 or higher required"
    $allChecksPassed = $false
}

# Optional checks
Write-Host ""
Write-Host "Optional Components:" -ForegroundColor Cyan

# Check: Python
Write-Check "Python (optional, for embedded web server)"
try {
    $pythonVersion = (python --version 2>&1) -replace "Python ", ""
    Write-Pass
    Write-Host "  → Python $pythonVersion" -ForegroundColor Gray
    Write-Host "  → Can be embedded in PE image for web server" -ForegroundColor Gray
} catch {
    Write-Warning "NOT FOUND"
    Write-Host "  → Python embeddable package can be added to PE image" -ForegroundColor Gray
    Write-Host "  → Download from: https://www.python.org/downloads/windows/" -ForegroundColor Gray
}

# Check: Available USB drives
Write-Check "removable USB drives"
$removableDrives = Get-Volume | Where-Object { $_.DriveType -eq 'Removable' }
if ($removableDrives) {
    Write-Pass
    Write-Host "  → Found removable drives:" -ForegroundColor Gray
    foreach ($drive in $removableDrives) {
        $sizeGB = [math]::Round($drive.Size / 1GB, 2)
        Write-Host "     - $($drive.DriveLetter): ($sizeGB GB) - $($drive.FileSystemLabel)" -ForegroundColor Gray
    }

    # Check if any drive is large enough
    $largeDrives = $removableDrives | Where-Object { $_.Size -ge 16GB }
    if (-not $largeDrives) {
        Write-Warning "No USB drives >= 16 GB found"
    }
} else {
    Write-Warning "NONE FOUND"
    Write-Host "  → Insert a USB drive (16 GB or larger) to create bootable media" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($allChecksPassed) {
    Write-Host ""
    Write-Host "✅ ALL PREREQUISITES MET!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You're ready to build Nightmare OS Windows PE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run: .\winpe\Build-NightmareOS-PE.ps1"
    Write-Host "  2. Wait for build to complete (10-20 minutes)"
    Write-Host "  3. Insert USB drive (16 GB or larger)"
    Write-Host "  4. Run: .\winpe\Create-Bootable-USB.ps1 -DriveLetter <letter>"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ SOME PREREQUISITES NOT MET" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please resolve the failed checks above before building." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation help:" -ForegroundColor Yellow
    Write-Host "  • Windows ADK: https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install"
    Write-Host "  • Ensure you select 'Windows Preinstallation Environment' during ADK installation"
    Write-Host "  • Free up disk space if needed (20 GB minimum)"
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Return exit code
if ($allChecksPassed) {
    exit 0
} else {
    exit 1
}

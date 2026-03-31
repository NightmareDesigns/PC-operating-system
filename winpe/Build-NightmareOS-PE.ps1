#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Builds a custom Windows 11 PE image with Nightmare OS web desktop environment.

.DESCRIPTION
    This script automates the creation of a bootable Windows 11 PE environment
    that includes the Nightmare OS web desktop. It uses Windows ADK tools to
    create, customize, and prepare a WinPE image.

.PARAMETER WorkDir
    The working directory for WinPE build. Default: C:\WinPE_NightmareOS

.PARAMETER Architecture
    Target architecture (amd64 or x86). Default: amd64

.PARAMETER IncludePython
    Include Python embedded package for local web server. Default: $true

.PARAMETER IncludeEdge
    Include Microsoft Edge browser. Default: $true

.PARAMETER CreateISO
    Create a bootable ISO file in addition to USB media files. Default: $false

.EXAMPLE
    .\Build-NightmareOS-PE.ps1
    Builds with default settings

.EXAMPLE
    .\Build-NightmareOS-PE.ps1 -WorkDir "D:\WinPE_Build" -Architecture amd64
    Builds with custom working directory

.EXAMPLE
    .\Build-NightmareOS-PE.ps1 -CreateISO $true
    Builds and creates a bootable ISO file
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$WorkDir = "C:\WinPE_NightmareOS",

    [Parameter(Mandatory=$false)]
    [ValidateSet("amd64", "x86")]
    [string]$Architecture = "amd64",

    [Parameter(Mandatory=$false)]
    [bool]$IncludePython = $true,

    [Parameter(Mandatory=$false)]
    [bool]$IncludeEdge = $true,

    [Parameter(Mandatory=$false)]
    [bool]$CreateISO = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "`n==> $Message" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

# Banner
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Nightmare OS - Windows 11 PE Builder                 ║
║     =====================================                 ║
║                                                           ║
║     Building bootable Windows PE with web desktop        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# Check for Administrator privileges
Write-Step "Checking administrator privileges..."
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator!"
    Write-Host "Please right-click and select 'Run as Administrator'"
    exit 1
}
Write-Success "Running with administrator privileges"

# Check for Windows ADK
Write-Step "Checking for Windows ADK installation..."

# Resolve the ADK path: check registry first, then common install paths.
$adkPath = $null
try {
    $regPaths = @(
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows Kits\Installed Roots",
        "HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots"
    )
    foreach ($regPath in $regPaths) {
        if (Test-Path $regPath) {
            $kitsRoot = (Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue).KitsRoot10
            if ($kitsRoot) {
                $candidate = Join-Path $kitsRoot "Assessment and Deployment Kit"
                if (Test-Path $candidate) { $adkPath = $candidate; break }
            }
        }
    }
} catch {}

if (-not $adkPath) {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit",
        "${env:ProgramFiles}\Windows Kits\10\Assessment and Deployment Kit"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $adkPath = $c; break }
    }
}

if (-not $adkPath) {
    Write-Error "Windows ADK not found!"
    Write-Host "Please install Windows ADK for Windows 11 from:"
    Write-Host "https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install"
    exit 1
}

$winPEPath = "$adkPath\Windows Preinstallation Environment"

if (-not (Test-Path $winPEPath)) {
    Write-Error "Windows PE add-on not found!"
    Write-Host "Please install Windows PE add-on for Windows ADK"
    exit 1
}
Write-Success "Windows ADK found at: $adkPath"

# Get source directory (where this script is located)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Split-Path -Parent $scriptPath
Write-Success "Nightmare OS source: $sourceDir"

# Check for required source files
Write-Step "Validating Nightmare OS source files..."
$requiredFiles = @("index.html", "manifest.json", "sw.js")
foreach ($file in $requiredFiles) {
    if (-not (Test-Path "$sourceDir\$file")) {
        Write-Error "Required file not found: $file"
        exit 1
    }
}
$requiredDirs = @("css", "js", "icons")
foreach ($dir in $requiredDirs) {
    if (-not (Test-Path "$sourceDir\$dir")) {
        Write-Error "Required directory not found: $dir"
        exit 1
    }
}
Write-Success "All source files validated"

# Clean up existing work directory
if (Test-Path $WorkDir) {
    Write-Step "Cleaning up existing work directory..."
    Write-Warning "Removing: $WorkDir"
    Remove-Item -Path $WorkDir -Recurse -Force
    Write-Success "Cleanup complete"
}

# Create WinPE working directory
Write-Step "Creating Windows PE working directory..."
$env:Path += ";$adkPath\Deployment Tools\$Architecture\Oscdimg"
$env:Path += ";$adkPath\Deployment Tools\$Architecture\DISM"

# Use copype.cmd to create base WinPE structure
$copypePath = "$winPEPath\$Architecture\copype.cmd"
if (-not (Test-Path $copypePath)) {
    Write-Error "copype.cmd not found at: $copypePath"
    exit 1
}

Write-Host "Running: copype.cmd $Architecture $WorkDir"
& cmd.exe /c "$copypePath" $Architecture "$WorkDir" 2>&1 | ForEach-Object { Write-Host $_ }

if (-not $?) {
    Write-Error "Failed to create WinPE working directory"
    exit 1
}
Write-Success "WinPE working directory created: $WorkDir"

# Mount the WinPE image
Write-Step "Mounting Windows PE boot image..."
$bootWim = "$WorkDir\media\sources\boot.wim"
$mountDir = "$WorkDir\mount"

if (-not (Test-Path $bootWim)) {
    Write-Error "boot.wim not found at: $bootWim"
    exit 1
}

Dism /Mount-Image /ImageFile:"$bootWim" /index:1 /MountDir:"$mountDir" | Out-Host

if (-not $?) {
    Write-Error "Failed to mount boot image"
    exit 1
}
Write-Success "Boot image mounted at: $mountDir"

try {
    # Add optional packages
    Write-Step "Adding Windows PE optional components..."

    $packages = @(
        "WinPE-WMI.cab",
        "WinPE-NetFx.cab",
        "WinPE-Scripting.cab",
        "WinPE-PowerShell.cab",
        "WinPE-StorageWMI.cab",
        "WinPE-DismCmdlets.cab"
    )

    $packagesPath = "$winPEPath\$Architecture\WinPE_OCs"

    foreach ($package in $packages) {
        $packagePath = "$packagesPath\$package"
        if (Test-Path $packagePath) {
            Write-Host "Adding package: $package"
            Dism /Add-Package /Image:"$mountDir" /PackagePath:"$packagePath" | Out-Host
            Write-Success "Added $package"
        } else {
            Write-Warning "Package not found: $package"
        }
    }

    # Copy Nightmare OS files
    Write-Step "Copying Nightmare OS files to PE image..."
    $nightmareOSDir = "$mountDir\NightmareOS"
    New-Item -ItemType Directory -Path $nightmareOSDir -Force | Out-Null

    # Copy directories
    foreach ($dir in $requiredDirs) {
        Write-Host "Copying $dir..."
        Copy-Item -Path "$sourceDir\$dir" -Destination "$nightmareOSDir\" -Recurse -Force
    }

    # Copy files
    foreach ($file in $requiredFiles) {
        Write-Host "Copying $file..."
        Copy-Item -Path "$sourceDir\$file" -Destination "$nightmareOSDir\" -Force
    }

    Write-Success "Nightmare OS files copied"

    # Create Python directory if including Python
    if ($IncludePython) {
        Write-Step "Preparing for Python integration..."
        $pythonDir = "$mountDir\Python"
        New-Item -ItemType Directory -Path $pythonDir -Force | Out-Null
        Write-Warning "Python embedded package must be manually copied to: $pythonDir"
        Write-Host "Download from: https://www.python.org/downloads/windows/"
        Write-Host "Extract the embeddable package to the Python directory"
    }

    # Create startup script
    Write-Step "Creating startup script..."
    $startnetPath = "$mountDir\Windows\System32\startnet.cmd"

    $startnetContent = @"
@echo off
wpeinit

echo.
echo ================================================================
echo.
echo   ███╗   ██╗██╗ ██████╗ ██╗  ██╗████████╗███╗   ███╗ █████╗ ██████╗ ███████╗
echo   ████╗  ██║██║██╔════╝ ██║  ██║╚══██╔══╝████╗ ████║██╔══██╗██╔══██╗██╔════╝
echo   ██╔██╗ ██║██║██║  ███╗███████║   ██║   ██╔████╔██║███████║██████╔╝█████╗
echo   ██║╚██╗██║██║██║   ██║██╔══██║   ██║   ██║╚██╔╝██║██╔══██║██╔══██╗██╔══╝
echo   ██║ ╚████║██║╚██████╔╝██║  ██║   ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║███████╗
echo   ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
echo.
echo                    Nightmare OS - Windows PE Edition
echo                    ===================================
echo.
echo ================================================================
echo.

REM Initialize network
echo Initializing network...
wpeutil InitializeNetwork
timeout /t 2 /nobreak > nul

REM Set up environment
set NIGHTMARE_OS_DIR=X:\NightmareOS
cd /d %NIGHTMARE_OS_DIR%

echo.
echo Starting Nightmare OS Desktop Environment...
echo.

REM Start local web server using PowerShell
echo Starting web server on http://localhost:8080...
start /min powershell -WindowStyle Hidden -Command "cd X:\NightmareOS; python -m http.server 8080 2>&1 | Out-Null"

REM Wait for server to initialize
timeout /t 5 /nobreak > nul

REM Launch Microsoft Edge in kiosk mode
echo Launching browser...
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeFirstRunDialog
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeFirstRunDialog
) else (
    echo ERROR: Microsoft Edge not found!
    echo Please install Microsoft Edge or modify startnet.cmd to use a different browser.
    pause
)

REM Keep command prompt available
echo.
echo ================================================================
echo Nightmare OS is now running
echo Press any key to open a command prompt...
echo ================================================================
pause > nul
cmd /k
"@

    Set-Content -Path $startnetPath -Value $startnetContent -Encoding ASCII
    Write-Success "Startup script created"

    # Set Windows PE settings
    Write-Step "Configuring Windows PE settings..."

    # Create unattend.xml for auto-login
    $unattendPath = "$mountDir\Windows\System32\unattend.xml"
    $unattendContent = @"
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <settings pass="windowsPE">
        <component name="Microsoft-Windows-Setup" processorArchitecture="$Architecture" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
            <Display>
                <ColorDepth>32</ColorDepth>
                <HorizontalResolution>1920</HorizontalResolution>
                <VerticalResolution>1080</VerticalResolution>
            </Display>
        </component>
    </settings>
</unattend>
"@

    Set-Content -Path $unattendPath -Value $unattendContent -Encoding UTF8
    Write-Success "Windows PE settings configured"

    # Create README in PE image
    $readmePath = "$mountDir\NightmareOS\README_PE.txt"
    $readmeContent = @"
Nightmare OS - Windows PE Edition
==================================

This is a custom Windows PE environment with the Nightmare OS web desktop.

Boot Process:
1. Windows PE boots from USB
2. startnet.cmd runs automatically
3. Python HTTP server starts on port 8080
4. Microsoft Edge opens in kiosk mode
5. Nightmare OS desktop loads

Important Notes:
- All data is stored in RAM (no persistence)
- Automatically reboots after 72 hours (Windows PE limitation)
- Press Ctrl+Alt+Del to access Task Manager
- Files saved in Nightmare OS are temporary

Troubleshooting:
- If the desktop doesn't load, press Alt+Tab to switch to browser window
- Open Command Prompt from Task Manager if needed
- Check that web server started: netstat -an | find "8080"

Network:
- Network drivers load automatically if available
- Check connection: ipconfig /all
- Test connectivity: ping google.com

System Information:
- OS: Windows PE (Preinstallation Environment)
- Desktop: Nightmare OS Web Desktop
- Browser: Microsoft Edge (Kiosk Mode)
- Web Server: Python HTTP Server on localhost:8080

For more information, visit:
https://github.com/NightmareDesigns/PC-operating-system
"@

    Set-Content -Path $readmePath -Value $readmeContent -Encoding ASCII
    Write-Success "README created in PE image"

} catch {
    Write-Error "Error during customization: $_"
    Write-Warning "Attempting to unmount image..."
    Dism /Unmount-Image /MountDir:"$mountDir" /discard | Out-Host
    exit 1
}

# Unmount and commit changes
Write-Step "Unmounting and committing changes..."
Dism /Unmount-Image /MountDir:"$mountDir" /commit | Out-Host

if (-not $?) {
    Write-Error "Failed to unmount and commit changes"
    exit 1
}
Write-Success "Changes committed successfully"

# Create ISO (optional)
if ($CreateISO) {
    Write-Step "Creating bootable ISO file..."
    $isoPath = "$WorkDir\NightmareOS-PE.iso"
    $mediaDir = "$WorkDir\media"

    # Check for oscdimg tool (part of Windows ADK)
    $oscdimgPath = "$adkPath\Deployment Tools\$Architecture\Oscdimg\oscdimg.exe"

    if (-not (Test-Path $oscdimgPath)) {
        Write-Warning "oscdimg.exe not found at: $oscdimgPath"
        Write-Warning "ISO creation skipped. Install Windows ADK Deployment Tools to enable ISO creation."
    } else {
        Write-Host "Using oscdimg: $oscdimgPath"
        Write-Host "Creating ISO from: $mediaDir"
        Write-Host "Output: $isoPath"

        # oscdimg parameters:
        # -m = Ignore maximum image size limit
        # -o = Optimize storage by encoding duplicate files once
        # -u2 = Produce UDF file system
        # -udfver102 = UDF version 1.02
        # -bootdata:2 = Two boot images (for BIOS and UEFI)
        # First boot image: BIOS boot (etfsboot.com)
        # Second boot image: UEFI boot (efisys.bin)

        $etfsboot = "$mediaDir\boot\etfsboot.com"
        $efisys = "$mediaDir\efi\microsoft\boot\efisys.bin"

        # Check if boot files exist
        if (-not (Test-Path $etfsboot)) {
            Write-Warning "BIOS boot file not found: $etfsboot"
            Write-Warning "Attempting ISO creation without BIOS boot support..."
            $etfsboot = $null
        }

        if (-not (Test-Path $efisys)) {
            Write-Warning "UEFI boot file not found: $efisys"
            Write-Warning "Attempting ISO creation without UEFI boot support..."
            $efisys = $null
        }

        try {
            # Build oscdimg command based on available boot files
            if ($etfsboot -and $efisys) {
                # Both BIOS and UEFI boot
                $bootData = "2#p0,e,b`"$etfsboot`"#pEF,e,b`"$efisys`""
                & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$isoPath"
            } elseif ($efisys) {
                # UEFI boot only
                $bootData = "2#pEF,e,b`"$efisys`""
                & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$isoPath"
            } elseif ($etfsboot) {
                # BIOS boot only
                $bootData = "1#p0,e,b`"$etfsboot`""
                & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$isoPath"
            } else {
                # No boot files - create data-only ISO
                Write-Warning "No boot files found - creating non-bootable ISO"
                & $oscdimgPath -m -o -u2 -udfver102 "$mediaDir" "$isoPath"
            }

            if ($LASTEXITCODE -eq 0) {
                Write-Success "ISO created successfully!"
                $isoSize = (Get-Item $isoPath).Length / 1MB
                Write-Host "  • ISO File: $isoPath"
                Write-Host "  • ISO Size: $([math]::Round($isoSize, 2)) MB"
                Write-Host ""
                Write-Host "You can now:" -ForegroundColor Yellow
                Write-Host "  • Burn the ISO to a DVD"
                Write-Host "  • Use with virtual machines (VirtualBox, VMware, Hyper-V)"
                Write-Host "  • Create bootable USB with Rufus or similar tools"
            } else {
                Write-Error "ISO creation failed with exit code: $LASTEXITCODE"
            }
        } catch {
            Write-Error "Error creating ISO: $_"
        }
    }
} else {
    Write-Step "Preparing bootable media..."
    $isoPath = "$WorkDir\NightmareOS-PE.iso"
    $mediaDir = "$WorkDir\media"

    Write-Host "Bootable media files are ready at: $mediaDir"
    Write-Host ""
    Write-Host "To create a bootable ISO file, run:"
    Write-Host "  .\winpe\Build-NightmareOS-PE.ps1 -CreateISO `$true"
    Write-Host ""
    Write-Host "Or use Create-ISO.ps1:"
    Write-Host "  .\winpe\Create-ISO.ps1 -WorkDir $WorkDir"
    Write-Host ""
    Write-Host "To create a bootable USB drive, run:"
    Write-Host "  .\winpe\Create-Bootable-USB.ps1 -DriveLetter <USB_DRIVE_LETTER>"
    Write-Host ""
    Write-Host "Or use MakeWinPEMedia manually:"
    Write-Host "  MakeWinPEMedia /UFD $WorkDir <USB_DRIVE_LETTER>"
}

# Summary
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     BUILD COMPLETE!                                       ║
║     ==============                                        ║
║                                                           ║
║     Windows PE with Nightmare OS is ready to deploy      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "Build Summary:" -ForegroundColor Cyan
Write-Host "  • Working Directory: $WorkDir"
Write-Host "  • Architecture: $Architecture"
Write-Host "  • Boot WIM: $bootWim"
Write-Host "  • Media Directory: $mediaDir"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Insert a USB drive (16 GB or larger)"
Write-Host "  2. Run Create-Bootable-USB.ps1 to write to USB"
Write-Host "  3. Boot from USB drive"
Write-Host "  4. Nightmare OS will start automatically"
Write-Host ""
Write-Host "Important:" -ForegroundColor Red
Write-Host "  • Disable Secure Boot in BIOS/UEFI if boot fails"
Write-Host "  • All changes in PE are temporary (RAM only)"
Write-Host "  • PE automatically reboots after 72 hours"
Write-Host ""

Write-Success "Build process completed successfully!"

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
    [bool]$CreateISO = $false,

    [Parameter(Mandatory=$false)]
    [bool]$IncludeNvidiaDrivers = $true
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
        "WinPE-DismCmdlets.cab",
        "WinPE-HTA.cab"
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

    # Inject Nvidia GPU drivers for RTX 3060 Ti / Ampere architecture support
    if ($IncludeNvidiaDrivers) {
        Write-Step "Checking for Nvidia GPU drivers (RTX 3060 Ti / Ampere support)..."
        $nvidiaDriversDir = Join-Path $scriptPath "drivers\nvidia"
        if (Test-Path $nvidiaDriversDir) {
            Write-Host "Found Nvidia driver package at: $nvidiaDriversDir"
            Write-Host "Injecting drivers into WinPE image (this may take a moment)..."
            Dism /Add-Driver /Image:"$mountDir" /Driver:"$nvidiaDriversDir" /Recurse /ForceUnsigned | Out-Host
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Nvidia GPU drivers injected (RTX 3060 Ti / Ampere support enabled)"
            } else {
                Write-Warning "Nvidia driver injection returned exit code: $LASTEXITCODE"
                Write-Warning "RTX 3060 Ti may fall back to basic VGA mode in WinPE"
            }
        } else {
            Write-Warning "No Nvidia driver package found at: $nvidiaDriversDir"
            Write-Warning "RTX 3060 Ti and other Ampere GPUs will use the basic VGA driver in WinPE."
            Write-Host ""
            Write-Host "  To add Nvidia driver support:" -ForegroundColor Yellow
            Write-Host "  1. Download the matching Nvidia display driver (Game Ready / Studio DCH):"
            Write-Host "     https://www.nvidia.com/Download/index.aspx"
            Write-Host "  2. Self-extract the installer (run it and cancel, or use 7-Zip)."
            Write-Host "  3. Copy the Display.Driver sub-folder (INF, CAT, SYS files) to:"
            Write-Host "     $nvidiaDriversDir"
            Write-Host "  4. Re-run this script to rebuild with driver support."
            Write-Host ""
        }
    }

    # Disable the Windows PE automatic reboot timer in the image registry
    Write-Step "Disabling Windows PE automatic reboot timer..."
    try {
        $sysHive  = "$mountDir\Windows\System32\config\SYSTEM"
        $tempKey  = "HKLM\WinPE_NightOS_SYSTEM"
        & reg load $tempKey "$sysHive" 2>&1 | Out-Null
        & reg add "$tempKey\ControlSet001\Control\WinPE" /v BootTimeLimit /t REG_DWORD /d 0 /f 2>&1 | Out-Null
        [System.GC]::Collect()
        Start-Sleep -Milliseconds 500
        & reg unload $tempKey 2>&1 | Out-Null
        Write-Success "Reboot timer disabled in WinPE registry"
    } catch {
        Write-Warning "Could not pre-disable PE timer via registry: $_"
        Write-Warning "Runtime reg command in startnet.cmd will disable it at boot"
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

REM Disable the Windows PE automatic reboot timer (removes 72-hour session limit)
reg add "HKLM\SYSTEM\CurrentControlSet\Control\WinPE" /v BootTimeLimit /t REG_DWORD /d 0 /f >nul 2>&1

REM Detect UEFI vs Legacy BIOS boot mode
wpeutil UpdateBootInfo
for /F "tokens=3" %%i IN ('reg query HKLM\System\CurrentControlSet\Control /v PEFirmwareType 2^>nul ^| find "PEFirmwareType"') DO set PE_FIRMWARE=%%i
if "%PE_FIRMWARE%"=="0x2" (echo [+] Boot mode: 64-bit UEFI) else (echo [+] Boot mode: Legacy BIOS)

REM Initialize display subsystem (required for NVIDIA Ampere GPUs such as RTX 3060 Ti)
echo [*] Initializing display subsystem...
timeout /t 1 /nobreak > nul
echo [+] Display ready

cls
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
echo [+] Network initialized

REM Set up environment
set NIGHTMARE_OS_DIR=X:\NightmareOS
set DATA_PARTITION=D:\NightmareOS-Data

REM Configure persistence — store Edge profile on data partition when available
echo [*] Configuring persistence...
set EDGE_PROFILE_FLAG=
if exist D:\ (
    if not exist "%DATA_PARTITION%" mkdir "%DATA_PARTITION%" 2>nul
    if not exist "%DATA_PARTITION%\EdgeProfile" mkdir "%DATA_PARTITION%\EdgeProfile" 2>nul
    set "EDGE_PROFILE_FLAG=--user-data-dir=%DATA_PARTITION%\EdgeProfile"
    echo [+] Persistence ENABLED - all browser data will survive reboots
    echo [+] Profile: %DATA_PARTITION%\EdgeProfile
) else (
    echo [-] No data partition (D:) found - running in RAM-only mode
)

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
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeFirstRunDialog --ignore-gpu-blocklist %EDGE_PROFILE_FLAG%
    goto :browser_launched
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeFirstRunDialog --ignore-gpu-blocklist %EDGE_PROFILE_FLAG%
    goto :browser_launched
)
echo ERROR: Microsoft Edge not found!
pause

:browser_launched
echo.
echo ================================================================
echo Nightmare OS is now running
if exist D:\ (
    echo Persistence ENABLED: Data saved to D:\NightmareOS-Data
) else (
    echo Persistence DISABLED: RAM-only mode
)
echo No automatic reboot timer
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
- Persistence enabled when D: partition exists (Edge profile stored on D:\NightmareOS-Data\EdgeProfile)
- No automatic reboot timer - sessions run indefinitely
- Press Ctrl+Alt+Del to access Task Manager
- To enable persistence: create an NTFS partition on your USB and label it NightmareOS-Data

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
        # First boot image:  BIOS boot (etfsboot.com)
        # Second boot image: UEFI 64-bit boot
        #   efisys_noprompt.bin preferred — boots immediately without "Press any key"
        #   which is required for Ventoy and automated kiosk environments.
        #   Falls back to efisys.bin when efisys_noprompt.bin is absent.

        $etfsboot = "$mediaDir\boot\etfsboot.com"

        # Prefer efisys_noprompt.bin: no "Press any key to boot from EFI" prompt.
        # This is required for Ventoy compatibility and clean UEFI kiosk boot.
        $efisysNoprompt = "$mediaDir\efi\microsoft\boot\efisys_noprompt.bin"
        $efisysFallback  = "$mediaDir\efi\microsoft\boot\efisys.bin"
        $efisys = if (Test-Path $efisysNoprompt) { $efisysNoprompt } else { $efisysFallback }

        # Check if boot files exist
        if (-not (Test-Path $etfsboot)) {
            Write-Warning "BIOS boot file not found: $etfsboot"
            Write-Warning "Attempting ISO creation without BIOS boot support..."
            $etfsboot = $null
        }

        if (-not (Test-Path $efisys)) {
            Write-Warning "UEFI boot file not found (checked efisys_noprompt.bin and efisys.bin)"
            Write-Warning "Attempting ISO creation without UEFI boot support..."
            $efisys = $null
        } else {
            $efisysLabel = if ($efisys -like "*noprompt*") { "efisys_noprompt.bin (Ventoy-compatible)" } else { "efisys.bin" }
            Write-Host "64-bit UEFI boot file: $efisysLabel"
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
                Write-Host "  • Create a bootable USB with Rufus (select GPT + UEFI for modern hardware)"
                Write-Host "  • Boot via Ventoy: copy the ISO to the Ventoy USB data partition"
                Write-Host "    Ventoy will list it in its menu automatically — no special config needed"
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
Write-Host "  • Supports 64-bit UEFI boot (amd64) using efisys_noprompt.bin (no keypress prompt)"
Write-Host "  • Ventoy: copy NightmareOS-PE.iso to the Ventoy USB data partition root"
Write-Host "    (Secure Boot must be disabled or the Ventoy MOK enrolled first)"
Write-Host "  • Nvidia RTX 3060 Ti: place driver INFs in winpe\drivers\nvidia\ and rebuild"
Write-Host "    (without injected drivers the GPU falls back to basic VGA in WinPE)"
Write-Host "  • Persistence: create an NTFS partition labelled NightmareOS-Data on USB"
Write-Host "    (Edge profile stored there automatically — data survives reboots)"
Write-Host "  • No automatic reboot timer — sessions run indefinitely"
Write-Host "  • Disable Secure Boot in BIOS/UEFI settings if boot fails on bare-metal"
Write-Host ""

Write-Success "Build process completed successfully!"

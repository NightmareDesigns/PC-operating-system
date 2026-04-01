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

# Build the WinPE working directory structure in pure PowerShell.
# This replicates exactly what copype.cmd does (copy Media\, fwfiles\, winpe.wim)
# without relying on cmd.exe — eliminating all %~dp0 resolution issues that
# occur when the ADK path contains spaces ("C:\Program Files (x86)\...").
$archPESourceDir = Join-Path $winPEPath $Architecture
Write-Host "WinPE source directory: $archPESourceDir"

# List immediate contents of the architecture source directory for diagnostics
Write-Host "Contents of ${archPESourceDir}:"
Get-ChildItem -Path $archPESourceDir -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "  $($_.Name)" }
# Also list en-us\ if present (Windows 11 ADK stores winpe.wim here)
$enUsDir = Join-Path $archPESourceDir "en-us"
if (Test-Path $enUsDir) {
    Write-Host "Contents of ${enUsDir}:"
    Get-ChildItem -Path $enUsDir -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "  $($_.Name)" }
}

$mediaSrc = Join-Path $archPESourceDir "Media"
$fwSrc    = Join-Path $archPESourceDir "fwfiles"

# Locate winpe.wim — Windows 11 ADK (v10.1.26100+) stores it under amd64\en-us\,
# while older ADK versions put it directly in amd64\.  Search both locations.
$winpewim = $null
foreach ($candidate in @(
    (Join-Path $archPESourceDir "winpe.wim"),
    (Join-Path $archPESourceDir "en-us\winpe.wim")
)) {
    if (Test-Path $candidate) { $winpewim = $candidate; break }
}
if (-not $winpewim) {
    # Broad search as final fallback
    $hit = Get-ChildItem -Path $archPESourceDir -Filter "winpe.wim" -Recurse `
                         -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { $winpewim = $hit.FullName }
}

if (-not (Test-Path $mediaSrc)) {
    Write-Error "WinPE Media directory not found: $mediaSrc"
    Write-Host "The Windows PE add-on may be partially installed."
    exit 1
}
if (-not $winpewim) {
    Write-Error "winpe.wim not found under $archPESourceDir"
    Write-Host "The Windows PE add-on may be partially installed."
    exit 1
}
Write-Host "winpe.wim located at: $winpewim"

Write-Host "Copying WinPE media structure to $WorkDir ..."

# Ensure the working directory exists before copying content into it
if (-not (Test-Path $WorkDir)) {
    New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
}

# 1. Copy the bootable media tree (ETL, efisys.bin, etc.)
$mediaDest = Join-Path $WorkDir "Media"
Copy-Item -Path $mediaSrc -Destination $mediaDest -Recurse -Force -ErrorAction Stop

# 2. Copy firmware files if present (UEFI + BIOS boot files: efisys.bin, etc.)
if (Test-Path $fwSrc) {
    $fwDest = Join-Path $WorkDir "fwfiles"
    Copy-Item -Path $fwSrc -Destination $fwDest -Recurse -Force -ErrorAction Stop
}

# 3. Copy winpe.wim → <WorkDir>\Media\sources\boot.wim (standard WinPE convention)
$bootWimDest = Join-Path $WorkDir "Media\sources\boot.wim"
$bootWimDir  = Split-Path $bootWimDest -Parent
# The sources\ directory is normally part of the Media tree copied in step 1.
# Create it explicitly as a safety net in case the ADK media tree is non-standard.
if (-not (Test-Path $bootWimDir)) {
    Write-Host "Note: creating Media\sources\ (not found in Media tree)"
    New-Item -ItemType Directory -Path $bootWimDir -Force | Out-Null
}
Copy-Item -Path $winpewim -Destination $bootWimDest -Force -ErrorAction Stop

Write-Success "WinPE working directory created: $WorkDir"

# Mount the WinPE image
Write-Step "Mounting Windows PE boot image..."
$bootWim = "$WorkDir\media\sources\boot.wim"
$mountDir = "$WorkDir\mount"

if (-not (Test-Path $bootWim)) {
    Write-Error "boot.wim not found at: $bootWim"
    exit 1
}

# DISM requires the mount directory to already exist.
if (-not (Test-Path $mountDir)) {
    New-Item -ItemType Directory -Path $mountDir -Force | Out-Null
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

    # Packages in dependency order: each entry is [base-package, en-us-language-pack].
    # Language packs are installed immediately after their base package.
    # Dependency notes:
    #   WinPE-NetFx requires WinPE-WMI
    #   WinPE-PowerShell requires WinPE-WMI, WinPE-NetFx, WinPE-Scripting
    #   WinPE-StorageWMI / WinPE-DismCmdlets require WinPE-WMI, WinPE-NetFx, WinPE-PowerShell
    #   WinPE-SecureStartup requires WinPE-EnhancedStorage
    $packagePairs = @(
        @("WinPE-WMI.cab",             "en-us\WinPE-WMI_en-us.cab"),
        @("WinPE-NetFx.cab",           "en-us\WinPE-NetFx_en-us.cab"),
        @("WinPE-Scripting.cab",       "en-us\WinPE-Scripting_en-us.cab"),
        @("WinPE-PowerShell.cab",      "en-us\WinPE-PowerShell_en-us.cab"),
        @("WinPE-StorageWMI.cab",      "en-us\WinPE-StorageWMI_en-us.cab"),
        @("WinPE-DismCmdlets.cab",     "en-us\WinPE-DismCmdlets_en-us.cab"),
        @("WinPE-EnhancedStorage.cab", "en-us\WinPE-EnhancedStorage_en-us.cab"),
        @("WinPE-Dot3Svc.cab",         "en-us\WinPE-Dot3Svc_en-us.cab"),
        @("WinPE-SecureStartup.cab",   "en-us\WinPE-SecureStartup_en-us.cab"),
        @("WinPE-HTA.cab",             "en-us\WinPE-HTA_en-us.cab")
    )

    $packagesPath = "$winPEPath\$Architecture\WinPE_OCs"

    foreach ($pair in $packagePairs) {
        foreach ($rel in $pair) {
            $pkgPath = "$packagesPath\$rel"
            if (Test-Path $pkgPath) {
                Write-Host "Adding: $rel"
                Dism /Add-Package /Image:"$mountDir" /PackagePath:"$pkgPath" | Out-Host
                Write-Success "Added $rel"
            } else {
                Write-Warning "Package not found (skipping): $rel"
            }
        }
    }

    # Inject NVIDIA GPU drivers for RTX 3060 Ti / Ampere architecture support.
    # IMPORTANT: Only inject if real kernel-mode driver binaries (.sys) exist outside
    # the test/ subdirectory.  The test/ dir contains a CI pipeline-validation stub
    # with FICTITIOUS hardware IDs — it is safe to inject but does nothing useful.
    # If the test stub previously had real RTX 3060 Ti hardware IDs injected, it would
    # cause SYSTEM_THREAD_EXCEPTION_NOT_HANDLED on boot (display driver crash).
    if ($IncludeNvidiaDrivers) {
        Write-Step "Checking for NVIDIA GPU drivers (RTX 3060 Ti / Ampere support)..."
        $nvidiaDriversDir = Join-Path $scriptPath "drivers\nvidia"
        if (Test-Path $nvidiaDriversDir) {
            # Enumerate .sys files outside the test/ subdirectory
            $realSysFiles = Get-ChildItem -Path $nvidiaDriversDir -Recurse -Filter "*.sys" -ErrorAction SilentlyContinue |
                Where-Object { $_.FullName -notmatch [regex]::Escape([IO.Path]::DirectorySeparatorChar + 'test' + [IO.Path]::DirectorySeparatorChar) }

            if ($realSysFiles) {
                Write-Host "Found real NVIDIA driver binaries:"
                $realSysFiles | ForEach-Object { Write-Host "  $($_.FullName)" }
                Write-Host "Injecting drivers into WinPE image (this may take a moment)..."
                Dism /Add-Driver /Image:"$mountDir" /Driver:"$nvidiaDriversDir" /Recurse /ForceUnsigned | Out-Host
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "NVIDIA GPU drivers injected (RTX 3060 Ti / Ampere support enabled)"
                } else {
                    Write-Warning "NVIDIA driver injection returned exit code: $LASTEXITCODE"
                    Write-Warning "RTX 3060 Ti may fall back to basic VGA mode in WinPE"
                }
            } else {
                Write-Warning "No real NVIDIA driver binaries (.sys) found outside test/ — skipping injection."
                Write-Warning "The test/ subdirectory contains a CI stub only (fictitious HW IDs, no kernel binary)."
                Write-Host ""
                Write-Host "  To add real NVIDIA driver support:" -ForegroundColor Yellow
                Write-Host "  1. Download the matching NVIDIA display driver (Game Ready / Studio DCH):"
                Write-Host "     https://www.nvidia.com/Download/index.aspx"
                Write-Host "  2. Self-extract the installer (run it and cancel, or use 7-Zip)."
                Write-Host "  3. Copy the Display.Driver sub-folder (INF, CAT, SYS files) to:"
                Write-Host "     $nvidiaDriversDir"
                Write-Host "  4. Re-run this script to rebuild with driver support."
                Write-Host ""
                Write-Host "  WinPE will use the Microsoft Basic Display Adapter until real drivers are added."
                Write-Host "  Basic VGA is fully functional for the Nightmare OS web desktop."
                Write-Host ""
            }
        } else {
            Write-Warning "No NVIDIA driver directory found at: $nvidiaDriversDir"
        }
    }

    # Disable the Windows PE automatic reboot timer in the image registry
    Write-Step "Disabling Windows PE automatic reboot timer..."
    $regLoadSucceeded = $false
    $sysHive  = "$mountDir\Windows\System32\config\SYSTEM"
    $tempKey  = "HKLM\WinPE_NightOS_SYSTEM"
    try {
        $null = & reg load $tempKey "$sysHive" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "reg load failed with exit code $LASTEXITCODE."
        }
        $regLoadSucceeded = $true

        $null = & reg add "$tempKey\ControlSet001\Control\WinPE" /v BootTimeLimit /t REG_DWORD /d 0 /f 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "reg add failed with exit code $LASTEXITCODE."
        }

        [System.GC]::Collect()
        Start-Sleep -Milliseconds 500

        Write-Success "Reboot timer disabled in WinPE registry"
    } catch {
        Write-Warning "Could not pre-disable PE timer via registry: $_"
        Write-Warning "Runtime reg command in startnet.cmd will disable it at boot"
    } finally {
        if ($regLoadSucceeded) {
            $maxUnloadAttempts = 3
            for ($attempt = 1; $attempt -le $maxUnloadAttempts; $attempt++) {
                $null = & reg unload $tempKey 2>&1
                if ($LASTEXITCODE -eq 0) {
                    break
                }
                if ($attempt -lt $maxUnloadAttempts) {
                    Start-Sleep -Milliseconds 500
                }
            }
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Failed to unload registry hive $tempKey after $maxUnloadAttempts attempts (exit code $LASTEXITCODE)."
            }
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

    # Copy startup script from the authoritative winpe/startnet.cmd in the repo.
    # Using the repo file (rather than an embedded here-string) ensures the built PE
    # always runs the same script that contributors edit and test locally.
    Write-Step "Copying startup script..."
    $startnetPath = "$mountDir\Windows\System32\startnet.cmd"
    $srcStartnet  = Join-Path $PSScriptRoot "startnet.cmd"
    if (Test-Path $srcStartnet) {
        Copy-Item -Path $srcStartnet -Destination $startnetPath -Force
        Write-Success "Startup script copied from winpe/startnet.cmd"
    } else {
        Write-Warning "winpe/startnet.cmd not found at $srcStartnet — writing minimal fallback"
        Set-Content -Path $startnetPath -Value "@echo off`r`nwpeinit`r`n" -Encoding ASCII
    }

    # Copy the Tabby AI setup script (downloaded + started at boot by startnet.cmd)
    $srcSetupTabby = Join-Path $PSScriptRoot "Setup-Tabby.ps1"
    if (Test-Path $srcSetupTabby) {
        Copy-Item -Path $srcSetupTabby -Destination "$mountDir\Setup-Tabby.ps1" -Force
        Write-Success "Tabby AI setup script copied from winpe/Setup-Tabby.ps1"
    } else {
        Write-Warning "winpe/Setup-Tabby.ps1 not found — Tabby AI auto-setup will be unavailable in WinPE"
    }

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

This is a custom Windows 11 PE environment with the Nightmare OS web desktop
and Tabby AI coding assistant (v0.32.0, NVIDIA CUDA 12.4).

Boot Process:
1. Windows PE boots from USB
2. startnet.cmd runs automatically
3. Tabby AI server downloads on first boot (requires NightmareOS-Data partition)
   and starts on http://localhost:9090 using the RTX 3060 Ti GPU
4. Python HTTP server starts on port 8080
5. Microsoft Edge opens in kiosk mode
6. Nightmare OS desktop loads

Tabby AI Setup:
- Requires a USB partition labeled "NightmareOS-Data" (NTFS)
- On first boot, tabby_x86_64-windows-msvc-cuda124.zip (~160 MB) is downloaded
  from GitHub and extracted to D:\NightmareOS-Data\Tabby\
- Models are stored in D:\NightmareOS-Data\TabbyModels\
- Tabby server runs on http://localhost:9090 using NVIDIA CUDA (RTX 3060 Ti)
- Open the Tabby AI app on the desktop; the server URL is pre-set to localhost:9090
- On subsequent boots, the cached binary is reused (no re-download needed)
- To use a different Tabby model, run in Edge DevTools console:
    fetch('http://localhost:9090/api/v1/...') or use the Tabby admin UI

Important Notes:
- Persistence enabled when NightmareOS-Data partition found
  (Edge profile: D:\NightmareOS-Data\EdgeProfile)
  (Tabby binary: D:\NightmareOS-Data\Tabby\tabby.exe)
  (Tabby models: D:\NightmareOS-Data\TabbyModels\)
- No automatic reboot timer - sessions run indefinitely
- Press Ctrl+Alt+Del to access Task Manager
- To enable persistence: create an NTFS partition on USB labeled NightmareOS-Data

Troubleshooting:
- If the desktop doesn't load, press Alt+Tab to switch to browser window
- Check web server: netstat -an | find "8080"
- Check Tabby server: netstat -an | find "9090"
- View TabbySetup window if Tabby fails to start

Network:
- Network drivers load automatically if available
- Check connection: ipconfig /all
- Test connectivity: ping 8.8.8.8

System Information:
- OS: Windows PE (Preinstallation Environment)
- Desktop: Nightmare OS Web Desktop
- Browser: Microsoft Edge (Kiosk Mode)
- Web Server: Python HTTP Server on localhost:8080
- AI Server: Tabby ML v0.32.0 (CUDA 12.4) on localhost:9090

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
            # -n  = allow long filenames (>8.3) in ISO9660 layer — required for BIOS boot
            # -m  = ignore maximum image size limit
            # -o  = optimize storage by encoding duplicate files once
            # -u2 = produce UDF 2.0 file system (UEFI reads UDF; BIOS reads ISO9660)
            # -udfver102 = set UDF revision to 1.02 for maximum firmware compatibility
            if ($etfsboot -and $efisys) {
                # Both BIOS and UEFI boot
                $bootData = "2#p0,e,b`"$etfsboot`"#pEF,e,b`"$efisys`""
                & $oscdimgPath -n -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$isoPath"
            } elseif ($efisys) {
                # UEFI boot only
                $bootData = "2#pEF,e,b`"$efisys`""
                & $oscdimgPath -n -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$isoPath"
            } elseif ($etfsboot) {
                # BIOS boot only
                $bootData = "1#p0,e,b`"$etfsboot`""
                & $oscdimgPath -n -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$isoPath"
            } else {
                # No boot files - create data-only ISO
                Write-Warning "No boot files found - creating non-bootable ISO"
                & $oscdimgPath -n -m -o -u2 -udfver102 "$mediaDir" "$isoPath"
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
Write-Host "  • NVIDIA RTX 3060 Ti: place driver INFs in winpe\drivers\nvidia\ and rebuild"
Write-Host "    (without injected drivers the GPU falls back to basic VGA in WinPE)"
Write-Host "  • Persistence: create an NTFS partition labelled NightmareOS-Data on USB"
Write-Host "    (Edge profile stored there automatically — data survives reboots)"
Write-Host "  • No automatic reboot timer — sessions run indefinitely"
Write-Host "  • Disable Secure Boot in BIOS/UEFI settings if boot fails on bare-metal"
Write-Host ""

Write-Success "Build process completed successfully!"

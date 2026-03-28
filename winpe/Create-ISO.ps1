#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Creates a bootable ISO file from Nightmare OS Windows PE media.

.DESCRIPTION
    This script creates a bootable ISO file from an existing Windows PE build.
    The ISO can be burned to DVD or used with virtual machines.

.PARAMETER WorkDir
    The WinPE working directory. Default: C:\WinPE_NightmareOS

.PARAMETER OutputPath
    The output path for the ISO file. If not specified, creates in WorkDir.

.EXAMPLE
    .\Create-ISO.ps1
    Creates ISO from default working directory

.EXAMPLE
    .\Create-ISO.ps1 -WorkDir "D:\WinPE_Build" -OutputPath "C:\ISOs\NightmareOS.iso"
    Creates ISO with custom paths
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$WorkDir = "C:\WinPE_NightmareOS",

    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ""
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
║     Nightmare OS - ISO Creator                           ║
║     ==========================                            ║
║                                                           ║
║     Creating bootable ISO from Windows PE media          ║
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

# Validate work directory
Write-Step "Validating work directory..."
if (-not (Test-Path $WorkDir)) {
    Write-Error "Work directory not found: $WorkDir"
    Write-Host "Please run Build-NightmareOS-PE.ps1 first to create the PE image"
    exit 1
}

$mediaDir = "$WorkDir\media"
if (-not (Test-Path $mediaDir)) {
    Write-Error "Media directory not found: $mediaDir"
    Write-Host "The WinPE build appears incomplete. Please run Build-NightmareOS-PE.ps1"
    exit 1
}
Write-Success "Media directory found: $mediaDir"

# Set output path if not specified
if ([string]::IsNullOrEmpty($OutputPath)) {
    $OutputPath = "$WorkDir\NightmareOS-PE.iso"
}

Write-Host "Output ISO: $OutputPath"

# Check for Windows ADK
Write-Step "Checking for Windows ADK..."
$adkPath = "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit"

if (-not (Test-Path $adkPath)) {
    Write-Error "Windows ADK not found!"
    Write-Host "Please install Windows ADK for Windows 11 from:"
    Write-Host "https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install"
    exit 1
}
Write-Success "Windows ADK found"

# Detect architecture
$bootWim = "$mediaDir\sources\boot.wim"
if (-not (Test-Path $bootWim)) {
    Write-Error "boot.wim not found at: $bootWim"
    exit 1
}

# Try to detect architecture from media structure
$arch = "amd64"  # Default to amd64
$oscdimgPath = "$adkPath\Deployment Tools\$arch\Oscdimg\oscdimg.exe"

if (-not (Test-Path $oscdimgPath)) {
    # Try x86
    $arch = "x86"
    $oscdimgPath = "$adkPath\Deployment Tools\$arch\Oscdimg\oscdimg.exe"
}

if (-not (Test-Path $oscdimgPath)) {
    Write-Error "oscdimg.exe not found!"
    Write-Host "Tried:"
    Write-Host "  • $adkPath\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
    Write-Host "  • $adkPath\Deployment Tools\x86\Oscdimg\oscdimg.exe"
    Write-Host ""
    Write-Host "Please ensure Windows ADK Deployment Tools are installed"
    exit 1
}
Write-Success "Found oscdimg: $oscdimgPath"

# Create ISO
Write-Step "Creating bootable ISO..."

$etfsboot = "$mediaDir\boot\etfsboot.com"
$efisys = "$mediaDir\efi\microsoft\boot\efisys.bin"

# Check boot files
$hasEtfsboot = Test-Path $etfsboot
$hasEfisys = Test-Path $efisys

if (-not $hasEtfsboot) {
    Write-Warning "BIOS boot file not found: $etfsboot"
}

if (-not $hasEfisys) {
    Write-Warning "UEFI boot file not found: $efisys"
}

if (-not $hasEtfsboot -and -not $hasEfisys) {
    Write-Error "No boot files found! ISO will not be bootable."
    Write-Host "Expected files:"
    Write-Host "  • $etfsboot (BIOS boot)"
    Write-Host "  • $efisys (UEFI boot)"
    exit 1
}

# Build oscdimg command
Write-Host "Building bootable ISO..."
Write-Host "  • Source: $mediaDir"
Write-Host "  • Output: $OutputPath"
Write-Host "  • BIOS boot: $hasEtfsboot"
Write-Host "  • UEFI boot: $hasEfisys"
Write-Host ""

try {
    if ($hasEtfsboot -and $hasEfisys) {
        # Both BIOS and UEFI boot
        Write-Host "Creating dual-boot ISO (BIOS + UEFI)..."
        $bootData = "2#p0,e,b`"$etfsboot`"#pEF,e,b`"$efisys`""
        & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$OutputPath"
    } elseif ($hasEfisys) {
        # UEFI boot only
        Write-Host "Creating UEFI-only bootable ISO..."
        $bootData = "2#pEF,e,b`"$efisys`""
        & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$OutputPath"
    } elseif ($hasEtfsboot) {
        # BIOS boot only
        Write-Host "Creating BIOS-only bootable ISO..."
        $bootData = "1#p0,e,b`"$etfsboot`""
        & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData "$mediaDir" "$OutputPath"
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "ISO creation failed with exit code: $LASTEXITCODE"
        exit 1
    }

    Write-Success "ISO created successfully!"

    # Get ISO file info
    $isoFile = Get-Item $OutputPath
    $isoSizeMB = [math]::Round($isoFile.Length / 1MB, 2)

    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                           ║" -ForegroundColor Green
    Write-Host "║     ISO CREATION COMPLETE!                                ║" -ForegroundColor Green
    Write-Host "║                                                           ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    Write-Host "ISO Details:" -ForegroundColor Cyan
    Write-Host "  • File: $OutputPath"
    Write-Host "  • Size: $isoSizeMB MB"
    Write-Host "  • Created: $($isoFile.CreationTime)"
    Write-Host ""

    Write-Host "Usage Options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Burn to DVD:" -ForegroundColor Yellow
    Write-Host "   • Use Windows built-in ISO burner (right-click ISO → Burn disc image)"
    Write-Host "   • Or use third-party tools like ImgBurn, CDBurnerXP"
    Write-Host ""
    Write-Host "2. Use with Virtual Machines:" -ForegroundColor Yellow
    Write-Host "   • VirtualBox: Mount as optical drive in VM settings"
    Write-Host "   • VMware: Use as CD/DVD drive"
    Write-Host "   • Hyper-V: Attach ISO to VM"
    Write-Host ""
    Write-Host "3. Create Bootable USB:" -ForegroundColor Yellow
    Write-Host "   • Rufus: Select ISO and write to USB"
    Write-Host "   • Etcher: Simple drag-and-drop ISO burning"
    Write-Host "   • Windows Media Creation Tool"
    Write-Host ""
    Write-Host "4. Test Before Use:" -ForegroundColor Yellow
    Write-Host "   • Recommended: Test in virtual machine first"
    Write-Host "   • Ensure Secure Boot is disabled in BIOS/UEFI"
    Write-Host ""

    Write-Host "Boot Instructions:" -ForegroundColor Cyan
    Write-Host "  1. Insert DVD or mount ISO in VM"
    Write-Host "  2. Boot from DVD/ISO (may need to change boot order in BIOS)"
    Write-Host "  3. Nightmare OS will start automatically"
    Write-Host "  4. Network initializes and web server starts"
    Write-Host "  5. Browser opens with Nightmare OS desktop"
    Write-Host ""

    Write-Success "ISO ready to use!"

} catch {
    Write-Error "Error creating ISO: $_"
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

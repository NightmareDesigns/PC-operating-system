#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Creates a bootable USB drive with Nightmare OS Windows PE.

.DESCRIPTION
    This script writes the Windows PE image to a USB drive, making it bootable.
    WARNING: This will ERASE ALL DATA on the target USB drive!

    NOTE: This script requires Windows ADK (MakeWinPEMedia.cmd).
    On Linux, use Nightmare Loader instead:
        pip install nightmare-loader
        sudo nightmare-loader prepare /dev/sdX
        sudo nightmare-loader add /dev/sdX NightmareOS-PE.iso --label "Nightmare OS"
    See: https://github.com/NightmareDesigns/Nightmare-loader

.PARAMETER DriveLetter
    The drive letter of the USB drive (e.g., "E:" or "E")

.PARAMETER WorkDir
    The WinPE working directory. Default: C:\WinPE_NightmareOS

.PARAMETER Format
    Whether to format the USB drive. Default: $true

.EXAMPLE
    .\Create-Bootable-USB.ps1 -DriveLetter E:
    Creates bootable USB on drive E:

.EXAMPLE
    .\Create-Bootable-USB.ps1 -DriveLetter F -WorkDir "D:\WinPE_Build"
    Uses custom work directory
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$DriveLetter,

    [Parameter(Mandatory=$false)]
    [string]$WorkDir = "C:\WinPE_NightmareOS",

    [Parameter(Mandatory=$false)]
    [bool]$Format = $true
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
║     Nightmare OS - Bootable USB Creator                  ║
║     ===================================                   ║
║                                                           ║
║     Creating bootable USB from Windows PE image          ║
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

# Normalize drive letter
$DriveLetter = $DriveLetter.TrimEnd(':')
$DriveLetterFull = "${DriveLetter}:"

# Validate drive letter
Write-Step "Validating USB drive..."
if (-not (Test-Path $DriveLetterFull)) {
    Write-Error "Drive $DriveLetterFull not found!"
    Write-Host "Available drives:"
    Get-Volume | Where-Object { $_.DriveType -eq 'Removable' } | Format-Table -AutoSize
    exit 1
}

# Get drive information
$drive = Get-Volume -DriveLetter $DriveLetter
$disk = Get-Partition -DriveLetter $DriveLetter | Get-Disk

if ($disk.BusType -ne 'USB') {
    Write-Warning "Drive $DriveLetterFull does not appear to be a USB drive!"
    Write-Host "Drive type: $($disk.BusType)"
    Write-Host "Are you sure you want to continue? (yes/no)"
    $confirmation = Read-Host
    if ($confirmation -ne 'yes') {
        Write-Host "Operation cancelled."
        exit 0
    }
}

Write-Host "Drive Information:" -ForegroundColor Cyan
Write-Host "  • Drive Letter: $DriveLetterFull"
Write-Host "  • Label: $($drive.FileSystemLabel)"
Write-Host "  • Size: $([math]::Round($drive.Size / 1GB, 2)) GB"
Write-Host "  • Bus Type: $($disk.BusType)"
Write-Host ""

# Check if work directory exists
Write-Step "Checking WinPE work directory..."
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
Write-Success "WinPE media found at: $mediaDir"

# Final confirmation
Write-Warning "WARNING: This will ERASE ALL DATA on drive $DriveLetterFull!"
Write-Host ""
Write-Host "All files on this drive will be permanently deleted."
Write-Host "Make sure you have backed up any important data."
Write-Host ""
Write-Host "Type 'YES' to continue or anything else to cancel: " -NoNewline
$finalConfirmation = Read-Host

if ($finalConfirmation -ne 'YES') {
    Write-Host "Operation cancelled by user."
    exit 0
}

# Check for MakeWinPEMedia
Write-Step "Locating MakeWinPEMedia tool..."
$adkPath = "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit"
$makeWinPEMediaPath = "$adkPath\Windows Preinstallation Environment\MakeWinPEMedia.cmd"

if (-not (Test-Path $makeWinPEMediaPath)) {
    Write-Error "MakeWinPEMedia.cmd not found!"
    Write-Host "Expected location: $makeWinPEMediaPath"
    Write-Host "Please ensure Windows ADK with WinPE is installed"
    exit 1
}
Write-Success "MakeWinPEMedia found"

# Create bootable USB
Write-Step "Creating bootable USB drive..."
Write-Host "This may take several minutes..."
Write-Host ""

try {
    # Run MakeWinPEMedia
    $makeWinPECmd = "cmd.exe"
    $makeWinPEArgs = "/c `"$makeWinPEMediaPath`" /UFD `"$WorkDir`" $DriveLetterFull"

    Write-Host "Running: MakeWinPEMedia /UFD $WorkDir $DriveLetterFull"
    Write-Host ""

    $process = Start-Process -FilePath $makeWinPECmd -ArgumentList $makeWinPEArgs -Wait -NoNewWindow -PassThru

    if ($process.ExitCode -ne 0) {
        Write-Error "MakeWinPEMedia failed with exit code: $($process.ExitCode)"
        exit 1
    }

    Write-Success "Bootable USB created successfully!"

} catch {
    Write-Error "Failed to create bootable USB: $_"
    exit 1
}

# Verify the USB contents
Write-Step "Verifying USB contents..."
$requiredFiles = @(
    "$DriveLetterFull\bootmgr",
    "$DriveLetterFull\sources\boot.wim"
)

$allFilesPresent = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ Found: $file"
    } else {
        Write-Warning "  ✗ Missing: $file"
        $allFilesPresent = $false
    }
}

if ($allFilesPresent) {
    Write-Success "All required boot files present"
} else {
    Write-Warning "Some boot files are missing. The USB may not boot correctly."
}

# Show USB contents
Write-Step "USB Drive Contents:"
Get-ChildItem $DriveLetterFull -Force | Format-Table Name, Length, LastWriteTime -AutoSize

# Final summary
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     BOOTABLE USB CREATED!                                 ║
║     ====================                                  ║
║                                                           ║
║     Your Nightmare OS Windows PE USB is ready            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "USB Drive Information:" -ForegroundColor Cyan
Write-Host "  • Drive: $DriveLetterFull"
Write-Host "  • Label: Nightmare OS PE"
Write-Host "  • Ready to boot"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Safely eject the USB drive"
Write-Host "  2. Insert into target computer"
Write-Host "  3. Enter BIOS/UEFI (usually F2, F12, Del, or Esc)"
Write-Host "  4. Disable Secure Boot (if enabled)"
Write-Host "  5. Set USB as first boot device"
Write-Host "  6. Save and exit BIOS"
Write-Host "  7. Computer will boot into Nightmare OS"
Write-Host ""

Write-Host "Boot Process:" -ForegroundColor Cyan
Write-Host "  • Windows PE boots from USB"
Write-Host "  • Network initializes automatically"
Write-Host "  • Python web server starts"
Write-Host "  • Browser opens with Nightmare OS"
Write-Host "  • Desktop loads and is ready to use"
Write-Host ""

Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  • If boot fails, disable Secure Boot in BIOS"
Write-Host "  • Try different USB ports (prefer USB 2.0 for compatibility)"
Write-Host "  • Ensure USB boot is enabled in BIOS"
Write-Host "  • Check boot order in BIOS"
Write-Host "  • On Linux? Use Nightmare Loader instead:"
Write-Host "      pip install nightmare-loader"
Write-Host "      sudo nightmare-loader prepare /dev/sdX"
Write-Host "      sudo nightmare-loader add /dev/sdX NightmareOS-PE.iso --label `"Nightmare OS`""
Write-Host "      https://github.com/NightmareDesigns/Nightmare-loader"
Write-Host ""

Write-Host "Important Notes:" -ForegroundColor Red
Write-Host "  • All data is stored in RAM unless a D: persistence partition exists"
Write-Host "  • Changes are lost on reboot when running in RAM-only mode"
Write-Host "  • No automatic reboot timer"
Write-Host "  • Requires 2 GB RAM minimum, 4 GB recommended"
Write-Host ""

Write-Success "Bootable USB creation completed successfully!"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Builds a customized Windows 11 ISO with Nightmare OS pre-configured.

.DESCRIPTION
    This script takes an existing Windows 11 ISO, customizes it by injecting the
    Nightmare OS web desktop files into the Windows image, optionally creates an
    unattended installation answer file for automated setup, and rebuilds a
    bootable dual-boot (BIOS + UEFI) ISO ready for use with virtual machines,
    DVD burning, or bootable USB creation via Rufus.

    Requirements:
      - Windows 11 source ISO (any edition)
      - Windows ADK (Deployment Tools) installed
      - Administrator privileges
      - ~20 GB free disk space for working directory

.PARAMETER SourceISO
    Path to the original Windows 11 ISO file. This parameter is required.

.PARAMETER OutputPath
    Full path for the output ISO file.
    Default: C:\NightmareOS-Win11\NightmareOS-Win11.iso

.PARAMETER WorkDir
    Temporary working directory used during the build.
    Default: C:\NightmareOS-Win11

.PARAMETER Edition
    Windows 11 edition to customize inside the install.wim
    (e.g. "Windows 11 Home", "Windows 11 Pro").
    Use "list" to print all available editions and exit.
    Default: "Windows 11 Pro"

.PARAMETER InjectNightmareOS
    When $true the Nightmare OS web-desktop files are copied into the
    Windows image so they are available at C:\NightmareOS after installation.
    Default: $true

.PARAMETER CreateUnattend
    When $true an unattend.xml answer file is generated and embedded in the
    image, enabling a largely automated Windows 11 installation.
    Default: $true

.PARAMETER Architecture
    Target processor architecture. Must match the source ISO.
    Default: amd64

.EXAMPLE
    .\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso"
    Customize with default settings and output to C:\NightmareOS-Win11\NightmareOS-Win11.iso

.EXAMPLE
    .\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso" -Edition "Windows 11 Home" -OutputPath "E:\My.iso"
    Target the Home edition and write the ISO to a custom path

.EXAMPLE
    .\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso" -Edition list
    List all editions present in the source ISO

.EXAMPLE
    .\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso" -InjectNightmareOS $false -CreateUnattend $false
    Rebuild a clean ISO without any Nightmare OS customization
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$SourceISO,

    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "C:\NightmareOS-Win11\NightmareOS-Win11.iso",

    [Parameter(Mandatory=$false)]
    [string]$WorkDir = "C:\NightmareOS-Win11",

    [Parameter(Mandatory=$false)]
    [string]$Edition = "Windows 11 Pro",

    [Parameter(Mandatory=$false)]
    [bool]$InjectNightmareOS = $true,

    [Parameter(Mandatory=$false)]
    [bool]$CreateUnattend = $true,

    [Parameter(Mandatory=$false)]
    [ValidateSet("amd64", "x86", "arm64")]
    [string]$Architecture = "amd64"
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}
function Write-Step    { param([string]$m) Write-ColorOutput "`n==> $m" "Cyan" }
function Write-Success { param([string]$m) Write-ColorOutput "✓ $m" "Green" }
function Write-Warn    { param([string]$m) Write-ColorOutput "⚠ $m" "Yellow" }
function Write-Fail    { param([string]$m) Write-ColorOutput "✗ $m" "Red" }

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Nightmare OS  –  Windows 11 ISO Builder              ║
║     ==========================================            ║
║                                                           ║
║     Customizes a Windows 11 ISO with Nightmare OS        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# ---------------------------------------------------------------------------
# 1. Administrator check
# ---------------------------------------------------------------------------

Write-Step "Checking administrator privileges..."
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Fail "This script must be run as Administrator."
    Write-Host "Right-click PowerShell and select 'Run as Administrator'."
    exit 1
}
Write-Success "Running with administrator privileges"

# ---------------------------------------------------------------------------
# 2. Validate source ISO
# ---------------------------------------------------------------------------

Write-Step "Validating source ISO..."
if (-not (Test-Path $SourceISO)) {
    Write-Fail "Source ISO not found: $SourceISO"
    exit 1
}
$isoItem = Get-Item $SourceISO
Write-Success "Source ISO: $($isoItem.FullName)  ($([math]::Round($isoItem.Length/1GB,2)) GB)"

# ---------------------------------------------------------------------------
# 3. Locate oscdimg from Windows ADK
# ---------------------------------------------------------------------------

Write-Step "Locating oscdimg (Windows ADK)..."
$adkBase = "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit"
if (-not (Test-Path $adkBase)) {
    Write-Fail "Windows ADK not found at: $adkBase"
    Write-Host "Download from: https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install"
    exit 1
}

$oscdimgPath = "$adkBase\Deployment Tools\$Architecture\Oscdimg\oscdimg.exe"
if (-not (Test-Path $oscdimgPath)) {
    # Fallback: search common locations
    $oscdimgPath = Get-ChildItem "$adkBase\Deployment Tools" -Recurse -Filter "oscdimg.exe" -ErrorAction SilentlyContinue |
                   Select-Object -First 1 -ExpandProperty FullName
}
if (-not $oscdimgPath -or -not (Test-Path $oscdimgPath)) {
    Write-Fail "oscdimg.exe not found. Please install Windows ADK Deployment Tools."
    exit 1
}
Write-Success "oscdimg: $oscdimgPath"

# ---------------------------------------------------------------------------
# 4. Prepare working directories
# ---------------------------------------------------------------------------

Write-Step "Preparing working directory..."

$isoSrc      = "$WorkDir\iso_src"       # extracted ISO contents
$mountDir    = "$WorkDir\mount"         # DISM mount point
$scratchDir  = "$WorkDir\scratch"       # DISM scratch space

foreach ($dir in @($WorkDir, $isoSrc, $mountDir, $scratchDir)) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

# Output directory
$outputDir = Split-Path $OutputPath -Parent
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Success "Working directory: $WorkDir"

# ---------------------------------------------------------------------------
# 5. Mount source ISO and copy contents
# ---------------------------------------------------------------------------

Write-Step "Mounting source ISO..."
$mountResult = Mount-DiskImage -ImagePath $isoItem.FullName -PassThru
$driveLetter = ($mountResult | Get-Volume).DriveLetter
if (-not $driveLetter) {
    Write-Fail "Failed to determine drive letter for mounted ISO."
    Dismount-DiskImage -ImagePath $isoItem.FullName -ErrorAction SilentlyContinue
    exit 1
}
$isoDrive = "${driveLetter}:"
Write-Success "ISO mounted at $isoDrive"

Write-Step "Copying ISO contents to working directory (this may take a few minutes)..."
try {
    Copy-Item -Path "$isoDrive\*" -Destination $isoSrc -Recurse -Force
    Write-Success "ISO contents copied to $isoSrc"
} finally {
    Dismount-DiskImage -ImagePath $isoItem.FullName -ErrorAction SilentlyContinue
    Write-Success "ISO unmounted"
}

# ---------------------------------------------------------------------------
# 6. Locate install.wim / install.esd
# ---------------------------------------------------------------------------

Write-Step "Locating Windows image file..."
$installWim = "$isoSrc\sources\install.wim"
$installEsd = "$isoSrc\sources\install.esd"

if (-not (Test-Path $installWim) -and -not (Test-Path $installEsd)) {
    Write-Fail "Neither install.wim nor install.esd found under $isoSrc\sources\"
    exit 1
}

$wimPath = if (Test-Path $installWim) { $installWim } else { $installEsd }
Write-Success "Image file: $wimPath"

# If user asked to list editions, do so and exit
if ($Edition -eq "list") {
    Write-Host "`nEditions available in source ISO:" -ForegroundColor Cyan
    Get-WindowsImage -ImagePath $wimPath | Format-Table -AutoSize ImageIndex, ImageName
    Write-Host "Re-run the script with -Edition `"<ImageName>`" to select one." -ForegroundColor Yellow
    exit 0
}

# Resolve edition index
Write-Step "Resolving edition index for '$Edition'..."
$images = Get-WindowsImage -ImagePath $wimPath
$selected = $images | Where-Object { $_.ImageName -eq $Edition }
if (-not $selected) {
    Write-Warn "Edition '$Edition' not found. Available editions:"
    $images | ForEach-Object { Write-Host "  [$($_.ImageIndex)] $($_.ImageName)" }
    Write-Fail "Please specify a valid -Edition name."
    exit 1
}
$imageIndex = $selected.ImageIndex
Write-Success "Selected: [$imageIndex] $Edition"

# ---------------------------------------------------------------------------
# 7. Convert ESD → WIM if necessary (DISM cannot mount ESD read/write)
# ---------------------------------------------------------------------------

if ($wimPath -eq $installEsd) {
    Write-Step "Converting install.esd to install.wim (this may take 10-20 minutes)..."
    $convertedWim = "$WorkDir\install_converted.wim"
    Export-WindowsImage -SourceImagePath $installEsd -SourceIndex $imageIndex `
                        -DestinationImagePath $convertedWim -CompressionType max `
                        -Setbootable -ErrorAction Stop
    # Replace the esd with the converted wim in the ISO source
    Remove-Item $installEsd -Force
    Move-Item $convertedWim "$isoSrc\sources\install.wim" -Force
    $wimPath    = "$isoSrc\sources\install.wim"
    $imageIndex = 1   # Export creates a single-index wim
    Write-Success "Conversion complete: $wimPath"
}

# ---------------------------------------------------------------------------
# 8. Mount install.wim and inject customizations
# ---------------------------------------------------------------------------

if ($InjectNightmareOS -or $CreateUnattend) {
    Write-Step "Mounting Windows image for customization..."
    Mount-WindowsImage -ImagePath $wimPath -Index $imageIndex -Path $mountDir `
                       -ScratchDirectory $scratchDir -ErrorAction Stop
    Write-Success "Image mounted at $mountDir"

    # ---- 8a. Inject Nightmare OS files ----
    if ($InjectNightmareOS) {
        Write-Step "Injecting Nightmare OS files into Windows image..."

        # Locate the NightmareOS repo root (two levels up from this script)
        $scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
        $repoRoot   = Split-Path -Parent $scriptDir
        $nightmareFiles = @("index.html","manifest.json","sw.js","css","icons","js")

        $destBase = "$mountDir\Windows\Web\NightmareOS"
        New-Item -ItemType Directory -Path $destBase -Force | Out-Null

        foreach ($item in $nightmareFiles) {
            $src = Join-Path $repoRoot $item
            if (Test-Path $src) {
                Copy-Item -Path $src -Destination $destBase -Recurse -Force
                Write-Success "Injected: $item"
            } else {
                Write-Warn "Source not found (skipped): $src"
            }
        }

        # Create a desktop shortcut batch file that opens Nightmare OS via Edge
        $shortcutScript = @'
@echo off
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
    --app="file:///C:/Windows/Web/NightmareOS/index.html" ^
    --window-size=1920,1080 ^
    --start-maximized
'@
        $shortcutDest = "$mountDir\Windows\Web\NightmareOS\Launch-NightmareOS.bat"
        Set-Content -Path $shortcutDest -Value $shortcutScript -Encoding ASCII
        Write-Success "Launcher script created: Launch-NightmareOS.bat"

        # Place a shortcut in the Public Desktop so all users see it after install
        $publicDesktop = "$mountDir\Users\Public\Desktop"
        New-Item -ItemType Directory -Path $publicDesktop -Force | Out-Null
        # Use a built-in system icon – SVG cannot be used as a Windows icon file.
        # shell32.dll index 14 is the generic web/browser globe icon.
        $lnkContent = @"
[InternetShortcut]
URL=file:///C:/Windows/Web/NightmareOS/index.html
IconFile=C:\Windows\System32\shell32.dll
IconIndex=14
"@
        Set-Content -Path "$publicDesktop\Nightmare OS.url" -Value $lnkContent -Encoding ASCII
        Write-Success "Desktop shortcut placed in Public\Desktop"
    }

    # ---- 8b. Create unattend.xml ----
    if ($CreateUnattend) {
        Write-Step "Creating unattend.xml answer file..."

        $unattendXml = @'
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">

  <!-- ============================================================
       Nightmare OS  –  Windows 11 Unattended Install
       Generated by Build-Win11-ISO.ps1
       ============================================================ -->

  <settings pass="windowsPE">
    <component name="Microsoft-Windows-Setup"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <UserData>
        <ProductKey>
          <!-- Generic KMS client key for Windows 11 Pro – replace with a
               retail/volume key for a fully-activated installation. -->
          <Key>VK7JG-NPHTM-C97JM-9MPGT-3V66T</Key>
          <WillShowUI>OnError</WillShowUI>
        </ProductKey>
        <AcceptEula>true</AcceptEula>
        <FullName>Nightmare OS User</FullName>
        <Organization>NightmareDesigns</Organization>
      </UserData>
      <DiskConfiguration>
        <Disk wcm:action="add">
          <DiskID>0</DiskID>
          <WillWipeDisk>true</WillWipeDisk>
          <CreatePartitions>
            <!-- EFI System Partition -->
            <CreatePartition wcm:action="add">
              <Order>1</Order>
              <Type>EFI</Type>
              <Size>100</Size>
            </CreatePartition>
            <!-- Microsoft Reserved Partition -->
            <CreatePartition wcm:action="add">
              <Order>2</Order>
              <Type>MSR</Type>
              <Size>16</Size>
            </CreatePartition>
            <!-- Windows OS Partition -->
            <CreatePartition wcm:action="add">
              <Order>3</Order>
              <Type>Primary</Type>
              <Extend>true</Extend>
            </CreatePartition>
          </CreatePartitions>
          <ModifyPartitions>
            <ModifyPartition wcm:action="add">
              <Order>1</Order>
              <PartitionID>1</PartitionID>
              <Label>System</Label>
              <Format>FAT32</Format>
            </ModifyPartition>
            <ModifyPartition wcm:action="add">
              <Order>2</Order>
              <PartitionID>2</PartitionID>
            </ModifyPartition>
            <ModifyPartition wcm:action="add">
              <Order>3</Order>
              <PartitionID>3</PartitionID>
              <Label>NightmareOS</Label>
              <Letter>C</Letter>
              <Format>NTFS</Format>
            </ModifyPartition>
          </ModifyPartitions>
        </Disk>
      </DiskConfiguration>
      <ImageInstall>
        <OSImage>
          <InstallTo>
            <DiskID>0</DiskID>
            <PartitionID>3</PartitionID>
          </InstallTo>
          <WillShowUI>OnError</WillShowUI>
        </OSImage>
      </ImageInstall>
    </component>

    <component name="Microsoft-Windows-International-Core-WinPE"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <SetupUILanguage>
        <UILanguage>en-US</UILanguage>
      </SetupUILanguage>
      <InputLocale>en-US</InputLocale>
      <SystemLocale>en-US</SystemLocale>
      <UILanguage>en-US</UILanguage>
      <UserLocale>en-US</UserLocale>
    </component>
  </settings>

  <settings pass="specialize">
    <component name="Microsoft-Windows-Shell-Setup"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <ComputerName>NightmareOS-PC</ComputerName>
      <TimeZone>UTC</TimeZone>
      <RegisteredOwner>Nightmare OS User</RegisteredOwner>
      <RegisteredOrganization>NightmareDesigns</RegisteredOrganization>
    </component>

    <!-- Disable telemetry / data collection -->
    <component name="Microsoft-Windows-SQMAPI"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <CEIPEnabled>0</CEIPEnabled>
    </component>
  </settings>

  <settings pass="oobeSystem">
    <component name="Microsoft-Windows-Shell-Setup"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <OOBE>
        <HideEULAPage>true</HideEULAPage>
        <HideLocalAccountScreen>false</HideLocalAccountScreen>
        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
        <NetworkLocation>Home</NetworkLocation>
        <ProtectYourPC>3</ProtectYourPC>
        <SkipMachineOOBE>true</SkipMachineOOBE>
        <SkipUserOOBE>true</SkipUserOOBE>
      </OOBE>
      <UserAccounts>
        <LocalAccounts>
          <LocalAccount wcm:action="add">
            <Name>NightmareUser</Name>
            <DisplayName>Nightmare OS User</DisplayName>
            <Group>Administrators</Group>
            <!-- Password is intentionally blank; change before production use. -->
            <Password>
              <Value></Value>
              <PlainText>true</PlainText>
            </Password>
          </LocalAccount>
        </LocalAccounts>
      </UserAccounts>
      <!-- Auto-login for demo/kiosk use; remove for multi-user deployments. -->
      <AutoLogon>
        <Enabled>true</Enabled>
        <Username>NightmareUser</Username>
        <LogonCount>1</LogonCount>
        <Password>
          <Value></Value>
          <PlainText>true</PlainText>
        </Password>
      </AutoLogon>
      <FirstLogonCommands>
        <SynchronousCommand wcm:action="add">
          <Order>1</Order>
          <Description>Launch Nightmare OS on first logon</Description>
          <CommandLine>cmd /c start "" "C:\Windows\Web\NightmareOS\Launch-NightmareOS.bat"</CommandLine>
          <RequiresUserInput>false</RequiresUserInput>
        </SynchronousCommand>
      </FirstLogonCommands>
    </component>

    <component name="Microsoft-Windows-International-Core"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <InputLocale>en-US</InputLocale>
      <SystemLocale>en-US</SystemLocale>
      <UILanguage>en-US</UILanguage>
      <UserLocale>en-US</UserLocale>
    </component>
  </settings>

</unattend>
'@
        $unattendDest = "$mountDir\Windows\System32\Sysprep\unattend.xml"
        New-Item -ItemType Directory -Path (Split-Path $unattendDest) -Force | Out-Null
        Set-Content -Path $unattendDest -Value $unattendXml -Encoding UTF8
        Write-Success "unattend.xml written to image"

        # Also place a copy in the ISO sources folder so Windows Setup picks it
        # up automatically when booting from the ISO
        $autoUnattendDest = "$isoSrc\autounattend.xml"
        Set-Content -Path $autoUnattendDest -Value $unattendXml -Encoding UTF8
        Write-Success "autounattend.xml placed in ISO root"
    }

    # ---- 8c. Commit & unmount ----
    Write-Step "Saving changes and unmounting image (this may take several minutes)..."
    Dismount-WindowsImage -Path $mountDir -Save -ScratchDirectory $scratchDir -ErrorAction Stop
    Write-Success "Image unmounted and saved"
}

# ---------------------------------------------------------------------------
# 9. Rebuild bootable ISO
# ---------------------------------------------------------------------------

Write-Step "Rebuilding bootable ISO..."

$etfsboot = "$isoSrc\boot\etfsboot.com"

# Prefer efisys_noprompt.bin so the ISO boots from Ventoy (and other
# chainloaders) without requiring "Press any key to boot from CD/DVD".
$efisysNoprompt = "$isoSrc\efi\microsoft\boot\efisys_noprompt.bin"
$efisysFallback  = "$isoSrc\efi\microsoft\boot\efisys.bin"
if (Test-Path $efisysNoprompt) {
    $efisys = $efisysNoprompt
} elseif (Test-Path $efisysFallback) {
    $efisys = $efisysFallback
} else {
    $efisys = $null
}

$hasBios = Test-Path $etfsboot
$hasUefi = ($null -ne $efisys)

if (-not $hasBios) { Write-Warn "BIOS boot file not found: $etfsboot" }
if (-not $hasUefi) { Write-Warn "UEFI boot file not found (checked efisys_noprompt.bin and efisys.bin)" }
if (-not $hasBios -and -not $hasUefi) {
    Write-Fail "No boot files found – cannot create a bootable ISO."
    exit 1
}

Write-Host "  • Source  : $isoSrc"
Write-Host "  • Output  : $OutputPath"
Write-Host "  • BIOS    : $hasBios"
Write-Host "  • UEFI    : $hasUefi"
Write-Host ""

try {
    if ($hasBios -and $hasUefi) {
        Write-Host "Creating dual-boot ISO (BIOS + UEFI)..."
        $bootData = "2#p0,e,b`"$etfsboot`"#pEF,e,b`"$efisys`""
        & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData `
                       -l"NightmareOS_Win11" "$isoSrc" "$OutputPath"
    } elseif ($hasUefi) {
        Write-Host "Creating UEFI-only bootable ISO..."
        $bootData = "2#pEF,e,b`"$efisys`""
        & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData `
                       -l"NightmareOS_Win11" "$isoSrc" "$OutputPath"
    } else {
        Write-Host "Creating BIOS-only bootable ISO..."
        $bootData = "1#p0,e,b`"$etfsboot`""
        & $oscdimgPath -m -o -u2 -udfver102 -bootdata:$bootData `
                       -l"NightmareOS_Win11" "$isoSrc" "$OutputPath"
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "oscdimg exited with code $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Fail "Error running oscdimg: $_"
    exit 1
}

# ---------------------------------------------------------------------------
# 10. Summary
# ---------------------------------------------------------------------------

$isoOut    = Get-Item $OutputPath
$isoSizeGB = [math]::Round($isoOut.Length / 1GB, 2)

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                           ║" -ForegroundColor Green
Write-Host "║     ISO BUILD COMPLETE!                                   ║" -ForegroundColor Green
Write-Host "║                                                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "ISO Details:" -ForegroundColor Cyan
Write-Host "  • File    : $OutputPath"
Write-Host "  • Size    : $isoSizeGB GB"
Write-Host "  • Created : $($isoOut.CreationTime)"
Write-Host ""

Write-Host "What was customized:" -ForegroundColor Yellow
if ($InjectNightmareOS) {
    Write-Host "  ✓ Nightmare OS files injected to C:\Windows\Web\NightmareOS\"
    Write-Host "  ✓ Desktop shortcut placed in Public\Desktop"
    Write-Host "  ✓ Edge launcher script (Launch-NightmareOS.bat) created"
}
if ($CreateUnattend) {
    Write-Host "  ✓ autounattend.xml embedded (automated setup)"
    Write-Host "  ✓ Nightmare OS auto-launches on first login"
}
Write-Host ""

Write-Host "Usage Options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Install in a Virtual Machine:" -ForegroundColor Yellow
Write-Host "   • VirtualBox: New VM → attach ISO as optical drive → boot"
Write-Host "   • VMware Workstation: New VM wizard → use ISO file"
Write-Host "   • Hyper-V: New VM → attach ISO in settings → start"
Write-Host ""
Write-Host "2. Burn to DVD / USB:" -ForegroundColor Yellow
Write-Host "   • DVD : right-click ISO → 'Burn disc image'"
Write-Host "   • USB : use Rufus (https://rufus.ie) – select ISO, write to USB"
Write-Host ""
Write-Host "3. Boot the installed system:" -ForegroundColor Yellow
Write-Host "   • Nightmare OS opens automatically in Microsoft Edge"
Write-Host "   • Files are at C:\Windows\Web\NightmareOS\"
Write-Host "   • To launch manually: run C:\Windows\Web\NightmareOS\Launch-NightmareOS.bat"
Write-Host ""

Write-Host "Note:" -ForegroundColor Cyan
Write-Host "  The embedded KMS client key (if used) activates via an on-premises"
Write-Host "  KMS server.  Replace it with your retail or volume license key for"
Write-Host "  a fully-activated installation."
Write-Host ""

Write-Success "Windows 11 + Nightmare OS ISO is ready!"

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

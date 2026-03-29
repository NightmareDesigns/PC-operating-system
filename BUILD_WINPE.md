# Building Bootable Windows 11 PE with Nightmare OS

This guide explains how to create a bootable Windows 11 PE (Preinstallation Environment) USB drive with the Nightmare OS web desktop environment.

## Build in the Cloud (No PC Required)

A GitHub Actions workflow is included so you can build the WinPE ISO entirely in the cloud — no Windows PC needed.

### Steps

1. Open the **Actions** tab of this repository on GitHub.
2. Select **"Build Nightmare OS WinPE ISO"** in the left sidebar.
3. Click **"Run workflow"** (top-right) → keep defaults → click **"Run workflow"**.
4. The job installs Windows ADK on a `windows-latest` runner, builds the ISO, and uploads it as an artifact.
5. When the run turns green (✅), click it and scroll down to **Artifacts**.
6. Click **`NightmareOS-PE-ISO-<N>`** to download a ZIP.
7. Extract the ZIP to get `NightmareOS-PE.iso` (~300–500 MB).

### ADK Cache

The first run downloads ~2.3 GB of ADK packages (takes ~25–30 min).  Subsequent runs restore the packages from the GitHub Actions cache and complete in ~20 min.

To force a fresh ADK download (e.g. after a Microsoft ADK update), bump the `ADK_CACHE_KEY` value in `.github/workflows/build-winpe-iso.yml`.

### Automatic Release Builds

When you push a version tag (e.g. `git tag v1.0 && git push --tags`), the workflow runs automatically and attaches the ISO to the GitHub Release.

---

## Prerequisites

### Required Software
1. **Windows 11** (host machine for building)
2. **Windows Assessment and Deployment Kit (ADK)** for Windows 11
   - Download from: https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install
   - Required components:
     - Deployment Tools
     - Windows Preinstallation Environment (Windows PE)
3. **Administrator privileges** on the build machine

### Hardware Requirements
- At least 8 GB RAM
- 20 GB free disk space for build environment
- USB flash drive (16 GB or larger, recommended 32 GB)

## Build Process Overview

The build process consists of several steps:

1. Install Windows ADK and Windows PE add-on
2. Create a custom Windows PE working directory
3. Mount the Windows PE boot image (WIM file)
4. Customize the Windows PE environment
5. Integrate the Nightmare OS web desktop
6. Configure auto-start for the web desktop
7. Unmount and commit changes
8. Create bootable USB drive

## Step-by-Step Instructions

### Step 1: Install Windows ADK

1. Download Windows ADK for Windows 11 from Microsoft
2. Run the installer and select these features:
   - **Deployment Tools**
   - **Windows Preinstallation Environment (Windows PE)**

### Step 2: Prepare Build Environment

1. Open **Deployment and Imaging Tools Environment** as Administrator
   - Start Menu → Windows Kits → Deployment and Imaging Tools Environment
   - Right-click → Run as Administrator

2. Navigate to your project directory:
   ```cmd
   cd C:\path\to\PC-operating-system
   ```

### Step 3: Run the Build Script

We provide a PowerShell script to automate the build process:

```powershell
# Run as Administrator
.\winpe\Build-NightmareOS-PE.ps1
```

This script will:
- Create a Windows PE working directory
- Mount the boot image
- Copy Nightmare OS files into the PE environment
- Install necessary components (browsers, networking)
- Configure auto-start scripts
- Create the bootable media

### Step 4: Create Bootable USB

After the build completes, use the included script to create a bootable USB:

```powershell
# Run as Administrator
.\winpe\Create-Bootable-USB.ps1 -DriveLetter E:
```

**WARNING**: This will erase all data on the target USB drive!

Replace `E:` with your USB drive letter.

### Step 4 Alternative: Create Bootable ISO

To create a bootable ISO file instead of or in addition to USB:

**Option 1: During Build**

```powershell
# Run as Administrator
.\winpe\Build-NightmareOS-PE.ps1 -CreateISO $true
```

**Option 2: After Build**

```powershell
# Run as Administrator
.\winpe\Create-ISO.ps1
```

The ISO file will be created at: `C:\WinPE_NightmareOS\NightmareOS-PE.iso`

**ISO Usage:**
- Burn to DVD using Windows built-in disc burner
- Mount in virtual machines (VirtualBox, VMware, Hyper-V)
- Create bootable USB using Rufus or similar tools
- Test in VM before deploying to physical hardware

## Manual Build Process

If you prefer to build manually, follow these steps:

### 1. Create Working Directory

```cmd
copype amd64 C:\WinPE_NightmareOS
```

### 2. Mount the Boot Image

```cmd
Dism /Mount-Image /ImageFile:"C:\WinPE_NightmareOS\media\sources\boot.wim" /index:1 /MountDir:"C:\WinPE_NightmareOS\mount"
```

### 3. Add Packages

```cmd
REM Add networking support
Dism /Add-Package /Image:"C:\WinPE_NightmareOS\mount" /PackagePath:"C:\Program Files (x86)\Windows Kits\10\Assessment and Deployment Kit\Windows Preinstallation Environment\amd64\WinPE_OCs\WinPE-WMI.cab"
Dism /Add-Package /Image:"C:\WinPE_NightmareOS\mount" /PackagePath:"C:\Program Files (x86)\Windows Kits\10\Assessment and Deployment Kit\Windows Preinstallation Environment\amd64\WinPE_OCs\WinPE-NetFx.cab"
Dism /Add-Package /Image:"C:\WinPE_NightmareOS\mount" /PackagePath:"C:\Program Files (x86)\Windows Kits\10\Assessment and Deployment Kit\Windows Preinstallation Environment\amd64\WinPE_OCs\WinPE-Scripting.cab"
Dism /Add-Package /Image:"C:\WinPE_NightmareOS\mount" /PackagePath:"C:\Program Files (x86)\Windows Kits\10\Assessment and Deployment Kit\Windows Preinstallation Environment\amd64\WinPE_OCs\WinPE-PowerShell.cab"
```

### 4. Copy Nightmare OS Files

```cmd
xcopy /E /H /Y ".\css" "C:\WinPE_NightmareOS\mount\NightmareOS\css\"
xcopy /E /H /Y ".\js" "C:\WinPE_NightmareOS\mount\NightmareOS\js\"
xcopy /E /H /Y ".\icons" "C:\WinPE_NightmareOS\mount\NightmareOS\icons\"
copy /Y ".\index.html" "C:\WinPE_NightmareOS\mount\NightmareOS\"
copy /Y ".\manifest.json" "C:\WinPE_NightmareOS\mount\NightmareOS\"
copy /Y ".\sw.js" "C:\WinPE_NightmareOS\mount\NightmareOS\"
```

### 5. Create Startup Script

Create `C:\WinPE_NightmareOS\mount\Windows\System32\startnet.cmd`:

```cmd
@echo off
wpeinit
echo.
echo ============================================
echo   Nightmare OS - Windows PE Edition
echo ============================================
echo.
echo Starting Nightmare OS Desktop...
echo.

REM Start the local web server
start /min powershell -WindowStyle Hidden -Command "cd X:\NightmareOS; python -m http.server 8080"

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Launch browser in kiosk mode
start msedge --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run

cmd /k
```

### 6. Unmount and Commit

```cmd
Dism /Unmount-Image /MountDir:"C:\WinPE_NightmareOS\mount" /commit
```

### 7. Create Bootable Media

**For USB:**

```cmd
MakeWinPEMedia /UFD C:\WinPE_NightmareOS E:
```

Replace `E:` with your USB drive letter.

**For ISO:**

```cmd
oscdimg -m -o -u2 -udfver102 -bootdata:2#p0,e,b"C:\WinPE_NightmareOS\media\boot\etfsboot.com"#pEF,e,b"C:\WinPE_NightmareOS\media\efi\microsoft\boot\efisys.bin" C:\WinPE_NightmareOS\media C:\WinPE_NightmareOS\NightmareOS-PE.iso
```

This creates a dual-boot ISO (BIOS + UEFI).

## Architecture

### Boot Sequence

1. **BIOS/UEFI** → Loads Windows Boot Manager
2. **Windows Boot Manager** → Loads Windows PE kernel
3. **Windows PE Kernel** → Initializes hardware and drivers
4. **startnet.cmd** → Runs automatically on boot
5. **Python HTTP Server** → Serves Nightmare OS files locally
6. **Microsoft Edge** → Opens in kiosk mode displaying Nightmare OS
7. **Nightmare OS Desktop** → User interface loads

### Directory Structure in Windows PE

```
X:\                              (RAM disk - Windows PE environment)
├── Windows\                     (Windows PE system files)
│   └── System32\
│       └── startnet.cmd         (Auto-start script)
├── NightmareOS\                 (Nightmare OS web files)
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── css\
│   ├── js\
│   └── icons\
└── Python\                      (Embedded Python for web server)
```

## Customization

### Changing Boot Message

Edit `winpe\startnet.cmd` to customize the boot messages.

### Adding Applications

To add additional Windows applications to the PE environment:

1. Copy application files to `C:\WinPE_NightmareOS\mount\Windows\System32\`
2. Update `startnet.cmd` to launch the application

### Modifying Auto-Start Behavior

Edit `startnet.cmd` to change what happens on boot:
- Change the browser launch parameters
- Add additional startup commands
- Modify the web server configuration

## Troubleshooting

### Build Fails - Access Denied
- Ensure you're running PowerShell or Command Prompt as Administrator
- Check antivirus isn't blocking DISM operations

### USB Won't Boot
- Ensure Secure Boot is disabled in BIOS/UEFI
- Try using MBR instead of GPT partition scheme
- Verify the USB drive is set as first boot device

### Browser Doesn't Start
- Check that Microsoft Edge is included in the PE image
- Verify the Python HTTP server starts correctly
- Check firewall isn't blocking localhost connections

### Nightmare OS Doesn't Load
- Verify all files were copied correctly to X:\NightmareOS\
- Check browser console for JavaScript errors (F12)
- Ensure index.html is accessible at http://localhost:8080/

## Limitations

### Windows PE Limitations
- **Maximum session time**: Windows PE automatically reboots after 72 hours
- **No persistence**: Changes are stored in RAM and lost on reboot
- **Limited drivers**: Only basic hardware drivers included
- **No Windows Store**: Cannot install Windows Store apps
- **No file system changes**: Cannot modify the boot drive (read-only)

### Nightmare OS in PE
- No persistence between boots (localStorage is in RAM)
- Cannot save files to local disk (files save to RAM disk X:\)
- Browser iframe limitations may affect some apps
- Network-dependent apps require working network connection

## Advanced Configuration

### Adding Persistence

To add persistence across reboots, you can:

1. Create a second partition on the USB drive for data storage
2. Modify startnet.cmd to mount this partition
3. Configure Nightmare OS to use this partition for localStorage

### Including Python in the Image

To embed Python in the PE image:

1. Download Python embeddable package
2. Extract to `C:\WinPE_NightmareOS\mount\Python\`
3. Update startnet.cmd to use embedded Python path

### Network Configuration

To configure networking:

```cmd
REM In startnet.cmd, add:
wpeutil InitializeNetwork
ipconfig /renew
```

## Building Without Internet

The build process can be done offline if you have:
- Windows ADK installer (offline installer available)
- All required CAB files from ADK
- Python embeddable package (if embedding Python)

## Security Considerations

- Windows PE boots with Administrator privileges
- No user authentication by default
- Network is accessible if drivers available
- Consider adding authentication to Nightmare OS login screen
- Limit network access for security-sensitive environments

## License

This Windows PE build configuration is provided as-is. Windows PE and Windows ADK are proprietary Microsoft software and subject to Microsoft's licensing terms.

The Nightmare OS web desktop environment is MIT licensed.

## Support

For build issues:
- Check Windows ADK documentation
- Review DISM error logs in C:\Windows\Logs\DISM\
- Verify all prerequisites are installed

For Nightmare OS issues:
- See main README.md
- Check browser console for errors
- Verify all files copied correctly

---

## Building a Full Windows 11 ISO

In addition to the lightweight WinPE image, you can build a **full Windows 11 installation ISO** that pre-installs Nightmare OS and auto-launches it on first login.

### Requirements

- A genuine Windows 11 ISO (e.g. downloaded from the [Microsoft website](https://www.microsoft.com/en-us/software-download/windows11))
- Windows ADK (Deployment Tools) – same as the WinPE build
- ~20 GB free disk space
- Administrator privileges

### Quick Start

```powershell
# Customize Win 11 Pro (default) and create the ISO
.\winpe\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso"

# Output: C:\NightmareOS-Win11\NightmareOS-Win11.iso
```

### All Parameters

| Parameter | Default | Description |
|---|---|---|
| `-SourceISO` | *(required)* | Path to the original Windows 11 ISO |
| `-OutputPath` | `C:\NightmareOS-Win11\NightmareOS-Win11.iso` | Where to write the new ISO |
| `-WorkDir` | `C:\NightmareOS-Win11` | Scratch directory (~20 GB needed) |
| `-Edition` | `Windows 11 Pro` | Windows edition to customize (use `list` to enumerate) |
| `-InjectNightmareOS` | `$true` | Copy Nightmare OS files into the Windows image |
| `-CreateUnattend` | `$true` | Embed an `autounattend.xml` for automated setup |
| `-Architecture` | `amd64` | Processor architecture (`amd64`, `x86`, `arm64`) |

### List Available Editions

```powershell
.\winpe\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso" -Edition list
```

### Target a Different Edition

```powershell
.\winpe\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso" -Edition "Windows 11 Home"
```

### Rebuild Without Customization

```powershell
.\winpe\Build-Win11-ISO.ps1 -SourceISO "D:\Win11.iso" `
    -InjectNightmareOS $false -CreateUnattend $false
```

### What the Script Does

1. Validates the source ISO and locates `oscdimg` from Windows ADK
2. Mounts and extracts the source ISO to a working directory
3. Converts `install.esd` → `install.wim` if necessary (some ISOs use ESD)
4. Mounts the selected Windows image with DISM
5. **Injects Nightmare OS files** to `C:\Windows\Web\NightmareOS\` inside the image, and adds a Public Desktop shortcut + Edge launcher script
6. **Embeds `autounattend.xml`** in the ISO root so Windows Setup runs unattended (auto-partitioning, auto-account creation, auto-launch of Nightmare OS on first login)
7. Unmounts and saves the image
8. Rebuilds a dual-boot (BIOS + UEFI) ISO with `oscdimg`

### Using the Built ISO

**Virtual machine (recommended for testing):**
- **VirtualBox**: New VM → attach ISO as optical drive → boot
- **VMware Workstation**: New VM wizard → use ISO file
- **Hyper-V**: New VM → attach ISO in settings → start

**Physical machine:**
- Burn to DVD: right-click ISO → *Burn disc image*
- Write to USB: use [Rufus](https://rufus.ie) – select ISO, choose GPT/UEFI, write

After installation, Nightmare OS opens automatically in Microsoft Edge.  
Files are located at `C:\Windows\Web\NightmareOS\`.  
To launch manually, run `C:\Windows\Web\NightmareOS\Launch-NightmareOS.bat`.

### Licence Note

The embedded KMS client key in the generated `autounattend.xml` is a publicly-documented generic key that activates via an on-premises KMS server.  Replace it with your retail or volume license key before distribution.

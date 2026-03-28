# Windows PE Build Scripts

This directory contains scripts to build a bootable Windows 11 PE (Preinstallation Environment) with Nightmare OS.

## Files

### PowerShell Scripts

- **`Check-Prerequisites.ps1`** - Validates that all required software is installed
- **`Build-NightmareOS-PE.ps1`** - Main build script that creates the WinPE image
- **`Create-Bootable-USB.ps1`** - Writes the WinPE image to a USB drive

### Batch Files

- **`startnet.cmd`** - Startup script that runs when Windows PE boots (copied into PE image during build)

## Quick Usage

### 1. Check Prerequisites

Run first to ensure you have everything needed:

```powershell
.\winpe\Check-Prerequisites.ps1
```

This checks for:
- Administrator privileges
- Windows ADK installation
- Windows PE add-on
- Required tools (DISM, copype, MakeWinPEMedia)
- Disk space
- Source files

### 2. Build the Image

Creates the Windows PE working directory and customizes it:

```powershell
.\winpe\Build-NightmareOS-PE.ps1
```

Options:
- `-WorkDir` - Custom working directory (default: `C:\WinPE_NightmareOS`)
- `-Architecture` - Target architecture: `amd64` or `x86` (default: `amd64`)
- `-IncludePython` - Include Python placeholder (default: `$true`)
- `-IncludeEdge` - Include Edge placeholder (default: `$true`)

Example with custom options:
```powershell
.\winpe\Build-NightmareOS-PE.ps1 -WorkDir "D:\MyBuild" -Architecture amd64
```

### 3. Create Bootable USB

Writes the image to a USB drive (ERASES all data on the drive!):

```powershell
.\winpe\Create-Bootable-USB.ps1 -DriveLetter E:
```

Options:
- `-DriveLetter` - USB drive letter (required)
- `-WorkDir` - WinPE working directory (default: `C:\WinPE_NightmareOS`)
- `-Format` - Whether to format the drive (default: `$true`)

## Build Process Details

### What Build-NightmareOS-PE.ps1 Does

1. **Validates prerequisites** - Checks for ADK, tools, source files
2. **Creates WinPE directory** - Uses `copype.cmd` to create base structure
3. **Mounts boot image** - Mounts `boot.wim` for customization
4. **Adds packages** - Installs optional components:
   - WinPE-WMI (Windows Management Instrumentation)
   - WinPE-NetFx (.NET Framework)
   - WinPE-Scripting (Windows Script Host)
   - WinPE-PowerShell (PowerShell support)
   - WinPE-StorageWMI (Storage management)
   - WinPE-DismCmdlets (DISM PowerShell cmdlets)
5. **Copies Nightmare OS** - Copies all web files to `X:\NightmareOS\`
6. **Creates startup script** - Generates `startnet.cmd` in the image
7. **Configures settings** - Sets display resolution and other PE options
8. **Unmounts and commits** - Saves all changes to boot.wim

### What Create-Bootable-USB.ps1 Does

1. **Validates drive** - Checks USB drive exists and is accessible
2. **Confirms destructive operation** - Requires user to type "YES"
3. **Runs MakeWinPEMedia** - Uses ADK tool to create bootable USB
4. **Verifies contents** - Checks that boot files were written correctly

### What startnet.cmd Does (On Boot)

1. **Runs wpeinit** - Initializes Windows PE environment
2. **Shows banner** - Displays Nightmare OS ASCII art
3. **Initializes network** - Runs `wpeutil InitializeNetwork`
4. **Starts web server** - Launches Python HTTP server on port 8080
5. **Launches browser** - Opens Microsoft Edge in kiosk mode
6. **Opens command prompt** - Provides access to command line

## Directory Structure After Build

```
C:\WinPE_NightmareOS\
├── media\                      # Bootable media files
│   ├── Boot\                   # Boot files
│   │   ├── BCD                 # Boot Configuration Data
│   │   ├── boot.sdi            # Boot SDI file
│   │   └── ...
│   ├── EFI\                    # UEFI boot files
│   ├── sources\
│   │   └── boot.wim            # Main WinPE image (customized)
│   ├── bootmgr                 # Legacy BIOS boot manager
│   └── bootmgr.efi             # UEFI boot manager
├── mount\                      # Mount point (empty after unmount)
└── fwfiles\                    # Firmware files

Inside boot.wim (when mounted):
X:\
├── Windows\                    # Windows PE system
│   └── System32\
│       └── startnet.cmd        # Auto-start script (our custom version)
├── NightmareOS\                # Our web desktop
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── css\
│   ├── js\
│   └── icons\
└── Python\                     # Optional embedded Python
```

## Customization

### Modify Boot Behavior

Edit `startnet.cmd` before running the build script to customize:
- Boot messages
- Web server configuration
- Browser launch parameters
- Network initialization
- Startup applications

### Add Additional Files

To include additional files in the PE environment, modify `Build-NightmareOS-PE.ps1`:

```powershell
# Add after the "Copy Nightmare OS files" section
Copy-Item -Path "C:\MyTools" -Destination "$mountDir\MyTools" -Recurse -Force
```

### Change Display Resolution

Edit the unattend.xml section in `Build-NightmareOS-PE.ps1`:

```xml
<Display>
    <ColorDepth>32</ColorDepth>
    <HorizontalResolution>1920</HorizontalResolution>  <!-- Change this -->
    <VerticalResolution>1080</VerticalResolution>      <!-- Change this -->
</Display>
```

### Add Drivers

To add additional drivers:

```powershell
# Add after mounting the image
Dism /Add-Driver /Image:"$mountDir" /Driver:"C:\Drivers\MyDriver.inf"
```

## Troubleshooting

### Build Errors

**"Windows ADK not found"**
- Install Windows ADK for Windows 11
- Ensure Windows PE add-on is installed

**"Failed to mount boot image"**
- Close all File Explorer windows
- Check no other processes are accessing the working directory
- Restart and try again

**"Access Denied"**
- Run PowerShell as Administrator
- Disable antivirus temporarily during build

### USB Creation Errors

**"Drive not found"**
- Ensure USB is inserted
- Check drive letter with `Get-Volume`

**"MakeWinPEMedia failed"**
- Ensure USB is not write-protected
- Try different USB port
- Format USB drive manually first

### Boot Errors

**USB doesn't boot**
- Disable Secure Boot in BIOS
- Enable USB boot in BIOS
- Try Legacy BIOS mode if UEFI fails

**Stops at command prompt**
- Check if browser launched (Alt+Tab)
- Manually run: `cd X:\NightmareOS && start msedge http://localhost:8080/index.html`

## System Requirements

### Build System
- Windows 11 (any edition)
- 8 GB RAM minimum
- 20 GB free disk space
- Administrator access
- Windows ADK installed

### Target System (Boot From USB)
- x64 processor (64-bit)
- 2 GB RAM minimum (4 GB recommended)
- UEFI or Legacy BIOS
- Secure Boot disabled

## Performance Tips

1. **Use SSD** for build directory (faster DISM operations)
2. **Close other applications** during build (reduces memory pressure)
3. **Use USB 3.0 drive** for better boot performance
4. **Exclude from antivirus** to speed up file operations

## Security Notes

- Windows PE boots with Administrator privileges
- No user authentication by default
- Network access is unrestricted
- Consider adding authentication for sensitive environments
- All data stored in RAM (no disk traces after reboot)

## Clean Up

To remove the build directory after creating your USB:

```powershell
Remove-Item -Path "C:\WinPE_NightmareOS" -Recurse -Force
```

Warning: Only do this after successfully creating your bootable USB!

## Getting Help

### Script Help
```powershell
Get-Help .\winpe\Check-Prerequisites.ps1 -Full
Get-Help .\winpe\Build-NightmareOS-PE.ps1 -Full
Get-Help .\winpe\Create-Bootable-USB.ps1 -Full
```

### Documentation
- Quick Start: `../QUICKSTART_WINPE.md`
- Full Guide: `../BUILD_WINPE.md`
- Main README: `../README.md`

### Windows PE Documentation
- Microsoft Docs: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/winpe-intro
- DISM Reference: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/dism-reference

## Version Information

These scripts are designed for:
- Windows 11
- Windows ADK for Windows 11
- Windows PE based on Windows 11

For older versions of Windows, modifications may be required.

## License

These build scripts are part of the Nightmare OS project and are licensed under the MIT License.

Windows ADK and Windows PE are proprietary Microsoft software subject to Microsoft's licensing terms.

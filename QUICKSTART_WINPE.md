# Nightmare OS - Windows PE Edition
# Quick Start Guide

This guide will help you create a bootable USB drive with Nightmare OS running on Windows 11 PE.

## What You'll Need

1. A Windows 11 computer (for building)
2. Windows ADK for Windows 11 (free from Microsoft)
3. USB flash drive (16 GB or larger)
4. Administrator access
5. About 30-60 minutes

## Quick Start (3 Steps)

### Step 1: Install Windows ADK

1. Download Windows ADK for Windows 11:
   https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install

2. Run installer and select:
   - ✓ Deployment Tools
   - ✓ Windows Preinstallation Environment

### Step 2: Build the Image

1. Open PowerShell as Administrator
2. Navigate to this repository:
   ```powershell
   cd C:\path\to\PC-operating-system
   ```

3. Run the build script:
   ```powershell
   .\winpe\Build-NightmareOS-PE.ps1
   ```

4. Wait for build to complete (10-20 minutes)

### Step 3: Create Bootable Media

**Option A: Bootable USB**

1. Insert USB drive (will be erased!)
2. Note the drive letter (e.g., E:)
3. Run USB creation script:
   ```powershell
   .\winpe\Create-Bootable-USB.ps1 -DriveLetter E:
   ```

4. Wait for completion (5-10 minutes)
5. Safely eject USB drive

**Option B: Bootable ISO**

1. Build with ISO creation enabled:
   ```powershell
   .\winpe\Build-NightmareOS-PE.ps1 -CreateISO $true
   ```

2. Or create ISO from existing build:
   ```powershell
   .\winpe\Create-ISO.ps1
   ```

3. ISO file created at: `C:\WinPE_NightmareOS\NightmareOS-PE.iso`
4. Burn to DVD or use with virtual machines

## Booting from USB

1. Insert USB into target computer
2. Enter BIOS/UEFI (usually F2, F12, Del, or Esc during boot)
3. Disable Secure Boot (if enabled)
4. Set USB as first boot device
5. Save and exit
6. Computer boots into Nightmare OS automatically!

## Booting from ISO

**In Virtual Machine:**
1. Create new VM (VirtualBox, VMware, Hyper-V)
2. Mount ISO as optical drive
3. Start VM
4. Nightmare OS boots automatically

**On Physical Machine:**
1. Burn ISO to DVD using Windows built-in burner
2. Or create USB from ISO using Rufus
3. Boot from DVD/USB
4. Nightmare OS starts automatically

## What Happens on Boot

1. Windows PE boots from USB (10-30 seconds)
2. Network initializes automatically
3. Python web server starts on localhost:8080
4. Microsoft Edge opens in fullscreen kiosk mode
5. Nightmare OS desktop loads
6. You can start using all apps!

## Important Limitations

⚠ **Persistence (Optional)**: By default, everything is stored in RAM
   - Changes are lost when you reboot
   - Files you create are temporary
   - Settings don't save between boots
   - **Enable persistence**: Create a second NTFS partition on your USB labelled `NightmareOS-Data` — Edge profile (localStorage, history, notes) will be stored there automatically

⚠ **No automatic reboot timer** — sessions run indefinitely

⚠ **RAM Usage**: Runs entirely in RAM
   - Minimum: 2 GB RAM
   - Recommended: 4 GB RAM or more

⚠ **Limited Drivers**: Only basic hardware support
   - Modern network cards usually work
   - Some WiFi adapters may not work
   - Bluetooth typically not available

## Troubleshooting

### Boot Problems

**USB doesn't boot:**
- Disable Secure Boot in BIOS
- Try USB 2.0 port instead of USB 3.0
- Ensure USB boot is enabled in BIOS
- Verify boot order in BIOS

**Stops at command prompt:**
- Check if browser launched with Alt+Tab
- Manually start browser: `start msedge http://localhost:8080/index.html`

### Desktop Problems

**Nightmare OS doesn't load:**
- Press Alt+Tab to switch to browser window
- Check web server is running: `netstat -an | find "8080"`
- Manually open browser and go to http://localhost:8080

**Browser shows error:**
- Check files are at X:\NightmareOS\
- Restart web server:
  ```
  taskkill /F /IM python.exe
  cd X:\NightmareOS
  python -m http.server 8080
  ```

### Network Problems

**No network connection:**
- Check drivers loaded: `ipconfig /all`
- Initialize network: `wpeutil InitializeNetwork`
- Connect ethernet cable (WiFi may not work)

## Advanced Usage

### Access Command Prompt

- Press Ctrl+Alt+Del
- Open Task Manager
- File → Run new task → cmd.exe

### Manual Browser Launch

If browser doesn't auto-start:
```cmd
cd X:\NightmareOS
start msedge --kiosk http://localhost:8080/index.html --edge-kiosk-type=fullscreen
```

### Check System Status

```cmd
REM View running processes
tasklist

REM Check network
ipconfig /all
ping google.com

REM Check web server
netstat -an | find "8080"

REM View memory usage
wmic OS get FreePhysicalMemory,TotalVisibleMemorySize

REM Check disk usage (RAM disk)
dir X:\ /s
```

### Copy Files to USB

While in Windows PE, you can copy files to/from the USB:
```cmd
REM USB drive is usually D: or E:
dir D:\
copy X:\NightmareOS\somefile.txt D:\backup\
```

## Customization

### Change Startup Behavior

Edit `winpe\startnet.cmd` before building:
- Modify boot messages
- Change browser launch parameters
- Add additional startup scripts
- Configure network settings

### Add Applications

To include additional Windows applications:
1. Copy .exe files to `C:\WinPE_NightmareOS\mount\Windows\System32\`
2. Update startnet.cmd to launch them
3. Rebuild the image

### Include Python

To embed Python in the image:
1. Download Python embeddable package from python.org
2. Extract to `C:\WinPE_NightmareOS\mount\Python\`
3. Rebuild the image

## File Sizes

Expected file sizes:
- Build working directory: ~3 GB
- Boot.wim file: ~300-500 MB
- USB drive space used: ~500-800 MB
- RAM usage when running: ~1-2 GB

## System Requirements

### Build Computer (Windows 11)
- OS: Windows 11 (any edition)
- RAM: 8 GB minimum
- Disk: 20 GB free space
- Administrator privileges

### Target Computer (Any PC)
- RAM: 2 GB minimum, 4 GB recommended
- CPU: x64 processor (64-bit)
- BIOS: UEFI or Legacy BIOS
- Secure Boot: Must be disabled

## Getting Help

### Build Script Help
```powershell
Get-Help .\winpe\Build-NightmareOS-PE.ps1 -Detailed
Get-Help .\winpe\Create-Bootable-USB.ps1 -Detailed
```

### Common Issues

1. **"Access Denied" error**
   - Run PowerShell as Administrator

2. **"Windows ADK not found"**
   - Install Windows ADK with Windows PE add-on

3. **Build fails to mount image**
   - Close any open File Explorer windows
   - Restart and try again

4. **USB creation fails**
   - Use diskpart to clean the USB drive
   - Ensure USB is not write-protected

5. **Takes very long to boot**
   - Normal on first boot (drivers loading)
   - Subsequent boots are faster

## What's Included

Your bootable USB contains:
✓ Windows PE kernel and drivers
✓ Nightmare OS web desktop (all 30+ apps)
✓ Python HTTP server (if included)
✓ Microsoft Edge browser
✓ Basic networking support
✓ Command prompt access
✓ Task Manager

## Security Notes

- Windows PE boots with Administrator privileges
- No user authentication by default
- Network access is unrestricted
- Consider adding password protection for sensitive environments
- All data is in RAM (no disk traces after reboot)

## Performance Tips

1. **Use USB 3.0 drive** for faster file access
2. **Allocate more RAM** if available (PE uses what's available)
3. **Use wired ethernet** for better network performance
4. **Close unused apps** in Nightmare OS to save RAM
5. **Avoid resource-intensive apps** (games, matrix rain) if low on RAM

## Next Steps

After creating your bootable USB:
1. Test it on the build computer first
2. Verify all apps work correctly
3. Check network connectivity
4. Deploy to target computers

## For More Information

- Full build documentation: `BUILD_WINPE.md`
- Nightmare OS features: `README.md`
- Windows PE documentation: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/winpe-intro

---

**Created by Nightmare Designs**
**License: MIT**

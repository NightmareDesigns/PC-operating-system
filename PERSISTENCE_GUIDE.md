# Nightmare OS - Persistence Setup Guide

This guide explains how to enable data persistence in Windows PE edition so your settings, bookmarks, todos, and other data survive reboots.

## How Persistence Works

By default, Windows PE stores everything in RAM, which is lost on reboot. To enable persistence, we use a **second partition** on the USB drive to store data.

### Architecture

```
USB Drive Structure:
├── Partition 1 (C: in PE / Windows PE System)
│   ├── bootmgr (Boot files)
│   ├── sources/boot.wim (PE image with Nightmare OS)
│   └── EFI/ (UEFI boot files)
└── Partition 2 (D: in PE / Data Partition - NEW!)
    └── NightmareOS-Data/
        ├── persistence-check.txt
        └── Saved data from IndexedDB
```

## Quick Setup

### Option 1: Automatic (During USB Creation)

1. Use the updated `Create-Bootable-USB.ps1` script with persistence option:
   ```powershell
   .\winpe\Create-Bootable-USB.ps1 -DriveLetter E: -EnablePersistence
   ```

2. This will create a second partition (8 GB) for data storage

3. Boot from USB - persistence is automatic!

### Option 2: Manual (Add to Existing USB)

If you already have a Nightmare OS USB drive, you can add persistence:

#### Step 1: Shrink the First Partition

1. Insert USB drive (e.g., E:)
2. Open Disk Management (diskmgmt.msc)
3. Right-click the USB drive partition → Shrink Volume
4. Enter shrink amount: 8192 MB (8 GB for data)
5. Click Shrink

#### Step 2: Create Data Partition

1. Right-click the new unallocated space → New Simple Volume
2. Next → Next (use maximum size)
3. Assign drive letter: Choose any (will be D: in Windows PE)
4. Format as NTFS
5. Volume label: "NightmareOS-Data"
6. Finish

#### Step 3: Create Marker File

1. Open the new data partition
2. Create a folder: `NightmareOS-Data`
3. Inside that folder, create a text file: `persistence-check.txt`
4. Add this content:
   ```
   Nightmare OS Persistence Storage
   This partition is used to store data across reboots.
   Do not delete this file.
   ```

#### Step 4: Test

1. Boot from USB
2. Look for message: `[+] Persistence enabled - data will survive reboots`
3. If you see this, persistence is working!

## What Gets Persisted

When persistence is enabled, these items survive reboots:

✅ **Settings** - Wallpaper, theme, accent color, volume
✅ **Browser Data** - Bookmarks and browsing history
✅ **Sticky Notes** - All your notes
✅ **Calendar Events** - Your schedule
✅ **Todo Items** - Task lists
✅ **Terminal History** - Command history
✅ **Userscripts** - Custom scripts
✅ **Saved Colors** - Color picker palette
✅ **Habit Tracker** - Your habits and streaks
✅ **Firefox History** - Browser history

## Technical Details

### Persistence Layer

Nightmare OS uses a **dual-persistence strategy**:

1. **IndexedDB** (Primary)
   - Browser's IndexedDB for structured data storage
   - Survives browser restarts within same PE session
   - Auto-syncs every 30 seconds
   - Data saved on page unload

2. **File System** (Secondary/Planned)
   - Direct file I/O to D:\NightmareOS-Data
   - Requires specific browser permissions
   - Manual export/import available

### How Data is Stored

```javascript
// Storage structure
IndexedDB Database: 'NightmareOS_Persistence'
└── Object Store: 'persistence'
    ├── key: 'nightos_settings'
    ├── key: 'nightmareos_bookmarks'
    ├── key: 'nightmareos_todos'
    └── ... (all localStorage keys)
```

### Auto-Sync Behavior

- **Interval**: Every 30 seconds
- **Trigger**: On localStorage changes
- **Final Save**: On browser close/page unload
- **Restore**: On page load/boot

## Manual Backup/Restore

Even with persistence enabled, you can manually export/import data:

### Export Data

1. Open Browser Console (F12)
2. Run:
   ```javascript
   window.exportPersistenceData()
   ```
3. Save the JSON file to a safe location

### Import Data

1. Open Browser Console (F12)
2. Run:
   ```javascript
   window.importPersistenceData()
   ```
3. Select your backup JSON file
4. Page will reload with imported data

## Troubleshooting

### "No data partition found" message

**Problem**: PE can't find the second partition

**Solutions**:
1. Check Disk Management - ensure D: drive exists
2. Verify partition is formatted as NTFS
3. Check that `D:\NightmareOS-Data\persistence-check.txt` exists
4. Try different drive letter in Disk Management

### Data not persisting between reboots

**Problem**: Settings reset after reboot

**Check**:
1. Boot message shows "Persistence ENABLED"?
2. Open File Explorer in PE - can you see D: drive?
3. Check D:\NightmareOS-Data folder exists
4. Look for browser errors in Console (F12)

**Solutions**:
- Ensure IndexedDB is not in private/incognito mode
- Check Edge is not launched with `--inprivate` flag
- Verify browser has write permissions to IndexedDB
- Try manual export before reboot

### Browser shows "Persistence not available"

**Problem**: Console shows persistence unavailable

**This is normal if**:
- No second partition exists (RAM-only mode)
- Running in standard web browser (not Windows PE)

**To fix**:
- Follow setup steps above to create data partition
- Reboot from USB

### Partition not detected

**Problem**: D: drive exists but PE shows "No data partition found"

**Solutions**:
1. Rename partition label to "NightmareOS-Data"
2. Create the marker file: `D:\NightmareOS-Data\persistence-check.txt`
3. Check partition is not hidden or encrypted
4. Try formatting as NTFS (not FAT32)

## Advanced Configuration

### Change Data Partition Path

Edit `js/persistence.js`:

```javascript
const PERSISTENCE_CONFIG = {
  dataPartitionPath: 'E:/MyData', // Change path
  // ...
};
```

Then rebuild the PE image.

### Change Sync Interval

Edit `js/persistence.js`:

```javascript
const PERSISTENCE_CONFIG = {
  syncInterval: 60000, // Change to 60 seconds
  // ...
};
```

### Add Custom Storage Keys

Edit `js/persistence.js`:

```javascript
const PERSISTENCE_CONFIG = {
  storageKeys: [
    'nightos_settings',
    // ... existing keys ...
    'my_custom_key' // Add your key
  ]
};
```

## Performance Impact

Persistence has minimal performance impact:

- **Storage**: Uses ~1-5 MB typically, max ~50 MB
- **CPU**: Near-zero (async operations)
- **Sync Time**: ~10-50ms per sync operation
- **Boot Time**: +0.5-1 second for data restore

## Limitations

⚠️ **Windows PE Limitations Still Apply**:
- No Windows Update
- Limited driver support
- RAM-based system files

⚠️ **Persistence Limitations**:
- IndexedDB has browser quotas (~50-100 MB typically)
- File I/O requires Edge permissions
- Data partition must be on same USB drive
- No real-time cloud sync (offline only)

## Security Notes

- Data stored in **plaintext** on D: partition
- No encryption by default
- Anyone with USB access can read data
- Consider encrypting sensitive information
- Use BitLocker on data partition for security

## Best Practices

1. ✅ **Regular Exports**: Manual backup weekly
2. ✅ **Test Persistence**: Verify after USB creation
3. ✅ **Partition Size**: Allocate 4-8 GB for data
4. ✅ **Safe Shutdown**: Use "Shutdown" not hard power off

## Comparison: With vs Without Persistence

| Feature | Without Persistence | With Persistence |
|---------|-------------------|------------------|
| **Storage Location** | RAM only | RAM + USB partition |
| **Data Survival** | Lost on reboot | Survives reboots |
| **Setup Complexity** | None (default) | Medium (create partition) |
| **USB Structure** | Single partition | Dual partition |
| **Performance** | Fastest | Very fast (minimal overhead) |
| **Use Case** | Temporary use, demos | Daily driver, portable workstation |

## Examples

### Scenario 1: Portable Workstation

You use Nightmare OS PE as your daily portable OS:

1. Create USB with persistence
2. Set up your preferences, install userscripts
3. Add bookmarks, create todos
4. Shut down computer
5. **Boot another computer** - all your data is there!

### Scenario 2: System Recovery Tool

You use it for troubleshooting broken computers:

1. Create USB without persistence (RAM-only)
2. Boot any computer
3. Use tools, browse web, take notes
4. Reboot - no traces left
5. Privacy preserved

### Scenario 3: School/Work Environment

Multiple people share one USB:

1. Create USB with persistence
2. Use "Clear All Data" in Settings before handing off
3. Next person gets clean slate
4. Or: export personal data, wipe, import when you get USB back

## Future Enhancements

Planned features for persistence:

- 🔄 Cloud sync (Google Drive, Dropbox)
- 🔐 Data encryption
- 📊 Storage usage dashboard
- ⚡ Faster sync algorithms
- 🌐 Network storage support
- 💾 Differential backups

## Support

For persistence issues:
- Check console logs (F12 → Console)
- Look for `[Persistence]` messages
- Check startnet.cmd output
- Verify D: drive in File Explorer

---

**Questions?** Open an issue on GitHub with:
- Console logs
- Boot messages
- Disk Management screenshot
- Steps to reproduce

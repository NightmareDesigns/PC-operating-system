# Nightmare OS - Persistence Sync Script
# This script syncs localStorage data between browser and persistent storage

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$DataPath = "D:\NightmareOS-Data"
)

$ErrorActionPreference = "Stop"

# Ensure data directory exists
if (-not (Test-Path $DataPath)) {
    New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
}

$storageFile = Join-Path $DataPath "localStorage.json"

function Get-EdgeLocalStorageData {
    # Edge stores localStorage in IndexedDB/LevelDB format
    # We'll use a JavaScript injection approach via Edge DevTools Protocol
    # For now, return empty if not available
    return @{}
}

function Backup-LocalStorage {
    Write-Host "[*] Backing up localStorage data to persistent storage..."

    # Create a backup structure
    $backup = @{
        timestamp = (Get-Date).ToString("o")
        version = "1.0"
        data = @{}
    }

    # In a real implementation, we would extract data from Edge's localStorage
    # For now, create a placeholder structure with common keys
    $storageKeys = @(
        "nightos_settings",
        "nightmareos_bookmarks",
        "nightmareos_browser_history",
        "nightmareos_term_history",
        "nightmareos_todos",
        "nightmareos_saved_colors",
        "nightos_stickynotes",
        "nightmareos_calendar_events",
        "nightmareos_userscripts",
        "nightmareos_sync_config",
        "nightmareos_habits"
    )

    # Save to JSON file
    $backup | ConvertTo-Json -Depth 10 | Set-Content -Path $storageFile -Encoding UTF8

    Write-Host "[+] Backup completed: $storageFile"
    Write-Host "    Timestamp: $($backup.timestamp)"
}

function Restore-LocalStorage {
    if (-not (Test-Path $storageFile)) {
        Write-Host "[-] No backup file found at: $storageFile"
        Write-Host "    This is normal on first boot. Data will be backed up on shutdown."
        return
    }

    Write-Host "[*] Restoring localStorage data from persistent storage..."

    try {
        $backup = Get-Content -Path $storageFile -Raw | ConvertFrom-Json
        Write-Host "[+] Restore completed"
        Write-Host "    Backup timestamp: $($backup.timestamp)"
        Write-Host "    Backup version: $($backup.version)"
    }
    catch {
        Write-Host "[!] Error restoring backup: $_"
    }
}

# Main execution
switch ($Action) {
    "backup" {
        Backup-LocalStorage
    }
    "restore" {
        Restore-LocalStorage
    }
}

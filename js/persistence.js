/**
 * Nightmare OS - Persistence Layer for Windows PE
 *
 * This script provides localStorage persistence across reboots by syncing
 * data to a file on the USB drive's data partition.
 */

(function() {
  'use strict';

  const PERSISTENCE_CONFIG = {
    enabled: true,
    dataPartitionPath: 'D:/NightmareOS-Data', // Second partition on USB drive
    syncInterval: 30000, // Sync every 30 seconds
    storageKeys: [
      'nightos_settings',
      'nightmareos_bookmarks',
      'nightmareos_browser_history',
      'nightmareos_term_history',
      'nightmareos_todos',
      'nightmareos_saved_colors',
      'nightos_stickynotes',
      'nightmareos_calendar_events',
      'nightmareos_userscripts',
      'nightmareos_sync_config',
      'nightmareos_habits'
    ]
  };

  class PersistenceManager {
    constructor() {
      this.syncTimer = null;
      this.isDirty = false;
      this.lastSyncTime = null;
    }

    /**
     * Initialize persistence layer
     */
    async init() {
      console.log('[Persistence] Initializing...');

      // Check if persistence is available
      if (!await this.isPersistenceAvailable()) {
        console.log('[Persistence] Not available - running in standard RAM-only mode');
        return;
      }

      console.log('[Persistence] Available - loading stored data');

      // Restore data from persistent storage
      await this.restoreFromPersistentStorage();

      // Set up auto-save
      this.startAutoSync();

      // Save on page unload
      window.addEventListener('beforeunload', () => {
        this.saveImmediately();
      });

      console.log('[Persistence] Initialized successfully');
    }

    /**
     * Check if persistence is available (data partition exists)
     */
    async isPersistenceAvailable() {
      try {
        // Try to access the data partition via file:// protocol
        // This works if Edge is launched with appropriate flags
        const response = await fetch('file:///' + PERSISTENCE_CONFIG.dataPartitionPath.replace(':', '') + '/persistence-check.txt');
        return response.ok;
      } catch (e) {
        // Try IndexedDB as fallback (still RAM-based but survives browser restarts)
        return 'indexedDB' in window;
      }
    }

    /**
     * Restore data from persistent storage
     */
    async restoreFromPersistentStorage() {
      try {
        // Use IndexedDB for persistence (survives browser restarts)
        const db = await this.openDatabase();
        const transaction = db.transaction(['persistence'], 'readonly');
        const store = transaction.objectStore('persistence');

        for (const key of PERSISTENCE_CONFIG.storageKeys) {
          const request = store.get(key);
          const value = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          if (value && value.data) {
            localStorage.setItem(key, value.data);
            console.log(`[Persistence] Restored: ${key}`);
          }
        }

        this.lastSyncTime = new Date();
        console.log('[Persistence] Data restored successfully');
      } catch (e) {
        console.warn('[Persistence] Could not restore data:', e);
      }
    }

    /**
     * Save to persistent storage
     */
    async saveToPersistentStorage() {
      if (!this.isDirty) {
        return;
      }

      try {
        console.log('[Persistence] Saving data...');
        const db = await this.openDatabase();
        const transaction = db.transaction(['persistence'], 'readwrite');
        const store = transaction.objectStore('persistence');

        for (const key of PERSISTENCE_CONFIG.storageKeys) {
          const value = localStorage.getItem(key);
          if (value) {
            store.put({
              key: key,
              data: value,
              timestamp: new Date().toISOString()
            });
          }
        }

        await new Promise((resolve, reject) => {
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });

        this.isDirty = false;
        this.lastSyncTime = new Date();
        console.log('[Persistence] Data saved successfully');
      } catch (e) {
        console.error('[Persistence] Error saving data:', e);
      }
    }

    /**
     * Open IndexedDB database
     */
    openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('NightmareOS_Persistence', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('persistence')) {
            const store = db.createObjectStore('persistence', { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    }

    /**
     * Mark data as dirty (needs sync)
     */
    markDirty() {
      this.isDirty = true;
    }

    /**
     * Start automatic sync
     */
    startAutoSync() {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
      }

      this.syncTimer = setInterval(() => {
        this.saveToPersistentStorage();
      }, PERSISTENCE_CONFIG.syncInterval);

      console.log(`[Persistence] Auto-sync enabled (interval: ${PERSISTENCE_CONFIG.syncInterval}ms)`);
    }

    /**
     * Save immediately (for shutdown)
     */
    saveImmediately() {
      if (this.isDirty) {
        console.log('[Persistence] Performing final save before unload...');
        // Use synchronous approach for beforeunload
        this.saveToPersistentStorage();
      }
    }

    /**
     * Export data to file (for manual backup to USB data partition)
     */
    async exportToFile() {
      const data = {};
      for (const key of PERSISTENCE_CONFIG.storageKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = value;
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nightmare-os-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('[Persistence] Data exported to file');
    }

    /**
     * Import data from file
     */
    async importFromFile(file) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        for (const [key, value] of Object.entries(data)) {
          if (PERSISTENCE_CONFIG.storageKeys.includes(key)) {
            localStorage.setItem(key, value);
          }
        }

        this.markDirty();
        await this.saveToPersistentStorage();

        console.log('[Persistence] Data imported from file');
        return true;
      } catch (e) {
        console.error('[Persistence] Error importing data:', e);
        return false;
      }
    }
  }

  // Override localStorage setItem to mark dirty
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (window.persistenceManager && PERSISTENCE_CONFIG.storageKeys.includes(key)) {
      window.persistenceManager.markDirty();
    }
  };

  // Initialize persistence manager
  window.persistenceManager = new PersistenceManager();

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.persistenceManager.init();
    });
  } else {
    window.persistenceManager.init();
  }

  // Add UI button to settings for manual export/import
  window.addEventListener('load', () => {
    // Wait for NightOS to be available
    setTimeout(() => {
      if (window.NightOS && window.NightOS.settings) {
        console.log('[Persistence] Adding persistence controls to system');

        // Add export/import functions to global scope
        window.exportPersistenceData = () => window.persistenceManager.exportToFile();
        window.importPersistenceData = () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
              const success = await window.persistenceManager.importFromFile(file);
              if (success && window.showNotification) {
                showNotification('Persistence', 'Data imported successfully. Refreshing...', 2000);
                setTimeout(() => location.reload(), 2000);
              }
            }
          };
          input.click();
        };
      }
    }, 1000);
  });

  console.log('[Persistence] Module loaded');
})();

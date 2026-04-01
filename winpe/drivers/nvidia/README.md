# Nvidia GPU Drivers for WinPE (RTX 3060 Ti / Ampere)

Place Nvidia driver files here so `Build-NightmareOS-PE.ps1` can inject them into the
WinPE image via DISM. This enables hardware-accelerated rendering in Edge and prevents
black-screen issues on Nvidia Ampere-architecture GPUs (RTX 30-series, including the RTX 3060 Ti).

## How to obtain the driver files

1. Go to <https://www.nvidia.com/Download/index.aspx> and download the **Game Ready** or
   **Studio DCH** driver for your GPU (select **Windows 11 64-bit**).
2. Run the installer — when it asks where to extract, note the path
   (typically `C:\NVIDIA\DisplayDriver\<version>\Win11_Win10-DCH_64\`).
   You can also cancel after extraction and collect the files from there,
   or use [7-Zip](https://www.7-zip.org/) to extract the `.exe` directly.
3. Copy the **`Display.Driver`** sub-folder from the extracted package into this directory:

```
winpe/drivers/nvidia/
└── Display.Driver/
    ├── nv_dispi.inf       ← primary INF for display driver
    ├── nvd3dum.dll
    ├── nvwgf2um.dll
    └── ... (other .dll, .sys, .cat files)
```

> You only need `Display.Driver`. Other sub-folders (PhysX, audio, etc.) are not
> required for WinPE display support and will increase build time if included.

## What the build script does

`Build-NightmareOS-PE.ps1` runs:

```powershell
Dism /Add-Driver /Image:"$mountDir" /Driver:"<this folder>" /Recurse /ForceUnsigned
```

This injects the INF-based driver into the WinPE boot image so the RTX 3060 Ti (and
other Ampere GPUs) initialise correctly during PE boot.

## Without injected drivers

If this directory is empty or absent the build script will warn and continue. The WinPE
image will fall back to the Microsoft Basic Display Adapter (VESA VGA). The OS will still
run, but:

- Display resolution may be limited to 1024×768 or 800×600.
- Edge GPU acceleration will be disabled (software rendering fallback).
- On some RTX 30-series systems the screen may remain black until the driver is loaded.

## Test stub (pipeline validation)

A minimal stub INF is included in the `test/` sub-folder:

```
winpe/drivers/nvidia/
├── README.md               ← this file
└── test/
    └── nvtestdisplay.inf   ← test stub (no binaries, no kernel service)
```

`Build-NightmareOS-PE.ps1` uses `Dism /Add-Driver /Recurse`, so it finds the stub
automatically.  The stub declares the RTX 3060 Ti hardware ID
(`PCI\VEN_10DE&DEV_2489`) but performs **no CopyFiles and installs no kernel
service**, so DISM can parse and stage it without any `.sys` or `.dll` files
being present.  This lets CI verify the full driver-injection code path without
requiring proprietary Nvidia binaries.

On real hardware the stub acts as a null match — the display stays on the
Microsoft Basic Display Adapter until a full Nvidia DCH package is placed
alongside it (see above).

## Ventoy and UEFI note

Driver injection is independent of the boot method. Whether you boot the ISO directly from
UEFI, from Ventoy, or from a Rufus-created USB, the injected drivers are part of the WinPE
image (`boot.wim`) and load automatically.

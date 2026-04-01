#!/usr/bin/env bash
# =============================================================================
# Create-USB-Image.sh
#
# Creates a bootable USB disk image from NightmareOS-PE.iso using
# Nightmare Loader (https://github.com/NightmareDesigns/Nightmare-loader).
#
# The output is a raw .img file that can be:
#   - Flashed to a USB drive with dd (Linux/macOS)
#   - Written with Rufus or Balena Etcher (Windows / cross-platform)
#   - Used as a virtual disk in QEMU/VirtualBox for testing
#
# USAGE
#   sudo ./Create-USB-Image.sh [ISO_PATH] [OUTPUT_IMG]
#
# EXAMPLES
#   sudo ./winpe/Create-USB-Image.sh NightmareOS-PE.iso NightmareOS-USB.img
#   sudo ./winpe/Create-USB-Image.sh              # uses defaults
#
# DEPENDENCIES (install on Debian/Ubuntu)
#   sudo apt install grub2-common grub-pc-bin grub-efi-amd64-bin parted dosfstools
#   pip install nightmare-loader
# =============================================================================

set -euo pipefail

ISO_PATH="${1:-NightmareOS-PE.iso}"
OUT_IMG="${2:-NightmareOS-USB.img}"

LOOP_DEV=""

# ── helpers ──────────────────────────────────────────────────────────────────
log()  { echo "==> $*"; }
ok()   { echo "✓  $*"; }
warn() { echo "⚠  $*" >&2; }
die()  { echo "✗  $*" >&2; exit 1; }

cleanup() {
    if [[ -n "$LOOP_DEV" ]]; then
        log "Detaching loop device $LOOP_DEV ..."
        sudo losetup -d "$LOOP_DEV" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# ── pre-flight checks ─────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "This script must be run as root (sudo $0)"

[[ -f "$ISO_PATH" ]] || die "ISO not found: $ISO_PATH"

for cmd in nightmare-loader parted mkfs.fat grub-install losetup fallocate; do
    command -v "$cmd" &>/dev/null || die "Required command not found: $cmd
  Install with:
    sudo apt install grub2-common grub-pc-bin grub-efi-amd64-bin parted dosfstools
    pip install nightmare-loader"
done

# ── size calculation ──────────────────────────────────────────────────────────
ISO_SIZE_MB=$(du -m "$ISO_PATH" | cut -f1)
# Add 256 MB overhead: FAT32 filesystem, GRUB core/modules (~20 MB), EFI (~5 MB), headroom
IMG_SIZE_MB=$(( ISO_SIZE_MB + 256 ))

log "ISO          : $ISO_PATH  (${ISO_SIZE_MB} MB)"
log "Output image : $OUT_IMG   (${IMG_SIZE_MB} MB)"

# ── create raw image ──────────────────────────────────────────────────────────
log "Allocating ${IMG_SIZE_MB} MB image ..."
fallocate -l "${IMG_SIZE_MB}M" "$OUT_IMG"

# ── attach as loop device with partition scan ─────────────────────────────────
log "Setting up loop device ..."
LOOP_DEV=$(losetup --show -fP "$OUT_IMG")
ok "Loop device  : $LOOP_DEV"

# Give the kernel a moment to expose the partition nodes
sleep 1

# ── prepare drive (partition + GRUB BIOS + GRUB UEFI) ────────────────────────
log "Running nightmare-loader prepare on $LOOP_DEV ..."
nightmare-loader prepare "$LOOP_DEV" --yes

# ── add the NightmareOS ISO ───────────────────────────────────────────────────
log "Adding $ISO_PATH to image ..."
nightmare-loader add "$LOOP_DEV" "$ISO_PATH" --label "Nightmare OS"

# ── verify ────────────────────────────────────────────────────────────────────
log "Registered ISOs:"
nightmare-loader list "$LOOP_DEV"

# ── detach (also done by trap) ────────────────────────────────────────────────
log "Detaching loop device ..."
losetup -d "$LOOP_DEV"
LOOP_DEV=""  # prevent double-detach in trap

FINAL_SIZE_MB=$(du -m "$OUT_IMG" | cut -f1)
ok "USB image created: $OUT_IMG  (${FINAL_SIZE_MB} MB)"
echo ""
echo "Flash to USB (Linux):"
echo "  sudo dd if=\"$OUT_IMG\" of=/dev/sdX bs=4M status=progress && sync"
echo ""
echo "Flash to USB (Windows / cross-platform):"
echo "  Open NightmareOS-USB.img with Rufus or Balena Etcher"
echo ""
echo "Test in QEMU (UEFI):"
echo "  qemu-system-x86_64 -m 2G -bios /usr/share/ovmf/OVMF.fd -drive file=\"$OUT_IMG\",format=raw"

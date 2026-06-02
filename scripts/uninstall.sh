#!/usr/bin/env bash
# Sediman uninstaller
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[32m'
RED='\033[31m'
DIM='\033[2m'
RESET='\033[0m'

info()  { echo -e "  ${GREEN}+${RESET} $*"; }
warn()  { echo -e "  ${RED}!${RESET} $*"; }

TERMINATOR_BIN_DIR="$HOME/.terminator/bin"
TERMINATOR_DATA_DIR="$HOME/.terminator"
OLD_SEDIMAN_DATA_DIR="$HOME/.sediman"
REMOVE_DATA=false

for arg in "$@"; do
    case "$arg" in
        --remove-data) REMOVE_DATA=true ;;
        --help|-h)
            echo "Usage: bash uninstall.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --remove-data   Remove all Sediman data (skills, memory, sessions)"
            echo "  --help          Show this help"
            exit 0
            ;;
    esac
done

echo ""
echo -e "  ${BOLD}Sediman Uninstaller${RESET}"
echo ""

if command -v uv &>/dev/null; then
    info "Removing openskynet Python tool..."
    uv tool uninstall openskynet 2>/dev/null || true
fi

if [ -d "$TERMINATOR_BIN_DIR" ]; then
    info "Removing $TERMINATOR_BIN_DIR..."
    rm -rf "$TERMINATOR_BIN_DIR"
fi

if [ "$REMOVE_DATA" = "true" ]; then
    warn "Removing all data at $TERMINATOR_DATA_DIR..."
    rm -rf "$TERMINATOR_DATA_DIR"
    if [ -d "$OLD_SEDIMAN_DATA_DIR" ]; then
        warn "Removing legacy data at $OLD_SEDIMAN_DATA_DIR..."
        rm -rf "$OLD_SEDIMAN_DATA_DIR"
    fi
else
    info "Keeping data at $TERMINATOR_DATA_DIR (use --remove-data to delete)"
    if [ -d "$OLD_SEDIMAN_DATA_DIR" ]; then
        warn "Legacy data found at $OLD_SEDIMAN_DATA_DIR. Run with --remove-data to delete."
    fi
fi

for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$rc" ] && grep -qF ".terminator/bin" "$rc" 2>/dev/null; then
        info "Removing PATH entry from $rc..."
        sed -i.bak '/# Added by OpenSkynet installer/d' "$rc"
        sed -i.bak '/.terminator\/bin/d' "$rc"
        rm -f "${rc}.bak" 2>/dev/null || true
    fi
done

echo ""
echo -e "  ${BOLD}Sediman uninstalled.${RESET}"
echo ""

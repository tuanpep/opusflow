#!/bin/bash
set -euo pipefail

# Configuration
OWNER="tuanpep"
REPO="opusflow"
BINARY="opusflow"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}▶${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✖${NC} $1" >&2; exit 1; }

# Check required commands
for cmd in curl tar; do
    command -v "$cmd" >/dev/null 2>&1 || error "Required command not found: $cmd"
done

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux)  OS_TYPE="linux" ;;
    Darwin) OS_TYPE="darwin" ;;
    MINGW*|MSYS*|CYGWIN*) error "Windows detected. Please download from GitHub releases manually." ;;
    *) error "Unsupported OS: $OS" ;;
esac

# Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64|amd64) ARCH_TYPE="amd64" ;;
    arm64|aarch64) ARCH_TYPE="arm64" ;;
    *) error "Unsupported architecture: $ARCH" ;;
esac

info "Detected: $OS_TYPE/$ARCH_TYPE"

# Fetch latest CLI release (filter out vscode releases)
API_URL="https://api.github.com/repos/$OWNER/$REPO/releases"
info "Fetching latest CLI release..."

RELEASES_JSON=$(curl -fsSL "$API_URL" 2>/dev/null) || error "Failed to fetch release info. Check your internet connection."

# Find first release that starts with 'v' but not 'vscode-'
VERSION=$(echo "$RELEASES_JSON" | grep -oP '"tag_name":\s*"\Kv[0-9]+\.[0-9]+\.[0-9]+"' | tr -d '"' | head -1)
[ -z "$VERSION" ] && error "Could not find a CLI release. Check https://github.com/$OWNER/$REPO/releases"

info "Latest version: $VERSION"

# Build download URL (GoReleaser strips 'v' prefix from version in archive names)
CLEAN_VERSION="${VERSION#v}"
ASSET_NAME="${BINARY}_${CLEAN_VERSION}_${OS_TYPE}_${ARCH_TYPE}.tar.gz"
DOWNLOAD_URL="https://github.com/$OWNER/$REPO/releases/download/$VERSION/$ASSET_NAME"

# Download
info "Downloading $ASSET_NAME..."
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

HTTP_CODE=$(curl -sL -w "%{http_code}" "$DOWNLOAD_URL" -o "$TMP_DIR/$ASSET_NAME")
[ "$HTTP_CODE" != "200" ] && error "Download failed (HTTP $HTTP_CODE). Asset: $ASSET_NAME"

# Extract
info "Extracting..."
tar -xzf "$TMP_DIR/$ASSET_NAME" -C "$TMP_DIR" || error "Failed to extract archive"

[ -f "$TMP_DIR/$BINARY" ] || error "Binary not found in archive"

# Install
info "Installing to $INSTALL_DIR..."
if [ -w "$INSTALL_DIR" ]; then
    mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/"
else
    warn "Elevated permissions required for $INSTALL_DIR"
    sudo mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/"
fi

chmod +x "$INSTALL_DIR/$BINARY"

# Verify
if command -v "$BINARY" >/dev/null 2>&1; then
    echo ""
    info "Successfully installed $BINARY $VERSION"
    echo ""
    "$BINARY" --version
else
    warn "Installed but '$BINARY' not in PATH. Add $INSTALL_DIR to your PATH."
fi

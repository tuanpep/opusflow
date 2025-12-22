#!/bin/bash
set -e

OWNER="tuanpep"
REPO="opusflow"
BINARY="opusflow"
INSTALL_DIR="/usr/local/bin"

# Detect OS and Arch
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux)  OS_TYPE="linux" ;;
    Darwin) OS_TYPE="darwin" ;;
    *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
    x86_64) ARCH_TYPE="amd64" ;;
    arm64|aarch64)  ARCH_TYPE="arm64" ;;
    *) echo "Unsupported Arch: $ARCH"; exit 1 ;;
esac

echo "Detected $OS_TYPE $ARCH_TYPE"

# Find latest version using GitHub API
LATEST_URL="https://api.github.com/repos/$OWNER/$REPO/releases/latest"
echo "Fetching latest release from $LATEST_URL..."

# Verify release exists
RELEASE_JSON=$(curl -s $LATEST_URL)
if echo "$RELEASE_JSON" | grep -q "Not Found"; then
    echo "Error: Repository or Release not found at $OWNER/$REPO"
    exit 1
fi

# Extract version tag
VERSION=$(echo "$RELEASE_JSON" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
    echo "Error: Could not find latest version"
    exit 1
fi

echo "Latest version: $VERSION"

# Construct download URL (matching GoReleaser naming convention in .goreleaser.yaml)
# GoReleaser default strips 'v' from version in filenames
# Tag: v0.1.1 -> Version: 0.1.1
CLEAN_VERSION="${VERSION#v}"
ASSET_NAME="${BINARY}_${CLEAN_VERSION}_${OS_TYPE}_${ARCH_TYPE}.tar.gz"
DOWNLOAD_URL="https://github.com/$OWNER/$REPO/releases/download/$VERSION/$ASSET_NAME"

echo "Downloading $DOWNLOAD_URL..."
TMP_DIR=$(mktemp -d)
curl -sL "$DOWNLOAD_URL" -o "$TMP_DIR/$ASSET_NAME"

if [ ! -f "$TMP_DIR/$ASSET_NAME" ]; then
    echo "Error: Download failed or asset not found."
    exit 1
fi

echo "Extracting..."
tar -xzf "$TMP_DIR/$ASSET_NAME" -C "$TMP_DIR"

echo "Installing to $INSTALL_DIR..."
# Check if sudo is needed
if [ -w "$INSTALL_DIR" ]; then
    mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/"
else
    sudo mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/"
fi

# Cleanup
rm -rf "$TMP_DIR"

echo "Success! $BINARY installed to $INSTALL_DIR"
$BINARY --help

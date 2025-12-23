# OpusFlow

[![CLI Release](https://img.shields.io/github/v/release/tuanpep/opusflow?filter=v*&label=CLI)](https://github.com/tuanpep/opusflow/releases/latest)
[![VSCode Extension](https://img.shields.io/github/v/release/tuanpep/opusflow?filter=vscode-*&label=VSCode)](https://github.com/tuanpep/opusflow/releases?q=vscode)
[![Go Version](https://img.shields.io/github/go-mod/go-version/tuanpep/opusflow?filename=cli/go.mod)](https://go.dev/)

A spec-driven development tool to orchestrate coding agents.

## Installation

### Option 1: Go Install
```bash
go install github.com/tuanpep/oplusflow@latest
```

### Option 2: Download from Releases
Download the latest binary from [GitHub Releases](https://github.com/tuanpep/opusflow/releases/latest).

### Option 3: Build from Source
```bash
git clone https://github.com/tuanpep/opusflow.git
cd opusflow/cli
make build
```

## Usage

```bash
# Create a plan
opusflow plan "Add New Feature"

# Generate agent prompt
opusflow prompt plan plan-01-add-new-feature.md
```

## Components

- **[CLI](./cli)** - Command-line tool and MCP server
- **[VSCode Extension](./vscode-extension)** - IDE integration

## License

MIT

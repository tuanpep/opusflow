# OpusFlow

[![CLI Release](https://img.shields.io/github/v/release/tuanpep/opusflow?filter=v*&label=CLI)](https://github.com/tuanpep/opusflow/releases/latest)
[![VSCode Extension](https://img.shields.io/github/v/release/tuanpep/opusflow?filter=vscode-*&label=VSCode)](https://github.com/tuanpep/opusflow/releases?q=vscode)
[![Go Version](https://img.shields.io/github/go-mod/go-version/tuanpep/opusflow?filename=cli/go.mod)](https://go.dev/)

A spec-driven development tool to orchestrate coding agents.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/tuanpep/opusflow/main/install.sh | bash
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

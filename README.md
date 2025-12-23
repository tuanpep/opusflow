# OpusFlow

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

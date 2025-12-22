# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Auto-Init Project Root**: OpusFlow now automatically detects and initializes projects without manual setup. When no markers (`.git`, `.agent`, `opusflow-planning`) are found, it creates the necessary directories at the current working directory.
- Standardized project root markers: `.agent` and `opusflow-planning` are now default directories created to identify the project workspace.
- **Workspace Structure Documentation**: Added a guide on "Unified Planning" vs "Independent Planning" for multi-repo workspaces in `README.md`.
- **Project Root Discovery**: Documented the root discovery logic in `ARCHITECTURE.md`.
- **Unit Tests**: Added comprehensive tests for `FindProjectRoot` in `internal/manager/paths_test.go`.
- Added direct link to `EXAMPLES.md` in root `README.md`.

### Changed
- Moved workflow definitions from `workflows/` to `.agent/workflows/` to follow agentic coding standards.
- Optimized documentation structure for better readability.
- `FindProjectRoot()` now falls back to auto-initialization instead of returning an error when no markers exist.
- **Improved Directory Filtering**: `list_files` and `search_codebase` now automatically skip `node_modules`, `vendor`, `dist`, `build`, and other common large directories. Also supports `.gitignore` files from subprojects in multi-repo workspaces.

### Fixed
- **"Project root not found" error**: This error no longer occurs when using OpusFlow as an MCP server in fresh projects. The tool now auto-initializes instead of failing.
- Resolved minor lint warnings in `cli/go.mod`.

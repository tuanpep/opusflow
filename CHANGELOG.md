# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Standardized project root markers: `.agent` and `opusflow-planning` are now default directories created to identify the project workspace.
- **Workspace Structure Documentation**: Added a guide on "Unified Planning" vs "Independent Planning" for multi-repo workspaces in `README.md`.
- **Project Root Discovery**: Documented the root discovery logic in `ARCHITECTURE.md`.
- **Unit Tests**: Added comprehensive tests for `FindProjectRoot` in `internal/manager/paths_test.go`.
- Added direct link to `EXAMPLES.md` in root `README.md`.

### Changed
- Moved workflow definitions from `workflows/` to `.agent/workflows/` to follow agentic coding standards.
- Optimized documentation structure for better readability.

### Fixed
- "Project root not found" error that occurred when root markers were missing.
- Resolved minor lint warnings in `cli/go.mod`.

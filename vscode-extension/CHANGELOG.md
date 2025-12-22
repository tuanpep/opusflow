# Changelog

All notable changes to the OpusFlow VSCode extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [0.5.0] - 2025-12-22

### Added - SDD Workflow Integration
- **9 New Commands** for Spec-Driven Development:
  - `opusflow.generateMap` - Generate codebase symbol map
  - `opusflow.createSpec` - Create feature specification
  - `opusflow.decomposePlan` - Break plan into atomic tasks
  - `opusflow.nextTask` - Get next pending task
  - `opusflow.completeTask` - Mark task as complete
  - `opusflow.execTask` - Execute task with AI agent
  - `opusflow.workflowStatus` - Show workflow status
  - `opusflow.workflowStart` - Start new workflow
  - `opusflow.workflowNext` - Get next step guidance

### Changed - UI Refactor
- **Modern UI** using `@vscode-elements/elements` library
- **Native VSCode theming** with `--vscode-*` CSS variables
- **Phase Stepper** showing 5-step SDD workflow progress
- **Tree View** now shows Specifications and Task Queues

### Improved - CLI Wrapper
- 14 new methods in `OpusFlowWrapper` for SDD commands
- 9 new result interfaces in `OutputParser`
- Enhanced workflow status bar with phase icons


## [0.1.0] - 2025-12-22

### Added
- **Initial release of OpusFlow VSCode Extension**

#### Core Infrastructure
- TypeScript-based extension with strict type checking
- Webpack bundling for optimized distribution
- Extension activation on workspace containing `opusflow-planning/` directory
- Status bar integration with workflow panel quick access

#### CLI Integration
- Full integration with OpusFlow CLI
- Process spawning for CLI commands
- Real-time output streaming during command execution
- Support for `plan`, `verify`, and `prompt` commands
- Automatic CLI detection and error handling

#### Authentication System
- Multi-agent authentication support:
  - Cursor Agent (access token-based)
  - Gemini CLI (API key-based)
  - Claude CLI (API key-based)
- Secure credential storage using VSCode Secret Storage API
- Authentication webview UI for easy login
- Session management and status checking
- Visual indicators for authentication status

#### File System Integration
- File watcher for `opusflow-planning/` directory using chokidar
- Auto-refresh on file changes (create, modify, delete)
- Tree view provider for:
  - Plans folder
  - Phases folder
  - Verifications folder
- Click-to-open functionality for all files
- Context menu actions for tree items

#### Webview UI Components
- Modern dark theme with gradient accents
- Tabbed interface with 4 main views:
  - **Planning**: Markdown-rendered plan content
  - **Phases**: Visual phase list with status badges
  - **Execution**: Real-time log streaming with color coding
  - **Verification**: Markdown-rendered verification reports
- Smooth animations and transitions
- State persistence across webview reloads
- Progress bar for workflow execution
- Professional styling with:
  - Custom scrollbars
  - Hover effects
  - Status badges (pending, running, completed, failed)
  - Log entry color coding (info, success, error, warning)

#### Workflow Orchestration
- Complete workflow execution pipeline:
  1. Load Plan phase
  2. Generate Prompt phase (with clipboard copy)
  3. Research phase (simulated)
  4. Implementation phase (simulated)
  5. Verification phase (automated)
- Real-time progress tracking and UI updates
- Phase-based status management
- Error handling and recovery
- Automatic verification after workflow completion
- Duration tracking for phases and overall workflow

#### Commands
- `opusflow.createPlan` - Create a new development plan
- `opusflow.verifyPlan` - Run verification against a plan
- `opusflow.executeWorkflow` - Execute complete workflow
- `opusflow.openWorkflow` - Open workflow monitoring panel
- `opusflow.selectAgent` - Select AI agent to use
- `opusflow.authenticateAgent` - Authenticate with AI agent

#### Configuration
- `opusflow.cliPath` - Custom CLI executable path
- `opusflow.defaultAgent` - Default AI agent selection
- `opusflow.autoRefresh` - Auto-refresh UI on file changes

### Technical Features
- Process output streaming for real-time feedback
- Comprehensive error handling throughout
- Type-safe implementation with TypeScript
- Modular architecture with clear separation of concerns
- Event-driven file watching
- Webview message passing protocol
- State management for UI persistence

### Developer Experience
- Clean project structure
- Comprehensive inline documentation
- Reusable components
- Easy to extend for new AI agents
- Clear data flow between components

### Known Limitations
- Research and Implementation phases are currently simulated
- Workflow execution requires manual AI agent interaction
- No built-in agent execution (relies on external AI tools)
- Single workspace support only

### Future Enhancements (Planned)
- Direct integration with Cursor AI extension API
- Claude and Gemini agent execution automation
- Multi-workspace support
- Workflow templates
- Custom phase definitions
- Configuration presets
- Export/import workflow configurations
- Telemetry and analytics (opt-in)
- Extension marketplace publication

## Version History

### [0.1.0] - 2025-12-22
- Initial public release

---

For more information, see the [README](README.md).

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { AuthManager } from "./auth/authManager";
import { AuthProviderType } from "./auth/types";

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "opusflowChat";
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _authManager: AuthManager
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        // Initialize with HTML
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Send initial state once the view is ready (or just send it now, webview might miss it if not ready, but we can retry or inject in HTML)
        // Better: Inject in HTML or listen for "ready" message. 
        // For now, I'll rely on the view sending a "ready" message or just injecting it.
        // Let's inject it via replacement in _getHtmlForWebview.

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "onInfo": {
                    if (!data.value) return;
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onError": {
                    if (!data.value) return;
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
                case "savePlan": {
                    await this._savePlan(data.value);
                    break;
                }
                case "login": {
                    try {
                        const provider = data.value as AuthProviderType;
                        await this._authManager.login(provider);
                        await this._updateWebviewState();
                        vscode.window.showInformationMessage(`Successfully logged in to ${provider}`);
                    } catch (e: any) {
                        vscode.window.showErrorMessage(`Login failed: ${e.message}`);
                    }
                    break;
                }
                case "logout": {
                    try {
                        const provider = data.value as AuthProviderType;
                        await this._authManager.logout(provider);
                        await this._updateWebviewState();
                        vscode.window.showInformationMessage(`Logged out from ${provider}`);
                    } catch (e: any) {
                        vscode.window.showErrorMessage(`Logout failed: ${e.message}`);
                    }
                    break;
                }
                case "refreshAuth": {
                    await this._updateWebviewState();
                    break;
                }
                case "searchFiles": {
                    await this._handleFileSearch(data.value);
                    break;
                }
                case "chat": {
                    await this._handleChatMessage(data.value);
                    break;
                }
                case "webviewLoaded": {
                    await this._updateWebviewState();
                    break;
                }
                case "startWorkflow": {
                    await this._handleStartWorkflow(data.workflow, data.query, data.context);
                    break;
                }
                case "addContext": {
                    await this._handleAddContext(data.workflow);
                    break;
                }
                case "executeAction": {
                    if (data.command) {
                        try {
                            await vscode.commands.executeCommand(data.command, ...(data.args || []));
                        } catch (err: any) {
                            vscode.window.showErrorMessage(`Failed to execute: ${err.message}`);
                        }
                    }
                    break;
                }
            }
        });
    }

    private async _handleFileSearch(query: string) {
        if (!this._view) return;
        // Search for files matching the query
        // Limit to 20 results for performance in dropdown
        const files = await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**', 20);
        const filePaths = files.map(f => vscode.workspace.asRelativePath(f));

        this._view.webview.postMessage({
            type: "searchFilesResponse",
            value: filePaths
        });
    }

    private async _handleChatMessage(userMessage: string) {
        if (!this._view) return;

        // 1. Gather Context
        let contextMsg = "";

        // A. Parse @Mentions
        const mentionRegex = /@([\w./-]+)/g;
        const matches = [...userMessage.matchAll(mentionRegex)];

        if (matches.length > 0) {
            contextMsg += "\n\n[Mentioned Files]:";
            for (const match of matches) {
                const mention = match[1];
                // Try to find the file
                const files = await vscode.workspace.findFiles(`**/${mention}`, '**/node_modules/**', 1);
                if (files.length > 0) {
                    const file = files[0];
                    const relPath = vscode.workspace.asRelativePath(file);
                    try {
                        const content = (await vscode.workspace.openTextDocument(file)).getText();
                        // Truncate if too large (e.g., 10KB)
                        const safeContent = content.length > 10000 ? content.substring(0, 10000) + "\n...(truncated)" : content;
                        contextMsg += `\n\n--- ${relPath} ---\n${safeContent}\n----------------`;
                    } catch (e) {
                        contextMsg += `\n(Failed to read ${relPath})`;
                    }
                } else {
                    contextMsg += `\n(Could not find file matching: @${mention})`;
                }
            }
        }

        // B. Active Editor (fallback if no mentions, or additive? Let's make it additive but lesser priority or just brief)
        // If user explicitly mentions files, maybe they only want those? 
        // Strategy: Always include Active File if it's not already mentioned.
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const fileName = path.basename(activeEditor.document.fileName);
            if (!userMessage.includes(`@${fileName}`)) {
                const content = activeEditor.document.getText().substring(0, 5000);
                contextMsg += `\n\n[Active File: ${fileName}]\n${content}\n...(truncated if > 5kb)`;
            }
        }

        // Open Files List
        const openDocs = vscode.workspace.textDocuments.filter(d => d.uri.scheme === 'file').map(d => path.basename(d.fileName));
        if (openDocs.length > 0) {
            contextMsg += `\n\n[Open Files]: ${openDocs.join(', ')}`;
        }

        // 2. Log Context (for debugging/verification)
        console.log("Chat Context Gathered:", contextMsg);

        // 3. Construct Response (Mock for now, as CLI integration is separate)
        // In a real scenario, we'd send `userMessage + contextMsg` to the LLM agent.

        const reply = `I received your message: "${userMessage}".\n\nI am aware of your current context:\n- Active File: ${activeEditor ? path.basename(activeEditor.document.fileName) : 'None'}\n- Open Files: ${openDocs.length}`;

        // 4. Send Response
        this._view.webview.postMessage({
            type: "chatResponse",
            value: reply
        });
    }

    public async updateAgentStatus(agentId: string, connected: boolean) {
        if (!this._view) return;

        // We need full auth state + current agent
        await this._updateWebviewState(agentId);
    }

    private async _updateWebviewState(currentAgent?: string) {
        if (!this._view) return;

        const authStatuses = await this._authManager.checkSessions();
        // Convert Map to Object for serialization
        const authState: any = {};
        authStatuses.forEach((val, key) => {
            authState[key] = val;
        });

        // Inject current agent if provided, otherwise try to get from config or context
        if (currentAgent) {
            authState.currentAgent = currentAgent;
        } else {
            authState.currentAgent = vscode.workspace.getConfiguration('opusflow').get('defaultAgent') || 'gemini';
        }

        this._view.webview.postMessage({
            type: "updateState",
            value: {
                auth: authState
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const sidebarHtmlPath = vscode.Uri.joinPath(this._extensionUri, "media", "sidebar.html");
        const sidebarJsPath = vscode.Uri.joinPath(this._extensionUri, "media", "sidebar.js");

        // vscode-elements module path
        const vsceElementsPath = vscode.Uri.joinPath(
            this._extensionUri,
            "node_modules",
            "@vscode-elements",
            "elements",
            "dist",
            "bundled.js"
        );

        // Load HTML content
        let htmlContent = fs.readFileSync(sidebarHtmlPath.fsPath, "utf-8");

        const scriptUri = webview.asWebviewUri(sidebarJsPath);
        const vsceElementsUri = webview.asWebviewUri(vsceElementsPath);
        const nonce = this._getNonce();

        // Inject vscode-elements script URI
        htmlContent = htmlContent.replace(
            `<script type="module">
        import '@vscode-elements/elements';
    </script>`,
            `<script type="module" src="${vsceElementsUri}" nonce="${nonce}"></script>`
        );

        // Inject sidebar.js script URI
        htmlContent = htmlContent.replace(
            '<script src="sidebar.js"></script>',
            `<script src="${scriptUri}" nonce="${nonce}"></script>`
        );

        return htmlContent;
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private async _savePlan(planData: any) {
        try {
            if (!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage("No workspace open.");
                return;
            }

            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const plansDir = path.join(rootPath, "opusflow-planning", "plans");

            if (!fs.existsSync(plansDir)) {
                fs.mkdirSync(plansDir, { recursive: true });
            }

            const sanitizedName = planData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const filename = `plan-draft-${sanitizedName}.md`;
            const filePath = path.join(plansDir, filename);

            const markdown = this._generateMarkdown(planData);

            fs.writeFileSync(filePath, markdown);

            vscode.window.showInformationMessage(`Plan saved to: ${filename}`);

            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);

        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to save plan: ${e.message}`);
        }
    }

    private _generateMarkdown(data: any): string {
        let md = `---
description: ${data.description || "No description provided"}
---

# Plan: ${data.name}

## Pre-requisites
- **Dependencies**: TODO
- **Prior Context**: TODO

## Implementation Steps
`;

        data.steps.forEach((step: any, index: number) => {
            md += `
### Step ${index + 1}: ${step.title || "Untitled Step"}

**File**: \`${step.file || "TODO"}\`
**Action**: ${step.action || "Update"}

**Purpose**: ${step.purpose || "TODO"}

**Changes**:
\`\`\`${"text"}
${step.code || "// Code changes"}
\`\`\`
---
`;
        });

        return md;
    }

    private async _handleStartWorkflow(workflow: string, query: string, contextFiles: string[]) {
        if (!this._view) return;

        try {
            if (!vscode.workspace.workspaceFolders) {
                this._sendWorkflowError(workflow, "No workspace open.");
                return;
            }

            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            // Build context from files
            let contextContent = "";
            for (const filePath of contextFiles) {
                const fullPath = path.join(rootPath, filePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        const content = fs.readFileSync(fullPath, "utf-8");
                        const truncated = content.length > 5000 ? content.substring(0, 5000) + "\n...(truncated)" : content;
                        contextContent += `\n\n--- ${filePath} ---\n${truncated}`;
                    } catch (e) {
                        contextContent += `\n(Could not read ${filePath})`;
                    }
                }
            }

            // Generate workflow-specific prompt and save
            const timestamp = new Date().toISOString().slice(0, 10);
            const sanitizedQuery = query.split(' ').slice(0, 5).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');

            let outputDir: string;
            let filename: string;
            let promptContent: string;

            switch (workflow) {
                case 'phases':
                    outputDir = path.join(rootPath, "opusflow-planning", "phases");
                    filename = `phase-${timestamp}-${sanitizedQuery}.md`;
                    promptContent = this._generatePhasesPrompt(query, contextContent);
                    break;
                case 'plan':
                    outputDir = path.join(rootPath, "opusflow-planning", "plans");
                    filename = `plan-${timestamp}-${sanitizedQuery}.md`;
                    promptContent = this._generatePlanPrompt(query, contextContent);
                    break;
                case 'review':
                    outputDir = path.join(rootPath, "opusflow-planning", "reviews");
                    filename = `review-${timestamp}-${sanitizedQuery}.md`;
                    promptContent = this._generateReviewPrompt(query, contextContent);
                    break;
                default:
                    this._sendWorkflowError(workflow, "Unknown workflow type");
                    return;
            }

            // Ensure directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const filePath = path.join(outputDir, filename);

            // For now, create a draft file with the prompt
            // In production, this would call the CLI or agent
            const draftContent = `---
workflow: ${workflow}
created: ${new Date().toISOString()}
status: draft
---

# ${workflow.charAt(0).toUpperCase() + workflow.slice(1)}: ${query}

## User Query
${query}

## Context Files
${contextFiles.length > 0 ? contextFiles.map(f => `- ${f}`).join('\n') : 'No context files provided'}

---

## Generated Prompt

${promptContent}

---

> **Next Step:** Copy this prompt to your AI agent (Cursor, Claude, Gemini) or run \`opusflow prompt ${workflow}\`
`;

            fs.writeFileSync(filePath, draftContent);

            // Send success response
            this._view.webview.postMessage({
                type: "workflowResponse",
                workflow: workflow,
                content: `✅ **${workflow.charAt(0).toUpperCase() + workflow.slice(1)} Draft Created**\n\nFile: \`${filename}\`\n\nI've created a draft with your ${workflow} prompt. Open the file to review and refine it, then hand it off to your AI agent.`,
                actions: [
                    { icon: "📄", title: "Open File", command: "vscode.open", args: [vscode.Uri.file(filePath)] },
                    { icon: "📋", title: "Copy Prompt", command: "opusflow.copyPrompt", args: [filePath] }
                ]
            });

            // Open the file
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc, { preview: false });

            // Refresh explorer
            vscode.commands.executeCommand('opusflow.refreshExplorer');

        } catch (e: any) {
            this._sendWorkflowError(workflow, e.message);
        }
    }

    private _sendWorkflowError(workflow: string, error: string) {
        if (!this._view) return;
        this._view.webview.postMessage({
            type: "workflowError",
            workflow: workflow,
            error: error
        });
    }

    private _generatePhasesPrompt(query: string, context: string): string {
        return `You are an expert software architect. Analyze the following goal and break it down into sequential, manageable phases.

## Goal
${query}

## Context
${context || 'No additional context provided.'}

## Instructions
1. Clarify any ambiguous requirements
2. Identify the major phases needed (2-5 phases typically)
3. For each phase, define:
   - **Goal**: What this phase accomplishes
   - **Milestone**: Verifiable outcome
   - **Scope**: Files/components affected
   - **Dependencies**: Previous phases required

## Output Format
Generate a structured phases document following the opusflow phases workflow format.
Save to: \`opusflow-planning/phases/phase-[00]-[name].md\`
`;
    }

    private _generatePlanPrompt(query: string, context: string): string {
        return `You are an expert software engineer. Create a detailed, file-level implementation plan for the following task.

## Task
${query}

## Context
${context || 'No additional context provided.'}

## Instructions
Follow the plan verbatim. Trust the files and references.

1. Analyze the current codebase structure
2. Identify all files that need to be created or modified
3. For each file, specify:
   - **File path** (absolute)
   - **Action**: Create | Update
   - **Changes**: Specific functions, types, logic to add/modify
   - **Symbol References**: Link to existing code
   - **Error Handling**: Specify error cases

4. Include testing strategy
5. Define success criteria

## Output Format
Generate a detailed plan following the opusflow plan workflow format.
Save to: \`opusflow-planning/plans/plan-[phase#]-[name].md\`
`;
    }

    private _generateReviewPrompt(query: string, context: string): string {
        return `You are an expert code reviewer. Perform a comprehensive review of the following code/changes.

## Review Request
${query}

## Context
${context || 'No additional context provided.'}

## Instructions
Perform deep analysis across files and dependencies. Categorize findings by:

- 🐛 **Bug**: Functional issues, logic errors
- ⚡ **Performance**: Bottlenecks, inefficiencies  
- 🔒 **Security**: Vulnerabilities, unsafe practices
- 📝 **Clarity**: Readability, maintainability

For each issue:
1. Describe the problem
2. Explain the risk/impact
3. Provide a specific recommendation
4. Reference file and line number

## Output Format
Generate a review document following the opusflow review workflow format.
`;
    }

    private async _handleAddContext(workflow: string) {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: 'Add to Context',
            title: 'Select files to reference in your ' + workflow
        });

        if (files && this._view) {
            const paths = files.map(f => vscode.workspace.asRelativePath(f));
            this._view.webview.postMessage({
                type: "appendContext",
                files: paths
            });
        }
    }
}

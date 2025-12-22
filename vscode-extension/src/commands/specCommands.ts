import * as vscode from 'vscode';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';

export class SpecCommands {
    constructor(private cli: OpusFlowWrapper) { }

    /**
     * Create a new specification from user input
     */
    async createSpec(context: vscode.ExtensionContext): Promise<void> {
        const description = await vscode.window.showInputBox({
            prompt: 'Enter feature description (what do you want to build?)',
            placeHolder: 'Add OAuth2 authentication with JWT tokens',
            ignoreFocusOut: true
        });

        if (!description) {
            return;
        }

        const title = await vscode.window.showInputBox({
            prompt: 'Enter a short title (optional)',
            placeHolder: 'OAuth2 Auth',
            ignoreFocusOut: true
        });

        try {
            const cwd = this.getWorkspaceFolder();
            const result = await this.cli.spec(description, title || undefined, cwd);

            vscode.window.showInformationMessage(`✅ Created spec: ${result.filename}`);

            // Open the created file
            const uri = vscode.Uri.file(result.fullPath);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create spec: ${error.message}`);
        }
    }

    /**
     * Generate codebase map and show in editor
     */
    async generateMap(): Promise<void> {
        const format = await vscode.window.showQuickPick(
            [
                { label: 'Summary', description: 'Compact overview' },
                { label: 'Markdown', description: 'Detailed documentation' },
                { label: 'JSON', description: 'Machine-readable format' }
            ],
            { placeHolder: 'Select output format' }
        );

        if (!format) {
            return;
        }

        try {
            const cwd = this.getWorkspaceFolder();
            const result = await this.cli.map(format.label.toLowerCase() as any, cwd);

            // Create a new untitled document with the map content
            const doc = await vscode.workspace.openTextDocument({
                content: result.content,
                language: format.label === 'JSON' ? 'json' : 'markdown'
            });
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(
                `📊 Codebase Map: ${result.filesCount} files, ${result.symbolsCount} symbols`
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate map: ${error.message}`);
        }
    }

    private getWorkspaceFolder(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }
}

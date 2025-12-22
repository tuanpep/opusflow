import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileWatcher } from '../utils/fileWatcher';

export class OpusFlowExplorerProvider implements vscode.TreeDataProvider<PlanningItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PlanningItem | undefined | void> = new vscode.EventEmitter<PlanningItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<PlanningItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private watcher: FileWatcher) {
        this.watcher.onDidChange(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PlanningItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PlanningItem): Promise<PlanningItem[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const planningDir = path.join(workspaceFolders[0].uri.fsPath, 'opusflow-planning');
        if (!fs.existsSync(planningDir)) {
            return [];
        }

        if (element) {
            if (element.contextValue === 'category') {
                const category = element.label.toLowerCase(); // 'phases' or 'plans'
                const subDir = path.join(planningDir, category);

                if (!fs.existsSync(subDir)) {
                    return [];
                }

                const files = fs.readdirSync(subDir).filter(f => !f.startsWith('.'));

                return files.map(file => {
                    const filePath = path.join(subDir, file);
                    const isPlan = category === 'plans';

                    // Check for related verifications if this is a plan
                    let hasVerification = false;
                    if (isPlan) {
                        const verifyFile = `verify-${file}`;
                        const verifyPath = path.join(planningDir, 'verifications', verifyFile);
                        hasVerification = fs.existsSync(verifyPath);
                    }

                    return new PlanningItem(
                        file,
                        hasVerification ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'vscode.open',
                            title: 'Open File',
                            arguments: [vscode.Uri.file(filePath)]
                        },
                        isPlan ? 'plan' : 'phase'
                    );
                });
            } else if (element.contextValue === 'plan') {
                // Return verification file as child of the plan
                const verifyFile = `verify-${element.label}`;
                const verifyPath = path.join(planningDir, 'verifications', verifyFile);

                if (fs.existsSync(verifyPath)) {
                    return [new PlanningItem(
                        verifyFile,
                        vscode.TreeItemCollapsibleState.None,
                        {
                            command: 'vscode.open',
                            title: 'Open Verification',
                            arguments: [vscode.Uri.file(verifyPath)]
                        },
                        'verification'
                    )];
                }
                return [];
            }
            return [];
        } else {
            // Root categories - Only Phases and Plans (Verifications are now nested)
            const categories = [
                { label: 'Phases', dir: 'phases', icon: 'list-ordered' },
                { label: 'Plans', dir: 'plans', icon: 'repo' }
            ];

            // Ensure dirs exist
            ['phases', 'plans', 'verifications'].forEach(d => {
                const p = path.join(planningDir, d);
                if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
            });

            return categories.map(cat => {
                return new PlanningItem(
                    cat.label,
                    vscode.TreeItemCollapsibleState.Expanded, // Auto-expand for visibility
                    undefined,
                    'category'
                );
            });
        }
    }
}

class PlanningItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'file'
    ) {
        super(label, collapsibleState);

        this.tooltip = `${this.label}`;

        if (contextValue === 'category') {
            this.iconPath = label === 'Phases'
                ? new vscode.ThemeIcon('list-ordered')
                : new vscode.ThemeIcon('repo'); // Plans
        } else if (contextValue === 'plan') {
            this.iconPath = new vscode.ThemeIcon('file-submodule');
        } else if (contextValue === 'phase') {
            this.iconPath = new vscode.ThemeIcon('milestone');
        } else if (contextValue === 'verification') {
            this.iconPath = new vscode.ThemeIcon('verified');
        } else {
            this.iconPath = new vscode.ThemeIcon('file-text');
        }
    }
}

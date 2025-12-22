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
                const subDir = path.join(planningDir, element.label as string);
                if (!fs.existsSync(subDir)) {
                    return [];
                }
                const files = fs.readdirSync(subDir);
                return files.map(file => new PlanningItem(
                    file,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'vscode.open',
                        title: 'Open File',
                        arguments: [vscode.Uri.file(path.join(subDir, file))]
                    },
                    'file'
                ));
            }
            return [];
        } else {
            // Root categories
            const categories = ['plans', 'phases', 'verifications'];
            return categories.map(cat => {
                const subDir = path.join(planningDir, cat);
                if (!fs.existsSync(subDir)) {
                    fs.mkdirSync(subDir, { recursive: true });
                }
                return new PlanningItem(
                    cat,
                    vscode.TreeItemCollapsibleState.Collapsed,
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
            this.iconPath = new vscode.ThemeIcon('folder');
        } else {
            this.iconPath = new vscode.ThemeIcon('file-text');
        }
    }
}

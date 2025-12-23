import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileWatcher } from '../utils/fileWatcher';

export class OpusFlowExplorerProvider implements vscode.TreeDataProvider<PlanningItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PlanningItem | undefined | void> = new vscode.EventEmitter<
        PlanningItem | undefined | void
    >();
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

        const rootPath = workspaceFolders[0].uri.fsPath;
        const planningDir = path.join(rootPath, 'opusflow-planning');
        const opusflowDir = path.join(rootPath, '.opusflow');

        if (!fs.existsSync(planningDir)) {
            return [];
        }

        if (element) {
            return this.getChildrenForElement(element, planningDir, opusflowDir);
        } else {
            return this.getRootCategories(planningDir, opusflowDir);
        }
    }

    private getRootCategories(planningDir: string, opusflowDir: string): PlanningItem[] {
        // Ensure dirs exist
        ['specs', 'phases', 'plans', 'verifications'].forEach((d) => {
            const p = path.join(planningDir, d);
            if (!fs.existsSync(p)) {
                fs.mkdirSync(p, { recursive: true });
            }
        });

        const categories: PlanningItem[] = [
            new PlanningItem('Specifications', vscode.TreeItemCollapsibleState.Expanded, undefined, 'category', {
                categoryType: 'specs'
            }),
            new PlanningItem('Plans', vscode.TreeItemCollapsibleState.Expanded, undefined, 'category', {
                categoryType: 'plans'
            }),
            new PlanningItem('Phases', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'category', {
                categoryType: 'phases'
            })
        ];

        // Add Tasks category if any task queues exist
        if (fs.existsSync(opusflowDir)) {
            const taskFiles = fs.readdirSync(opusflowDir).filter((f) => f.startsWith('tasks-'));
            if (taskFiles.length > 0) {
                categories.push(
                    new PlanningItem('Task Queues', vscode.TreeItemCollapsibleState.Expanded, undefined, 'category', {
                        categoryType: 'tasks'
                    })
                );
            }
        }

        return categories;
    }

    private getChildrenForElement(element: PlanningItem, planningDir: string, opusflowDir: string): PlanningItem[] {
        if (element.contextValue === 'category') {
            return this.getCategoryChildren(element, planningDir, opusflowDir);
        } else if (element.contextValue === 'plan') {
            return this.getPlanChildren(element, planningDir);
        } else if (element.contextValue === 'taskQueue') {
            return this.getTaskQueueChildren(element, opusflowDir);
        }
        return [];
    }

    private getCategoryChildren(element: PlanningItem, planningDir: string, opusflowDir: string): PlanningItem[] {
        const categoryType = element.metadata?.categoryType;

        if (categoryType === 'tasks') {
            // List task queue files
            if (!fs.existsSync(opusflowDir)) {
                return [];
            }

            const taskFiles = fs.readdirSync(opusflowDir).filter((f) => f.startsWith('tasks-'));
            return taskFiles.map((file) => {
                const planRef = file.replace('tasks-', '').replace('.json', '');
                return new PlanningItem(planRef, vscode.TreeItemCollapsibleState.Collapsed, undefined, 'taskQueue', {
                    filePath: path.join(opusflowDir, file),
                    planRef
                });
            });
        }

        // Handle specs, plans, phases
        const dirMap: Record<string, string> = {
            specs: 'specs',
            plans: 'plans',
            phases: 'phases'
        };

        const subDir = path.join(planningDir, dirMap[categoryType] || categoryType);
        if (!fs.existsSync(subDir)) {
            return [];
        }

        const files = fs.readdirSync(subDir).filter((f) => !f.startsWith('.') && f.endsWith('.md'));

        return files.map((file) => {
            const filePath = path.join(subDir, file);
            const isPlan = categoryType === 'plans';
            const isSpec = categoryType === 'specs';

            // Check for related verifications if this is a plan
            let hasVerification = false;
            if (isPlan) {
                const verificationsDir = path.join(planningDir, 'verifications');
                if (fs.existsSync(verificationsDir)) {
                    const planName = path.parse(file).name;
                    const verifyFiles = fs.readdirSync(verificationsDir);
                    hasVerification = verifyFiles.some((f) => f.includes(planName));
                }
            }

            const contextValue = isSpec ? 'spec' : isPlan ? 'plan' : 'phase';

            return new PlanningItem(
                file,
                hasVerification ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                {
                    command: 'vscode.open',
                    title: 'Open File',
                    arguments: [vscode.Uri.file(filePath)]
                },
                contextValue,
                { filePath }
            );
        });
    }

    private getPlanChildren(element: PlanningItem, planningDir: string): PlanningItem[] {
        const verificationsDir = path.join(planningDir, 'verifications');
        if (!fs.existsSync(verificationsDir)) {
            return [];
        }

        const planName = path.parse(element.label).name;
        const verifyFiles = fs.readdirSync(verificationsDir).filter((f) => f.includes(planName));

        return verifyFiles.map(
            (f) =>
                new PlanningItem(
                    f,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'vscode.open',
                        title: 'Open Verification',
                        arguments: [vscode.Uri.file(path.join(verificationsDir, f))]
                    },
                    'verification',
                    { filePath: path.join(verificationsDir, f) }
                )
        );
    }

    private getTaskQueueChildren(element: PlanningItem, opusflowDir: string): PlanningItem[] {
        const filePath = element.metadata?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const queue = JSON.parse(content);
            const tasks = queue.tasks || [];

            return tasks.map((task: any) => {
                const statusIcon = this.getTaskStatusIcon(task.status);
                return new PlanningItem(
                    `${task.id}: ${task.title}`,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'task',
                    { taskId: task.id, status: task.status, planRef: element.metadata?.planRef }
                );
            });
        } catch (e) {
            return [];
        }
    }

    private getTaskStatusIcon(status: string): vscode.ThemeIcon {
        switch (status) {
            case 'pending':
                return new vscode.ThemeIcon('circle-outline');
            case 'in_progress':
                return new vscode.ThemeIcon('sync~spin');
            case 'done':
                return new vscode.ThemeIcon('check');
            case 'failed':
                return new vscode.ThemeIcon('error');
            case 'skipped':
                return new vscode.ThemeIcon('debug-step-over');
            default:
                return new vscode.ThemeIcon('question');
        }
    }
}

class PlanningItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly contextValue: string = 'file',
        public readonly metadata?: Record<string, any>
    ) {
        super(label, collapsibleState);

        this.tooltip = `${this.label}`;
        this.iconPath = this.getIcon();
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.contextValue) {
            case 'category':
                return this.getCategoryIcon();
            case 'spec':
                return new vscode.ThemeIcon('file-text', new vscode.ThemeColor('charts.purple'));
            case 'plan':
                return new vscode.ThemeIcon('file-submodule', new vscode.ThemeColor('charts.blue'));
            case 'phase':
                return new vscode.ThemeIcon('milestone');
            case 'verification':
                return new vscode.ThemeIcon('verified', new vscode.ThemeColor('charts.green'));
            case 'taskQueue':
                return new vscode.ThemeIcon('checklist', new vscode.ThemeColor('charts.orange'));
            case 'task':
                return this.getTaskIcon();
            default:
                return new vscode.ThemeIcon('file-text');
        }
    }

    private getCategoryIcon(): vscode.ThemeIcon {
        const categoryType = this.metadata?.categoryType;
        switch (categoryType) {
            case 'specs':
                return new vscode.ThemeIcon('book', new vscode.ThemeColor('charts.purple'));
            case 'plans':
                return new vscode.ThemeIcon('repo', new vscode.ThemeColor('charts.blue'));
            case 'phases':
                return new vscode.ThemeIcon('list-ordered');
            case 'tasks':
                return new vscode.ThemeIcon('tasklist', new vscode.ThemeColor('charts.orange'));
            default:
                return new vscode.ThemeIcon('folder');
        }
    }

    private getTaskIcon(): vscode.ThemeIcon {
        const status = this.metadata?.status;
        switch (status) {
            case 'pending':
                return new vscode.ThemeIcon('circle-outline');
            case 'in_progress':
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.yellow'));
            case 'done':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            case 'failed':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            case 'skipped':
                return new vscode.ThemeIcon('debug-step-over');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

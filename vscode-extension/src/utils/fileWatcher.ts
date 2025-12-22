import * as chokidar from 'chokidar';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FileWatcher implements vscode.Disposable {
    private watcher: chokidar.FSWatcher | undefined;
    private _onDidChange = new vscode.EventEmitter<void>();
    public readonly onDidChange = this._onDidChange.event;

    constructor() {
        this.initializeWatcher();
    }

    private initializeWatcher() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const planningDir = path.join(workspaceFolders[0].uri.fsPath, 'opusflow-planning');

        // Ensure directory exists so we can watch it
        if (!fs.existsSync(planningDir)) {
            try {
                fs.mkdirSync(planningDir, { recursive: true });
            } catch (err) {
                console.error('Failed to create planning directory', err);
            }
        }

        this.watcher = chokidar.watch(planningDir, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: false
        });

        this.watcher
            .on('add', () => this.notify())
            .on('change', () => this.notify())
            .on('unlink', () => this.notify())
            .on('addDir', () => this.notify())
            .on('unlinkDir', () => this.notify());
    }

    private notify() {
        this._onDidChange.fire();
    }

    public dispose() {
        if (this.watcher) {
            this.watcher.close();
        }
    }
}

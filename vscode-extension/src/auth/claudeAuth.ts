import * as vscode from 'vscode';
import { IAuthProvider, AuthProviderType, AuthSession } from './types';
import { SecretManager } from '../utils/secretManager';

export class ClaudeAuth implements IAuthProvider {
    public readonly type = AuthProviderType.Claude;

    constructor(private readonly secretManager: SecretManager) { }

    public async login(): Promise<AuthSession> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Claude API Key',
            password: true,
            ignoreFocusOut: true
        });

        if (!apiKey) {
            throw new Error('Claude API Key is required');
        }

        const session: AuthSession = {
            provider: this.type,
            apiKey: apiKey
        };

        await this.secretManager.saveSession(session);
        return session;
    }

    public async logout(): Promise<void> {
        await this.secretManager.deleteSession(this.type);
    }

    public async getSession(): Promise<AuthSession | undefined> {
        return this.secretManager.getSession(this.type);
    }
}

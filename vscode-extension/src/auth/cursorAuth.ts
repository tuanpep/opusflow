import * as vscode from 'vscode';
import { IAuthProvider, AuthProviderType, AuthSession } from './types';
import { SecretManager } from '../utils/secretManager';

export class CursorAuth implements IAuthProvider {
    public readonly type = AuthProviderType.Cursor;

    constructor(private readonly secretManager: SecretManager) { }

    public async login(): Promise<AuthSession> {
        // Placeholder for Cursor OAuth flow
        const token = await vscode.window.showInputBox({
            prompt: 'Enter your Cursor Access Token (experimental)',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) {
            throw new Error('Cursor Access Token is required');
        }

        const session: AuthSession = {
            provider: this.type,
            accessToken: token
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

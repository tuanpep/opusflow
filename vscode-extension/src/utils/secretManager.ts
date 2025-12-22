import * as vscode from 'vscode';
import { AuthSession } from '../auth/types';

export class SecretManager {
    private static readonly KEY_PREFIX = 'opusflow.auth.';

    constructor(private readonly secretStorage: vscode.SecretStorage) {}

    public async saveSession(session: AuthSession): Promise<void> {
        const key = this.getSessionKey(session.provider);
        await this.secretStorage.store(key, JSON.stringify(session));
    }

    public async getSession(provider: string): Promise<AuthSession | undefined> {
        const key = this.getSessionKey(provider);
        const data = await this.secretStorage.get(key);
        if (data) {
            try {
                return JSON.parse(data) as AuthSession;
            } catch (e) {
                console.error(`Failed to parse session for ${provider}:`, e);
            }
        }
        return undefined;
    }

    public async deleteSession(provider: string): Promise<void> {
        const key = this.getSessionKey(provider);
        await this.secretStorage.delete(key);
    }

    private getSessionKey(provider: string): string {
        return `${SecretManager.KEY_PREFIX}${provider}`;
    }
}

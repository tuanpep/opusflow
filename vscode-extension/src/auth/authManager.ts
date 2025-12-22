import * as vscode from 'vscode';
import { IAuthProvider, AuthProviderType, AuthSession } from './types';
import { SecretManager } from '../utils/secretManager';
import { ClaudeAuth } from './claudeAuth';
import { GeminiAuth } from './geminiAuth';
import { CursorAuth } from './cursorAuth';

export class AuthManager {
    private providers: Map<AuthProviderType, IAuthProvider> = new Map();
    private secretManager: SecretManager;

    constructor(context: vscode.ExtensionContext) {
        this.secretManager = new SecretManager(context.secrets);

        this.providers.set(AuthProviderType.Claude, new ClaudeAuth(this.secretManager));
        this.providers.set(AuthProviderType.Gemini, new GeminiAuth(this.secretManager));
        this.providers.set(AuthProviderType.Cursor, new CursorAuth(this.secretManager));
    }

    public async login(providerType: AuthProviderType): Promise<AuthSession> {
        const provider = this.providers.get(providerType);
        if (!provider) {
            throw new Error(`Unknown auth provider: ${providerType}`);
        }
        return provider.login();
    }

    public async logout(providerType: AuthProviderType): Promise<void> {
        const provider = this.providers.get(providerType);
        if (provider) {
            await provider.logout();
        }
    }

    public async getSession(providerType: AuthProviderType): Promise<AuthSession | undefined> {
        const provider = this.providers.get(providerType);
        if (provider) {
            return provider.getSession();
        }
        return undefined;
    }

    public async isAuthenticated(providerType: AuthProviderType): Promise<boolean> {
        const session = await this.getSession(providerType);
        return !!session;
    }

    public async checkSessions(): Promise<Map<AuthProviderType, boolean>> {
        const statuses = new Map<AuthProviderType, boolean>();
        for (const type of Object.values(AuthProviderType)) {
            statuses.set(type as AuthProviderType, await this.isAuthenticated(type as AuthProviderType));
        }
        return statuses;
    }
}

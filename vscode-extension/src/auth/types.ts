export enum AuthProviderType {
    Cursor = 'cursor-agent',
    Gemini = 'gemini-cli',
    Claude = 'claude-cli'
}

export interface AuthSession {
    provider: AuthProviderType;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    apiKey?: string;
}

export interface IAuthProvider {
    readonly type: AuthProviderType;
    login(): Promise<AuthSession>;
    logout(): Promise<void>;
    getSession(): Promise<AuthSession | undefined>;
    refreshSession?(): Promise<AuthSession | undefined>;
}

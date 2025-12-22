import * as vscode from 'vscode';
import { IAuthProvider, AuthProviderType, AuthSession } from './types';
import { SecretManager } from '../utils/secretManager';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * CursorAuth - Simple browser-based authentication for Cursor Agent
 * 
 * Uses the `cursor-agent` CLI for authentication:
 * - `cursor-agent login` - Opens browser for OAuth login
 * - `cursor-agent status` - Checks if user is authenticated
 * - `cursor-agent logout` - Clears authentication
 * 
 * No manual token copying required!
 */
export class CursorAuth implements IAuthProvider {
    public readonly type = AuthProviderType.Cursor;

    constructor(private readonly secretManager: SecretManager) { }

    /**
     * Login using browser-based OAuth flow
     * Opens browser automatically - user just needs to click "Login"
     */
    public async login(): Promise<AuthSession> {
        // First check if already authenticated
        const existingSession = await this.checkCLIAuth();
        if (existingSession) {
            vscode.window.showInformationMessage('✅ Already logged in to Cursor!');
            return existingSession;
        }

        // Show progress while opening browser
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Cursor Login",
            cancellable: true
        }, async (progress, token) => {
            progress.report({ message: "Opening browser for login..." });

            try {
                // Run cursor-agent login - opens browser automatically
                const loginProcess = spawn('cursor-agent', ['login'], {
                    stdio: 'pipe',
                    shell: true
                });

                // Wait for login to complete or timeout
                const result = await new Promise<boolean>((resolve, reject) => {
                    let output = '';

                    loginProcess.stdout?.on('data', (data) => {
                        output += data.toString();
                        // Update progress with output
                        if (output.includes('browser')) {
                            progress.report({ message: "Waiting for browser authentication..." });
                        }
                    });

                    loginProcess.stderr?.on('data', (data) => {
                        output += data.toString();
                    });

                    loginProcess.on('close', (code) => {
                        if (code === 0) {
                            resolve(true);
                        } else {
                            reject(new Error(`Login failed: ${output}`));
                        }
                    });

                    loginProcess.on('error', (err) => {
                        reject(new Error(`Failed to start cursor-agent: ${err.message}. Is cursor-agent installed?`));
                    });

                    // Handle cancellation
                    token.onCancellationRequested(() => {
                        loginProcess.kill();
                        reject(new Error('Login cancelled'));
                    });

                    // Timeout after 5 minutes
                    setTimeout(() => {
                        loginProcess.kill();
                        reject(new Error('Login timed out'));
                    }, 5 * 60 * 1000);
                });

                if (result) {
                    // Verify login worked
                    const session = await this.checkCLIAuth();
                    if (session) {
                        vscode.window.showInformationMessage('✅ Successfully logged in to Cursor!');
                        return session;
                    }
                }

                throw new Error('Login verification failed');
            } catch (error: any) {
                // If cursor-agent is not installed, offer alternative
                if (error.message?.includes('cursor-agent') || error.message?.includes('not found')) {
                    const choice = await vscode.window.showErrorMessage(
                        'cursor-agent CLI not found. Would you like to enter an API key instead?',
                        'Enter API Key',
                        'Install cursor-agent',
                        'Cancel'
                    );

                    if (choice === 'Enter API Key') {
                        return this.loginWithApiKey();
                    } else if (choice === 'Install cursor-agent') {
                        vscode.env.openExternal(vscode.Uri.parse('https://cursor.com/docs/cli/installation'));
                    }
                }
                throw error;
            }
        });
    }

    /**
     * Fallback: Login with API key (manual method)
     */
    private async loginWithApiKey(): Promise<AuthSession> {
        const token = await vscode.window.showInputBox({
            prompt: 'Enter your Cursor API Key',
            placeHolder: 'Get your API key from Cursor dashboard → Integrations → User API Keys',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) {
            throw new Error('API key is required');
        }

        const session: AuthSession = {
            provider: this.type,
            accessToken: token,
            apiKey: token
        };

        await this.secretManager.saveSession(session);
        vscode.window.showInformationMessage('✅ API key saved successfully!');
        return session;
    }

    /**
     * Logout - clears both CLI and extension auth
     */
    public async logout(): Promise<void> {
        // Try to logout from CLI
        try {
            await execAsync('cursor-agent logout');
        } catch {
            // Ignore errors if CLI not available
        }

        // Also clear extension secrets
        await this.secretManager.deleteSession(this.type);
        vscode.window.showInformationMessage('👋 Logged out from Cursor');
    }

    /**
     * Get current session - checks CLI auth first, then falls back to stored session
     */
    public async getSession(): Promise<AuthSession | undefined> {
        // First check CLI auth status
        const cliSession = await this.checkCLIAuth();
        if (cliSession) {
            return cliSession;
        }

        // Fall back to stored API key
        return this.secretManager.getSession(this.type);
    }

    /**
     * Check if user is authenticated via cursor-agent CLI
     */
    private async checkCLIAuth(): Promise<AuthSession | undefined> {
        try {
            const { stdout } = await execAsync('cursor-agent status', {
                timeout: 10000 // 10 second timeout
            });

            // Parse the status output to check if authenticated
            const output = stdout.toLowerCase();

            if (output.includes('authenticated') ||
                output.includes('logged in') ||
                output.includes('status: ok') ||
                (output.includes('user') && !output.includes('not authenticated'))) {

                // Extract user info if available
                const emailMatch = stdout.match(/email[:\s]+([^\s\n]+)/i);
                const userMatch = stdout.match(/user[:\s]+([^\s\n]+)/i);

                return {
                    provider: this.type,
                    accessToken: 'cli-managed', // Token is managed by CLI
                    // Store any extracted info
                    ...(emailMatch && { email: emailMatch[1] }),
                    ...(userMatch && { user: userMatch[1] })
                } as AuthSession;
            }

            return undefined;
        } catch {
            // CLI not available or not authenticated
            return undefined;
        }
    }

    /**
     * Quick check if authenticated (used for status bar)
     */
    public async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    }
}

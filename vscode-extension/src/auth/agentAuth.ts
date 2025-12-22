import * as vscode from 'vscode';

/**
 * Simple API key management for AI coding agents
 * 
 * Supported agents:
 * - Aider: Uses ANTHROPIC_API_KEY or OPENAI_API_KEY
 * - Claude Code: Uses ANTHROPIC_API_KEY  
 * - Gemini CLI: Uses GEMINI_API_KEY
 * - Cursor: Uses MCP integration (no API key needed here)
 */
export class AgentAuth {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get configured API keys as environment variables
     */
    getEnvVars(): Record<string, string> {
        const config = vscode.workspace.getConfiguration('opusflow.apiKeys');
        const env: Record<string, string> = {};

        const anthropic = config.get<string>('anthropic');
        const openai = config.get<string>('openai');
        const gemini = config.get<string>('gemini');

        if (anthropic) env['ANTHROPIC_API_KEY'] = anthropic;
        if (openai) env['OPENAI_API_KEY'] = openai;
        if (gemini) env['GEMINI_API_KEY'] = gemini;

        return env;
    }

    /**
     * Check which agents have API keys configured
     */
    getStatus(): { agent: string; configured: boolean; envVar: string }[] {
        const config = vscode.workspace.getConfiguration('opusflow.apiKeys');

        return [
            {
                agent: 'Aider (Anthropic)',
                configured: !!config.get<string>('anthropic'),
                envVar: 'ANTHROPIC_API_KEY'
            },
            {
                agent: 'Aider (OpenAI)',
                configured: !!config.get<string>('openai'),
                envVar: 'OPENAI_API_KEY'
            },
            {
                agent: 'Claude Code',
                configured: !!config.get<string>('anthropic'),
                envVar: 'ANTHROPIC_API_KEY'
            },
            {
                agent: 'Gemini CLI',
                configured: !!config.get<string>('gemini'),
                envVar: 'GEMINI_API_KEY'
            }
        ];
    }

    /**
     * Interactive API key setup
     */
    async setupApiKeys(): Promise<void> {
        const agents = [
            { label: '🤖 Anthropic (for Aider & Claude Code)', key: 'anthropic', url: 'https://console.anthropic.com/' },
            { label: '🧠 OpenAI (for Aider with GPT)', key: 'openai', url: 'https://platform.openai.com/api-keys' },
            { label: '✨ Gemini (for Gemini CLI)', key: 'gemini', url: 'https://aistudio.google.com/' },
            { label: '📋 Show Status', key: 'status', url: '' }
        ];

        const selected = await vscode.window.showQuickPick(agents, {
            placeHolder: 'Select an API key to configure',
            title: 'OpusFlow: Setup API Keys'
        });

        if (!selected) return;

        if (selected.key === 'status') {
            await this.showStatus();
            return;
        }

        // Open console URL
        const openConsole = await vscode.window.showQuickPick(
            ['Enter API Key', 'Open Console to Get Key'],
            { placeHolder: `Configure ${selected.label}` }
        );

        if (openConsole === 'Open Console to Get Key') {
            vscode.env.openExternal(vscode.Uri.parse(selected.url));
            return;
        }

        if (openConsole === 'Enter API Key') {
            const apiKey = await vscode.window.showInputBox({
                prompt: `Enter your ${selected.label} API key`,
                password: true,
                placeHolder: 'sk-...',
                ignoreFocusOut: true
            });

            if (apiKey) {
                const config = vscode.workspace.getConfiguration('opusflow.apiKeys');
                await config.update(selected.key, apiKey, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`✅ ${selected.label} API key saved!`);
            }
        }
    }

    /**
     * Show status of all API keys
     */
    async showStatus(): Promise<void> {
        const status = this.getStatus();
        const items = status.map(s => ({
            label: s.configured ? `✅ ${s.agent}` : `❌ ${s.agent}`,
            description: s.envVar,
            detail: s.configured ? 'Configured' : 'Not configured - click to setup'
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'API Keys Status',
            title: 'OpusFlow: Agent Authentication Status'
        });

        if (selected && selected.label.startsWith('❌')) {
            await this.setupApiKeys();
        }
    }
}

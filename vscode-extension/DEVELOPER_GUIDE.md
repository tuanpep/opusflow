# OpusFlow VSCode Extension - Developer Guide

## 🚀 Quick Start

### Running in Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run extension (in VSCode)
Press F5
```

### Project Structure

```
src/
├── auth/          # Authentication providers
├── cli/           # CLI integration
├── commands/      # Command handlers
├── models/        # Type definitions
├── ui/            # UI components
├── utils/         # Utilities
└── extension.ts   # Entry point
```

## 🏗️ Architecture

### Extension Lifecycle

```typescript
activate() {
    // 1. Initialize components
    - AuthManager
    - FileWatcher
    - CLI Wrapper
    - WebviewProvider
    
    // 2. Register commands
    - createPlan
    - verifyPlan
    - executeWorkflow
    - openWorkflow
    - selectAgent
    - authenticateAgent
    
    // 3. Setup tree view
    - OpusFlowExplorerProvider
    
    // 4. Show status bar
}

deactivate() {
    // Cleanup resources
}
```

### Component Communication

```
┌─────────────────┐
│   Extension     │
│   (extension.ts)│
└────────┬────────┘
         │
    ┌────┴──────────────────────┐
    │                           │
┌───▼───────┐          ┌────────▼──────┐
│  Commands │          │  UI Components│
└───┬───────┘          └────────┬──────┘
    │                           │
┌───▼──────────┐       ┌────────▼────────┐
│ CLI Wrapper  │       │  Webview Panel  │
└──────────────┘       └─────────────────┘
```

## 📝 Adding a New Command

### 1. Define Command in package.json

```json
{
  "contributes": {
    "commands": [
      {
        "command": "opusflow.myCommand",
        "title": "OpusFlow: My Command",
        "icon": "$(icon-name)"
      }
    ]
  }
}
```

### 2. Create Command Handler

```typescript
// src/commands/myCommands.ts
export class MyCommands {
    constructor(private cli: OpusFlowWrapper) {}
    
    public async myCommand() {
        // Implementation
    }
}
```

### 3. Register in extension.ts

```typescript
const myHandlers = new MyCommands(cli);

const myCmd = vscode.commands.registerCommand(
    'opusflow.myCommand',
    () => myHandlers.myCommand()
);

context.subscriptions.push(myCmd);
```

## 🔐 Adding a New Auth Provider

### 1. Create Provider Class

```typescript
// src/auth/myAuth.ts
import { IAuthProvider, AuthProviderType, AuthSession } from './types';

export class MyAuth implements IAuthProvider {
    public readonly type = AuthProviderType.MyProvider;
    
    constructor(private secretManager: SecretManager) {}
    
    public async login(): Promise<AuthSession> {
        // Get credentials
        const token = await vscode.window.showInputBox({
            prompt: 'Enter token',
            password: true
        });
        
        if (!token) {
            throw new Error('Token required');
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
```

### 2. Update Types

```typescript
// src/auth/types.ts
export enum AuthProviderType {
    Cursor = 'cursor-agent',
    Gemini = 'gemini-cli',
    Claude = 'claude-cli',
    MyProvider = 'my-provider' // Add new type
}
```

### 3. Register in AuthManager

```typescript
// src/auth/authManager.ts
import { MyAuth } from './myAuth';

constructor(context: vscode.ExtensionContext) {
    this.secretManager = new SecretManager(context.secrets);
    
    this.providers.set(AuthProviderType.Cursor, new CursorAuth(this.secretManager));
    this.providers.set(AuthProviderType.Gemini, new GeminiAuth(this.secretManager));
    this.providers.set(AuthProviderType.Claude, new ClaudeAuth(this.secretManager));
    this.providers.set(AuthProviderType.MyProvider, new MyAuth(this.secretManager)); // Add here
}
```

## 🎨 Customizing the UI

### Adding a New Tab

#### 1. Update HTML in workflowWebview.ts

```typescript
private _getHtmlForWebview(webview: vscode.Webview) {
    return `
        <div class="tabs-nav">
            <!-- Existing tabs -->
            <div class="tab" onclick="openTab('mytab')">My Tab</div>
        </div>
        
        <!-- Existing tab contents -->
        
        <div id="mytab" class="tab-content">
            <div class="card">
                <h2>My Custom Tab</h2>
                <div id="mytab-content">Content here</div>
            </div>
        </div>
    `;
}
```

#### 2. Add Method to Update Tab

```typescript
public updateMyTab(content: string) {
    this._panel.webview.postMessage({ 
        command: 'updateMyTab', 
        content 
    });
}
```

#### 3. Handle in Client JS

```javascript
// resources/webview/js/main.js
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateMyTab':
            document.getElementById('mytab-content').innerHTML = message.content;
            break;
    }
});
```

## 🔧 Debugging

### Enable Debug Logging

```typescript
// In extension.ts
const outputChannel = vscode.window.createOutputChannel('OpusFlow');
outputChannel.appendLine('Debug message');
outputChannel.show(); // Show panel
```

### Debug Webview

```typescript
// In workflowWebview.ts
webview.html = html.replace(
    '</head>',
    `<script>console.log('Webview loaded');</script></head>`
);
```

Open DevTools: `Help → Toggle Developer Tools`

### Common Issues

**CLI Not Found**
```typescript
// Check path
const isInstalled = await cli.isInstalled();
if (!isInstalled) {
    vscode.window.showErrorMessage('OpusFlow CLI not found');
}
```

**Webview Not Updating**
```typescript
// Ensure panel exists
if (!WorkflowWebview._currentPanel) {
    WorkflowWebview.createOrShow(extensionUri);
}
```

## 📊 State Management

### Extension State
```typescript
// Store global state
context.globalState.update('key', value);
const value = context.globalState.get('key');
```

### Webview State
```typescript
// In webview client
const vscode = acquireVsCodeApi();

// Save state
vscode.setState({ data: 'value' });

// Restore state
const state = vscode.getState();
```

### Secrets
```typescript
// Store sensitive data
const secretManager = new SecretManager(context.secrets);
await secretManager.store('key', 'secret-value');
const secret = await secretManager.get('key');
```

## 🧪 Testing

### Unit Tests

```typescript
// src/test/suite/myTest.test.ts
import * as assert from 'assert';
import { MyClass } from '../../myClass';

suite('My Test Suite', () => {
    test('Should work', () => {
        const instance = new MyClass();
        assert.strictEqual(instance.method(), 'expected');
    });
});
```

### Run Tests
```bash
npm test
```

## 📦 Building for Distribution

### Create VSIX Package

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Output: vscode-opusflow-0.1.0.vsix
```

### Publish to Marketplace

```bash
# Create publisher account at https://marketplace.visualstudio.com

# Login
vsce login <publisher>

# Publish
vsce publish
```

## 🎯 Best Practices

### 1. Error Handling
```typescript
try {
    await riskyOperation();
} catch (error: any) {
    vscode.window.showErrorMessage(`Failed: ${error.message}`);
    outputChannel.appendLine(`Error: ${error.stack}`);
}
```

### 2. Progress Indication
```typescript
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Processing...',
    cancellable: false
}, async (progress) => {
    progress.report({ increment: 0 });
    await step1();
    progress.report({ increment: 50 });
    await step2();
    progress.report({ increment: 100 });
});
```

### 3. User Input Validation
```typescript
const input = await vscode.window.showInputBox({
    prompt: 'Enter name',
    validateInput: (value) => {
        return value.length < 3 ? 'Name too short' : null;
    }
});
```

### 4. Async Operations
```typescript
// Always use async/await
public async myCommand() {
    await this.doSomething();
}

// Handle promises
Promise.all([op1(), op2(), op3()])
    .then(() => console.log('Done'))
    .catch(err => console.error(err));
```

## 📚 Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and test
4. Commit: `git commit -am 'Add feature'`
5. Push: `git push origin feature/my-feature`
6. Open Pull Request

---

**Happy coding! 🚀**

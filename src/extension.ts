import * as vscode from 'vscode';
import { InspectVariablePanel } from './webview/InspectVariablePanel';
import { Logger } from './utils/logger';

export function activate(context: vscode.ExtensionContext): void {
    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Inspect Variable');
    
    // Create logger instance
    const logger = new Logger(outputChannel);
    
    // Create panel manager instance
    const panelManager = new InspectVariablePanel(logger);
    
    // Register the command
    const disposable = vscode.commands.registerCommand(
        'inspect-variable.inspectVariable',
        (variable: unknown) => {
            panelManager.createPanel(variable);
        }
    );

    context.subscriptions.push(disposable);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push({ dispose: () => logger.dispose() });
    context.subscriptions.push({ dispose: () => panelManager.dispose() });
}

export function deactivate(): void {
    // Cleanup is handled by VS Code calling dispose on subscriptions
}

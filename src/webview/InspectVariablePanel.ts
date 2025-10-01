import * as vscode from 'vscode';
import { getWebviewContent } from '../webviewContent';
import { Logger } from '../utils/logger';
import { DebugVariable, MESSAGE_COMMANDS, GetChildrenMessage, InspectVariableMessage } from '../types';

export class InspectVariablePanel {
    private disposables: vscode.Disposable[] = [];

    constructor(private logger: Logger) {}

    public createPanel(variable: unknown): void {
        const startTime = performance.now();

        try {
            // Validate input
            const varData = this.extractVariableData(variable);
            const variableName = varData.name;

            // Log for debugging
            this.logger.log('=== Inspect Variable Command Triggered ===');
            this.logger.logObject('Variable object', variable);
            this.logger.log('Variable keys: ' + Object.keys(variable ?? {}).join(', '));
            this.logger.show();

            this.logger.log(`Extracted name: ${variableName}`);
            this.logger.logObject('Variable data', varData);

            // Create and show the webview panel
            const panel = vscode.window.createWebviewPanel(
                'inspectVariable',
                `Inspect: ${variableName}`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            // Set the webview content
            panel.webview.html = getWebviewContent(variableName, varData);

            // Set up message handler for the webview
            this.setupMessageHandler(panel);

            // Handle panel disposal
            panel.onDidDispose(() => {
                const index = this.disposables.indexOf(panel);
                if (index > -1) {
                    this.disposables.splice(index, 1);
                }
            });

            this.disposables.push(panel);

            // Log performance (only in debug mode)
            const duration = performance.now() - startTime;
            this.logger.logPerformance('Panel creation', duration);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to create inspect panel: ${errorMessage}`);
            this.logger.log(`Error creating panel: ${errorMessage}`);
        }
    }

    private extractVariableData(variable: unknown): DebugVariable {
        // Type guard for variable container
        if (!variable || typeof variable !== 'object') {
            throw new Error(`Variable must be object, got ${typeof variable}`);
        }

        const container = variable as Record<string, unknown>;
        const varData = container['variable'] ?? variable;

        // Validate required fields
        if (!varData || typeof varData !== 'object') {
            throw new Error(`Variable data must be object, got ${typeof varData}`);
        }

        const data = varData as Record<string, unknown>;

        // Ensure we have at least a name
        if (!data['name'] || typeof data['name'] !== 'string') {
            throw new Error(`Variable must have string name, got ${typeof data['name']}`);
        }

        return {
            name: data['name'],
            value: typeof data['value'] === 'string' ? data['value'] : '',
            type: typeof data['type'] === 'string' ? data['type'] : undefined,
            variablesReference: typeof data['variablesReference'] === 'number' ? data['variablesReference'] : 0,
            evaluateName: typeof data['evaluateName'] === 'string' ? data['evaluateName'] : undefined
        };
    }

    private setupMessageHandler(panel: vscode.WebviewPanel): void {
        const messageDisposable = panel.webview.onDidReceiveMessage(
            async (message: unknown) => {
                try {
                    if (!message || typeof message !== 'object') {
                        return;
                    }

                    const msg = message as Record<string, unknown>;
                    
                    if (msg['command'] === MESSAGE_COMMANDS.GET_CHILDREN) {
                        await this.handleGetChildren(panel, msg as unknown as GetChildrenMessage);
                    } else if (msg['command'] === MESSAGE_COMMANDS.INSPECT_VARIABLE) {
                        this.handleInspectVariable(msg as unknown as InspectVariableMessage);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.log(`Error handling message: ${errorMessage}`);
                }
            }
        );

        // Dispose message handler when panel is disposed
        panel.onDidDispose(() => {
            messageDisposable.dispose();
        });
    }

    private async handleGetChildren(panel: vscode.WebviewPanel, message: GetChildrenMessage): Promise<void> {
        const session = vscode.debug.activeDebugSession;
        
        if (!session) {
            this.logger.log('No active debug session');
            panel.webview.postMessage({
                command: MESSAGE_COMMANDS.CHILDREN_RESPONSE,
                id: message.id,
                variables: []
            });
            return;
        }

        if (!message.variablesReference) {
            this.logger.log('No variablesReference provided');
            panel.webview.postMessage({
                command: MESSAGE_COMMANDS.CHILDREN_RESPONSE,
                id: message.id,
                variables: []
            });
            return;
        }

        try {
            const response = await session.customRequest('variables', {
                variablesReference: message.variablesReference
            }) as { variables?: DebugVariable[] };

            void panel.webview.postMessage({
                command: MESSAGE_COMMANDS.CHILDREN_RESPONSE,
                id: message.id,
                variables: response.variables ?? []
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.log(`Failed to get children: ${errorMessage}`);
            
            void panel.webview.postMessage({
                command: MESSAGE_COMMANDS.CHILDREN_RESPONSE,
                id: message.id,
                variables: []
            });
        }
    }

    private handleInspectVariable(message: InspectVariableMessage): void {
        if (!message.variable) {
            this.logger.log('No variable provided for inspection');
            return;
        }

        // Create a new panel for the nested variable
        this.createPanel(message.variable);
    }

    public dispose(): void {
        this.disposables.forEach(d => {
            d.dispose();
        });
        this.disposables = [];
    }
}

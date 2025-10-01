import * as vscode from 'vscode';

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private isDebugMode = false;
    private configSubscription: vscode.Disposable;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.updateDebugMode();
        
        this.configSubscription = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('inspect-variable.enableDebugLogging')) {
                this.updateDebugMode();
            }
        });
    }

    private updateDebugMode(): void {
        const config = vscode.workspace.getConfiguration('inspect-variable');
        this.isDebugMode = config.get<boolean>('enableDebugLogging', false);
    }

    public log(message: string): void {
        if (this.isDebugMode) {
            this.outputChannel.appendLine(message);
        }
    }

    public show(): void {
        if (this.isDebugMode) {
            this.outputChannel.show(true);
        }
    }

    public logObject(label: string, obj: unknown): void {
        if (!this.isDebugMode) {
            return;
        }

        try {
            this.outputChannel.appendLine(`${label}: ${JSON.stringify(obj, null, 2)}`);
        } catch {
            this.outputChannel.appendLine(`${label}: [Unable to stringify object]`);
        }
    }

    public logPerformance(operation: string, durationMs: number): void {
        if (this.isDebugMode) {
            this.outputChannel.appendLine(`Performance: ${operation} took ${durationMs.toFixed(2)}ms`);
        }
    }

    public dispose(): void {
        this.configSubscription?.dispose();
    }
}

// This code runs in the webview context (browser-like environment)

interface VsCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

interface PendingRequest {
    resolve: (data: DebugVariable[]) => void;
    reject: (error: Error) => void;
}

interface DebugVariable {
    name: string;
    value: string;
    type?: string;
    variablesReference: number;
    evaluateName?: string;
}

interface Message {
    command: string;
    id?: number;
    variables?: DebugVariable[];
}

const vscode = acquireVsCodeApi();
let requestCounter = 0;
const pendingRequests = new Map<number, PendingRequest>();
const variableDataMap = new Map<string, DebugVariable>();
let contextMenuTargetId: string | null = null;

// Constants
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MESSAGE_COMMANDS = {
    GET_CHILDREN: 'getChildren',
    CHILDREN_RESPONSE: 'childrenResponse',
    INSPECT_VARIABLE: 'inspectVariable'
} as const;

// Initialize root variable data
const rootElement = document.querySelector('[data-variable]');
if (rootElement) {
    try {
        const varDataAttr = rootElement.getAttribute('data-variable');
        if (varDataAttr) {
            const varData = JSON.parse(varDataAttr) as DebugVariable;
            variableDataMap.set('0', varData);
        }
    } catch (error) {
        console.error('Failed to parse root variable data:', error);
    }
}

// Handle messages from extension
window.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as Message;
    if (message.command === MESSAGE_COMMANDS.CHILDREN_RESPONSE && message.id !== undefined) {
        const callback = pendingRequests.get(message.id);
        if (callback) {
            callback.resolve(message.variables ?? []);
            pendingRequests.delete(message.id);
        }
    }
});

// Close context menu when clicking elsewhere
document.addEventListener('click', () => {
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.style.display = 'none';
    }
});

// Prevent default context menu
document.addEventListener('contextmenu', (e: Event) => {
    e.preventDefault();
});

// Event delegation for click handlers (prevents XSS)
document.addEventListener('click', (event: Event) => {
    const target = event.target as HTMLElement;
    
    // Handle tree expansion
    const clickable = target.closest('.tree-clickable');
    if (clickable) {
        const id = clickable.getAttribute('data-id');
        const refStr = clickable.getAttribute('data-ref');
        if (id && refStr) {
            const ref = parseInt(refStr, 10);
            if (!isNaN(ref) && ref > 0) {
                void toggleExpand(id, ref);
            }
        }
    }
});

// Event delegation for context menu
document.addEventListener('contextmenu', (event: Event) => {
    if (!(event instanceof MouseEvent)) {
        return;
    }
    
    const target = event.target as HTMLElement;
    const nameElement = target.closest('.tree-name');
    
    if (nameElement) {
        const id = nameElement.getAttribute('data-id');
        if (id) {
            showContextMenu(event, id);
        }
    }
});

async function toggleExpand(id: string, variablesReference: number): Promise<void> {
    const icon = document.getElementById('icon-' + id);
    const children = document.getElementById('children-' + id);
    
    if (!children) {
        return;
    }
    
    const isExpanded = children.classList.contains('expanded');
    
    if (isExpanded) {
        // Collapse
        children.classList.remove('expanded');
        if (icon) {
            icon.classList.remove('expanded');
        }
    } else {
        // Expand - check if we need to load children
        const loaded = children.getAttribute('data-loaded');
        if (!loaded && variablesReference > 0) {
            // Show loading indicator
            children.innerHTML = '<div style="margin-left: 20px; color: var(--vscode-descriptionForeground);">Loading...</div>';
            
            try {
                // Request children from extension with timeout
                const variables = await requestChildrenWithTimeout(variablesReference);
                
                // Build HTML for children
                let html = '';
                for (let i = 0; i < variables.length; i++) {
                    const variable = variables[i];
                    if (variable) {
                        html += buildVariableHtml(variable, id + '-' + i);
                    }
                }
                children.innerHTML = html;
                children.setAttribute('data-loaded', 'true');
            } catch (error) {
                children.innerHTML = `<div style="margin-left: 20px; color: var(--vscode-errorForeground);">Error: ${escapeHtml(String(error))}</div>`;
                console.error('Failed to load children:', error);
            }
        }
        
        children.classList.add('expanded');
        if (icon) {
            icon.classList.add('expanded');
        }
    }
}

function requestChildrenWithTimeout(variablesReference: number): Promise<DebugVariable[]> {
    const requestId = requestCounter++;
    
    return new Promise<DebugVariable[]>((resolve, reject) => {
        // Set up timeout
        const timeoutId = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error('Request timed out'));
        }, REQUEST_TIMEOUT_MS);
        
        // Store resolve/reject with cleanup
        pendingRequests.set(requestId, {
            resolve: (data: DebugVariable[]) => {
                clearTimeout(timeoutId);
                resolve(data);
            },
            reject: (error: Error) => {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
        
        // Send request
        vscode.postMessage({
            command: MESSAGE_COMMANDS.GET_CHILDREN,
            id: requestId,
            variablesReference: variablesReference
        });
    });
}

function buildVariableHtml(variable: DebugVariable, id: string): string {
    // Store variable data for context menu
    variableDataMap.set(id, variable);
    
    const hasChildren = variable.variablesReference > 0;
    const iconClass = hasChildren ? 'expandable' : 'leaf';
    
    // Use data attributes instead of inline handlers
    const dataAttrs = hasChildren 
        ? `data-id="${escapeHtml(id)}" data-ref="${variable.variablesReference}"` 
        : '';
    
    let html = `<div class="tree-item">`;
    html += `<div class="tree-clickable" ${dataAttrs}>`;
    html += `<span class="tree-icon ${iconClass}" id="icon-${escapeHtml(id)}"></span>`;
    html += `<span class="tree-name" data-id="${escapeHtml(id)}">${escapeHtml(variable.name)}</span>`;
    html += `</div>`;
    
    if (hasChildren) {
        // Show type/preview if available
        if (variable.type) {
            html += `<span class="tree-type">${escapeHtml(variable.type)}</span>`;
        }
        if (variable.value) {
            html += `<span class="tree-preview">${escapeHtml(variable.value)}</span>`;
        }
    } else {
        // Leaf node - show value
        html += `<span class="tree-separator">:</span>`;
        const valueClass = getValueClass(variable.value);
        html += `<span class="tree-value ${valueClass}">${escapeHtml(variable.value ?? '')}</span>`;
    }
    
    html += `</div>`;
    
    if (hasChildren) {
        html += `<div class="tree-children" id="children-${escapeHtml(id)}"></div>`;
    }
    
    return html;
}

function getValueClass(value: string): string {
    if (!value) {
        return '';
    }
    const str = String(value).trim();
    if (/^-?\d+$/.test(str) || /^-?\d*\.\d+$/.test(str)) {
        return 'number';
    }
    if (str === 'true' || str === 'false' || str === 'True' || str === 'False') {
        return 'boolean';
    }
    if (str === 'null' || str === 'None' || str === 'undefined') {
        return 'null';
    }
    return 'string';
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showContextMenu(event: MouseEvent, id: string): boolean {
    event.preventDefault();
    event.stopPropagation();
    
    const menu = document.getElementById('context-menu');
    if (!menu) {
        return false;
    }
    
    contextMenuTargetId = id;
    
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    
    return false;
}

function inspectFromContextMenu(): void {
    if (contextMenuTargetId) {
        const variable = variableDataMap.get(contextMenuTargetId);
        if (variable) {
            vscode.postMessage({
                command: MESSAGE_COMMANDS.INSPECT_VARIABLE,
                variable: variable
            });
        }
    }
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.style.display = 'none';
    }
}

function copyToClipboard(): void {
    const content = document.getElementById('variable-content');
    if (!content) {
        return;
    }
    
    navigator.clipboard.writeText(content.innerText).then(() => {
        const message = document.getElementById('copied-message');
        if (message) {
            message.classList.add('show');
            setTimeout(() => {
                message.classList.remove('show');
            }, 2000);
        }
    }).catch((error: unknown) => {
        console.error('Failed to copy to clipboard:', error);
    });
}

// Expose functions to global scope for HTML onclick handlers
window.copyToClipboard = copyToClipboard;
window.inspectFromContextMenu = inspectFromContextMenu;


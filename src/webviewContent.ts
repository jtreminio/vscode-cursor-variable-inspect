import * as fs from 'fs';
import * as path from 'path';
import { escapeHtml } from './utils/htmlUtils';
import { DebugVariable } from './types';

// Cache the file contents
let templateCache: string | null = null;
let stylesCache: string | null = null;
let scriptCache: string | null = null;

function loadFile(filename: string): string {
    try {
        // Files are copied to out/webview/ during build
        const filePath = path.join(__dirname, 'webview', filename);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load ${filename}: ${errorMessage}`);
    }
}

export function getWebviewContent(variableName: string, variableData: DebugVariable): string {
    try {
        // Load files on first use (cached for subsequent calls)
        templateCache ??= loadFile('template.html');
        stylesCache ??= loadFile('styles.css');
        scriptCache ??= loadFile('client.js');

        // Build tree HTML from the raw variable data
        const treeHtml = buildTreeHtmlFromVariable(variableName, variableData, '0');

        // Replace placeholders in template
        return templateCache
            .replace(/\{\{VARIABLE_NAME\}\}/g, variableName)
            .replace(/\{\{VARIABLE_NAME_ESCAPED\}\}/g, escapeHtml(variableName))
            .replace(/\{\{STYLES\}\}/g, stylesCache)
            .replace(/\{\{SCRIPT\}\}/g, scriptCache)
            .replace(/\{\{TREE_HTML\}\}/g, treeHtml);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return getErrorWebviewContent(variableName, errorMessage);
    }
}

function getErrorWebviewContent(variableName: string, error: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Inspect: ${escapeHtml(variableName)}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .error-container {
            border: 1px solid var(--vscode-errorForeground);
            padding: 16px;
            border-radius: 4px;
        }
        h2 { margin-top: 0; }
        pre {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h2>⚠️ Failed to Load Inspect View</h2>
        <p>Variable: <strong>${escapeHtml(variableName)}</strong></p>
        <p>Error:</p>
        <pre>${escapeHtml(error)}</pre>
    </div>
</body>
</html>`;
}

function buildTreeHtmlFromVariable(name: string, variable: DebugVariable, id: string): string {
    const hasChildren = variable.variablesReference > 0;
    const iconClass = hasChildren ? 'expandable' : 'leaf';
    
    // Use data attributes instead of inline handlers for security
    const dataAttrs = hasChildren 
        ? `data-id="${escapeHtml(id)}" data-ref="${variable.variablesReference}"` 
        : '';
    
    // Store variable data in the HTML for retrieval
    const variableDataJson = escapeHtml(JSON.stringify(variable));
    
    let html = `<div class="tree-item">`;
    html += `<div class="tree-clickable" ${dataAttrs}>`;
    html += `<span class="tree-icon ${iconClass}" id="icon-${escapeHtml(id)}"></span>`;
    html += `<span class="tree-name" data-id="${escapeHtml(id)}" data-variable='${variableDataJson}'>${escapeHtml(name)}</span>`;
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
        // Leaf node - show value with proper formatting
        html += `<span class="tree-separator">:</span>`;
        html += `<span class="tree-value ${getValueClassFromString(variable.value)}">${escapeHtml(formatDebugValue(variable.value))}</span>`;
    }
    
    html += `</div>`;
    
    // Add children container if it has children (will be loaded on demand)
    if (hasChildren) {
        html += `<div class="tree-children" id="children-${escapeHtml(id)}"></div>`;
    }
    
    return html;
}

function getValueClassFromString(value: string): string {
    if (!value) {
        return '';
    }
    const str = value.trim();
    // Check if it's a number
    if (/^-?\d+$/.test(str) || /^-?\d*\.\d+$/.test(str)) {
        return 'number';
    }
    // Check if it's a boolean
    if (str === 'true' || str === 'false' || str === 'True' || str === 'False') {
        return 'boolean';
    }
    // Check if it's null/None/undefined
    if (str === 'null' || str === 'None' || str === 'undefined') {
        return 'null';
    }
    return 'string';
}

function formatDebugValue(value: string): string {
    if (!value) {
        return '';
    }
    // Parse escape sequences for display
    return value
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');
}

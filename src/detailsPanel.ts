import * as vscode from 'vscode';
import { UsageData } from './usageService';

export class DetailsPanel {
    public static currentPanel: DetailsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, usage: UsageData) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DetailsPanel.currentPanel) {
            DetailsPanel.currentPanel.panel.reveal(column);
            DetailsPanel.currentPanel.update(usage);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'copilotUsageDetails',
            'Copilot Usage Details',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        DetailsPanel.currentPanel = new DetailsPanel(panel, usage);
    }

    private constructor(panel: vscode.WebviewPanel, usage: UsageData) {
        this.panel = panel;
        this.update(usage);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public update(usage: UsageData) {
        this.panel.webview.html = this.getHtmlContent(usage);
    }

    private getHtmlContent(usage: UsageData): string {
        const remaining = usage.quota - usage.used;
        const resetDateStr = usage.resetDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const now = new Date();
        const daysUntilReset = Math.ceil((usage.resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Determine status color
        let statusColor = '#4caf50'; // green
        let statusText = 'Good';
        if (usage.percentage >= 100) {
            statusColor = '#f44336'; // red
            statusText = 'Limit Reached';
        } else if (usage.percentage >= 80) {
            statusColor = '#ff9800'; // orange
            statusText = 'Warning';
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Usage Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .usage-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .progress-container {
            background: var(--vscode-progressBar-background);
            border-radius: 10px;
            height: 24px;
            overflow: hidden;
            margin: 15px 0;
        }
        .progress-bar {
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
            background: ${statusColor};
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        .stat-item {
            background: var(--vscode-input-background);
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .stat-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            background: ${statusColor};
            color: white;
        }
        .source-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            margin-left: 8px;
        }
        .info-text {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
             Copilot Premium Requests
            <span class="source-badge">${usage.source === 'internal' ? 'Auto-detected' : 'PAT'}</span>
        </h1>
        
        <div class="usage-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px;">${usage.used} / ${usage.quota} requests used</span>
                <span class="status-badge">${statusText}</span>
            </div>
            
            <div class="progress-container">
                <div class="progress-bar" style="width: ${Math.min(usage.percentage, 100)}%"></div>
            </div>
            
            <div style="text-align: center; font-size: 14px; color: var(--vscode-descriptionForeground);">
                ${usage.percentage}% used
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${remaining}</div>
                <div class="stat-label">Remaining</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${daysUntilReset}</div>
                <div class="stat-label">Days Until Reset</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${usage.quota}</div>
                <div class="stat-label">Monthly Quota</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${usage.percentage}%</div>
                <div class="stat-label">Usage Rate</div>
            </div>
        </div>

        <p class="info-text">
            <strong>Reset Date:</strong> ${resetDateStr}<br>
            <strong>Data Source:</strong> ${usage.source === 'internal' ? 'GitHub Copilot Internal API (automatic)' : 'GitHub Billing API (PAT required)'}
        </p>
    </div>
</body>
</html>`;
    }

    public dispose() {
        DetailsPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }
}

import * as vscode from 'vscode';
import { UsageData, UsageItem } from './usageService';

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
                retainContextWhenHidden: true
            }
        );

        DetailsPanel.currentPanel = new DetailsPanel(panel, usage);
    }

    private constructor(panel: vscode.WebviewPanel, usage: UsageData) {
        this.panel = panel;
        this.update(usage);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        vscode.commands.executeCommand('copilot-usage-tracker.refresh');
                        return;
                    case 'openSettings':
                        vscode.commands.executeCommand('workbench.action.openSettings', 'copilotUsageTracker');
                        return;
                }
            },
            null,
            this.disposables
        );
    }

    public update(usage: UsageData) {
        this.panel.webview.html = this.getHtmlContent(usage);
    }

    private getHtmlContent(usage: UsageData): string {
        const percentage = usage.percentage;
        const progressColor = percentage >= 100 ? '#f44336' : percentage >= 80 ? '#ff9800' : '#4caf50';
        
        const resetDateStr = usage.resetDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const now = new Date();
        const daysUntilReset = Math.ceil((usage.resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const itemsHtml = usage.items.length > 0
            ? usage.items.map(item => this.renderUsageItem(item)).join('')
            : '<tr><td colspan="4" style="text-align: center; color: #888;">No usage data for this period</td></tr>';

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
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        h1 {
            margin: 0;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .actions {
            display: flex;
            gap: 8px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 13px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .card {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .usage-main {
            text-align: center;
            padding: 20px 0;
        }
        .usage-number {
            font-size: 48px;
            font-weight: bold;
            color: ${progressColor};
        }
        .usage-label {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
        }
        .progress-container {
            background-color: var(--vscode-progressBar-background);
            border-radius: 10px;
            height: 20px;
            margin: 20px 0;
            overflow: hidden;
        }
        .progress-bar {
            background-color: ${progressColor};
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
            width: ${Math.min(percentage, 100)}%;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }
        .stat-item {
            text-align: center;
            padding: 12px;
            background-color: var(--vscode-editor-background);
            border-radius: 6px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        .stat-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        th {
            font-weight: 600;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .model-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
        }
        .footer {
            text-align: center;
            margin-top: 24px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Copilot Premium Usage</h1>
        <div class="actions">
            <button onclick="refresh()">🔄 Refresh</button>
            <button onclick="openSettings()">⚙️ Settings</button>
        </div>
    </div>

    <div class="card">
        <div class="usage-main">
            <div class="usage-number">${percentage}%</div>
            <div class="usage-label">${usage.used} of ${usage.limit} premium requests used</div>
        </div>
        <div class="progress-container">
            <div class="progress-bar"></div>
        </div>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${usage.used}</div>
                <div class="stat-label">Requests Used</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${usage.limit - usage.used}</div>
                <div class="stat-label">Remaining</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${daysUntilReset}</div>
                <div class="stat-label">Days Until Reset</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">$${usage.billedAmount.toFixed(2)}</div>
                <div class="stat-label">Billed Amount</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>Usage Breakdown by Model</h2>
        <table>
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Requests</th>
                    <th>In Allowance</th>
                    <th>Billed</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>Plan: ${this.formatPlanName(usage.plan)} | Resets on: ${resetDateStr}</p>
        <p>Data is cached for 1 minute. Click Refresh to update.</p>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }
    </script>
</body>
</html>`;
    }

    private renderUsageItem(item: UsageItem): string {
        return `
            <tr>
                <td><span class="model-badge">${item.model || 'Unknown'}</span></td>
                <td>${item.grossQuantity}</td>
                <td>${item.discountQuantity}</td>
                <td>$${item.netAmount.toFixed(2)}</td>
            </tr>
        `;
    }

    private formatPlanName(plan: string): string {
        const names: Record<string, string> = {
            'free': 'Free (50/month)',
            'pro': 'Pro (300/month)',
            'pro_plus': 'Pro+ (1500/month)',
            'business': 'Business (300/user/month)',
            'enterprise': 'Enterprise (1000/user/month)'
        };
        return names[plan] || plan;
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

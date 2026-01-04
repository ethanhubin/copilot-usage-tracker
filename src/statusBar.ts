import * as vscode from 'vscode';
import { UsageData } from './usageService';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            'copilot-usage-tracker',
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'copilot-usage-tracker.showDetails';
        this.statusBarItem.name = 'Copilot Usage Tracker';
        this.showNoToken();
        this.statusBarItem.show();
    }

    updateUsage(usage: UsageData) {
        const config = vscode.workspace.getConfiguration('copilotUsageTracker');
        const showPercentage = config.get<boolean>('showPercentage', true);
        const warningThreshold = config.get<number>('warningThreshold', 80);

        // Format display text
        let text: string;
        if (showPercentage) {
            text = `$(rocket) ${usage.used}/${usage.limit} (${usage.percentage}%)`;
        } else {
            text = `$(rocket) ${usage.used}/${usage.limit}`;
        }

        this.statusBarItem.text = text;

        // Set color based on usage percentage
        if (usage.percentage >= 100) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        } else if (usage.percentage >= warningThreshold) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.color = undefined;
        }

        // Calculate days until reset
        const now = new Date();
        const daysUntilReset = Math.ceil((usage.resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Set tooltip
        this.statusBarItem.tooltip = new vscode.MarkdownString(
            `**Copilot Premium Requests**\n\n` +
            `- **Used**: ${usage.used} / ${usage.limit}\n` +
            `- **Percentage**: ${usage.percentage}%\n` +
            `- **Plan**: ${this.formatPlanName(usage.plan)}\n` +
            `- **Resets in**: ${daysUntilReset} day(s)\n` +
            `- **Billed**: $${usage.billedAmount.toFixed(2)}\n\n` +
            `_Click to view details_`
        );
    }

    showLoading() {
        this.statusBarItem.text = '$(loading~spin) Copilot...';
        this.statusBarItem.tooltip = 'Fetching usage data...';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
    }

    showNoToken() {
        this.statusBarItem.text = '$(rocket) Copilot: No Token';
        this.statusBarItem.tooltip = 'Click to set GitHub token';
        this.statusBarItem.command = 'copilot-usage-tracker.setToken';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = new vscode.ThemeColor('disabledForeground');
    }

    showError(message: string) {
        this.statusBarItem.text = '$(error) Copilot: Error';
        this.statusBarItem.tooltip = message;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        this.statusBarItem.command = 'copilot-usage-tracker.showDetails';
    }

    private formatPlanName(plan: string): string {
        const names: Record<string, string> = {
            'free': 'Free',
            'pro': 'Pro',
            'pro_plus': 'Pro+',
            'business': 'Business',
            'enterprise': 'Enterprise'
        };
        return names[plan] || plan;
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

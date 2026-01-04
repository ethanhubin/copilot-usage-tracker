import * as vscode from 'vscode';
import { UsageData } from './usageService';

export type DisplayMode = 'normal' | 'progress' | 'minimal';

const MODE_NAMES: Record<DisplayMode, string> = {
    normal: 'Normal',
    progress: 'Progress Bar',
    minimal: 'Minimal'
};

const MODE_ORDER: DisplayMode[] = ['normal', 'progress', 'minimal'];

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private displayMode: DisplayMode = 'normal';
    private currentUsage: UsageData | null = null;
    private toggleCommand: vscode.Disposable;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(
            'copilot-usage-tracker',
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.name = 'Copilot Usage Realtime';

        // Register toggle command
        this.toggleCommand = vscode.commands.registerCommand(
            'copilot-usage-tracker.toggleDisplayMode',
            () => this.toggleDisplayMode()
        );
        context.subscriptions.push(this.toggleCommand);

        // Default: click to toggle display mode
        this.statusBarItem.command = 'copilot-usage-tracker.toggleDisplayMode';

        // Restore display mode from config
        this.displayMode = context.globalState.get<DisplayMode>('displayMode', 'normal');

        this.showNoToken();
        this.statusBarItem.show();
    }

    private toggleDisplayMode() {
        // Cycle through modes: normal -> progress -> minimal -> normal
        const currentIndex = MODE_ORDER.indexOf(this.displayMode);
        const nextIndex = (currentIndex + 1) % MODE_ORDER.length;
        this.displayMode = MODE_ORDER[nextIndex];

        // Save to global state
        this.context.globalState.update('displayMode', this.displayMode);

        // Refresh display
        if (this.currentUsage) {
            this.updateUsage(this.currentUsage);
        }

        vscode.window.setStatusBarMessage(
            `Copilot Usage: ${MODE_NAMES[this.displayMode]} mode`,
            2000
        );
    }

    private createProgressBar(percentage: number, width: number = 10): string {
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;

        const filledChar = '\u2588';
        const emptyChar = '\u2591';

        return filledChar.repeat(Math.min(filled, width)) + emptyChar.repeat(Math.max(empty, 0));
    }

    updateUsage(usage: UsageData) {
        this.currentUsage = usage;

        const config = vscode.workspace.getConfiguration('copilotUsageTracker');
        const warningThreshold = config.get<number>('warningThreshold', 80);

        // Format text based on display mode
        let text: string;
        switch (this.displayMode) {
            case 'progress':
                const progressBar = this.createProgressBar(Math.min(usage.percentage, 100));
                text = `$(rocket) ${progressBar} ${usage.percentage}%`;
                break;
            case 'minimal':
                text = `$(rocket) ${usage.percentage}%`;
                break;
            case 'normal':
            default:
                text = `$(rocket) ${usage.used}/${usage.quota} (${usage.percentage}%)`;
                break;
        }

        this.statusBarItem.text = text;

        // Set color
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
        const remaining = usage.quota - usage.used;

        // Set tooltip
        this.statusBarItem.tooltip = new vscode.MarkdownString(
            `**Copilot Premium Requests**\n\n` +
            `- **Used**: ${usage.used} / ${usage.quota}\n` +
            `- **Remaining**: ${remaining}\n` +
            `- **Percentage**: ${usage.percentage}%\n` +
            `- **Source**: ${usage.source === 'internal' ? 'Auto-detected' : 'PAT'}\n` +
            `- **Resets in**: ${daysUntilReset} day(s)\n\n` +
            `_Click to switch display mode (${MODE_NAMES[this.displayMode]})_`
        );

        this.statusBarItem.command = 'copilot-usage-tracker.toggleDisplayMode';
    }

    showLoading() {
        this.statusBarItem.text = '$(loading~spin) Copilot...';
        this.statusBarItem.tooltip = 'Fetching usage data...';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
    }

    showNoToken() {
        this.statusBarItem.text = '$(rocket) Copilot: No Token';
        this.statusBarItem.tooltip = new vscode.MarkdownString(
            '**No authentication configured**\n\n' +
            'Click to set a Personal Access Token, or run\n' +
            '`Copilot Usage: Authenticate with GitHub` command\n' +
            'to try automatic detection.'
        );
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

    resetCommand() {
        this.statusBarItem.command = 'copilot-usage-tracker.toggleDisplayMode';
    }

    getDisplayMode(): DisplayMode {
        return this.displayMode;
    }

    dispose() {
        this.statusBarItem.dispose();
        this.toggleCommand.dispose();
    }
}

import * as vscode from 'vscode';
import { UsageService } from './usageService';
import { StatusBarManager } from './statusBar';
import { TokenManager } from './tokenManager';
import { DetailsPanel } from './detailsPanel';
import { getOutputChannel } from './copilotInternalApi';

let usageService: UsageService;
let statusBarManager: StatusBarManager;
let tokenManager: TokenManager;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = getOutputChannel();
    outputChannel.appendLine('Copilot Usage Realtime is now active!');
    console.log('Copilot Usage Realtime is now active!');

    // Initialize managers
    tokenManager = new TokenManager(context);
    usageService = new UsageService(tokenManager);
    statusBarManager = new StatusBarManager(context);

    // Register commands
    const refreshCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.refresh',
        () => refreshUsage(false)
    );

    const setTokenCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.setToken',
        () => setToken()
    );

    const showDetailsCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.showDetails',
        () => showDetails(context)
    );

    const clearTokenCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.clearToken',
        () => clearToken()
    );

    // New command: Authenticate with GitHub
    const authenticateCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.authenticate',
        () => authenticateGitHub()
    );

    // New command: Show logs
    const showLogsCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.showLogs',
        () => outputChannel.show()
    );

    context.subscriptions.push(
        refreshCommand,
        setTokenCommand,
        showDetailsCommand,
        clearTokenCommand,
        authenticateCommand,
        showLogsCommand,
        statusBarManager
    );

    // Initial refresh (silent, no user prompt)
    await refreshUsage(false);

    // Setup auto-refresh
    setupAutoRefresh();

    // Listen to configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('copilotUsageTracker')) {
            setupAutoRefresh();
            refreshUsage(false);
        }
    });
}

async function refreshUsage(promptUser: boolean = false) {
    try {
        statusBarManager.showLoading();

        // Try to fetch usage (internal API first, then PAT)
        const usage = await usageService.fetchUsage(promptUser);

        if (usage) {
            statusBarManager.updateUsage(usage);
        } else {
            // If failed, check if we have a token
            const hasToken = await tokenManager.hasToken();
            if (!hasToken) {
                statusBarManager.showNoToken();
            } else {
                statusBarManager.showError('Failed to fetch usage');
            }
        }
    } catch (error) {
        console.error('Error refreshing usage:', error);
        statusBarManager.showError('Error fetching usage');
    }
}

async function authenticateGitHub() {
    const outputChannel = getOutputChannel();
    outputChannel.show();
    outputChannel.appendLine('Starting GitHub authentication...');

    try {
        statusBarManager.showLoading();
        usageService.clearCache();

        // Try to fetch with user prompt enabled
        const usage = await usageService.fetchUsage(true);

        if (usage) {
            statusBarManager.updateUsage(usage);
            vscode.window.showInformationMessage(
                `GitHub authenticated! Usage: ${usage.used}/${usage.quota} (${usage.percentage}%)`
            );
        } else {
            outputChannel.appendLine('Authentication or API call failed');
            vscode.window.showErrorMessage(
                'Failed to authenticate or fetch usage. Check the Output panel for details.'
            );
            statusBarManager.showNoToken();
        }
    } catch (error) {
        outputChannel.appendLine(`Authentication error: ${error}`);
        vscode.window.showErrorMessage('Authentication failed. Check the Output panel for details.');
        statusBarManager.showError('Auth failed');
    }
}

async function setToken() {
    const token = await vscode.window.showInputBox({
        prompt: 'Enter your GitHub Personal Access Token (needs "Plan: read-only" permission)',
        password: true,
        placeHolder: 'ghp_xxxxxxxxxxxx',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Token cannot be empty';
            }
            if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
                return 'Token should start with "ghp_" or "github_pat_"';
            }
            return null;
        }
    });

    if (token) {
        await tokenManager.setToken(token);
        usageService.clearCache();
        vscode.window.showInformationMessage('GitHub token saved successfully!');
        await refreshUsage(false);
    }
}

async function clearToken() {
    const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear your GitHub token?',
        'Yes', 'No'
    );

    if (confirm === 'Yes') {
        await tokenManager.clearToken();
        usageService.clearCache();
        vscode.window.showInformationMessage('GitHub token cleared.');
        await refreshUsage(false);
    }
}

async function showDetails(context: vscode.ExtensionContext) {
    try {
        const usage = await usageService.fetchUsage(false);
        if (usage) {
            DetailsPanel.createOrShow(context.extensionUri, usage);
        } else {
            const action = await vscode.window.showWarningMessage(
                'No usage data available. Try authenticating with GitHub.',
                'Authenticate', 'Set PAT Token', 'Cancel'
            );
            if (action === 'Authenticate') {
                await authenticateGitHub();
            } else if (action === 'Set PAT Token') {
                await setToken();
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage('Failed to fetch usage details');
    }
}

function setupAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    const config = vscode.workspace.getConfiguration('copilotUsageTracker');
    const intervalSeconds = config.get<number>('refreshInterval', 300);
    const intervalMs = Math.max(60, intervalSeconds) * 1000;

    refreshInterval = setInterval(() => {
        refreshUsage(false);
    }, intervalMs);
}

export function deactivate() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

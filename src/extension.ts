import * as vscode from 'vscode';
import { UsageService } from './usageService';
import { StatusBarManager } from './statusBar';
import { TokenManager } from './tokenManager';
import { DetailsPanel } from './detailsPanel';

let usageService: UsageService;
let statusBarManager: StatusBarManager;
let tokenManager: TokenManager;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Usage Tracker is now active!');

    // Initialize managers
    tokenManager = new TokenManager(context);
    usageService = new UsageService(tokenManager);
    statusBarManager = new StatusBarManager();

    // Register commands
    const refreshCommand = vscode.commands.registerCommand(
        'copilot-usage-tracker.refresh',
        () => refreshUsage()
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

    context.subscriptions.push(
        refreshCommand,
        setTokenCommand,
        showDetailsCommand,
        clearTokenCommand,
        statusBarManager
    );

    // Initial refresh
    await refreshUsage();

    // Setup auto-refresh
    setupAutoRefresh();

    // Listen to configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('copilotUsageTracker')) {
            setupAutoRefresh();
            refreshUsage();
        }
    });
}

async function refreshUsage() {
    try {
        const hasToken = await tokenManager.hasToken();
        if (!hasToken) {
            statusBarManager.showNoToken();
            return;
        }

        statusBarManager.showLoading();
        const usage = await usageService.fetchUsage();
        
        if (usage) {
            statusBarManager.updateUsage(usage);
        } else {
            statusBarManager.showError('Failed to fetch usage');
        }
    } catch (error) {
        console.error('Error refreshing usage:', error);
        statusBarManager.showError('Error fetching usage');
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
        vscode.window.showInformationMessage('GitHub token saved successfully!');
        await refreshUsage();
    }
}

async function clearToken() {
    const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear your GitHub token?',
        'Yes', 'No'
    );
    
    if (confirm === 'Yes') {
        await tokenManager.clearToken();
        vscode.window.showInformationMessage('GitHub token cleared.');
        statusBarManager.showNoToken();
    }
}

async function showDetails(context: vscode.ExtensionContext) {
    const hasToken = await tokenManager.hasToken();
    if (!hasToken) {
        const action = await vscode.window.showWarningMessage(
            'No GitHub token configured. Would you like to set one now?',
            'Set Token', 'Cancel'
        );
        if (action === 'Set Token') {
            await setToken();
        }
        return;
    }

    try {
        const usage = await usageService.fetchUsage();
        if (usage) {
            DetailsPanel.createOrShow(context.extensionUri, usage);
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
        refreshUsage();
    }, intervalMs);
}

export function deactivate() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

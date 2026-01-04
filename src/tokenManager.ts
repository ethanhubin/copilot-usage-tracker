import * as vscode from 'vscode';

const TOKEN_KEY = 'copilot-usage-tracker.github-token';
const USERNAME_KEY = 'copilot-usage-tracker.github-username';

export class TokenManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async getToken(): Promise<string | undefined> {
        return await this.context.secrets.get(TOKEN_KEY);
    }

    async setToken(token: string): Promise<void> {
        await this.context.secrets.store(TOKEN_KEY, token);
        // Clear cached username when token changes
        await this.context.globalState.update(USERNAME_KEY, undefined);
    }

    async hasToken(): Promise<boolean> {
        const token = await this.getToken();
        return token !== undefined && token.length > 0;
    }

    async clearToken(): Promise<void> {
        await this.context.secrets.delete(TOKEN_KEY);
        await this.context.globalState.update(USERNAME_KEY, undefined);
    }

    async getUsername(): Promise<string | undefined> {
        // Check cached username first
        const cached = this.context.globalState.get<string>(USERNAME_KEY);
        if (cached) {
            return cached;
        }

        // Fetch from GitHub API
        const token = await this.getToken();
        if (!token) {
            return undefined;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'copilot-usage-tracker-vscode'
                }
            });

            if (response.ok) {
                const data = await response.json() as { login: string };
                const username = data.login;
                // Cache the username
                await this.context.globalState.update(USERNAME_KEY, username);
                return username;
            }
        } catch (error) {
            console.error('Failed to fetch username:', error);
        }

        return undefined;
    }
}

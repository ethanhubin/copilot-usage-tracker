import * as vscode from 'vscode';

// Create output channel for logging
const outputChannel = vscode.window.createOutputChannel('Copilot Usage Realtime');

export interface CopilotUserInfo {
    copilot_plan: 'free' | 'individual' | 'individual_pro' | 'business' | 'enterprise';
    access_type_sku?: string;
    username?: string;
    quota_snapshots?: {
        premium_interactions: {
            unlimited: boolean;
            overage_permitted: boolean;
            overage_count: number;
            entitlement: number;
            percent_remaining: number;
        };
    };
    quota_reset_date?: string;
}

export interface CopilotQuotaInfo {
    unlimited: boolean;
    overageEnabled: boolean;
    overageUsed: number;
    quota: number;
    used: number;
    percentage: number;
    resetDate: Date;
    plan: string;
}

const PLAN_MAP: Record<string, string> = {
    'free': 'free',
    'individual': 'pro',
    'individual_pro': 'pro_plus',
    'business': 'business',
    'enterprise': 'enterprise'
};

export function getOutputChannel(): vscode.OutputChannel {
    return outputChannel;
}

export class CopilotInternalApi {
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        outputChannel.appendLine(`[${timestamp}] ${message}`);
        console.log(`[CopilotInternalApi] ${message}`);
    }

    /**
     * Try to get Copilot user info using the internal API
     * First try silent, then with user prompt if needed
     */
    async fetchUserInfo(promptUser: boolean = false): Promise<CopilotUserInfo | null> {
        try {
            this.log('Attempting to fetch user info...');
            
            // First try silent (no popup)
            let session = await vscode.authentication.getSession(
                'github', 
                ['user:email', 'read:user'], 
                { silent: true }
            );
            
            this.log(`Silent session result: ${session ? 'found' : 'not found'}`);
            
            // If silent fails and we should prompt, try with createIfNone
            if (!session && promptUser) {
                this.log('Prompting user for GitHub authentication...');
                try {
                    session = await vscode.authentication.getSession(
                        'github', 
                        ['user:email', 'read:user'], 
                        { createIfNone: true }
                    );
                    this.log(`Prompted session result: ${session ? 'found' : 'not found'}`);
                } catch (e) {
                    this.log(`User cancelled auth or error: ${e}`);
                }
            }

            if (!session) {
                this.log('No GitHub session available');
                return null;
            }
            
            this.log(`Session account: ${session.account.label}`);

            this.log('Calling copilot_internal/user API...');
            const response = await fetch('https://api.github.com/copilot_internal/user', {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Accept': 'application/json',
                    'X-GitHub-Api-Version': '2025-05-01',
                    'User-Agent': 'copilot-usage-tracker-vscode'
                }
            });

            this.log(`API response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                this.log(`API error response: ${errorText}`);
                return null;
            }

            const data = await response.json() as CopilotUserInfo;
            this.log(`User info fetched: plan=${data.copilot_plan}`);
            if (data.quota_snapshots?.premium_interactions) {
                const pi = data.quota_snapshots.premium_interactions;
                this.log(`Quota: entitlement=${pi.entitlement}, remaining=${pi.percent_remaining}%`);
            }
            return data;
        } catch (error) {
            this.log(`Error fetching user info: ${error}`);
            return null;
        }
    }

    /**
     * Parse user info into quota info
     */
    parseQuotaInfo(userInfo: CopilotUserInfo): CopilotQuotaInfo | null {
        if (!userInfo.quota_snapshots?.premium_interactions) {
            this.log('No quota_snapshots.premium_interactions in response');
            return null;
        }

        const pi = userInfo.quota_snapshots.premium_interactions;
        const entitlement = pi.entitlement;
        const percentRemaining = pi.percent_remaining;

        const used = Math.max(0, entitlement * (1 - percentRemaining / 100));
        const percentage = entitlement > 0
            ? Math.round((used / entitlement) * 1000) / 10
            : 0;

        return {
            unlimited: pi.unlimited,
            overageEnabled: pi.overage_permitted,
            overageUsed: pi.overage_count,
            quota: entitlement,
            used: Math.round(used),
            percentage,
            resetDate: userInfo.quota_reset_date ? new Date(userInfo.quota_reset_date) : this.getNextMonthReset(),
            plan: PLAN_MAP[userInfo.copilot_plan] || 'pro'
        };
    }

    private getNextMonthReset(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    /**
     * Try to get quota info using the internal API
     */
    async getQuotaInfo(promptUser: boolean = false): Promise<CopilotQuotaInfo | null> {
        const userInfo = await this.fetchUserInfo(promptUser);
        if (!userInfo) {
            return null;
        }
        return this.parseQuotaInfo(userInfo);
    }
}

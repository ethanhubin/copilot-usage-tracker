import * as vscode from 'vscode';

export interface CopilotUserInfo {
    copilot_plan: 'free' | 'individual' | 'individual_pro' | 'business' | 'enterprise';
    access_type_sku?: string;
    username?: string;
    quota_snapshots?: {
        premium_interactions: {
            unlimited: boolean;
            overage_permitted: boolean;
            overage_count: number;
            entitlement: number;      // 配额限制 (如 1500)
            percent_remaining: number; // 剩余百分比 (如 94.9)
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

export class CopilotInternalApi {

    /**
     * Try to get Copilot user info using the internal API
     * This requires VS Code's GitHub authentication
     */
    async fetchUserInfo(): Promise<CopilotUserInfo | null> {
        try {
            // Get GitHub session from VS Code's authentication
            const session = await vscode.authentication.getSession('github', ['user:email', 'read:user'], { silent: true });

            if (!session) {
                console.log('[CopilotInternalApi] No GitHub session available');
                return null;
            }

            const response = await fetch('https://api.github.com/copilot_internal/user', {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Accept': 'application/json',
                    'X-GitHub-Api-Version': '2025-05-01',
                    'User-Agent': 'copilot-usage-tracker-vscode'
                }
            });

            if (!response.ok) {
                console.log(`[CopilotInternalApi] API returned ${response.status}: ${response.statusText}`);
                return null;
            }

            const data = await response.json() as CopilotUserInfo;
            console.log('[CopilotInternalApi] User info fetched successfully');
            return data;
        } catch (error) {
            console.error('[CopilotInternalApi] Failed to fetch user info:', error);
            return null;
        }
    }

    /**
     * Parse user info into quota info
     */
    parseQuotaInfo(userInfo: CopilotUserInfo): CopilotQuotaInfo | null {
        if (!userInfo.quota_snapshots?.premium_interactions) {
            return null;
        }

        const pi = userInfo.quota_snapshots.premium_interactions;
        const entitlement = pi.entitlement;
        const percentRemaining = pi.percent_remaining;

        // Calculate used: entitlement * (1 - percent_remaining / 100)
        const used = Math.max(0, entitlement * (1 - percentRemaining / 100));

        // Calculate percentage used
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
     * Returns null if the API is not accessible
     */
    async getQuotaInfo(): Promise<CopilotQuotaInfo | null> {
        const userInfo = await this.fetchUserInfo();
        if (!userInfo) {
            return null;
        }
        return this.parseQuotaInfo(userInfo);
    }
}

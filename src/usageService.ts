import * as vscode from 'vscode';
import { TokenManager } from './tokenManager';

export interface UsageItem {
    product: string;
    sku: string;
    model: string;
    unitType: string;
    pricePerUnit: number;
    grossQuantity: number;
    grossAmount: number;
    discountQuantity: number;
    discountAmount: number;
    netQuantity: number;
    netAmount: number;
}

export interface UsageResponse {
    timePeriod: {
        year: number;
        month?: number;
    };
    user: string;
    usageItems: UsageItem[];
}

export interface UsageData {
    used: number;
    limit: number;
    percentage: number;
    plan: string;
    resetDate: Date;
    items: UsageItem[];
    billedAmount: number;
    discountedAmount: number;
}

const PLAN_LIMITS: Record<string, number> = {
    'free': 50,
    'pro': 300,
    'pro_plus': 1500,
    'business': 300,
    'enterprise': 1000
};

export class UsageService {
    private tokenManager: TokenManager;
    private cachedUsage: UsageData | null = null;
    private lastFetch: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute cache

    constructor(tokenManager: TokenManager) {
        this.tokenManager = tokenManager;
    }

    async fetchUsage(forceRefresh: boolean = false): Promise<UsageData | null> {
        // Return cached data if still valid
        if (!forceRefresh && this.cachedUsage && (Date.now() - this.lastFetch < this.CACHE_TTL)) {
            return this.cachedUsage;
        }

        const token = await this.tokenManager.getToken();
        const username = await this.tokenManager.getUsername();

        if (!token || !username) {
            return null;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        try {
            const response = await fetch(
                `https://api.github.com/users/${username}/settings/billing/premium_request/usage?year=${year}&month=${month}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                        'User-Agent': 'copilot-usage-tracker-vscode'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error ${response.status}: ${errorText}`);
                
                if (response.status === 401) {
                    vscode.window.showErrorMessage('GitHub token is invalid or expired. Please set a new token.');
                } else if (response.status === 403) {
                    vscode.window.showErrorMessage('Token lacks "Plan: read-only" permission. Please create a new token with this permission.');
                } else if (response.status === 404) {
                    vscode.window.showWarningMessage('Usage data not available. Enhanced Billing may not be enabled for your account.');
                }
                
                return null;
            }

            const data = await response.json() as UsageResponse;
            
            // Calculate totals from usage items
            let totalUsed = 0;
            let totalBilled = 0;
            let totalDiscounted = 0;

            if (data.usageItems && Array.isArray(data.usageItems)) {
                for (const item of data.usageItems) {
                    totalUsed += item.grossQuantity || 0;
                    totalBilled += item.netAmount || 0;
                    totalDiscounted += item.discountAmount || 0;
                }
            }

            // Get plan limit from settings
            const config = vscode.workspace.getConfiguration('copilotUsageTracker');
            const plan = config.get<string>('plan', 'pro');
            const limit = PLAN_LIMITS[plan] || 300;

            // Calculate reset date (1st of next month UTC)
            const resetDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

            const usageData: UsageData = {
                used: totalUsed,
                limit: limit,
                percentage: limit > 0 ? Math.round((totalUsed / limit) * 100) : 0,
                plan: plan,
                resetDate: resetDate,
                items: data.usageItems || [],
                billedAmount: totalBilled,
                discountedAmount: totalDiscounted
            };

            this.cachedUsage = usageData;
            this.lastFetch = Date.now();

            return usageData;
        } catch (error) {
            console.error('Failed to fetch usage:', error);
            vscode.window.showErrorMessage('Failed to connect to GitHub API. Please check your network connection.');
            return null;
        }
    }

    getCachedUsage(): UsageData | null {
        return this.cachedUsage;
    }
}

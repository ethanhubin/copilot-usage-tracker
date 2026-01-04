import { CopilotInternalApi, CopilotQuotaInfo, getOutputChannel } from './copilotInternalApi';
import { TokenManager } from './tokenManager';

export interface UsageData {
    used: number;
    quota: number;
    percentage: number;
    resetDate: Date;
    source: 'internal' | 'billing';
}

export class UsageService {
    private copilotApi: CopilotInternalApi;
    private tokenManager: TokenManager;
    private cachedUsage: UsageData | null = null;
    private cacheTime: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(tokenManager: TokenManager) {
        this.copilotApi = new CopilotInternalApi();
        this.tokenManager = tokenManager;
    }

    private log(message: string): void {
        const channel = getOutputChannel();
        const timestamp = new Date().toISOString();
        channel.appendLine(`[${timestamp}] [UsageService] ${message}`);
        console.log(`[UsageService] ${message}`);
    }

    /**
     * Fetch usage data, trying internal API first, then billing API
     * @param promptUser If true, will prompt user for GitHub auth if needed
     */
    async fetchUsage(promptUser: boolean = false): Promise<UsageData | null> {
        // Check cache
        if (this.cachedUsage && Date.now() - this.cacheTime < this.CACHE_TTL) {
            this.log('Returning cached usage data');
            return this.cachedUsage;
        }

        this.log('Fetching fresh usage data...');

        // Try internal API first
        const internalData = await this.tryInternalApi(promptUser);
        if (internalData) {
            this.cachedUsage = internalData;
            this.cacheTime = Date.now();
            return internalData;
        }

        // Try billing API if we have a token
        const billingData = await this.tryBillingApi();
        if (billingData) {
            this.cachedUsage = billingData;
            this.cacheTime = Date.now();
            return billingData;
        }

        this.log('All API methods failed');
        return null;
    }

    private async tryInternalApi(promptUser: boolean): Promise<UsageData | null> {
        try {
            this.log('Trying internal API...');
            const quotaInfo = await this.copilotApi.getQuotaInfo(promptUser);
            
            if (quotaInfo) {
                this.log(`Internal API success: ${quotaInfo.used}/${quotaInfo.quota}`);
                return {
                    used: quotaInfo.used,
                    quota: quotaInfo.quota,
                    percentage: quotaInfo.percentage,
                    resetDate: quotaInfo.resetDate,
                    source: 'internal'
                };
            }
            
            this.log('Internal API returned no data');
            return null;
        } catch (error) {
            this.log(`Internal API error: ${error}`);
            return null;
        }
    }

    private async tryBillingApi(): Promise<UsageData | null> {
        try {
            const token = await this.tokenManager.getToken();
            if (!token) {
                this.log('No PAT token available for billing API');
                return null;
            }

            this.log('Trying billing API...');
            
            // First get username
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (!userResponse.ok) {
                this.log(`Failed to get username: ${userResponse.status}`);
                return null;
            }

            const userData = await userResponse.json() as { login: string };
            const username = userData.login;
            this.log(`Got username: ${username}`);

            // Now get billing data
            const billingUrl = `https://api.github.com/users/${username}/settings/billing/premium_request/usage`;
            const billingResponse = await fetch(billingUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (!billingResponse.ok) {
                this.log(`Billing API failed: ${billingResponse.status}`);
                return null;
            }

            const billingData = await billingResponse.json() as {
                total_premium_requests_used: number;
                monthly_included_premium_requests: number;
                code_completions_premium_requests_used: number;
                chat_premium_requests_used: number;
            };

            this.log(`Billing API success: ${billingData.total_premium_requests_used}/${billingData.monthly_included_premium_requests}`);

            const used = billingData.total_premium_requests_used;
            const quota = billingData.monthly_included_premium_requests;
            const percentage = quota > 0 ? Math.round((used / quota) * 1000) / 10 : 0;

            // Calculate reset date (first of next month)
            const now = new Date();
            const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

            return {
                used,
                quota,
                percentage,
                resetDate,
                source: 'billing'
            };
        } catch (error) {
            this.log(`Billing API error: ${error}`);
            return null;
        }
    }

    clearCache(): void {
        this.cachedUsage = null;
        this.cacheTime = 0;
        this.log('Cache cleared');
    }
}

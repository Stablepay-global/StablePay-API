export interface EnvironmentConfig {
  name: string;
  apiBaseUrl: string;
  apiKeyPrefix: string;
  kycApiKeyPrefix: string;
  cashfreeKycBaseUrl: string;
  requiresWebhookSecret: boolean;
  rateLimit: {
    requests: number;
    window: string;
  };
  features: {
    realTimeWebhooks: boolean;
    advancedKyc: boolean;
    bulkOperations: boolean;
    analyticsReporting: boolean;
  };
}

export const environments: Record<string, EnvironmentConfig> = {
  production: {
    name: "Production",
    apiBaseUrl: "http://localhost:4000",
    apiKeyPrefix: "pk_live_",
    kycApiKeyPrefix: "live_",
    cashfreeKycBaseUrl: 'https://api.cashfree.com/verification', // Production Cashfree KYC API
    requiresWebhookSecret: true,
    rateLimit: {
      requests: 1000,
      window: "1 minute"
    },
    features: {
      realTimeWebhooks: true,
      advancedKyc: true,
      bulkOperations: true,
      analyticsReporting: true
    }
  }
};

export function getEnvironmentConfig(env: string): EnvironmentConfig {
  return environments[env] || environments.production;
}
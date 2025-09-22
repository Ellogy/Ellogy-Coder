/**
 * Configuration du Gateway Ellogy
 */

export interface GatewayConfig {
  dev: {
    gateway: string;
  };
  prod: {
    gateway: string;
  };
}

export const gatewayConfig: GatewayConfig = {
  dev: {
    gateway: 'https://ellogygateway-test.azurewebsites.net',
  },
  prod: {
    gateway: 'https://ellogygateway.azurewebsites.net',
  },
};

/**
 * Obtient l'URL du gateway selon l'environnement
 */
export const getGatewayUrl = (env: 'dev' | 'prod' = 'dev'): string => {
  // En développement, utiliser le proxy Vite pour éviter les problèmes CORS
  if (env === 'dev' && typeof window !== 'undefined') {
    return '/api/gateway';
  }

  return gatewayConfig[env].gateway;
};

/**
 * Détermine l'environnement actuel
 */
export const getCurrentEnvironment = (): 'dev' | 'prod' => {
  /*
   * En production, vous pouvez utiliser process.env.NODE_ENV
   * ou une variable d'environnement spécifique
   */
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
      ? 'dev'
      : 'prod';
  }

  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
};

/**
 * Configuration par défaut pour les requêtes
 */
export const defaultRequestConfig = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

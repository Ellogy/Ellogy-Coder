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

// Vérification de la variable d'environnement VITE_GATEWAY_URL
const gatewayUrl = process.env.VITE_GATEWAY_URL;

if (!gatewayUrl) {
  console.error(
    "❌ ERREUR: La variable d'environnement VITE_GATEWAY_URL n'est pas définie.\n" +
      "   Veuillez l'ajouter dans votre fichier .env avec la valeur suivante:\n" +
      "   VITE_GATEWAY_URL=https://votre-gateway-url.com",
  );
}

export const gatewayConfig: GatewayConfig = {
  dev: {
    gateway: gatewayUrl || '',
  },
  prod: {
    gateway: gatewayUrl || '',
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

  const url = gatewayConfig[env].gateway;

  if (!url) {
    console.error(
      `❌ ERREUR: L'URL du gateway pour l'environnement "${env}" n'est pas définie.\n` +
        "   Veuillez définir VITE_GATEWAY_URL dans votre fichier .env",
    );
  }

  return url;
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

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

const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || '';

if (!gatewayUrl) {
  console.error(
    "❌ ERREUR: La variable d'environnement VITE_GATEWAY_URL n'est pas définie.\n" +
      "   Veuillez l'ajouter dans votre fichier .env avec la valeur suivante:\n" +
      '   VITE_GATEWAY_URL=https://votre-gateway-url.com',
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
 * En production (déployé), utilise toujours l'URL directe du gateway, jamais localhost
 */
export const getGatewayUrl = (env: 'dev' | 'prod' = 'dev'): string => {
  // Toujours utiliser l'URL directe du gateway (pas de proxy localhost)
  // Le proxy /api/gateway n'est utilisé que si explicitement configuré
  const url = gatewayConfig[env].gateway || gatewayConfig.dev.gateway || gatewayConfig.prod.gateway;

  if (!url) {
    console.error(
      `❌ ERREUR: L'URL du gateway pour l'environnement "${env}" n'est pas définie.\n` +
        '   Veuillez définir VITE_GATEWAY_URL dans votre fichier .env\n' +
        `   Valeur actuelle de import.meta.env.VITE_GATEWAY_URL: ${import.meta.env.VITE_GATEWAY_URL || 'undefined'}`,
    );
    return '';
  }

  return url;
};

/**
 * Détermine l'environnement actuel
 * En production déployée, retourne toujours 'prod' pour utiliser l'URL directe
 */
export const getCurrentEnvironment = (): 'dev' | 'prod' => {
  // Si on est dans le navigateur et pas sur localhost, c'est la production
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Seulement localhost/127.0.0.1 est considéré comme dev
    // Tout le reste (dev.ellogy.ai, etc.) est considéré comme prod
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'dev';
    }
    // En production déployée, toujours utiliser 'prod'
    return 'prod';
  }

  // Côté serveur, utiliser NODE_ENV
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ? 'prod' : 'dev';
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

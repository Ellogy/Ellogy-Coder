import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getElloyDataFromCookies, clearElloyDataFromCookies } from '~/utils/ellogyUtils';
import { getGatewayUrl, getCurrentEnvironment, defaultRequestConfig } from '~/lib/config/gateway.config';

// Constantes pour les endpoints
const ENDPOINTS = {
  REFRESH_TOKEN: '/auth/refreshJwtToken',
  LOGIN: '/auth/login',
} as const;

// Constantes pour les codes d'erreur HTTP
const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  OK: 200,
} as const;

// Configuration du Gateway
export const baseURL = getGatewayUrl(getCurrentEnvironment());

// Instance Axios pour le gateway
export const gatewayInstance: AxiosInstance = axios.create({
  baseURL,
  ...defaultRequestConfig,
});

// Variables pour gérer le refresh token
let isRefreshing = false;

type PendingRequestCallback = () => void;

const pendingRequests: PendingRequestCallback[] = [];

// Interface pour les données de refresh
interface RefreshTokenData {
  jwt: string;
  refreshToken: string;
}

// Interface pour la réponse de refresh
interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

/**
 * Gère les erreurs d'authentification en déconnectant l'utilisateur
 */
const handleAuthError = (): void => {
  clearElloyDataFromCookies();

  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

/**
 * Intercepteur de requête générique pour ajouter automatiquement le token JWT
 */
export const setRequestInterceptorWithToken = (instance: AxiosInstance) => {
  instance.interceptors.request.use(
    (config: any) => {
      const { ellogyToken } = getElloyDataFromCookies();

      if (ellogyToken && config.headers) {
        Object.assign(config.headers, {
          Authorization: `Bearer ${ellogyToken}`,
        });
      }

      if (!ellogyToken) {
        delete instance.defaults.headers.common.Authorization;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );
};

/**
 * Renouvelle le token d'accès via le refresh token
 */
export const refreshAccessToken = async (): Promise<void> => {
  const { ellogyUser, ellogyToken } = getElloyDataFromCookies();

  if (isRefreshing) {
    return new Promise<void>((resolve) => {
      const wrapper: PendingRequestCallback = () => {
        resolve();
      };
      pendingRequests.push(wrapper);
    });
  }

  isRefreshing = true;

  try {
    if (!ellogyUser || !ellogyToken) {
      throw new Error('Données utilisateur manquantes');
    }

    const data: RefreshTokenData = {
      jwt: ellogyToken,
      refreshToken: ellogyUser.refreshToken || '',
    };

    const refreshResponse: AxiosResponse<RefreshTokenResponse> = await gatewayInstance.post(
      ENDPOINTS.REFRESH_TOKEN,
      data,
    );

    // Mettre à jour le token dans les cookies
    if (refreshResponse.data.token) {
      const updatedUser = { ...ellogyUser, refreshToken: refreshResponse.data.refreshToken };
      const { setElloyDataToCookies } = await import('~/utils/ellogyUtils');
      setElloyDataToCookies(updatedUser, refreshResponse.data.token);

      // Déclencher un événement de stockage pour notifier les autres composants
      window.dispatchEvent(new Event('storage'));
    }

    // Exécuter toutes les requêtes en attente
    pendingRequests.forEach((callback) => callback());
    pendingRequests.length = 0;

    return undefined;
  } catch (error) {
    console.error('Erreur lors du renouvellement du token:', error);
    handleAuthError();
    throw error;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Configure l'intercepteur de réponse pour gérer les erreurs 401 et 403
 */
export const setResponseInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Gestion des erreurs 401 (Token expiré)
      if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          await refreshAccessToken();

          // Relancer la requête avec le nouveau token
          const { ellogyToken } = getElloyDataFromCookies();

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${ellogyToken}`;
          }

          return instance(originalRequest);
        } catch (refreshError) {
          console.error('Impossible de renouveler le token:', refreshError);
          return Promise.reject(error);
        }
      }

      // Gestion des erreurs 403 (Accès refusé)
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        const url = originalRequest.url || '';

        // Ne pas afficher l'erreur pour les routes de login
        if (!url.includes(ENDPOINTS.LOGIN)) {
          // Déclencher un événement pour afficher l'erreur d'accès refusé
          window.dispatchEvent(
            new CustomEvent('access-denied', {
              detail: { message: 'Accès refusé' },
            }),
          );
        }
      }

      return Promise.reject(error);
    },
  );
};

/**
 * Initialise les intercepteurs pour l'instance du gateway
 */
export const initializeGatewayInterceptors = () => {
  setRequestInterceptorWithToken(gatewayInstance);
  setResponseInterceptor(gatewayInstance);
};

/**
 * Vérifie si le token est valide avec la gateway
 * Utilise une requête simple pour tester la validité du token
 */
export const verifyTokenWithGateway = async (token: string): Promise<boolean> => {
  try {
    /*
     * Faire une requête simple avec le token pour vérifier sa validité
     * Si le token est valide, la requête réussit
     * Si le token est expiré, on reçoit une erreur 401
     */
    const response = await gatewayInstance.get('/auth/refreshJwtToken', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Si on arrive ici, le token est valide
    return response.status === HTTP_STATUS.OK;
  } catch (error: any) {
    // Si erreur 401, le token est expiré/invalide
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      return false;
    }

    /*
     * Pour les autres erreurs, on considère le token comme valide
     * car le problème pourrait être réseau ou autre
     */
    console.warn('Erreur lors de la vérification du token:', error);

    return true;
  }
};

/**
 * Vérifie si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => {
  const { ellogyUser, ellogyToken } = getElloyDataFromCookies();
  return !!(ellogyUser && ellogyToken);
};

/**
 * Déconnecte l'utilisateur
 */
export const logout = (): void => {
  handleAuthError();
};

// Initialiser les intercepteurs automatiquement
initializeGatewayInterceptors();

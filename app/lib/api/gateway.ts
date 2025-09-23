import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getElloyDataFromCookies, cleanJwtToken } from '~/utils/ellogyUtils';
import { getGatewayUrl, getCurrentEnvironment, defaultRequestConfig } from '~/lib/config/gateway.config';

// Constantes pour les endpoints
const ENDPOINTS = {
  REFRESH_TOKEN: 'dev/auth/refreshJwtToken',
  LOGIN: 'dev/auth/login',
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
  //clearElloyDataFromCookies();

  if (typeof window !== 'undefined') {
    window.location.href = 'coder/login';
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
export const verifyTokenWithGateway = async (token: string): Promise<{ isValid: boolean; newToken?: string }> => {
  try {
    /*
     * Faire une requête simple avec le token pour vérifier sa validité
     * Si le token est valide, la requête réussit
     * Si le token est expiré, on reçoit une erreur 401
     */
    console.log('refreshToken', token);

    // Nettoyer le token des guillemets supplémentaires
    const cleanToken = cleanJwtToken(token);
    console.log('Token original:', token);
    console.log('Token nettoyé:', cleanToken);

    // Récupérer les données utilisateur depuis les cookies
    const { ellogyUser } = getElloyDataFromCookies();

    /*
     * const jwt="eyJhbGciOiJIUzI1NiIsInR5cCI6IkjklkpXVCJ9.eyJBY2NvdW50UGxhbiI6IkJh4568144kIjoiYmYwMmFiODktYzZmZC00OTcyLWFjMjYtMzIwN2FkNmM1NGY2IiwiZW1haWwiOiJtYXJpZW0uZnJpa2hhQGlvdmlzaW9uLmlvIiwibmJmIjoxNzU4NTMxMjE1LCJleHAiOjE3NTg1MzcyMTUsImlhdCI6MTc1ODUzMTIxNSwiaXNzIjoiaHR0cHM6Ly9lbGxvZ3kudXNlcm1hbmFnZXIifQ.gggg"
     */

    // Préparer le body JSON avec JWT et refreshToken
    const requestBody = {
      jwt: cleanToken,
      refreshToken: ellogyUser?.refreshToken || '',
    };

    console.log('Body JSON envoyé:', requestBody);

    const response = await gatewayInstance.post('/dev/auth/refreshJwtToken', requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Si on arrive ici, le token est valide
    console.log('Réponse complète:', response);
    console.log('Token reçu:', response.data);

    /*
     * Récupérer le nouveau token depuis la réponse
     * La réponse peut être directement le token (string) ou un objet avec le token
     */
    let newToken;

    if (typeof response.data === 'string') {
      // Si la réponse est directement le token
      newToken = response.data;
    } else if (response.data && response.data.token) {
      // Si la réponse est un objet avec une propriété token
      newToken = response.data.token;
    } else {
      // Fallback
      newToken = response.data;
    }

    // Sauvegarder le nouveau token dans localStorage
    if (newToken) {
      localStorage.setItem('token', newToken);
      console.log('Nouveau token sauvegardé:', newToken);

      // Décoder le token JWT pour afficher les informations (débogage)
      try {
        const tokenParts = newToken.split('.');

        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Informations du token:', {
            userId: payload.userId,
            email: payload.email,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            iat: new Date(payload.iat * 1000).toLocaleString(),
            accountPlan: payload.AccountPlan,
          });
        }
      } catch (e) {
        console.warn('Impossible de décoder le token JWT:', e);
      }

      // Mettre à jour le token dans le localStorage
      localStorage.setItem('token', newToken);

      // Mettre à jour aussi les cookies si nécessaire
      const { ellogyUser } = getElloyDataFromCookies();

      if (ellogyUser) {
        const { setElloyDataToCookies } = await import('~/utils/ellogyUtils');
        setElloyDataToCookies(ellogyUser, newToken);
        console.log('Token mis à jour dans les cookies');
      }
    }

    return { isValid: response.status === HTTP_STATUS.OK, newToken };
  } catch (error: any) {
    // Si erreur 401, le token est expiré/invalide
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      return { isValid: false };
    }

    // Gestion spécifique des erreurs CORS
    if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS') || error.message?.includes('Network Error')) {
      console.warn('Erreur CORS détectée. Vérifiez la configuration du serveur ou utilisez le proxy de développement.');

      /*
       * En cas d'erreur CORS, on considère que le token pourrait être valide
       * mais on ne peut pas le vérifier à cause de la configuration serveur
       */
      return { isValid: true }; // Ou false selon votre logique métier
    }

    // Pour les autres erreurs, on considère que le token n'est pas valide
    console.error('Erreur lors de la vérification du token:', error);

    return { isValid: false };
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
 * Fonction de login avec le gateway
 */
export const loginWithGateway = async (email: string, password: string) => {
  try {
    const response = await gatewayInstance.post('/dev/auth/login', {
      email,
      password,
    });

    // Vérifier si la réponse est 200
    if (response.status === 200) {
      console.log('Received Response from the Target: 200 /dev/auth/login');

      const { jwt, refreshToken } = response.data;

      // Sauvegarder dans localStorage
      if (jwt) {
        localStorage.setItem('token', jwt);
        console.log('Token sauvegardé dans localStorage:', jwt);
      }

      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        console.log('Données utilisateur sauvegardées dans localStorage:', response.data);
      }

      // Sauvegarder dans les cookies
      if (response.data && jwt) {
        const user = response.data;

        try {
          const { setElloyDataToCookies } = await import('~/utils/ellogyUtils');
          setElloyDataToCookies(
            {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              accountPlan: user.accountPlan,
              organization: user.organization || null,
              department: user.department || null,
              phoneNumber: user.phoneNumber || null,
              avatarLink: user.avatarLink || null,
              stripeCustomerId: user.stripeCustomerId || '',
              refreshToken: refreshToken || '',
            },
            jwt,
          );
          console.log('Données sauvegardées dans les cookies ellogy_token et ellogy_user');

          // Vérifier immédiatement que les cookies ont été créés
          const { ellogyUser, ellogyToken } = getElloyDataFromCookies();
          console.log('Vérification immédiate des cookies:', {
            hasUser: !!ellogyUser,
            hasToken: !!ellogyToken,
            userData: ellogyUser ? { id: ellogyUser.id, email: ellogyUser.email } : null,
          });

          // Rediriger immédiatement si les cookies sont présents
          if (ellogyUser && ellogyToken) {
            console.log('Cookies créés avec succès, redirection vers /coder');
            window.location.href = '/coder';
          } else {
            console.error('Échec de la création des cookies, redirection vers /coder/login');
            window.location.href = '/coder/login';
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde des cookies:', error);
          window.location.href = '/coder/login';
        }
      } else {
        console.error('Données utilisateur ou token manquants');
        window.location.href = '/coder/login';
      }
    }

    return response.data;
  } catch (error: any) {
    console.error('Erreur lors du login avec le gateway:', error);
    throw error;
  }
};

/**
 * Déconnecte l'utilisateur
 */
export const logout = (): void => {
  handleAuthError();
};

// Initialiser les intercepteurs automatiquement
initializeGatewayInterceptors();

import { useCallback } from 'react';
import { gatewayInstance } from '~/lib/api/gateway';
import { useAuth } from '~/components/auth/AuthProvider';

/**
 * Hook personnalisé pour utiliser le gateway avec gestion automatique des tokens
 */
export const useGateway = () => {
  const { isAuthenticated, logout } = useAuth();

  /**
   * Effectue une requête GET vers le gateway
   */
  const get = useCallback(
    async <T = any>(url: string, config?: any) => {
      if (!isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      try {
        const response = await gatewayInstance.get<T>(url, config);
        return response.data;
      } catch (error) {
        console.error('Erreur GET gateway:', error);
        throw error;
      }
    },
    [isAuthenticated],
  );

  /**
   * Effectue une requête POST vers le gateway
   */
  const post = useCallback(
    async <T = any>(url: string, data?: any, config?: any) => {
      if (!isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      try {
        const response = await gatewayInstance.post<T>(url, data, config);
        return response.data;
      } catch (error) {
        console.error('Erreur POST gateway:', error);
        throw error;
      }
    },
    [isAuthenticated],
  );

  /**
   * Effectue une requête PUT vers le gateway
   */
  const put = useCallback(
    async <T = any>(url: string, data?: any, config?: any) => {
      if (!isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      try {
        const response = await gatewayInstance.put<T>(url, data, config);
        return response.data;
      } catch (error) {
        console.error('Erreur PUT gateway:', error);
        throw error;
      }
    },
    [isAuthenticated],
  );

  /**
   * Effectue une requête DELETE vers le gateway
   */
  const del = useCallback(
    async <T = any>(url: string, config?: any) => {
      if (!isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      try {
        const response = await gatewayInstance.delete<T>(url, config);
        return response.data;
      } catch (error) {
        console.error('Erreur DELETE gateway:', error);
        throw error;
      }
    },
    [isAuthenticated],
  );

  /**
   * Effectue une requête PATCH vers le gateway
   */
  const patch = useCallback(
    async <T = any>(url: string, data?: any, config?: any) => {
      if (!isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      try {
        const response = await gatewayInstance.patch<T>(url, data, config);
        return response.data;
      } catch (error) {
        console.error('Erreur PATCH gateway:', error);
        throw error;
      }
    },
    [isAuthenticated],
  );

  return {
    get,
    post,
    put,
    delete: del,
    patch,
    isAuthenticated,
    logout,
  };
};

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { logout } from '~/lib/api/gateway';
import { getElloyDataFromCookies, type ElllogyUser } from '~/utils/ellogyUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  user: ElllogyUser | null;
  token: string | null;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Fournisseur de contexte d'authentification
 * Gère l'état d'authentification global de l'application
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState(() => {
    const { ellogyUser, ellogyToken } = getElloyDataFromCookies();
    return {
      isAuthenticated: !!(ellogyUser && ellogyToken),
      user: ellogyUser,
      token: ellogyToken,
    };
  });

  const refreshAuth = () => {
    const { ellogyUser, ellogyToken } = getElloyDataFromCookies();
    setAuthState({
      isAuthenticated: !!(ellogyUser && ellogyToken),
      user: ellogyUser,
      token: ellogyToken,
    });
  };

  const handleLogout = () => {
    logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  };

  useEffect(() => {
    // Écouter les changements de stockage (pour les mises à jour de token)
    const handleStorageChange = () => {
      refreshAuth();
    };

    // Écouter les événements d'accès refusé
    const handleAccessDenied = (event: CustomEvent) => {
      console.error('Accès refusé:', event.detail);

      // Ici vous pouvez afficher une notification ou une modal
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('access-denied', handleAccessDenied as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('access-denied', handleAccessDenied as EventListener);
    };
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    token: authState.token,
    logout: handleLogout,
    refreshAuth,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

/**
 * Hook pour utiliser le contexte d'authentification
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }

  return context;
};

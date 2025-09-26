import React, { useEffect, useState } from 'react';
import { getElloyDataFromCookies, setElloyDataToCookies } from '~/utils/ellogyUtils';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Composant de protection d'authentification
 * Vérifie la présence des cookies ellogy_user et ellogy_token
 * Redirige vers /coder/login si les cookies sont manquants
 * Sinon, affiche le contenu protégé (BaseChat)
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthentication = () => {
      try {
        // Récupérer les données depuis les cookies
        const { ellogyUser, ellogyToken } = getElloyDataFromCookies();

        console.log('AuthGuard - Vérification des cookies:', {
          hasUser: !!ellogyUser,
          hasToken: !!ellogyToken,
          userData: ellogyUser ? { id: ellogyUser.id, email: ellogyUser.email } : null,
          tokenLength: ellogyToken ? ellogyToken.length : 0,
          allCookies: document.cookie,
          localStorageToken: localStorage.getItem('token'),
          localStorageUser: localStorage.getItem('user'),
        });

        // Vérifier si les cookies existent et sont valides
        if (!ellogyUser || !ellogyToken) {
          console.log('Cookies ellogy_user ou ellogy_token manquants, redirection vers /coder/login');
          console.log('État des cookies:', {
            hasUser: !!ellogyUser,
            hasToken: !!ellogyToken,
            userData: ellogyUser ? { id: ellogyUser.id, email: ellogyUser.email } : null,
          });

          // Vérifier aussi dans localStorage comme fallback
          const localStorageToken = localStorage.getItem('token');
          const localStorageUser = localStorage.getItem('user');

          if (localStorageToken && localStorageUser) {
            console.log('Données trouvées dans localStorage, tentative de récupération...');

            try {
              const userData = JSON.parse(localStorageUser);

              // Essayer de restaurer les cookies depuis localStorage
              setElloyDataToCookies(userData, localStorageToken);

              // Re-vérifier après restauration
              const { ellogyUser: restoredUser, ellogyToken: restoredToken } = getElloyDataFromCookies();

              if (restoredUser && restoredToken) {
                console.log('Cookies restaurés avec succès depuis localStorage');
                setIsAuthenticated(true);
                setIsChecking(false);

                return;
              }
            } catch (error) {
              console.error('Erreur lors de la restauration depuis localStorage:', error);
            }
          }

          window.location.href = '/coder/login';

          return;
        }

        // Vérifier que les données utilisateur sont complètes
        if (!ellogyUser.id || !ellogyUser.email) {
          console.log('Données utilisateur incomplètes, redirection vers /coder/login');
          window.location.href = '/coder/login';

          return;
        }

        // Authentification réussie
        console.log('Authentification réussie, cookies présents:', {
          userId: ellogyUser.id,
          email: ellogyUser.email,
          hasToken: !!ellogyToken,
        });

        setIsAuthenticated(true);
        setIsChecking(false);
      } catch (error) {
        console.error('Erreur lors de la vérification des cookies:', error);
        window.location.href = '/coder/login';
      }
    };

    checkAuthentication();
  }, []);

  // Afficher un indicateur de chargement pendant la vérification
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Authentication Verification...</p>
        </div>
      </div>
    );
  }

  // Si authentifié, afficher le contenu protégé
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Si non authentifié, ne rien afficher (redirection en cours)
  return null;
};

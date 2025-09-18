import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ProtectedRoute } from '~/components/auth/ProtectedRoute';
import { useAuth } from '~/components/auth/AuthProvider';
import { useGateway } from '~/lib/hooks/useGateway';
import { useEffect, useState } from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Zone Protégée - Ellogy Coder' },
    { name: 'description', content: 'Zone protégée nécessitant une authentification' },
  ];
};

export const loader = () => json({});

/**
 * Composant de contenu protégé
 */
function ProtectedContent() {
  const { user, logout } = useAuth();
  const gateway = useGateway();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);

    try {
      // Exemple d'utilisation du gateway avec gestion automatique des tokens
      const data = await gateway.get('/user/profile');
      setUserData(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Zone Protégée</h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Se déconnecter
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Informations utilisateur</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p>
                  <strong>Nom:</strong> {user?.firstName} {user?.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {user?.email}
                </p>
                <p>
                  <strong>Rôle:</strong> {user?.role}
                </p>
                <p>
                  <strong>Organisation:</strong> {user?.organization || 'Non spécifiée'}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Test du Gateway</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <button
                  onClick={fetchUserData}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Récupérer les données du profil'}
                </button>

                {userData && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-900">Données du profil:</h3>
                    <pre className="mt-2 text-sm bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(userData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Fonctionnalités du système d'authentification</h2>
              <div className="bg-green-50 p-4 rounded-md">
                <ul className="space-y-2 text-sm text-green-800">
                  <li>✅ Token JWT automatiquement ajouté aux requêtes</li>
                  <li>✅ Renouvellement automatique des tokens expirés</li>
                  <li>✅ Gestion des erreurs 401/403 du gateway</li>
                  <li>✅ Protection des routes côté client</li>
                  <li>✅ Déconnexion automatique en cas d'échec</li>
                  <li>✅ Intercepteurs Axios configurés</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Page protégée avec vérification d'authentification
 */
export default function Protected() {
  return (
    <ProtectedRoute>
      <ProtectedContent />
    </ProtectedRoute>
  );
}

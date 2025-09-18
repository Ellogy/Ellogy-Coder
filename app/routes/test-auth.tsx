import { json, type MetaFunction } from '@remix-run/cloudflare';
import { AuthStatus } from '~/components/auth/AuthStatus';
import { useGateway } from '~/lib/hooks/useGateway';
import { useState } from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Test Authentification - Ellogy Coder' },
    { name: 'description', content: "Page de test pour le système d'authentification" },
  ];
};

export const loader = () => json({});

/**
 * Page de test pour le système d'authentification
 */
export default function TestAuth() {
  const gateway = useGateway();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testGatewayConnection = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      // Test d'une requête simple vers le gateway
      const result = await gateway.get('/health');
      setTestResult(`✅ Connexion réussie: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      setTestResult(`❌ Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test du Système d'Authentification</h1>

          <div className="space-y-6">
            {/* Statut d'authentification */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Statut d'Authentification</h2>
              <AuthStatus />
            </div>

            {/* Test de connexion au gateway */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Test de Connexion au Gateway</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <button
                  onClick={testGatewayConnection}
                  disabled={isLoading || !gateway.isAuthenticated}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Test en cours...' : 'Tester la connexion au gateway'}
                </button>

                {!gateway.isAuthenticated && (
                  <p className="mt-2 text-sm text-gray-600">
                    Vous devez être connecté pour tester la connexion au gateway.
                  </p>
                )}

                {testResult && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Résultat du test:</h3>
                    <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-64">{testResult}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Informations sur le système */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Fonctionnalités Implémentées</h2>
              <div className="bg-green-50 p-4 rounded-md">
                <ul className="space-y-2 text-sm text-green-800">
                  <li>✅ Configuration du Gateway avec URLs dev/prod</li>
                  <li>✅ Intercepteurs de requête avec token JWT automatique</li>
                  <li>✅ Gestion des erreurs 401 (renouvellement automatique des tokens)</li>
                  <li>✅ Gestion des erreurs 403 (accès refusé)</li>
                  <li>✅ Protection des routes avec composant ProtectedRoute</li>
                  <li>✅ Contexte d'authentification global (AuthProvider)</li>
                  <li>✅ Hook personnalisé useGateway pour les requêtes</li>
                  <li>✅ Gestion des cookies pour le stockage des tokens</li>
                  <li>✅ Déconnexion automatique en cas d'échec d'authentification</li>
                  <li>✅ Système de queue pour les requêtes pendant le refresh</li>
                </ul>
              </div>
            </div>

            {/* Liens de navigation */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Navigation</h2>
              <div className="flex space-x-4">
                <a
                  href="/login"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Page de Connexion
                </a>
                <a
                  href="/protected"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Page Protégée
                </a>
                <a
                  href="/"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Accueil
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

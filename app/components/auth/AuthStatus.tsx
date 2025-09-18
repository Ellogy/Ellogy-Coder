import { useAuth } from './AuthProvider';

/**
 * Composant pour afficher le statut d'authentification
 */
export const AuthStatus = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Non authentifié</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Vous devez vous connecter pour accéder aux fonctionnalités protégées.</p>
            </div>
            <div className="mt-4">
              <a
                href="/login"
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Se connecter
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4">
      <div className="flex justify-between items-start">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Authentifié</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                Connecté en tant que{' '}
                <strong>
                  {user?.firstName} {user?.lastName}
                </strong>
              </p>
              <p>Email: {user?.email}</p>
              <p>Rôle: {user?.role}</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

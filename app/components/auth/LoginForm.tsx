import { useState } from 'react';
import { gatewayInstance } from '~/lib/api/gateway';
import { setElloyDataToCookies } from '~/utils/ellogyUtils';
import { useAuth } from './AuthProvider';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: number;
    accountPlan: number;
    organization?: string;
    department?: string;
    phoneNumber?: string;
    avatarLink?: string;
    stripeCustomerId?: string;
  };
}

/**
 * Composant de formulaire de connexion
 */
export const LoginForm = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshAuth } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Effacer l'erreur quand l'utilisateur tape
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await gatewayInstance.post<LoginResponse>('/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { token, refreshToken, user } = response.data;

      // Sauvegarder les données dans les cookies
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
          refreshToken,
        },
        token,
      );

      // Rafraîchir l'état d'authentification
      refreshAuth();

      // Rediriger vers la page d'accueil
      window.location.href = '/';
    } catch (error: any) {
      console.error('Erreur de connexion:', error);

      if (error.response?.status === 401) {
        setError('Email ou mot de passe incorrect');
      } else if (error.response?.status === 403) {
        setError('Accès refusé. Vérifiez vos permissions.');
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Connexion à Ellogy</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Connectez-vous à votre compte Ellogy Coder</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Adresse email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

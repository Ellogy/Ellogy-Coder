import { json, type MetaFunction } from '@remix-run/cloudflare';
import { LoginForm } from '~/components/auth/LoginForm';

export const meta: MetaFunction = () => {
  return [
    { title: 'Connexion - Ellogy Coder' },
    { name: 'description', content: 'Connectez-vous à votre compte Ellogy Coder' },
  ];
};

export const loader = () => json({});

/**
 * Page de connexion
 */
export default function Login() {
  return <LoginForm />;
}

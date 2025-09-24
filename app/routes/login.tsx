import { json, type MetaFunction } from '@remix-run/cloudflare';
import { LoginForm } from '~/components/auth/LoginForm';

export const meta: MetaFunction = () => {
  return [{ title: 'Ellogy Coder' }, { name: 'description', content: 'Login to your Ellogy Coder account' }];
};

export const loader = () => json({});

/**
 * Page de connexion
 */
export default function Login() {
  return <LoginForm />;
}

export function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  // Split the cookie string by semicolons and spaces
  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest.length > 0) {
      // Decode the name and value, and join value parts in case it contains '='
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

export function getApiKeysFromCookie(cookieHeader: string | null): Record<string, string> {
  const cookies = parseCookies(cookieHeader);
  const cookieKeys = cookies.apiKeys ? JSON.parse(cookies.apiKeys) : {};

  // Ajouter les clés API depuis les variables d'environnement VITE_
  const envKeys: Record<string, string> = {};

  // Vérifier VITE_ANTHROPIC_API_KEY
  if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
    envKeys.Anthropic = import.meta.env.VITE_ANTHROPIC_API_KEY;
  }

  // Vérifier d'autres variables VITE_ si nécessaire
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    envKeys.OpenAI = import.meta.env.VITE_OPENAI_API_KEY;
  }

  if (import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY) {
    envKeys.Google = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
  }

  /*
   * Fusionner les clés des cookies avec celles des variables d'environnement
   * Les variables d'environnement ont la priorité
   */
  return { ...cookieKeys, ...envKeys };
}

export function getProviderSettingsFromCookie(cookieHeader: string | null): Record<string, any> {
  const cookies = parseCookies(cookieHeader);
  return cookies.providers ? JSON.parse(cookies.providers) : {};
}

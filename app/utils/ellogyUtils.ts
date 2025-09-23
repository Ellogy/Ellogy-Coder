import Cookies from 'js-cookie';

export interface ElllogyUser {
  id: string;
  accountPlan: number;
  avatarLink: string | null;
  department: string | null;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  phoneNumber: string | null;
  refreshToken: string;
  role: number;
  stripeCustomerId: string;
  [key: string]: any;
}

export interface ElllogyData {
  ellogyUser: ElllogyUser | null;
  ellogyToken: string | null;
}

/**
 * Récupère les données Ellogy depuis les cookies
 * @returns {ElllogyData} Les données utilisateur et token Ellogy
 */
export function getElloyDataFromCookies(): ElllogyData {
  const ellogyUserCookie = Cookies.get('ellogy_user');
  const ellogyTokenCookie = Cookies.get('ellogy_token');

  let ellogyUser: ElllogyUser | null = null;
  let ellogyToken: string | null = null;

  if (ellogyUserCookie) {
    try {
      const parsedUser = JSON.parse(ellogyUserCookie);

      // Valider que l'utilisateur a les champs requis
      if (parsedUser && typeof parsedUser === 'object' && parsedUser.id && parsedUser.email) {
        ellogyUser = {
          id: parsedUser.id,
          accountPlan: parsedUser.accountPlan || 0,
          avatarLink: parsedUser.avatarLink || null,
          department: parsedUser.department || null,
          email: parsedUser.email,
          firstName: parsedUser.firstName || '',
          lastName: parsedUser.lastName || '',
          organization: parsedUser.organization || null,
          phoneNumber: parsedUser.phoneNumber || null,
          refreshToken: parsedUser.refreshToken || '',
          role: parsedUser.role || 0,
          stripeCustomerId: parsedUser.stripeCustomerId || '',
          ...parsedUser, // Garder les autres propriétés
        };
      }
    } catch (error) {
      console.error('Erreur lors du parsing de ellogy_user depuis les cookies:', error);
    }
  }

  if (ellogyTokenCookie) {
    // Nettoyer le token des guillemets supplémentaires s'il y en a
    ellogyToken = cleanJwtToken(ellogyTokenCookie);
  }

  return { ellogyUser, ellogyToken };
}

/**
 * Définit les données Ellogy dans les cookies
 * @param {ElllogyUser} user - Les données utilisateur
 * @param {string} token - Le token d'authentification
 * @param {number} expireDays - Nombre de jours avant expiration (défaut: 30)
 */
export function setElloyDataToCookies(user: ElllogyUser, token: string, expireDays: number = 30): void {
  try {
    // Nettoyer le token avant de le sauvegarder
    const cleanToken = cleanJwtToken(token);

    // Configuration des cookies avec des options plus robustes
    const cookieOptions = {
      expires: expireDays,
      secure: window.location.protocol === 'https:', // Secure en HTTPS
      sameSite: 'lax' as const, // Protection CSRF
      path: '/', // Accessible sur tout le site
    };

    Cookies.set('ellogy_user', JSON.stringify(user), cookieOptions);
    Cookies.set('ellogy_token', cleanToken, cookieOptions);

    console.log('Données Ellogy sauvegardées dans les cookies:', {
      userSaved: !!user,
      tokenSaved: !!cleanToken,
      tokenLength: cleanToken.length,
      cookieOptions,
    });

    // Vérifier que les cookies ont été sauvegardés
    const savedUser = Cookies.get('ellogy_user');
    const savedToken = Cookies.get('ellogy_token');
    console.log('Vérification des cookies sauvegardés:', {
      userCookieExists: !!savedUser,
      tokenCookieExists: !!savedToken,
      tokenLength: savedToken ? savedToken.length : 0,
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données Ellogy dans les cookies:', error);
  }
}

/**
 * Vérifie si les données Ellogy sont présentes dans les cookies
 * @returns {boolean} True si les données sont présentes
 */
export function hasElloyDataInCookies(): boolean {
  const { ellogyUser, ellogyToken } = getElloyDataFromCookies();
  return !!(ellogyUser && ellogyToken);
}

/**
 * Nettoie un token JWT des guillemets supplémentaires
 * @param token - Le token à nettoyer
 * @returns Le token nettoyé
 */
export function cleanJwtToken(token: string): string {
  if (!token) {
    return token;
  }

  // Supprimer les guillemets au début et à la fin
  let cleaned = token.replace(/^"(.*)"$/, '$1');

  // Supprimer les espaces en début et fin
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Supprime les données Ellogy des cookies
 */
export function clearElloyDataFromCookies(): void {
  try {
    Cookies.remove('ellogy_user');
    Cookies.remove('ellogy_token');
    console.log('Données Ellogy supprimées des cookies');
  } catch (error) {
    console.error('Erreur lors de la suppression des données Ellogy des cookies:', error);
  }
}

/**
 * Fonction de test pour vérifier la récupération des cookies
 */
export function testElloyyCookies(): void {
  console.log('=== Test des cookies Ellogy ===');

  const { ellogyUser, ellogyToken } = getElloyDataFromCookies();

  console.log('ellogy_user trouvé:', ellogyUser);
  console.log('ellogy_token trouvé:', ellogyToken);
  console.log('Données présentes:', hasElloyDataInCookies());

  if (ellogyUser) {
    console.log('Détails utilisateur:');
    console.log('- ID:', ellogyUser.id);
    console.log('- Email:', ellogyUser.email);
    console.log('- FirstName:', ellogyUser.firstName);
    console.log('- LastName:', ellogyUser.lastName);
  }

  // Vérifier aussi localStorage
  const localStorageToken = localStorage.getItem('token');
  const localStorageUser = localStorage.getItem('user');
  console.log('localStorage token:', localStorageToken ? 'présent' : 'absent');
  console.log('localStorage user:', localStorageUser ? 'présent' : 'absent');

  // Vérifier tous les cookies
  console.log('Tous les cookies:', document.cookie);

  console.log('=== Fin du test ===');
}

import { atom } from 'nanostores';

interface Profile {
  // Champs existants
  username: string;
  bio: string;
  avatar: string;
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
  id: string;
}

// Initialize with stored profile or defaults
const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('bolt_profile') : null;
const initialProfile: Profile = storedProfile
  ? JSON.parse(storedProfile)
  : {
      // Champs existants
      username: '',
      bio: '',
      avatar: '',

      // Nouveaux champs avec valeurs par défaut
      accountPlan: 0,
      avatarLink: null,
      department: null,
      email: '',
      firstName: '',
      lastName: '',
      organization: null,
      phoneNumber: null,
      refreshToken: '',
      role: 0,
      stripeCustomerId: '',
      id: '',
    };

export const profileStore = atom<Profile>(initialProfile);

// Initialiser le profil au démarrage si on est côté client
if (typeof window !== 'undefined') {
  // Synchroniser avec les données du localStorage 'user' si disponibles
  const userData = localStorage.getItem('user');

  if (userData) {
    try {
      const user = JSON.parse(userData);
      const syncedProfile: Profile = {
        // Champs existants
        username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest User',
        bio: '',
        avatar: user.avatarLink || '',

        // Nouveaux champs depuis localStorage 'user'
        accountPlan: user.accountPlan || 0,
        avatarLink: user.avatarLink || null,
        department: user.department || null,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        organization: user.organization || null,
        phoneNumber: user.phoneNumber || null,
        refreshToken: user.refreshToken || '',
        role: user.role || 0,
        stripeCustomerId: user.stripeCustomerId || '',
        id: user.id || '',
      };

      profileStore.set(syncedProfile);
      localStorage.setItem('bolt_profile', JSON.stringify(syncedProfile));
    } catch (error) {
      console.error("Erreur lors de l'initialisation du profil:", error);
    }
  }
}

export const updateProfile = (updates: Partial<Profile>) => {
  profileStore.set({ ...profileStore.get(), ...updates });

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('bolt_profile', JSON.stringify(profileStore.get()));
  }
};

// Fonction pour mettre à jour le profil avec les données complètes de l'utilisateur
export const updateUserProfile = (userData: {
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
  id: string;
}) => {
  const currentProfile = profileStore.get();

  // Mettre à jour le profil avec les nouvelles données
  const updatedProfile: Profile = {
    ...currentProfile,
    ...userData,

    // Générer un username basé sur firstName et lastName si pas défini
    username: currentProfile.username || `${userData.firstName} ${userData.lastName}`.trim() || 'Guest User',
  };

  profileStore.set(updatedProfile);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('bolt_profile', JSON.stringify(updatedProfile));
  }

  return updatedProfile;
};

// Fonction pour récupérer le profil utilisateur depuis localStorage
export const getUserProfile = (): Profile | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('bolt_profile');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return null;
  }
};

// Fonction pour mettre à jour l'utilisateur invité avec firstName et lastName
export const updateGuestUser = (firstName: string, lastName: string) => {
  const currentProfile = profileStore.get();

  const updatedProfile: Profile = {
    ...currentProfile,
    firstName,
    lastName,
    username: `${firstName} ${lastName}`.trim() || 'Guest User',

    // Marquer comme utilisateur invité si pas d'email
    email: currentProfile.email || '',
  };

  profileStore.set(updatedProfile);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('bolt_profile', JSON.stringify(updatedProfile));
  }

  return updatedProfile;
};

// Fonction pour vérifier si l'utilisateur est un invité
export const isGuestUser = (): boolean => {
  const profile = profileStore.get();
  return !profile.email || profile.email === '';
};

// Fonction pour synchroniser le profil avec les données du localStorage 'user'
export const syncProfileFromLocalStorage = (): Profile | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userData = localStorage.getItem('user');

    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData);

    // Mapper les données du localStorage 'user' vers notre interface Profile
    const profileData: Profile = {
      // Champs existants (garder les valeurs actuelles si pas dans user)
      username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest User',
      bio: '',
      avatar: user.avatarLink || '',

      // Nouveaux champs depuis localStorage 'user'
      accountPlan: user.accountPlan || 0,
      avatarLink: user.avatarLink || null,
      department: user.department || null,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      organization: user.organization || null,
      phoneNumber: user.phoneNumber || null,
      refreshToken: user.refreshToken || '',
      role: user.role || 0,
      stripeCustomerId: user.stripeCustomerId || '',
      id: user.id || '',
    };

    // Mettre à jour le store
    profileStore.set(profileData);

    // Sauvegarder dans bolt_profile aussi
    localStorage.setItem('bolt_profile', JSON.stringify(profileData));

    return profileData;
  } catch (error) {
    console.error('Erreur lors de la synchronisation du profil:', error);
    return null;
  }
};

// Fonction pour initialiser le profil au démarrage de l'application
export const initializeProfile = (): Profile => {
  // D'abord essayer de synchroniser avec localStorage 'user'
  const syncedProfile = syncProfileFromLocalStorage();

  if (syncedProfile) {
    return syncedProfile;
  }

  // Sinon, utiliser le profil existant ou les valeurs par défaut
  return profileStore.get();
};

import { atom } from 'nanostores';

export const sidebarStore = atom<{ isOpen: boolean }>({ isOpen: false });

export const toggleSidebar = () => {
  const current = sidebarStore.get();
  sidebarStore.set({ isOpen: !current.isOpen });
};

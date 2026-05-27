import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  isPremium: boolean;
  avatarUrl?: string;
}

interface UpsellModalState {
  isOpen: boolean;
  title: string;
  description: string;
}

interface UserStoreState {
  currentUser: User | null;
  isPremium: boolean;
  languageCode: string;
  upsellModal: UpsellModalState;
  
  setCurrentUser: (user: User | null) => void;
  setLanguage: (lang: string) => void;
  triggerPremiumUpsellModal: (modalConfig: Partial<Omit<UpsellModalState, 'isOpen'>>) => void;
  closePremiumUpsellModal: () => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isPremium: false,
      languageCode: 'en',
      upsellModal: {
        isOpen: false,
        title: 'Unlock Premium Features',
        description: 'Upgrade your membership to access the AI Coach, post-game commentary, and in-depth puzzle analysis tools.'
      },
      
      setCurrentUser: (user) => set({ 
        currentUser: user, 
        isPremium: user?.isPremium || false 
      }),
      
      setLanguage: (lang) => set({ 
        languageCode: lang 
      }),
      
      triggerPremiumUpsellModal: (modalConfig) => set((state) => ({
        upsellModal: {
          isOpen: true,
          title: modalConfig.title || state.upsellModal.title,
          description: modalConfig.description || state.upsellModal.description
        }
      })),
      
      closePremiumUpsellModal: () => set((state) => ({
        upsellModal: {
          ...state.upsellModal,
          isOpen: false
        }
      }))
    }),
    {
      name: 'chess-user-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonList,
  IonListHeader
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/useUserStore';

const ProfileTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const languageCode = useUserStore((state) => state.languageCode);
  const setLanguage = useUserStore((state) => state.setLanguage);

  const handleLanguageChange = async (e: CustomEvent) => {
    const selectedLang = e.detail.value;
    await i18n.changeLanguage(selectedLang);
    setLanguage(selectedLang);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.profile')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1>Settings & Configurations</h1>

          <IonList inset={true} style={{ marginTop: '20px' }}>
            <IonListHeader>
              <IonLabel>Localization Settings</IonLabel>
            </IonListHeader>
            
            <IonItem>
              <IonLabel>App Language</IonLabel>
              <IonSelect 
                value={languageCode} 
                placeholder="Select Language" 
                onIonChange={handleLanguageChange}
              >
                <IonSelectOption value="en">English</IonSelectOption>
                <IonSelectOption value="es">Español</IonSelectOption>
                <IonSelectOption value="fr">Français</IonSelectOption>
                <IonSelectOption value="de">Deutsch</IonSelectOption>
                <IonSelectOption value="ru">Русский</IonSelectOption>
                <IonSelectOption value="hi">हिन्दी</IonSelectOption>
                <IonSelectOption value="ml">മലയാളം</IonSelectOption>
                <IonSelectOption value="ta">தமிழ்</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfileTab;

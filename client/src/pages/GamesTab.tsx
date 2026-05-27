import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

const GamesTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.games')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1>{t('games.title')}</h1>
          <p>Chronological match archives with platform sync helpers.</p>
          <div style={{ marginTop: '15px' }}>
            <IonButton expand="block">{t('games.sync')}</IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default GamesTab;

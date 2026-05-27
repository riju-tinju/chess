import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar 
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

const AnalyzeTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.analyze')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1>Engine Analysis</h1>
          <p>Request stockfish move classifications or upgrade to premium to access your personalized AI Coach.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AnalyzeTab;

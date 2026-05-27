import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar 
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

const LearnTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.learn')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1>Lessons & Puzzles</h1>
          <p>Sharpen your skills through structured learning paths and custom tactics training.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LearnTab;

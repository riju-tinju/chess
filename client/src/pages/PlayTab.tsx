import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

const PlayTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.play')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1>{t('play.title')}</h1>
          <p>{t('play.subtitle')}</p>

          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>{t('play.new_game')}</IonCardSubtitle>
              <IonCardTitle>VS Stockfish / Player</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              Start an immersive local game using 100% full-width chessboard ergonomics.
              <div style={{ marginTop: '15px' }}>
                <IonButton expand="block">{t('play.new_game')}</IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>{t('play.daily_challenge')}</IonCardSubtitle>
              <IonCardTitle>Offline Chess Puzzles</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              Solve daily puzzle FENs completely offline without server roundtrips.
              <div style={{ marginTop: '15px' }}>
                <IonButton expand="block" color="secondary">{t('play.daily_challenge')}</IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PlayTab;

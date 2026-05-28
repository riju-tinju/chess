import React, { Suspense } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonSpinner,
  IonPage,
  IonContent,
  IonModal,
  IonButton,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useTranslation } from 'react-i18next';
import { 
  gameControllerOutline, 
  bookOutline, 
  analyticsOutline, 
  listOutline, 
  personOutline 
} from 'ionicons/icons';
import { useUserStore } from './store/useUserStore';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

// Lazy Loaded Tab Pages
const PlayTab = React.lazy(() => import('./pages/PlayTab'));
const LearnTab = React.lazy(() => import('./pages/LearnTab'));
const AnalyzeTab = React.lazy(() => import('./pages/AnalyzeTab'));
const GamesTab = React.lazy(() => import('./pages/GamesTab'));
const ProfileTab = React.lazy(() => import('./pages/ProfileTab'));

const LoadingScreen: React.FC = () => (
  <IonPage>
    <IonContent className="ion-padding ion-text-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ transform: 'translateY(40vh)' }}>
        <IonSpinner name="crescent" color="primary" />
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>Initializing Chessboard...</p>
      </div>
    </IonContent>
  </IonPage>
);

const App: React.FC = () => {
  const { t } = useTranslation();
  
  // Zustand Store Selectors
  const upsellModal = useUserStore((state) => state.upsellModal);
  const closePremiumUpsellModal = useUserStore((state) => state.closePremiumUpsellModal);
  const currentUser = useUserStore((state) => state.currentUser);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);

  const simulateUpgrade = () => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        isPremium: true
      });
    } else {
      setCurrentUser({
        id: 'sandbox_user',
        username: 'SandboxGrandmaster',
        email: 'sandbox@chess.com',
        isPremium: true
      });
    }
    closePremiumUpsellModal();
  };

  return (
    <IonApp>
      <IonReactRouter>
        <Suspense fallback={<LoadingScreen />}>
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/play" component={PlayTab} />
              <Route exact path="/learn" component={LearnTab} />
              <Route exact path="/analyze" component={AnalyzeTab} />
              <Route exact path="/games" component={GamesTab} />
              <Route exact path="/profile" component={ProfileTab} />
              <Route exact path="/">
                <Redirect to="/play" />
              </Route>
            </IonRouterOutlet>
            
            <IonTabBar slot="bottom">
              <IonTabButton tab="play" href="/play">
                <IonIcon aria-hidden="true" icon={gameControllerOutline} />
                <IonLabel>{t('tabs.play')}</IonLabel>
              </IonTabButton>
              
              <IonTabButton tab="learn" href="/learn">
                <IonIcon aria-hidden="true" icon={bookOutline} />
                <IonLabel>{t('tabs.learn')}</IonLabel>
              </IonTabButton>
              
              <IonTabButton tab="analyze" href="/analyze">
                <IonIcon aria-hidden="true" icon={analyticsOutline} />
                <IonLabel>{t('tabs.analyze')}</IonLabel>
              </IonTabButton>
              
              <IonTabButton tab="games" href="/games">
                <IonIcon aria-hidden="true" icon={listOutline} />
                <IonLabel>{t('tabs.games')}</IonLabel>
              </IonTabButton>
              
              <IonTabButton tab="profile" href="/profile">
                <IonIcon aria-hidden="true" icon={personOutline} />
                <IonLabel>{t('tabs.profile')}</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </Suspense>
      </IonReactRouter>

      {/* Global Gold-Accented Premium Members Upsell Modal */}
      <IonModal 
        isOpen={upsellModal.isOpen} 
        onDidDismiss={closePremiumUpsellModal}
        breakpoints={[0, 0.4, 0.7]}
        initialBreakpoint={0.4}
      >
        <IonContent className="ion-padding" style={{ '--background': '#1E1E1E', color: '#FFFFFF' }}>
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              color: '#121212', 
              backgroundColor: '#C9A84C', 
              padding: '3px 10px', 
              borderRadius: '20px',
              letterSpacing: '1px'
            }}>
              MEMBERSHIP REQUIRED
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '15px 0 10px 0', color: '#C9A84C' }}>
              {upsellModal.title}
            </h2>
            <p style={{ fontSize: '13px', color: '#A0A6B5', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {upsellModal.description}
            </p>

            <IonButton expand="block" color="warning" onClick={simulateUpgrade} style={{ 'font-weight': '600' }}>
              Upgrade Now (Sandbox Simulator)
            </IonButton>
            
            <IonButton expand="block" fill="clear" color="medium" onClick={closePremiumUpsellModal}>
              Maybe Later
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </IonApp>
  );
};

export default App;

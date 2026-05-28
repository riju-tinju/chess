import React, { useState, useEffect, useRef } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonToggle,
  IonAccordion,
  IonAccordionGroup,
  IonToast,
  IonSpinner,
  IonAvatar
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  refreshOutline, 
  playBackOutline, 
  hardwareChipOutline, 
  bluetoothOutline, 
  linkOutline,
  shareOutline,
  copyOutline,
  checkmarkCircleOutline,
  colorPaletteOutline,
  timerOutline,
  scaleOutline,
  wifiOutline,
  playOutline,
  optionsOutline,
  globeOutline,
  trophyOutline,
  micOutline,
  chevronForwardOutline,
  arrowBackOutline,
  flashOutline
} from 'ionicons/icons';
import { StockfishEngine } from '../services/stockfishService';
import { useUserStore } from '../store/useUserStore';

type ActiveView = 'dashboard' | 'setup' | 'board';
type GameMode = 'computer' | 'bluetooth' | 'friend';
type ChessColor = 'white' | 'black' | 'random';

interface RecentMatch {
  id: string;
  opponent: string;
  opponentElo: number;
  outcome: 'win' | 'loss' | 'draw';
  type: string;
  hasAudioLog: boolean;
  date: string;
}

const PlayTab: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useUserStore((state) => state.currentUser);

  // View state machine
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // Game Engine & board setups
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  
  const [gameMode, setGameMode] = useState<GameMode>('computer');
  const [gameFen, setGameFen] = useState(chessRef.current.fen());
  const [gameStatus, setGameStatus] = useState<string>('White to move');
  const [history, setHistory] = useState<string[]>([]);
  const [isEngineThinking, setIsEngineThinking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // --- MATCH CONFIGURATION STATES ---
  const [selectedColor, setSelectedColor] = useState<ChessColor>('white');
  const [sameTimeBoth, setSameTimeBoth] = useState<boolean>(true);
  const [timeControl, setTimeControl] = useState<number>(5);
  const [sameIncrementBoth, setSameIncrementBoth] = useState<boolean>(true);
  const [increment, setIncrement] = useState<number>(0);
  const [handicap, setHandicap] = useState<string>('none');

  // Interactive Digital Clocks
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  // Mock Quick History list (Last 3 matches)
  const [recentMatches] = useState<RecentMatch[]>([
    { id: 'rec_1', opponent: 'GrandmasterA', opponentElo: 2100, outcome: 'win', type: 'INTERNAL', hasAudioLog: true, date: 'TODAY' },
    { id: 'rec_2', opponent: 'Stockfish Level 8', opponentElo: 2500, outcome: 'loss', type: 'LICHESS', hasAudioLog: false, date: '1 DAY AGO' },
    { id: 'rec_3', opponent: 'MagnusC', opponentElo: 2882, outcome: 'draw', type: 'CHESS.COM', hasAudioLog: true, date: '3 DAYS AGO' }
  ]);

  // Bluetooth & Friend states
  const [isBtScanning, setIsBtScanning] = useState<boolean>(false);
  const [connectedBtDevice, setConnectedBtDevice] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');

  // Initialize stockfish
  useEffect(() => {
    engineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.terminate();
    };
  }, []);

  // Clock Countdown logic
  useEffect(() => {
    let interval: any;
    if (activeView === 'board' && isClockRunning && !chessRef.current.isGameOver()) {
      interval = setInterval(() => {
        const turn = chessRef.current.turn();
        if (turn === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              setGameStatus('Black wins on time!');
              setIsClockRunning(false);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              setGameStatus('White wins on time!');
              setIsClockRunning(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeView, isClockRunning, gameFen]);

  // Computer engine calculation
  useEffect(() => {
    const chess = chessRef.current;
    if (activeView === 'board' && gameMode === 'computer' && chess.turn() === 'b' && !chess.isGameOver() && !isEngineThinking) {
      setIsEngineThinking(true);
      setGameStatus('Computer is thinking...');
      
      const timer = setTimeout(() => {
        engineRef.current?.getBestMove(chess.fen(), 10, (bestMove) => {
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
          
          try {
            chess.move({ from, to, promotion });
            if (increment > 0) setBlackTime((t) => t + increment);
            setGameFen(chess.fen());
            setHistory(chess.history());
            setIsEngineThinking(false);
            updateStatus();
          } catch (err) {
            console.error("Invalid computer move:", err);
            setIsEngineThinking(false);
            updateStatus();
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameFen, gameMode, activeView]);

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateStatus = () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      setIsClockRunning(false);
      if (chess.isCheckmate()) {
        setGameStatus('Checkmate! Game Over.');
      } else if (chess.isDraw()) {
        setGameStatus('Game Over. Draw');
      }
    } else {
      if (chess.inCheck()) {
        setGameStatus(`Check! ${chess.turn() === 'w' ? 'White' : 'Black'} to move`);
      } else {
        setGameStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} to move`);
      }
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isEngineThinking || !isClockRunning) return false;
    const turn = chessRef.current.turn();
    if (gameMode === 'computer' && turn === 'b') return false;

    try {
      const chess = chessRef.current;
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      if (turn === 'w') {
        if (increment > 0) setWhiteTime((t) => t + increment);
      } else {
        if (increment > 0) setBlackTime((t) => t + increment);
      }

      setGameFen(chess.fen());
      setHistory(chess.history());
      updateStatus();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Launch hosted game from config setup
  const handleHostGame = () => {
    const initialClocks = timeControl * 60;
    setWhiteTime(initialClocks);
    setBlackTime(initialClocks);
    
    const cleanGame = new Chess();
    if (handicap === 'knight') {
      cleanGame.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR b KQkq - 1 1');
    } else if (handicap === 'queen') {
      cleanGame.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 1 1');
    }

    chessRef.current = cleanGame;
    setGameFen(cleanGame.fen());
    setHistory([]);
    setGameStatus('White to move');
    
    setActiveView('board');
    setIsClockRunning(true);
    setToastMessage(`Match Initialized. Time: ${formatTime(initialClocks)}`);
  };

  const undoMove = () => {
    if (isEngineThinking) return;
    const chess = chessRef.current;
    chess.undo();
    if (gameMode === 'computer' && chess.turn() === 'b') {
      chess.undo();
    }
    setGameFen(chess.fen());
    setHistory(chess.history());
    updateStatus();
  };

  const startNewGame = () => {
    if (isEngineThinking) {
      engineRef.current?.stop();
      setIsEngineThinking(false);
    }
    const newGame = new Chess();
    chessRef.current = newGame;
    setGameFen(newGame.fen());
    setHistory([]);
    setGameStatus('White to move');
    setIsClockRunning(true);
  };

  return (
    <IonPage>
      {/* Dynamic Header */}
      <IonHeader>
        <IonToolbar style={{ '--background': '#1A1E2B', '--color': '#FFFFFF' }}>
          {activeView === 'dashboard' ? (
            <IonTitle>{t('tabs.play')}</IonTitle>
          ) : (
            <IonButton 
              slot="start" 
              fill="clear" 
              style={{ '--color': '#C5A85C' }}
              onClick={() => setActiveView(activeView === 'board' ? 'setup' : 'dashboard')}
            >
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back
            </IonButton>
          )}
          {activeView === 'board' && (
            <IonTitle>Live Battle</IonTitle>
          )}
          {activeView === 'setup' && (
            <IonTitle>Game Setup</IonTitle>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': '#1A1E2B' }}>

        {/* ========================================================= */}
        {/* VIEW 1: PREMIUM MINIMALIST DASHBOARD VIEW                 */}
        {/* ========================================================= */}
        {activeView === 'dashboard' && (
          <div className="ion-padding" style={{ maxWidth: '550px', margin: '0 auto', color: '#FFFFFF' }}>
            
            {/* Top Header: User Profile Block */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px', 
              padding: '10px 5px',
              marginBottom: '20px'
            }}>
              <IonAvatar style={{ 
                width: '50px', 
                height: '50px', 
                border: '2px solid #C5A85C', // Subtle champagne gold ring
                padding: '2px',
                backgroundColor: '#1E1E1E'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: '#C5A85C',
                  color: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  {(currentUser?.username || 'P')[0].toUpperCase()}
                </div>
              </IonAvatar>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 2px 0', color: '#ECEFF4' }}>
                  {currentUser?.username || 'Guest Player'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#A0A6B5' }}>
                  <IonIcon icon={trophyOutline} style={{ color: '#C5A85C' }} />
                  <span>1,850 ELO</span>
                </div>
              </div>
            </div>

            {/* Primary Action Grid (Two Minimalist Cards) */}
            <IonGrid style={{ padding: 0, marginBottom: '20px' }}>
              <IonRow style={{ margin: '0 -6px' }}>
                <IonCol size="6" style={{ padding: '0 6px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('friend');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '145px',
                      borderRadius: '12px',
                      backgroundColor: '#1E1E1E',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <IonIcon icon={globeOutline} style={{ fontSize: '28px', color: '#C5A85C' }} />
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#ECEFF4' }}>Play Online</h3>
                      <p style={{ fontSize: '10px', color: '#888', margin: 0, lineHeight: '1.3' }}>Challenge global players via web links.</p>
                    </div>
                  </div>
                </IonCol>

                <IonCol size="6" style={{ padding: '0 6px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('computer');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '145px',
                      borderRadius: '12px',
                      backgroundColor: '#1E1E1E',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <IonIcon icon={hardwareChipOutline} style={{ fontSize: '28px', color: '#C5A85C' }} />
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#ECEFF4' }}>vs Computer</h3>
                      <p style={{ fontSize: '10px', color: '#888', margin: 0, lineHeight: '1.3' }}>Train vs Stockfish AI engine offline.</p>
                    </div>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Engagement Zone (Daily Challenge Banner) */}
            <div style={{
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1E1E1E 0%, #1A1E2B 100%)',
              padding: '16px',
              border: '1px solid rgba(197, 168, 92, 0.15)', // Light champagne gold accent line
              marginBottom: '25px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#C5A85C', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <IonIcon icon={flashOutline} />
                  DAILY PUZZLE
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#ECEFF4' }}>Mate in 3 Tactics</h3>
                <p style={{ fontSize: '11px', color: '#A0A6B5', margin: 0 }}>Solved by 14,204 players today.</p>
              </div>
              <IonButton 
                size="small" 
                style={{ 
                  '--background': 'transparent', 
                  '--border-color': '#C5A85C', 
                  '--border-style': 'solid',
                  '--border-width': '1px',
                  '--color': '#C5A85C',
                  'font-weight': '600',
                  fontSize: '11px'
                }}
              >
                SOLVE
              </IonButton>
            </div>

            {/* Quick History Zone (Last 3 matches) */}
            <div>
              <h3 style={{ 
                fontSize: '11px', 
                fontWeight: 'bold', 
                color: 'rgba(160, 166, 181, 0.6)', 
                letterSpacing: '1px', 
                textTransform: 'uppercase', 
                margin: '0 0 10px 4px' 
              }}>
                Recent Matches
              </h3>

              <IonList inset={true} style={{ background: 'transparent', margin: 0, padding: 0 }}>
                {recentMatches.map((match) => (
                  <div 
                    key={match.id}
                    style={{
                      backgroundColor: '#1E1E1E',
                      borderRadius: '8px',
                      padding: '12px',
                      margin: '6px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#ECEFF4' }}>
                        vs {match.opponent} ({match.opponentElo})
                      </div>
                      <div style={{ fontSize: '10px', color: '#A0A6B5', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ 
                          fontWeight: '700', 
                          color: match.outcome === 'win' ? '#81B64C' : match.outcome === 'loss' ? '#E53935' : '#FFFFFF' 
                        }}>
                          {match.outcome.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span>{match.type}</span>
                        <span>•</span>
                        <span>{match.date}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {match.hasAudioLog && (
                        <IonIcon icon={micOutline} style={{ color: '#C5A85C', fontSize: '16px' }} />
                      )}
                      <IonIcon icon={chevronForwardOutline} style={{ color: '#888', fontSize: '16px' }} />
                    </div>
                  </div>
                ))}
              </IonList>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: REFINED MATCH SETUP CONFIGURATION VIEW            */}
        {/* ========================================================= */}
        {activeView === 'setup' && (
          <div className="ion-padding" style={{ maxWidth: '500px', margin: '0 auto', color: '#FFFFFF' }}>
            
            {/* Horizontal Sub-mode selections */}
            <div style={{ marginBottom: '20px' }}>
              <IonSegment 
                value={gameMode} 
                onIonChange={(e) => setGameMode(e.detail.value as GameMode)}
                style={{ 
                  '--background': '#121212',
                  '--color': '#A0A6B5',
                  '--color-checked': '#121212',
                  '--background-checked': '#C5A85C', // Subdued gold checked states
                  borderRadius: '8px'
                }}
              >
                <IonSegmentButton value="computer" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>vs Computer</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="friend" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>Friend Lobby</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {/* Friend Room Code Generator if in Friend Mode */}
            {gameMode === 'friend' && (
              <IonCard style={{ '--background': '#1E1E1E', margin: '0 0 20px 0', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#C5A85C', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonIcon icon={linkOutline} />
                    Matchmaking Lobby Link
                  </h3>
                  {!roomCode ? (
                    <IonButton 
                      expand="block" 
                      onClick={() => {
                        setIsLobbyConnecting(true);
                        setTimeout(() => {
                          setRoomCode('ROOM_' + Math.random().toString(36).substring(2, 6).toUpperCase());
                          setIsLobbyConnecting(false);
                        }, 1000);
                      }}
                      style={{
                        '--background': 'rgba(197, 168, 92, 0.08)',
                        '--border-color': '#C5A85C',
                        '--border-style': 'solid',
                        '--border-width': '1px',
                        '--color': '#C5A85C',
                        'font-weight': '600',
                        margin: 0
                      }}
                    >
                      {isLobbyConnecting ? <IonSpinner name="dots" color="warning" /> : 'Generate Room Code'}
                    </IonButton>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2E3440', padding: '6px 12px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#81B64C' }}>Lobby Code: {roomCode}</span>
                      <IonButton fill="clear" size="small" style={{ '--color': '#C5A85C' }} onClick={() => {
                        navigator.clipboard.writeText(`https://chessapp.com/lobby/${roomCode}`);
                        setToastMessage('Lobby URL copied!');
                      }}>
                        Copy
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            )}

            {/* CONFIG SECTION 1: COLOR SELECTION */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#A0A6B5', margin: '0 0 10px 4px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={colorPaletteOutline} />
                Your Color
              </h3>
              
              <IonRow style={{ margin: '0 -4px' }}>
                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('white')}
                    style={{
                      padding: '16px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#1E1E1E',
                      border: selectedColor === 'white' ? '1px solid #C5A85C' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>♔</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: selectedColor === 'white' ? '#C5A85C' : '#FFFFFF' }}>White</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('black')}
                    style={{
                      padding: '16px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#1E1E1E',
                      border: selectedColor === 'black' ? '1px solid #C5A85C' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>♚</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: selectedColor === 'black' ? '#C5A85C' : '#FFFFFF' }}>Black</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('random')}
                    style={{
                      padding: '16px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#1E1E1E',
                      border: selectedColor === 'random' ? '1px solid #C5A85C' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>🎲</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: selectedColor === 'random' ? '#C5A85C' : '#FFFFFF' }}>Random</span>
                  </div>
                </IonCol>
              </IonRow>
            </div>

            {/* CONFIG SECTION 2: TIME CONTROL */}
            <div style={{ marginBottom: '25px', backgroundColor: '#1E1E1E', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#A0A6B5', margin: '0 0 15px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={timerOutline} />
                Time Control
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#ECEFF4' }}>Same time for both</span>
                <IonToggle checked={sameTimeBoth} onIonChange={(e) => setSameTimeBoth(e.detail.checked)} style={{ '--background': '#2E3440' }} />
              </div>

              {/* Dynamic horizontal duration selectors */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '15px' }}>
                {[1, 2, 3, 5, 10].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setTimeControl(t)}
                    style={{ 
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: timeControl === t ? '1px solid #C5A85C' : '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: timeControl === t ? 'rgba(197, 168, 92, 0.08)' : 'transparent',
                      color: timeControl === t ? '#C5A85C' : '#A0A6B5',
                      cursor: 'pointer',
                      minWidth: '60px'
                    }}
                  >
                    {t} min
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#ECEFF4' }}>Same increment for both</span>
                <IonToggle checked={sameIncrementBoth} onIonChange={(e) => setSameIncrementBoth(e.detail.checked)} style={{ '--background': '#2E3440' }} />
              </div>

              {/* Increments buttons */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px' }}>
                {[0, 1, 2, 3, 5].map((inc) => (
                  <button 
                    key={inc}
                    onClick={() => setIncrement(inc)}
                    style={{ 
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: increment === inc ? '1px solid #C5A85C' : '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: increment === inc ? 'rgba(197, 168, 92, 0.08)' : 'transparent',
                      color: increment === inc ? '#C5A85C' : '#A0A6B5',
                      cursor: 'pointer',
                      minWidth: '70px'
                    }}
                  >
                    {inc === 0 ? 'No inc' : `+${inc}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* CONFIG SECTION 3: ACCORDION HANDICAP */}
            <div style={{ marginBottom: '25px' }}>
              <IonAccordionGroup>
                <IonAccordion value="handicaps" style={{ '--background': '#1E1E1E', color: '#FFFFFF', borderRadius: '8px', overflow: 'hidden' }}>
                  <IonItem slot="header" style={{ '--background': '#1E1E1E', '--color': '#FFFFFF' }}>
                    <IonIcon icon={scaleOutline} slot="start" style={{ color: '#C5A85C' }} />
                    <IonLabel>
                      <h3 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Handicap</h3>
                      <p style={{ fontSize: '10px', color: '#888' }}>Optional - give one side an advantage</p>
                    </IonLabel>
                  </IonItem>
                  <div className="ion-padding" slot="content" style={{ backgroundColor: '#1E1E1E', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div 
                      onClick={() => setHandicap('none')}
                      style={{ padding: '10px', borderRadius: '4px', backgroundColor: handicap === 'none' ? '#2E3440' : 'transparent', border: handicap === 'none' ? '1px solid #C5A85C' : '1px solid transparent', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🛡️ None (Standard Equal Match)
                    </div>
                    <div 
                      onClick={() => setHandicap('knight')}
                      style={{ padding: '10px', borderRadius: '4px', backgroundColor: handicap === 'knight' ? '#2E3440' : 'transparent', border: handicap === 'knight' ? '1px solid #C5A85C' : '1px solid transparent', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🐎 Knight Advantage (White plays without Queen's Knight b1)
                    </div>
                    <div 
                      onClick={() => setHandicap('queen')}
                      style={{ padding: '10px', borderRadius: '4px', backgroundColor: handicap === 'queen' ? '#2E3440' : 'transparent', border: handicap === 'queen' ? '1px solid #C5A85C' : '1px solid transparent', cursor: 'pointer', fontSize: '12px' }}
                    >
                      👑 Queen Advantage (White plays without Queen d1)
                    </div>
                  </div>
                </IonAccordion>
              </IonAccordionGroup>
            </div>

            {/* Sleek Champagne Gold start button */}
            <IonButton 
              expand="block" 
              onClick={handleHostGame}
              disabled={gameMode === 'friend' && !roomCode}
              style={{ 
                '--background': '#C5A85C', // Premium Champagne Gold
                '--color': '#121212',
                'font-weight': '600',
                height: '46px',
                fontSize: '14px',
                marginTop: '30px'
              }}
            >
              {gameMode === 'computer' ? (
                <>
                  <IonIcon icon={playOutline} slot="start" />
                  Start Match vs Computer
                </>
              ) : (
                <>
                  <IonIcon icon={wifiOutline} slot="start" />
                  Host Online Lobby
                </>
              )}
            </IonButton>

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: ACTIVE GAME BOARD VIEW                            */}
        {/* ========================================================= */}
        {activeView === 'board' && (
          <div>
            {/* Clocks & Timer Header Bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              backgroundColor: '#1E1E1E', 
              padding: '12px',
              borderBottom: '2px solid #2E3440',
              color: '#FFFFFF'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#888', display: 'block' }}>WHITE (Player)</span>
                <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'w' ? '#C5A85C' : '#FFFFFF' }}>
                  {formatTime(whiteTime)}
                </span>
              </div>
              <div style={{ alignSelf: 'center', color: '#888', fontWeight: 'bold' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#888', display: 'block' }}>BLACK (Opponent)</span>
                <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'b' ? '#C5A85C' : '#FFFFFF' }}>
                  {formatTime(blackTime)}
                </span>
              </div>
            </div>

            {/* 100% full-width chessboard layout (mandated for zero visual strain) */}
            <div style={{ width: '100vw', maxWidth: '100vw', margin: '0', padding: '0', backgroundColor: '#1A1E2B' }}>
              <Chessboard 
                position={gameFen} 
                onPieceDrop={onDrop}
                boardWidth={window.innerWidth > 600 ? 550 : window.innerWidth}
                customDarkSquareStyle={{ backgroundColor: '#5C6479' }}
                customLightSquareStyle={{ backgroundColor: '#ECEFF4' }}
                customBoardStyle={{
                  borderRadius: '0px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4)'
                }}
                arePiecesDraggable={!isEngineThinking && isClockRunning}
              />
            </div>

            {/* Game controllers */}
            <div className="ion-padding" style={{ color: '#FFFFFF', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ 
                padding: '10px 15px', 
                borderRadius: '8px', 
                backgroundColor: '#1E1E1E', 
                marginBottom: '15px', 
                fontSize: '14px', 
                fontWeight: '600',
                textAlign: 'center',
                borderLeft: '4px solid #C5A85C'
              }}>
                {gameStatus}
              </div>

              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="6">
                    <IonButton expand="block" color="warning" fill="outline" onClick={undoMove} disabled={history.length === 0 || isEngineThinking}>
                      <IonIcon slot="start" icon={playBackOutline} />
                      Undo
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton expand="block" color="danger" fill="outline" onClick={startNewGame} disabled={isEngineThinking}>
                      <IonIcon slot="start" icon={refreshOutline} />
                      Restart
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Move Log */}
              <IonCard style={{ '--background': '#1E1E1E', margin: '15px 0 0 0', borderRadius: '8px' }}>
                <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#C5A85C' }}>Moves Played</h3>
                  {history.length === 0 ? (
                    <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>Waiting for first move...</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '60px', overflowY: 'auto' }}>
                      {history.map((move, index) => (
                        <span key={index} style={{ padding: '2px 6px', backgroundColor: '#2E3440', borderRadius: '4px' }}>
                          {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                        </span>
                      ))}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </div>
          </div>
        )}

        {/* Toast Notifier */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default PlayTab;

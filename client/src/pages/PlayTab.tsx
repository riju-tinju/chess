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
  IonAvatar,
  IonList,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton
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
  flashOutline,
  sunnyOutline,
  moonOutline
} from 'ionicons/icons';
import { StockfishEngine } from '../services/stockfishService';
import { useUserStore } from '../store/useUserStore';

type ActiveView = 'dashboard' | 'setup' | 'board';
type GameMode = 'computer' | 'friend' | 'bluetooth';
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

interface BluetoothDevice {
  id: string;
  name: string;
  status: 'paired' | 'discovered' | 'connecting';
}

const PlayTab: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useUserStore((state) => state.currentUser);

  // Dual Themes State: Premium Light Mode as Default core experience
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

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
  const [isLobbyConnecting, setIsLobbyConnecting] = useState<boolean>(false);
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([
    { id: 'dev_1', name: 'Grandmaster iPad Pro', status: 'paired' },
    { id: 'dev_2', name: 'OnePlus 12 (Discovered)', status: 'discovered' },
    { id: 'dev_3', name: 'Pixel 8 Pro (Discovered)', status: 'discovered' }
  ]);

  // Sync dual theme selection globally
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

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

  // Bluetooth scanning triggers
  const startBluetoothScan = () => {
    setIsBtScanning(true);
    setToastMessage('Searching local bluetooth frequencies...');
    setTimeout(() => {
      setIsBtScanning(false);
    }, 3000);
  };

  const connectToBtDevice = (device: BluetoothDevice) => {
    setBtDevices((prev) => prev.map((d) => d.id === device.id ? { ...d, status: 'connecting' } : d));
    setTimeout(() => {
      setBtDevices((prev) => prev.map((d) => d.id === device.id ? { ...d, status: 'paired' } : d));
      setConnectedBtDevice(device.name);
      setToastMessage(`Connected via Bluetooth to ${device.name}! Ready to play locally.`);
    }, 1500);
  };

  return (
    <IonPage>
      {/* Luxury Minimalist Header with dynamic theme toggle */}
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ 
          '--background': 'var(--ion-background-color)', 
          '--color': 'var(--ion-text-color)',
          padding: '10px 10px 0 10px',
          transition: 'background-color 0.3s ease'
        }}>
          {activeView !== 'dashboard' ? (
            <IonButton 
              slot="start" 
              fill="clear" 
              style={{ '--color': 'var(--luxury-gold)', fontWeight: '500', fontSize: '14px' }}
              onClick={() => setActiveView(activeView === 'board' ? 'setup' : 'dashboard')}
            >
              <IonIcon icon={arrowBackOutline} slot="start" style={{ fontSize: '16px' }} />
              Back
            </IonButton>
          ) : (
            /* Sleek Editorial Header Logo Placeholder */
            <div slot="start" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              fontWeight: '800', 
              letterSpacing: '2px',
              color: 'var(--ion-text-color)',
              paddingLeft: '10px'
            }}>
              ◈ CHESS ROOM
            </div>
          )}
          
          {/* Dual Theme Switcher (Tucked into top-right header) */}
          <div slot="end" onClick={() => setIsDarkMode(!isDarkMode)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
            cursor: 'pointer',
            paddingRight: '10px',
            color: 'var(--luxury-gold)',
            textTransform: 'uppercase'
          }}>
            <IonIcon icon={isDarkMode ? sunnyOutline : moonOutline} style={{ fontSize: '14px' }} />
            <span>{isDarkMode ? 'LIGHT' : 'DARK'}</span>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ 
        '--background': 'var(--ion-background-color)',
        transition: 'background-color 0.3s ease'
      }}>

        {/* ========================================================= */}
        {/* VIEW 1: EDITORIAL LUXURY MINIMALIST DASHBOARD VIEW        */}
        {/* ========================================================= */}
        {activeView === 'dashboard' && (
          <div className="ion-padding" style={{ 
            maxWidth: '520px', 
            margin: '0 auto', 
            color: 'var(--ion-text-color)',
            paddingTop: '20px'
          }}>
            
            {/* Top Luxury Header with Editorial Typography Hierarchy */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '35px',
              padding: '0 5px'
            }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--luxury-gold)', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  THE GRANDMASTER LIBRARY
                </span>
                
                {/* Single sentence mixed font-weights to emphasize focus keyword exactly */}
                <h1 style={{ 
                  fontSize: '26px', 
                  margin: 0, 
                  letterSpacing: '-0.5px',
                  color: 'var(--ion-text-color)',
                  lineHeight: '1.2',
                  fontWeight: '300'
                }}>
                  Hello, <span style={{ fontWeight: '800' }}>{currentUser?.username || 'Guest Player'}</span>
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: 'var(--luxury-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Global Rating</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--luxury-gold)' }}>1,850 ELO</span>
                </div>
                <IonAvatar style={{ 
                  width: '44px', 
                  height: '44px', 
                  border: '1.5px solid var(--luxury-gold)',
                  padding: '2px',
                  backgroundColor: 'var(--luxury-card-bg)'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: 'var(--luxury-gold)',
                    color: 'var(--ion-background-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '15px',
                    transition: 'color 0.3s ease'
                  }}>
                    {(currentUser?.username || 'G')[0].toUpperCase()}
                  </div>
                </IonAvatar>
              </div>
            </div>

            {/* Asymmetrical Primary Action Cards Grid (Soft Oversized Border Radii 24px) */}
            <IonGrid style={{ padding: 0, marginBottom: '25px' }}>
              <IonRow style={{ margin: '0 -8px' }}>
                
                {/* Card 1: Play Online (size="6") */}
                <IonCol size="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('friend');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '165px',
                      borderRadius: '24px', 
                      backgroundColor: 'var(--luxury-card-bg)', 
                      padding: '22px', 
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid var(--luxury-border)',
                      boxShadow: 'var(--luxury-card-shadow)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, background-color 0.3s ease'
                    }}
                  >
                    {/* Tucked Northeast Arrow (↗) in corner */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--luxury-gold-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: 'var(--luxury-gold)',
                      border: '1px solid var(--luxury-border)',
                      zIndex: 2
                    }}>
                      ↗
                    </div>

                    {/* Placeholder Vector Graphic 1: Fine-Line Globe Wireframe (Bottom-Right aligned) */}
                    <svg style={{
                      position: 'absolute',
                      bottom: '-15px',
                      right: '-15px',
                      width: '90px',
                      height: '90px',
                      opacity: 0.08,
                      pointerEvents: 'none',
                      color: 'var(--ion-text-color)'
                    }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <circle cx="50" cy="50" r="40" />
                      <ellipse cx="50" cy="50" rx="40" ry="15" />
                      <ellipse cx="50" cy="50" rx="15" ry="40" />
                      <line x1="50" y1="10" x2="50" y2="90" />
                      <line x1="10" y1="50" x2="90" y2="50" />
                    </svg>

                    <IonIcon icon={globeOutline} style={{ fontSize: '26px', color: 'var(--luxury-gold)' }} />
                    <div style={{ zIndex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: 'var(--ion-text-color)' }}>Play Online</h3>
                      <p style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', margin: 0, lineHeight: '1.3', fontWeight: '300' }}>Challenge players worldwide in real-time lobbies.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 2: vs Computer (size="6") */}
                <IonCol size="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('computer');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '165px',
                      borderRadius: '24px', 
                      backgroundColor: 'var(--luxury-card-bg)', 
                      padding: '22px', 
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid var(--luxury-border)',
                      boxShadow: 'var(--luxury-card-shadow)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, background-color 0.3s ease'
                    }}
                  >
                    {/* Tucked Northeast Arrow (↗) in corner */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--luxury-gold-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: 'var(--luxury-gold)',
                      border: '1px solid var(--luxury-border)',
                      zIndex: 2
                    }}>
                      ↗
                    </div>

                    {/* Placeholder Vector Graphic 2: Circuit Chip grid lines (Bottom-Right aligned) */}
                    <svg style={{
                      position: 'absolute',
                      bottom: '-10px',
                      right: '-10px',
                      width: '85px',
                      height: '85px',
                      opacity: 0.08,
                      pointerEvents: 'none',
                      color: 'var(--ion-text-color)'
                    }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="25" y="25" width="50" height="50" rx="8" />
                      <rect x="38" y="38" width="24" height="24" rx="4" />
                      <line x1="50" y1="10" x2="50" y2="25" />
                      <line x1="50" y1="75" x2="50" y2="90" />
                      <line x1="10" y1="50" x2="25" y2="50" />
                      <line x1="75" y1="50" x2="90" y2="50" />
                      <circle cx="50" cy="10" r="3" fill="currentColor" />
                      <circle cx="50" cy="90" r="3" fill="currentColor" />
                      <circle cx="10" cy="50" r="3" fill="currentColor" />
                      <circle cx="90" cy="50" r="3" fill="currentColor" />
                    </svg>

                    <IonIcon icon={hardwareChipOutline} style={{ fontSize: '26px', color: 'var(--luxury-gold)' }} />
                    <div style={{ zIndex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: 'var(--ion-text-color)' }}>vs Computer</h3>
                      <p style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', margin: 0, lineHeight: '1.3', fontWeight: '300' }}>Practice offline vs Stockfish engine settings.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 3: Local Multiplayer (size="12", full-width below them) */}
                <IonCol size="12" style={{ padding: '0 8px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('bluetooth');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '115px',
                      borderRadius: '24px', 
                      backgroundColor: 'var(--luxury-card-bg)', 
                      padding: '22px', 
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid var(--luxury-border)',
                      boxShadow: 'var(--luxury-card-shadow)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, background-color 0.3s ease'
                    }}
                  >
                    {/* Tucked Northeast Arrow (↗) in corner */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--luxury-gold-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: 'var(--luxury-gold)',
                      border: '1px solid var(--luxury-border)',
                      zIndex: 2
                    }}>
                      ↗
                    </div>

                    {/* Placeholder Vector Graphic 3: Dual device pairing waves (Bottom-Right aligned) */}
                    <svg style={{
                      position: 'absolute',
                      bottom: '-5px',
                      right: '30px',
                      width: '90px',
                      height: '90px',
                      opacity: 0.08,
                      pointerEvents: 'none',
                      color: 'var(--ion-text-color)'
                    }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="15" y="30" width="22" height="40" rx="4" />
                      <rect x="63" y="30" width="22" height="40" rx="4" />
                      <path d="M45,40 Q50,45 45,50" />
                      <path d="M55,40 Q50,45 55,50" />
                      <circle cx="50" cy="45" r="2" fill="currentColor" />
                    </svg>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 1 }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '16px',
                        backgroundColor: 'var(--luxury-gold-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--luxury-gold)'
                      }}>
                        <IonIcon icon={bluetoothOutline} style={{ fontSize: '22px' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 2px 0', color: 'var(--ion-text-color)' }}>Local Multiplayer</h3>
                        <p style={{ fontSize: '11px', color: 'var(--luxury-text-muted)', margin: 0, fontWeight: '300' }}>Play face-to-face offline via Local Bluetooth antenna.</p>
                      </div>
                    </div>
                  </div>
                </IonCol>

              </IonRow>
            </IonGrid>

            {/* Engagement Zone (Daily Tactic Hero Banner with 24px Radii) */}
            <div style={{
              borderRadius: '24px',
              backgroundColor: 'var(--luxury-card-bg)',
              padding: '24px',
              border: '1px solid var(--luxury-border)',
              marginBottom: '35px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: 'var(--luxury-card-shadow)',
              position: 'relative',
              cursor: 'pointer'
            }}>
              <div>
                <span style={{ 
                  fontSize: '9px', 
                  fontWeight: '700', 
                  color: 'var(--luxury-gold)', 
                  letterSpacing: '1.5px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  marginBottom: '6px' 
                }}>
                  <IonIcon icon={flashOutline} />
                  TACTIC CHALLENGE
                </span>
                
                {/* Mixed weight typography sentence */}
                <h3 style={{ fontSize: '18px', fontWeight: '300', margin: '0 0 4px 0', color: 'var(--ion-text-color)', letterSpacing: '-0.3px' }}>
                  Solve today's <span style={{ fontWeight: '800' }}>Daily Puzzle</span>
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--luxury-text-muted)', margin: 0, fontWeight: '300' }}>Mate in 3 • 14,204 solved today</p>
              </div>

              {/* Northeast clickability arrow indicator */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--luxury-gold-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                color: 'var(--luxury-gold)',
                border: '1px solid var(--luxury-border)'
              }}>
                ↗
              </div>
            </div>

            {/* Quick History List */}
            <div>
              <h3 style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                color: 'var(--luxury-gold)', 
                letterSpacing: '1.5px', 
                textTransform: 'uppercase', 
                margin: '0 0 14px 4px' 
              }}>
                Recent Battles
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentMatches.map((match) => (
                  <div 
                    key={match.id}
                    style={{
                      backgroundColor: 'var(--luxury-card-bg)',
                      borderRadius: '16px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--luxury-border)',
                      boxShadow: 'var(--luxury-card-shadow)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ion-text-color)' }}>
                        vs <span style={{ fontWeight: '300' }}>{match.opponent}</span> ({match.opponentElo})
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{ 
                          fontWeight: '700', 
                          color: match.outcome === 'win' ? '#81B64C' : match.outcome === 'loss' ? '#E53935' : 'var(--ion-text-color)' 
                        }}>
                          {match.outcome.toUpperCase()}
                        </span>
                        <span style={{ opacity: 0.3 }}>•</span>
                        <span>{match.type}</span>
                        <span style={{ opacity: 0.3 }}>•</span>
                        <span>{match.date}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {match.hasAudioLog && (
                        <IonIcon icon={micOutline} style={{ color: 'var(--luxury-gold)', fontSize: '15px' }} />
                      )}
                      <span style={{ color: 'var(--luxury-gold)', fontSize: '14px' }}>↗</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: PREMIUM LUXURY MATCH SETUP CONFIGURATION VIEW     */}
        {/* ========================================================= */}
        {activeView === 'setup' && (
          <div className="ion-padding" style={{ maxWidth: '480px', margin: '0 auto', color: 'var(--ion-text-color)' }}>
            
            {/* Elegant Segment Header */}
            <div style={{ marginBottom: '25px' }}>
              <IonSegment 
                value={gameMode} 
                onIonChange={(e) => setGameMode(e.detail.value as GameMode)}
                style={{ 
                  '--background': 'var(--ion-background-color)',
                  '--color': 'var(--luxury-text-muted)',
                  '--color-checked': 'var(--ion-background-color)',
                  '--background-checked': 'var(--luxury-gold)',
                  borderRadius: '12px',
                  padding: '2px',
                  border: '1px solid var(--luxury-border)'
                }}
              >
                <IonSegmentButton value="computer" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>vs Computer</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="friend" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>Friend Lobby</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="bluetooth" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>Bluetooth P2P</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {/* Sub-view: Bluetooth Offline scans */}
            {gameMode === 'bluetooth' && (
              <div style={{ 
                backgroundColor: 'var(--luxury-card-bg)', 
                borderRadius: '24px', 
                padding: '22px', 
                marginBottom: '20px', 
                border: '1px solid var(--luxury-border)',
                boxShadow: 'var(--luxury-card-shadow)'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--luxury-gold)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={bluetoothOutline} />
                  Bluetooth Local Pairing
                </h3>
                
                {isBtScanning ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <IonSpinner name="crescent" style={{ '--color': 'var(--luxury-gold)' }} />
                    <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: 'var(--luxury-text-muted)' }}>Scanning peer signals...</p>
                  </div>
                ) : (
                  <div>
                    {connectedBtDevice ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#81B64C', fontSize: '13px', margin: '5px 0 12px 0', fontWeight: '600' }}>
                        <IonIcon icon={checkmarkCircleOutline} />
                        Connected to: {connectedBtDevice}
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--luxury-text-muted)', margin: '0 0 14px 0', fontWeight: '300' }}>Scan to connect and play local match offline with a nearby device.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                      {btDevices.map((dev) => (
                        <div key={dev.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'var(--ion-background-color)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--luxury-border)'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: '500' }}>{dev.name}</span>
                          {dev.status === 'discovered' && (
                            <button 
                              onClick={() => connectToBtDevice(dev)}
                              style={{
                                background: 'var(--luxury-gold-subtle)',
                                border: '1px solid var(--luxury-gold)',
                                color: 'var(--luxury-gold)',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '4px 10px',
                                cursor: 'pointer'
                              }}
                            >
                              Pair
                            </button>
                          )}
                          {dev.status === 'connecting' && <IonSpinner name="dots" style={{ '--color': 'var(--luxury-gold)' }} />}
                          {dev.status === 'paired' && <IonIcon icon={checkmarkCircleOutline} style={{ color: '#81B64C' }} />}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={startBluetoothScan}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--luxury-gold-subtle)',
                        border: '1px solid var(--luxury-gold)',
                        borderRadius: '12px',
                        color: 'var(--luxury-gold)',
                        padding: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Scan Local Antennas
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Friend Room Code Generator */}
            {gameMode === 'friend' && (
              <div style={{ 
                backgroundColor: 'var(--luxury-card-bg)', 
                borderRadius: '24px', 
                padding: '22px', 
                marginBottom: '20px', 
                border: '1px solid var(--luxury-border)',
                boxShadow: 'var(--luxury-card-shadow)'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--luxury-gold)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={linkOutline} />
                  Matchmaking Lobby Link
                </h3>
                {!roomCode ? (
                  <button 
                    onClick={() => {
                      setIsLobbyConnecting(true);
                      setTimeout(() => {
                        setRoomCode('ROOM_' + Math.random().toString(36).substring(2, 6).toUpperCase());
                        setIsLobbyConnecting(false);
                      }, 1000);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--luxury-gold-subtle)',
                      border: '1px solid var(--luxury-gold)',
                      borderRadius: '12px',
                      color: 'var(--luxury-gold)',
                      padding: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {isLobbyConnecting ? 'Generating Tunnel...' : 'Generate Challenge Code'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--ion-background-color)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--luxury-border)' }}>
                    <span style={{ fontSize: '13px', color: '#81B64C', fontWeight: '700' }}>Lobby Code: {roomCode}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://chessapp.com/lobby/${roomCode}`);
                        setToastMessage('Lobby URL copied!');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--luxury-gold)',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* COLOR SELECTION CARD */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--luxury-gold)', margin: '0 0 12px 4px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={colorPaletteOutline} />
                Your Color
              </h3>
              
              <IonRow style={{ margin: '0 -4px' }}>
                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('white')}
                    style={{
                      padding: '20px 8px',
                      borderRadius: '16px',
                      backgroundColor: 'var(--luxury-card-bg)',
                      border: selectedColor === 'white' ? '1px solid var(--luxury-gold)' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--luxury-card-shadow)',
                      transition: 'border-color 0.3s ease, background-color 0.3s ease'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>♔</span>
                    <span style={{ fontSize: '12px', fontWeight: selectedColor === 'white' ? '800' : '400', color: selectedColor === 'white' ? 'var(--luxury-gold)' : 'var(--luxury-text-muted)' }}>White</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('black')}
                    style={{
                      padding: '20px 8px',
                      borderRadius: '16px',
                      backgroundColor: 'var(--luxury-card-bg)',
                      border: selectedColor === 'black' ? '1px solid var(--luxury-gold)' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--luxury-card-shadow)',
                      transition: 'border-color 0.3s ease, background-color 0.3s ease'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>♚</span>
                    <span style={{ fontSize: '12px', fontWeight: selectedColor === 'black' ? '800' : '400', color: selectedColor === 'black' ? 'var(--luxury-gold)' : 'var(--luxury-text-muted)' }}>Black</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('random')}
                    style={{
                      padding: '20px 8px',
                      borderRadius: '16px',
                      backgroundColor: 'var(--luxury-card-bg)',
                      border: selectedColor === 'random' ? '1px solid var(--luxury-gold)' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--luxury-card-shadow)',
                      transition: 'border-color 0.3s ease, background-color 0.3s ease'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>🎲</span>
                    <span style={{ fontSize: '12px', fontWeight: selectedColor === 'random' ? '800' : '400', color: selectedColor === 'random' ? 'var(--luxury-gold)' : 'var(--luxury-text-muted)' }}>Random</span>
                  </div>
                </IonCol>
              </IonRow>
            </div>

            {/* TIME CONTROL CARD (Soft oversized 24px) */}
            <div style={{ 
              marginBottom: '25px', 
              backgroundColor: 'var(--luxury-card-bg)', 
              borderRadius: '24px', 
              padding: '22px', 
              border: '1px solid var(--luxury-border)',
              boxShadow: 'var(--luxury-card-shadow)',
              transition: 'background-color 0.3s ease'
            }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--luxury-gold)', margin: '0 0 18px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={timerOutline} />
                Time Control
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '300' }}>Same time for both</span>
                <IonToggle checked={sameTimeBoth} onIonChange={(e) => setSameTimeBoth(e.detail.checked)} style={{ '--background': 'var(--ion-background-color)' }} />
              </div>

              {/* Dynamic horizontal duration selectors */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '18px' }}>
                {[1, 2, 3, 5, 10].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setTimeControl(t)}
                    style={{ 
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: timeControl === t ? '1px solid var(--luxury-gold)' : '1px solid var(--luxury-border)',
                      backgroundColor: timeControl === t ? 'var(--luxury-gold-subtle)' : 'transparent',
                      color: timeControl === t ? 'var(--luxury-gold)' : 'var(--luxury-text-muted)',
                      cursor: 'pointer',
                      minWidth: '65px',
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                  >
                    {t} min
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '300' }}>Same increment for both</span>
                <IonToggle checked={sameIncrementBoth} onIonChange={(e) => setSameIncrementBoth(e.detail.checked)} style={{ '--background': 'var(--ion-background-color)' }} />
              </div>

              {/* Increments buttons */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                {[0, 1, 2, 3, 5].map((inc) => (
                  <button 
                    key={inc}
                    onClick={() => setIncrement(inc)}
                    style={{ 
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: increment === inc ? '1px solid var(--luxury-gold)' : '1px solid var(--luxury-border)',
                      backgroundColor: increment === inc ? 'var(--luxury-gold-subtle)' : 'transparent',
                      color: increment === inc ? 'var(--luxury-gold)' : 'var(--luxury-text-muted)',
                      cursor: 'pointer',
                      minWidth: '70px',
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                  >
                    {inc === 0 ? 'No inc' : `+${inc}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* ACCORDION HANDICAP */}
            <div style={{ marginBottom: '30px' }}>
              <IonAccordionGroup>
                <IonAccordion value="handicaps" style={{ '--background': 'var(--luxury-card-bg)', color: 'var(--ion-text-color)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--luxury-border)' }}>
                  <IonItem slot="header" style={{ '--background': 'var(--luxury-card-bg)', '--color': 'var(--ion-text-color)' }}>
                    <IonIcon icon={scaleOutline} slot="start" style={{ color: 'var(--luxury-gold)' }} />
                    <IonLabel>
                      <h3 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Handicap Advantage</h3>
                      <p style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', fontWeight: '300' }}>Optional setup parameters</p>
                    </IonLabel>
                  </IonItem>
                  <div className="ion-padding" slot="content" style={{ backgroundColor: 'var(--luxury-card-bg)', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px' }}>
                    <div 
                      onClick={() => setHandicap('none')}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: handicap === 'none' ? 'var(--ion-background-color)' : 'transparent', border: handicap === 'none' ? '1px solid var(--luxury-gold)' : '1px solid transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--ion-text-color)' }}
                    >
                      🛡️ None (Standard Equal Match)
                    </div>
                    <div 
                      onClick={() => setHandicap('knight')}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: handicap === 'knight' ? 'var(--ion-background-color)' : 'transparent', border: handicap === 'knight' ? '1px solid var(--luxury-gold)' : '1px solid transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--ion-text-color)' }}
                    >
                      🐎 Knight Advantage (White plays without Knight b1)
                    </div>
                    <div 
                      onClick={() => setHandicap('queen')}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: handicap === 'queen' ? 'var(--ion-background-color)' : 'transparent', border: handicap === 'queen' ? '1px solid var(--luxury-gold)' : '1px solid transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--ion-text-color)' }}
                    >
                      👑 Queen Advantage (White plays without Queen d1)
                    </div>
                  </div>
                </IonAccordion>
              </IonAccordionGroup>
            </div>

            {/* Launch Active Game Button */}
            <button 
              onClick={handleHostGame}
              disabled={(gameMode === 'friend' && !roomCode) || (gameMode === 'bluetooth' && !connectedBtDevice)}
              style={{ 
                width: '100%',
                backgroundColor: 'var(--luxury-gold)', 
                color: 'var(--ion-background-color)',
                fontWeight: '700',
                height: '50px',
                fontSize: '14px',
                borderRadius: '24px', 
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 8px 20px rgba(201, 168, 76, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s'
              }}
            >
              {gameMode === 'computer' ? (
                <>
                  <IonIcon icon={playOutline} />
                  Start Match vs Computer
                </>
              ) : gameMode === 'friend' ? (
                <>
                  <IonIcon icon={wifiOutline} />
                  Host Online Lobby
                </>
              ) : (
                <>
                  <IonIcon icon={wifiOutline} />
                  Host Local Bluetooth Match
                </>
              )}
            </button>

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
              backgroundColor: 'var(--luxury-card-bg)', 
              padding: '16px',
              borderBottom: '1px solid var(--luxury-border)',
              color: 'var(--ion-text-color)',
              transition: 'background-color 0.3s ease'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WHITE (Player)</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'w' ? 'var(--luxury-gold)' : 'var(--ion-text-color)' }}>
                  {formatTime(whiteTime)}
                </span>
              </div>
              <div style={{ alignSelf: 'center', color: 'var(--luxury-text-muted)', fontWeight: 'bold' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BLACK (Opponent)</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'b' ? 'var(--luxury-gold)' : 'var(--ion-text-color)' }}>
                  {formatTime(blackTime)}
                </span>
              </div>
            </div>

            {/* 100% full-width chessboard layout (mandated for zero visual strain) */}
            <div style={{ width: '100vw', maxWidth: '100vw', margin: '0', padding: '0', backgroundColor: 'var(--ion-background-color)', transition: 'background-color 0.3s ease' }}>
              <Chessboard 
                position={gameFen} 
                onPieceDrop={onDrop}
                boardWidth={window.innerWidth > 600 ? 550 : window.innerWidth}
                customDarkSquareStyle={{ backgroundColor: '#5C6479' }}
                customLightSquareStyle={{ backgroundColor: '#ECEFF4' }}
                customBoardStyle={{
                  borderRadius: '0px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)'
                }}
                arePiecesDraggable={!isEngineThinking && isClockRunning}
              />
            </div>

            {/* Game controllers */}
            <div className="ion-padding" style={{ color: 'var(--ion-text-color)', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ 
                padding: '14px 20px', 
                borderRadius: '16px', 
                backgroundColor: 'var(--luxury-card-bg)', 
                marginBottom: '20px', 
                fontSize: '14px', 
                fontWeight: '600',
                textAlign: 'center',
                borderLeft: '4px solid var(--luxury-gold)',
                boxShadow: 'var(--luxury-card-shadow)',
                transition: 'background-color 0.3s ease'
              }}>
                {gameStatus}
              </div>

              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  <IonCol size="6">
                    <IonButton expand="block" color="warning" fill="outline" onClick={undoMove} disabled={history.length === 0 || isEngineThinking}>
                      <IonIcon slot="start" icon={playBackOutline} />
                      Undo Move
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton expand="block" color="danger" fill="outline" onClick={startNewGame} disabled={isEngineThinking}>
                      <IonIcon slot="start" icon={refreshOutline} />
                      Restart Game
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Move Log */}
              <div style={{ 
                backgroundColor: 'var(--luxury-card-bg)', 
                borderRadius: '24px', 
                padding: '20px', 
                marginTop: '20px',
                border: '1px solid var(--luxury-border)',
                boxShadow: 'var(--luxury-card-shadow)',
                transition: 'background-color 0.3s ease'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: 'var(--luxury-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moves Played</h3>
                {history.length === 0 ? (
                  <p style={{ color: 'var(--luxury-text-muted)', margin: 0, fontSize: '13px', fontWeight: '300' }}>Waiting for first move...</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '70px', overflowY: 'auto' }}>
                    {history.map((move, index) => (
                      <span key={index} style={{ padding: '4px 8px', backgroundColor: 'var(--ion-background-color)', borderRadius: '6px', color: 'var(--ion-text-color)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
                        {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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

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

interface BluetoothDevice {
  id: string;
  name: string;
  status: 'paired' | 'discovered' | 'connecting';
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
  const [isLobbyConnecting, setIsLobbyConnecting] = useState<boolean>(false);
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([
    { id: 'dev_1', name: 'Grandmaster iPad Pro', status: 'paired' },
    { id: 'dev_2', name: 'OnePlus 12 (Discovered)', status: 'discovered' },
    { id: 'dev_3', name: 'Pixel 8 Pro (Discovered)', status: 'discovered' }
  ]);

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

  return (
    <IonPage>
      {/* Luxury Minimalist Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ 
          '--background': '#0F111A', 
          '--color': '#ECEFF4',
          padding: '10px 10px 0 10px'
        }}>
          {activeView !== 'dashboard' && (
            <IonButton 
              slot="start" 
              fill="clear" 
              style={{ '--color': '#C9A84C', fontWeight: '500', fontSize: '14px' }}
              onClick={() => setActiveView(activeView === 'board' ? 'setup' : 'dashboard')}
            >
              <IonIcon icon={arrowBackOutline} slot="start" style={{ fontSize: '16px' }} />
              Back
            </IonButton>
          )}
          {activeView === 'board' && (
            <IonTitle style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px' }}>Live Battle</IonTitle>
          )}
          {activeView === 'setup' && (
            <IonTitle style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px' }}>Game Setup</IonTitle>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': '#0F111A' }}>

        {/* ========================================================= */}
        {/* VIEW 1: EDITORIAL LUXURY MINIMALIST DASHBOARD VIEW        */}
        {/* ========================================================= */}
        {activeView === 'dashboard' && (
          <div className="ion-padding" style={{ 
            maxWidth: '520px', 
            margin: '0 auto', 
            color: '#ECEFF4',
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
                <span style={{ fontSize: '11px', fontWeight: '500', color: '#C9A84C', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  THE PRIVATE ROOM
                </span>
                
                {/* Single sentence mixed font-weights to emphasize focus keyword exactly */}
                <h1 style={{ 
                  fontSize: '26px', 
                  margin: 0, 
                  letterSpacing: '-0.5px',
                  color: '#ECEFF4',
                  lineHeight: '1.2'
                }}>
                  Hello, <span style={{ fontWeight: '800' }}>{currentUser?.username || 'Guest Player'}</span>
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#A0A6B5', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Global Rank</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#C9A84C' }}>1,850 ELO</span>
                </div>
                <IonAvatar style={{ 
                  width: '44px', 
                  height: '44px', 
                  border: '1.5px solid #C9A84C',
                  padding: '2px',
                  backgroundColor: '#1E202B'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: '#C9A84C',
                    color: '#0F111A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '15px'
                  }}>
                    {(currentUser?.username || 'G')[0].toUpperCase()}
                  </div>
                </IonAvatar>
              </div>
            </div>

            {/* Primary Action Cards (Soft Oversized Border Radii 24px) */}
            <IonGrid style={{ padding: 0, marginBottom: '25px' }}>
              <IonRow style={{ margin: '0 -8px' }}>
                <IonCol size="6" style={{ padding: '0 8px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('friend');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '155px',
                      borderRadius: '24px', // Soft Oversized corner
                      backgroundColor: '#1E202B', // Muted card background
                      padding: '22px', // Breathing room cell padding
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                      position: 'relative'
                    }}
                  >
                    {/* Minimalist structural accent: elegant Northeast Arrow (↗) tucked into corner */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: '#C9A84C',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      ↗
                    </div>

                    <IonIcon icon={globeOutline} style={{ fontSize: '26px', color: '#C9A84C' }} />
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: '#ECEFF4' }}>Play Online</h3>
                      <p style={{ fontSize: '10px', color: '#A0A6B5', margin: 0, lineHeight: '1.3', fontWeight: '300' }}>Challenge players nearby or globally.</p>
                    </div>
                  </div>
                </IonCol>

                <IonCol size="6" style={{ padding: '0 8px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('computer');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '155px',
                      borderRadius: '24px', // Soft Oversized corner
                      backgroundColor: '#1E202B', // Muted card background
                      padding: '22px', // Breathing room cell padding
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                      position: 'relative'
                    }}
                  >
                    {/* Minimalist structural accent: elegant Northeast Arrow (↗) tucked into corner */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: '#C9A84C',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      ↗
                    </div>

                    <IonIcon icon={hardwareChipOutline} style={{ fontSize: '26px', color: '#C9A84C' }} />
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: '#ECEFF4' }}>vs Computer</h3>
                      <p style={{ fontSize: '10px', color: '#A0A6B5', margin: 0, lineHeight: '1.3', fontWeight: '300' }}>Practice offline vs Stockfish engine.</p>
                    </div>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Engagement Zone (Daily Tactic Hero Banner with 24px Radii) */}
            <div style={{
              borderRadius: '24px',
              backgroundColor: '#1E202B',
              padding: '24px',
              border: '1px solid rgba(201, 168, 76, 0.15)',
              marginBottom: '35px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              position: 'relative',
              cursor: 'pointer'
            }}>
              <div>
                <span style={{ 
                  fontSize: '9px', 
                  fontWeight: '700', 
                  color: '#C9A84C', 
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
                <h3 style={{ fontSize: '18px', fontWeight: '300', margin: '0 0 4px 0', color: '#ECEFF4', letterSpacing: '-0.3px' }}>
                  Solve today's <span style={{ fontWeight: '800' }}>Daily Puzzle</span>
                </h3>
                <p style={{ fontSize: '11px', color: '#A0A6B5', margin: 0, fontWeight: '300' }}>Mate in 3 • 14,204 solved today</p>
              </div>

              {/* Northeast clickability arrow indicator */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(201, 168, 76, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                color: '#C9A84C',
                border: '1px solid rgba(201, 168, 76, 0.2)'
              }}>
                ↗
              </div>
            </div>

            {/* Quick History List */}
            <div>
              <h3 style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                color: '#C9A84C', 
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
                      backgroundColor: '#1E202B',
                      borderRadius: '16px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255, 255, 255, 0.03)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#ECEFF4' }}>
                        vs <span style={{ fontWeight: '300' }}>{match.opponent}</span> ({match.opponentElo})
                      </div>
                      <div style={{ fontSize: '10px', color: '#A0A6B5', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{ 
                          fontWeight: '700', 
                          color: match.outcome === 'win' ? '#81B64C' : match.outcome === 'loss' ? '#E53935' : '#ECEFF4' 
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
                        <IonIcon icon={micOutline} style={{ color: '#C9A84C', fontSize: '15px' }} />
                      )}
                      <span style={{ color: '#888', fontSize: '14px' }}>↗</span>
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
          <div className="ion-padding" style={{ maxWidth: '480px', margin: '0 auto', color: '#ECEFF4' }}>
            
            {/* Elegant Segment Header */}
            <div style={{ marginBottom: '25px' }}>
              <IonSegment 
                value={gameMode} 
                onIonChange={(e) => setGameMode(e.detail.value as GameMode)}
                style={{ 
                  '--background': '#13151C',
                  '--color': '#A0A6B5',
                  '--color-checked': '#0F111A',
                  '--background-checked': '#C9A84C',
                  borderRadius: '12px',
                  padding: '2px'
                }}
              >
                <IonSegmentButton value="computer" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>vs Computer</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="friend" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>Friend Lobby</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {/* Friend Room Code Generator */}
            {gameMode === 'friend' && (
              <div style={{ 
                backgroundColor: '#1E202B', 
                borderRadius: '24px', 
                padding: '20px', 
                marginBottom: '20px', 
                border: '1px solid rgba(255,255,255,0.04)' 
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#C9A84C', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      backgroundColor: 'rgba(201, 168, 76, 0.06)',
                      border: '1px solid rgba(201, 168, 76, 0.2)',
                      borderRadius: '12px',
                      color: '#C9A84C',
                      padding: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {isLobbyConnecting ? 'Generating Tunnel...' : 'Generate Challenge Code'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F111A', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '13px', color: '#81B64C', fontWeight: '700' }}>Lobby Code: {roomCode}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://chessapp.com/lobby/${roomCode}`);
                        setToastMessage('Lobby URL copied!');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#C9A84C',
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
              <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#C9A84C', margin: '0 0 12px 4px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      backgroundColor: '#1E202B',
                      border: selectedColor === 'white' ? '1px solid #C9A84C' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>♔</span>
                    <span style={{ fontSize: '12px', fontWeight: selectedColor === 'white' ? '800' : '400', color: selectedColor === 'white' ? '#C9A84C' : '#A0A6B5' }}>White</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('black')}
                    style={{
                      padding: '20px 8px',
                      borderRadius: '16px',
                      backgroundColor: '#1E202B',
                      border: selectedColor === 'black' ? '1px solid #C9A84C' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>♚</span>
                    <span style={{ fontSize: '12px', fontWeight: selectedColor === 'black' ? '800' : '400', color: selectedColor === 'black' ? '#C9A84C' : '#A0A6B5' }}>Black</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('random')}
                    style={{
                      padding: '20px 8px',
                      borderRadius: '16px',
                      backgroundColor: '#1E202B',
                      border: selectedColor === 'random' ? '1px solid #C9A84C' : '1px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>🎲</span>
                    <span style={{ fontSize: '12px', fontWeight: selectedColor === 'random' ? '800' : '400', color: selectedColor === 'random' ? '#C9A84C' : '#A0A6B5' }}>Random</span>
                  </div>
                </IonCol>
              </IonRow>
            </div>

            {/* TIME CONTROL CARD (Soft oversized 24px) */}
            <div style={{ 
              marginBottom: '25px', 
              backgroundColor: '#1E202B', 
              borderRadius: '24px', 
              padding: '22px', 
              border: '1px solid rgba(255, 255, 255, 0.03)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#C9A84C', margin: '0 0 18px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={timerOutline} />
                Time Control
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '300' }}>Same time for both</span>
                <IonToggle checked={sameTimeBoth} onIonChange={(e) => setSameTimeBoth(e.detail.checked)} style={{ '--background': '#0F111A' }} />
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
                      border: timeControl === t ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: timeControl === t ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                      color: timeControl === t ? '#C9A84C' : '#A0A6B5',
                      cursor: 'pointer',
                      minWidth: '65px'
                    }}
                  >
                    {t} min
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '300' }}>Same increment for both</span>
                <IonToggle checked={sameIncrementBoth} onIonChange={(e) => setSameIncrementBoth(e.detail.checked)} style={{ '--background': '#0F111A' }} />
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
                      border: increment === inc ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: increment === inc ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                      color: increment === inc ? '#C9A84C' : '#A0A6B5',
                      cursor: 'pointer',
                      minWidth: '70px'
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
                <IonAccordion value="handicaps" style={{ '--background': '#1E202B', color: '#ECEFF4', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <IonItem slot="header" style={{ '--background': '#1E202B', '--color': '#ECEFF4' }}>
                    <IonIcon icon={scaleOutline} slot="start" style={{ color: '#C9A84C' }} />
                    <IonLabel>
                      <h3 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Handicap Advantage</h3>
                      <p style={{ fontSize: '10px', color: '#A0A6B5', fontWeight: '300' }}>Optional setup parameters</p>
                    </IonLabel>
                  </IonItem>
                  <div className="ion-padding" slot="content" style={{ backgroundColor: '#1E202B', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px' }}>
                    <div 
                      onClick={() => setHandicap('none')}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: handicap === 'none' ? '#0F111A' : 'transparent', border: handicap === 'none' ? '1px solid #C9A84C' : '1px solid transparent', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🛡️ None (Standard Equal Match)
                    </div>
                    <div 
                      onClick={() => setHandicap('knight')}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: handicap === 'knight' ? '#0F111A' : 'transparent', border: handicap === 'knight' ? '1px solid #C9A84C' : '1px solid transparent', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🐎 Knight Advantage (White plays without Knight b1)
                    </div>
                    <div 
                      onClick={() => setHandicap('queen')}
                      style={{ padding: '12px', borderRadius: '12px', backgroundColor: handicap === 'queen' ? '#0F111A' : 'transparent', border: handicap === 'queen' ? '1px solid #C9A84C' : '1px solid transparent', cursor: 'pointer', fontSize: '12px' }}
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
              disabled={gameMode === 'friend' && !roomCode}
              style={{ 
                width: '100%',
                backgroundColor: '#C9A84C', // Premium champagne gold base
                color: '#0F111A',
                fontWeight: '700',
                height: '50px',
                fontSize: '14px',
                borderRadius: '24px', // Fluid Oversized Button
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 8px 20px rgba(201, 168, 76, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {gameMode === 'computer' ? (
                <>
                  <IonIcon icon={playOutline} />
                  Start Match vs Computer
                </>
              ) : (
                <>
                  <IonIcon icon={wifiOutline} />
                  Host Online Lobby
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
              backgroundColor: '#1E202B', 
              padding: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              color: '#ECEFF4'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#A0A6B5', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WHITE (Player)</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'w' ? '#C9A84C' : '#ECEFF4' }}>
                  {formatTime(whiteTime)}
                </span>
              </div>
              <div style={{ alignSelf: 'center', color: '#A0A6B5', fontWeight: 'bold' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#A0A6B5', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BLACK (Opponent)</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'b' ? '#C9A84C' : '#ECEFF4' }}>
                  {formatTime(blackTime)}
                </span>
              </div>
            </div>

            {/* 100% full-width chessboard layout (mandated for zero visual strain) */}
            <div style={{ width: '100vw', maxWidth: '100vw', margin: '0', padding: '0', backgroundColor: '#0F111A' }}>
              <Chessboard 
                position={gameFen} 
                onPieceDrop={onDrop}
                boardWidth={window.innerWidth > 600 ? 550 : window.innerWidth}
                customDarkSquareStyle={{ backgroundColor: '#5C6479' }}
                customLightSquareStyle={{ backgroundColor: '#ECEFF4' }}
                customBoardStyle={{
                  borderRadius: '0px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
                }}
                arePiecesDraggable={!isEngineThinking && isClockRunning}
              />
            </div>

            {/* Game controllers */}
            <div className="ion-padding" style={{ color: '#ECEFF4', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ 
                padding: '14px 20px', 
                borderRadius: '16px', 
                backgroundColor: '#1E202B', 
                marginBottom: '20px', 
                fontSize: '14px', 
                fontWeight: '600',
                textAlign: 'center',
                borderLeft: '4px solid #C9A84C'
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
                backgroundColor: '#1E202B', 
                borderRadius: '24px', 
                padding: '20px', 
                marginTop: '20px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moves Played</h3>
                {history.length === 0 ? (
                  <p style={{ color: '#888', margin: 0, fontSize: '13px', fontWeight: '300' }}>Waiting for first move...</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '70px', overflowY: 'auto' }}>
                    {history.map((move, index) => (
                      <span key={index} style={{ padding: '4px 8px', backgroundColor: '#0F111A', borderRadius: '6px' }}>
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

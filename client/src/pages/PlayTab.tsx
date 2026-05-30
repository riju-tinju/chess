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
  wifiOutline, 
  linkOutline,
  shareOutline,
  copyOutline,
  checkmarkCircleOutline,
  colorPaletteOutline,
  timerOutline,
  scaleOutline,
  playOutline,
  optionsOutline,
  globeOutline,
  trophyOutline,
  micOutline,
  chevronForwardOutline,
  chevronBackOutline,
  arrowBackOutline,
  playSkipBackOutline,
  playSkipForwardOutline,
  flashOutline,
  sunnyOutline,
  moonOutline,
  closeOutline
} from 'ionicons/icons';
import { StockfishEngine } from '../services/stockfishService';
import { useUserStore } from '../store/useUserStore';

type ActiveView = 'dashboard' | 'setup' | 'board';
type GameMode = 'computer' | 'friend' | 'wifi';
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

// Local P2P Wi-Fi Peer interface (Replacing Bluetooth entirely)
interface WifiPeer {
  id: string;
  name: string;
  ipAddress: string;
  status: 'available' | 'connecting' | 'connected';
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

  // Engine Strength Level Selection (Level 1 to 10)
  const [engineStrength, setEngineStrength] = useState<number>(4);

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

  // Local Wi-Fi Peers States
  const [isWifiScanning, setIsWifiScanning] = useState<boolean>(false);
  const [connectedWifiPeer, setConnectedWifiPeer] = useState<string | null>(null);
  const [wifiPeers, setWifiPeers] = useState<WifiPeer[]>([
    { id: 'peer_1', name: 'Grandmaster iPad Pro', ipAddress: '192.168.1.45', status: 'available' },
    { id: 'peer_2', name: 'OnePlus 12 Tablet', ipAddress: '192.168.1.109', status: 'available' },
    { id: 'peer_3', name: 'MacBook Pro Chess Engine', ipAddress: '192.168.1.201', status: 'available' }
  ]);

  const [roomCode, setRoomCode] = useState<string>('');
  const [isLobbyConnecting, setIsLobbyConnecting] = useState<boolean>(false);

  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const handleResign = () => {
    // Show confirmation modal (IonAlert) – simplified here with browser confirm.
    if (window.confirm('Are you sure you want to resign?')) {
      setGameStatus(selectedColor === 'white' ? 'White resigned' : 'Black resigned');
      setIsClockRunning(false);
    }
  };
  // Move navigation state
  const [moveIndex, setMoveIndex] = useState<number>(history.length);

  // Helper to get board position at a given move index
  const getBoardAtIndex = (index: number) => {
    const tempGame = new Chess();
    for (let i = 0; i < index; i++) {
      const mv = history[i];
      if (!mv) break;
      // History stores SAN strings; use move parsing
      tempGame.move(mv);
    }
    return tempGame.fen();
  };

  // Navigation handlers
  const goToFirst = () => {
    setMoveIndex(0);
    setGameFen(getBoardAtIndex(0));
  };
  const goToPrev = () => {
    setMoveIndex((prev) => {
      const newIndex = Math.max(0, prev - 1);
      setGameFen(getBoardAtIndex(newIndex));
      return newIndex;
    });
  };
  const goToNext = () => {
    setMoveIndex((prev) => {
      const newIndex = Math.min(history.length, prev + 1);
      setGameFen(getBoardAtIndex(newIndex));
      return newIndex;
    });
  };
  const goToLast = () => {
    const lastIdx = history.length;
    setMoveIndex(lastIdx);
    setGameFen(getBoardAtIndex(lastIdx));
  };

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

  // Computer engine calculation using variable Engine Strength
  useEffect(() => {
    const chess = chessRef.current;
    // Determine if it's engine's turn based on selectedColor
    const isEngineTurn = gameMode === 'computer' && (
      (selectedColor === 'white' && chess.turn() === 'b') ||
      (selectedColor === 'black' && chess.turn() === 'w')
    );
    if (activeView === 'board' && isEngineTurn && !chess.isGameOver() && !isEngineThinking) {
      setIsEngineThinking(true);
      setGameStatus('Computer is thinking...');
      
      const timer = setTimeout(() => {
        engineRef.current?.getBestMove(chess.fen(), engineStrength, (bestMove) => {
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
  }, [gameFen, gameMode, activeView, engineStrength]);

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
    // Allow moving own pieces based on selectedColor side.
    if (gameMode === 'computer') {
      // In computer mode, block move when it's engine's side.
      const engineSide = selectedColor === 'white' ? 'b' : 'w';
      if (turn === engineSide) return false;
    } else {
      // In multiplayer modes, ensure turn matches selectedColor.
      if (turn !== (selectedColor === 'black' ? 'b' : 'w')) return false;
    }

    try {
      const chess = chessRef.current;
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      // Record last move for highlight.
      setLastMove({ from: sourceSquare, to: targetSquare });

      // Update move index after successful move.
      const newLength = chess.history().length;
      setMoveIndex(newLength);

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

  const getCapturedPieces = () => {
    const board = chessRef.current.board();
    const initialCount = { w: { p: 8, n: 2, b: 2, r: 2, q: 1 }, b: { p: 8, n: 2, b: 2, r: 2, q: 1 } };
    const currentCount = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    for (const row of board) {
      for (const piece of row) {
        if (piece) {
          const color = piece.color as 'w' | 'b';
          const type = piece.type as string;
          if (type !== 'k') {
            currentCount[color][type as keyof (typeof currentCount)['w']]++;
          }
        }
      }
    }

    const blackSymbols: Record<string, string> = { p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B' };
    const whiteSymbols: Record<string, string> = { p: '\u2659', n: '\u2658', b: '\u2657', r: '\u2656', q: '\u2655' };

    const capturedByWhite: string[] = [];
    let whitePoints = 0;
    for (const key in initialCount.b) {
      const type = key as keyof typeof initialCount.b;
      const lost = initialCount.b[type] - currentCount.b[type];
      for (let i = 0; i < lost; i++) {
        capturedByWhite.push(blackSymbols[type]);
        whitePoints += pieceValues[type];
      }
    }

    const capturedByBlack: string[] = [];
    let blackPoints = 0;
    for (const key in initialCount.w) {
      const type = key as keyof typeof initialCount.w;
      const lost = initialCount.w[type] - currentCount.w[type];
      for (let i = 0; i < lost; i++) {
        capturedByBlack.push(whiteSymbols[type]);
        blackPoints += pieceValues[type];
      }
    }

    const advantage = whitePoints - blackPoints;
    return {
      white: { pieces: capturedByWhite.join(''), points: whitePoints, advantage: advantage > 0 ? advantage : 0 },
      black: { pieces: capturedByBlack.join(''), points: blackPoints, advantage: advantage < 0 ? -advantage : 0 }
    };
  };

  const renderProfileCard = (type: 'user' | 'opponent') => {
    const isUser = type === 'user';
    const color = isUser ? selectedColor : (selectedColor === 'white' ? 'black' : 'white');
    const timer = color === 'white' ? whiteTime : blackTime;
    const isMyTurn = chessRef.current.turn() === (color === 'white' ? 'w' : 'b');
    const name = isUser
      ? (currentUser?.username || 'You')
      : (gameMode === 'computer' ? `Stockfish Lvl ${engineStrength}` : 'Opponent');
    const elo = isUser
      ? 1500
      : (gameMode === 'computer' ? engineStrength * 200 + 400 : 1600);

    const captured = getCapturedPieces();
    const capturedData = color === 'white' ? captured.white : captured.black;
    const capturedPieces = capturedData.pieces;
    const materialAdvantage = capturedData.advantage;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--luxury-card-bg)',
        borderRadius: '16px',
        border: isMyTurn && isClockRunning ? '1px solid var(--luxury-gold)' : '1px solid var(--luxury-border)',
        boxShadow: 'var(--luxury-card-shadow)',
        transition: 'border-color 0.3s ease, background-color 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IonAvatar style={{ width: '36px', height: '36px', border: '1px solid var(--luxury-gold)', backgroundColor: 'var(--luxury-card-bg)' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--luxury-gold)', color: 'var(--ion-background-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
              {name[0].toUpperCase()}
            </div>
          </IonAvatar>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ion-text-color)', display: 'block' }}>
              {name} <span style={{ fontWeight: '300', color: 'var(--luxury-text-muted)', fontSize: '11px' }}>({elo})</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
              {capturedPieces && (
                <span style={{ fontSize: '12px', letterSpacing: '1px' }}>{capturedPieces}</span>
              )}
              {materialAdvantage > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#81B64C' }}>+{materialAdvantage}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: '18px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: isMyTurn && isClockRunning ? 'var(--luxury-gold)' : 'var(--luxury-text-muted)',
            transition: 'color 0.3s ease'
          }}>
            {formatTime(timer)}
          </span>
        </div>
      </div>
    );
  };

  const handleHostGame = () => {
    const initialClocks = timeControl * 60;
    setWhiteTime(initialClocks);
    setBlackTime(initialClocks);
    
    // Resolve random color selection immediately
    if (selectedColor === 'random') {
      const resolvedColor = Math.random() < 0.5 ? 'white' : 'black';
      setSelectedColor(resolvedColor);
    }
    
    const newGame = new Chess();
    chessRef.current = newGame;
    setGameFen(newGame.fen());
    setHistory([]);
    setMoveIndex(0);
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
    const newHistory = chess.history();
    setGameFen(chess.fen());
    setHistory(newHistory);
    setMoveIndex(newHistory.length);
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
    setMoveIndex(0);
    setGameStatus('White to move');
    setIsClockRunning(true);
  };

  // Local Wi-Fi peer scanning triggers
  const startWifiScan = () => {
    setIsWifiScanning(true);
    setToastMessage('Broadcasting UDP discovery beacon on subnet...');
    setTimeout(() => {
      setIsWifiScanning(false);
      setToastMessage('UDP discovery complete. Found active Wi-Fi chess peers.');
    }, 2000);
  };

  const connectToWifiPeer = (peer: WifiPeer) => {
    setWifiPeers((prev) => prev.map((p) => p.id === peer.id ? { ...p, status: 'connecting' } : p));
    setTimeout(() => {
      setWifiPeers((prev) => prev.map((p) => p.id === peer.id ? { ...p, status: 'connected' } : p));
      setConnectedWifiPeer(`${peer.name} (${peer.ipAddress})`);
      setToastMessage(`Wi-Fi Chess P2P connection established with ${peer.ipAddress}!`);
    }, 1500);
  };

  // Unified Editorial Card Styling Generator (Dynamically supporting pastel color block system in Light Mode)
  const getCardStyle = (mode: 'online' | 'computer' | 'wifi' | 'tournaments') => {
    if (isDarkMode) {
      return {
        background: 'var(--luxury-card-bg)',
        text: 'var(--ion-text-color)',
        muted: 'var(--luxury-text-muted)',
        arrowBg: 'var(--luxury-gold-subtle)',
        arrowBorder: 'var(--luxury-border)',
        arrowColor: 'var(--luxury-gold)'
      };
    }
    switch (mode) {
      case 'online':
        return {
          background: '#D4DCF9', // Sophisticated pastel lavender/blue
          text: '#1A1E26',
          muted: 'rgba(26, 30, 38, 0.7)',
          arrowBg: 'rgba(26, 30, 38, 0.05)',
          arrowBorder: 'rgba(26, 30, 38, 0.1)',
          arrowColor: '#1A1E26'
        };
      case 'computer':
        return {
          background: '#EDE4B6', // Warm muted champagne/yellow
          text: '#1A1E26',
          muted: 'rgba(26, 30, 38, 0.7)',
          arrowBg: 'rgba(26, 30, 38, 0.05)',
          arrowBorder: 'rgba(26, 30, 38, 0.1)',
          arrowColor: '#1A1E26'
        };
      case 'wifi':
        return {
          background: '#C7DFD9', // Natural soft sage green/mint
          text: '#1A1E26',
          muted: 'rgba(26, 30, 38, 0.7)',
          arrowBg: 'rgba(26, 30, 38, 0.05)',
          arrowBorder: 'rgba(26, 30, 38, 0.1)',
          arrowColor: '#1A1E26'
        };
      case 'tournaments':
      default:
        return {
          background: '#ECDCD6', // Soft muted peach/rose
          text: '#1A1E26',
          muted: 'rgba(26, 30, 38, 0.7)',
          arrowBg: 'rgba(26, 30, 38, 0.05)',
          arrowBorder: 'rgba(26, 30, 38, 0.1)',
          arrowColor: '#1A1E26'
        };
    }
  };

  return (
    <IonPage>
      {/* Luxury Minimalist Header with dynamic theme toggle */}
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ 
          '--background': 'var(--ion-background-color)', 
          '--color': 'var(--ion-text-color)',
          padding: '10px 16px 0 16px', // Standardized unified left gutter (16px)
          transition: 'background-color 0.3s ease'
        }}>
          {activeView !== 'dashboard' ? (
            <IonButton 
              slot="start" 
              fill="clear" 
              style={{ '--color': 'var(--luxury-gold)', fontWeight: '500', fontSize: '14px', paddingLeft: '0' }}
              onClick={() => setActiveView(activeView === 'board' ? 'setup' : 'dashboard')}
            >
              <IonIcon icon={arrowBackOutline} slot="start" style={{ fontSize: '16px' }} />
              Back
            </IonButton>
          ) : (
            /* Sleek Editorial Header Logo Placeholder (Aligned perfectly on the left vertical grid) */
            <div slot="start" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              fontWeight: '800', 
              letterSpacing: '2px',
              color: 'var(--ion-text-color)',
              paddingLeft: '0' // Zero offset to lock perfectly with greeting
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
            paddingRight: '0',
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
          <div style={{ 
            maxWidth: '520px', 
            margin: '0 auto', 
            color: 'var(--ion-text-color)',
            padding: '20px 16px' // Exact standardized horizontal grid margins
          }}>
            
            {/* Top Luxury Header with Editorial Typography Hierarchy */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '35px',
              padding: '0' // Removed extra offsets to maintain a strict vertical line
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
                  backgroundColor: 'var(--luxury-card-bg)',
                  transition: 'background-color 0.3s ease'
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
                    transition: 'color 0.3s ease, background-color 0.3s ease'
                  }}>
                    {(currentUser?.username || 'G')[0].toUpperCase()}
                  </div>
                </IonAvatar>
              </div>
            </div>

            {/* Standardized 2x2 Balanced Action Cards Grid (Soft Oversized Border Radii 24px) */}
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
                      backgroundColor: getCardStyle('online').background, 
                      color: getCardStyle('online').text,
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
                      backgroundColor: getCardStyle('online').arrowBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: getCardStyle('online').arrowColor,
                      border: getCardStyle('online').arrowBorder,
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
                      opacity: isDarkMode ? 0.08 : 0.12,
                      pointerEvents: 'none',
                      color: getCardStyle('online').text
                    }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <circle cx="50" cy="50" r="40" />
                      <ellipse cx="50" cy="50" rx="40" ry="15" />
                      <ellipse cx="50" cy="50" rx="15" ry="40" />
                      <line x1="50" y1="10" x2="50" y2="90" />
                      <line x1="10" y1="50" x2="90" y2="50" />
                    </svg>

                    <IonIcon icon={globeOutline} style={{ fontSize: '26px', color: getCardStyle('online').arrowColor }} />
                    <div style={{ zIndex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: getCardStyle('online').text }}>Play Online</h3>
                      <p style={{ fontSize: '10px', color: getCardStyle('online').muted, margin: 0, lineHeight: '1.3', fontWeight: '400' }}>Challenge players worldwide in real-time lobbies.</p>
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
                      backgroundColor: getCardStyle('computer').background, 
                      color: getCardStyle('computer').text,
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
                      backgroundColor: getCardStyle('computer').arrowBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: getCardStyle('computer').arrowColor,
                      border: getCardStyle('computer').arrowBorder,
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
                      opacity: isDarkMode ? 0.08 : 0.12,
                      pointerEvents: 'none',
                      color: getCardStyle('computer').text
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

                    <IonIcon icon={hardwareChipOutline} style={{ fontSize: '26px', color: getCardStyle('computer').arrowColor }} />
                    <div style={{ zIndex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: getCardStyle('computer').text }}>vs Computer</h3>
                      <p style={{ fontSize: '10px', color: getCardStyle('computer').muted, margin: 0, lineHeight: '1.3', fontWeight: '400' }}>Practice offline vs Stockfish engine settings.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 3: Local Multiplayer (size="6") */}
                <IonCol size="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('wifi');
                      setActiveView('setup');
                    }}
                    style={{
                      height: '165px',
                      borderRadius: '24px', 
                      backgroundColor: getCardStyle('wifi').background, 
                      color: getCardStyle('wifi').text,
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
                      backgroundColor: getCardStyle('wifi').arrowBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: getCardStyle('wifi').arrowColor,
                      border: getCardStyle('wifi').arrowBorder,
                      zIndex: 2
                    }}>
                      ↗
                    </div>

                    {/* Placeholder Vector Graphic 3: Wi-Fi P2P subnet waves (Bottom-Right aligned) */}
                    <svg style={{
                      position: 'absolute',
                      bottom: '-15px',
                      right: '-15px',
                      width: '90px',
                      height: '90px',
                      opacity: isDarkMode ? 0.08 : 0.12,
                      pointerEvents: 'none',
                      color: getCardStyle('wifi').text
                    }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M10,80 A60,60 0 0,1 90,80" />
                      <path d="M25,80 A40,40 0 0,1 75,80" />
                      <path d="M40,80 A20,20 0 0,1 60,80" />
                      <circle cx="50" cy="80" r="4" fill="currentColor" />
                    </svg>

                    <IonIcon icon={wifiOutline} style={{ fontSize: '26px', color: getCardStyle('wifi').arrowColor }} />
                    <div style={{ zIndex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: getCardStyle('wifi').text }}>Local Wi-Fi</h3>
                      <p style={{ fontSize: '10px', color: getCardStyle('wifi').muted, margin: 0, lineHeight: '1.3', fontWeight: '400' }}>Direct P2P multiplayer link over shared Wi-Fi.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 4: Tournaments (Coming Soon) (size="6") */}
                <IonCol size="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    style={{
                      height: '165px',
                      borderRadius: '24px', 
                      backgroundColor: getCardStyle('tournaments').background, 
                      color: getCardStyle('tournaments').text,
                      padding: '22px', 
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid var(--luxury-border)',
                      boxShadow: 'var(--luxury-card-shadow)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'background-color 0.3s ease'
                    }}
                  >
                    {/* Small Locked / Coming Soon Badge in corner */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      right: '18px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '8px',
                      fontWeight: '800',
                      letterSpacing: '0.5px',
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(26, 30, 38, 0.08)',
                      color: isDarkMode ? 'var(--luxury-gold)' : '#1A1E26',
                      border: isDarkMode ? '1px solid var(--luxury-border)' : '1px solid rgba(26, 30, 38, 0.1)',
                      zIndex: 2
                    }}>
                      SOON
                    </div>

                    {/* Placeholder Vector Graphic 4: Brackets/Trophy Outline (Bottom-Right aligned) */}
                    <svg style={{
                      position: 'absolute',
                      bottom: '-10px',
                      right: '-10px',
                      width: '85px',
                      height: '85px',
                      opacity: isDarkMode ? 0.08 : 0.12,
                      pointerEvents: 'none',
                      color: getCardStyle('tournaments').text
                    }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M30,30 L70,30 L70,45 L30,45 Z" />
                      <path d="M40,45 L40,70 L60,70 L60,45" />
                      <path d="M35,80 L65,80" />
                      <line x1="50" y1="70" x2="50" y2="80" />
                      <path d="M30,35 H20 V40 H30" />
                      <path d="M70,35 H80 V40 H70" />
                    </svg>

                    <IonIcon icon={trophyOutline} style={{ fontSize: '26px', color: getCardStyle('tournaments').arrowColor, opacity: 0.6 }} />
                    <div style={{ zIndex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 2px 0', color: getCardStyle('tournaments').text, opacity: 0.8 }}>Tournaments</h3>
                      <p style={{ fontSize: '10px', color: getCardStyle('tournaments').muted, margin: 0, lineHeight: '1.3', fontWeight: '400', opacity: 0.8 }}>Join structured local brackets and arenas.</p>
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
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
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
                      boxShadow: 'var(--luxury-card-shadow)',
                      transition: 'background-color 0.3s ease'
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
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>PLAY ONLINE</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="wifi" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', fontWeight: '600' }}>Local Wi-Fi</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {/* ENGINE STRENGTH SELECTOR (Strictly for "vs Computer" Mode) */}
            {gameMode === 'computer' && (
              <div style={{
                marginBottom: '24px',
                backgroundColor: 'var(--luxury-card-bg)',
                borderRadius: '24px',
                padding: '22px',
                border: '1px solid var(--luxury-border)',
                boxShadow: 'var(--luxury-card-shadow)',
                transition: 'background-color 0.3s ease'
              }}>
                <h3 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--luxury-gold)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={optionsOutline} />
                  Engine Strength
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--ion-text-color)', display: 'block' }}>
                      Strength Level: {engineStrength}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--luxury-text-muted)', fontWeight: '400' }}>
                      Approx. Elo: {engineStrength * 200 + 400}
                    </span>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--luxury-gold)', letterSpacing: '0.8px' }}>
                    {engineStrength <= 3 ? 'BEGINNER' : engineStrength <= 7 ? 'INTERMEDIATE' : 'GRANDMASTER'}
                  </span>
                </div>

                {/* Elegant Custom Range Slider */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={engineStrength} 
                    onChange={(e) => setEngineStrength(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--luxury-gold)',
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--ion-background-color)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sub-view: Local Wi-Fi socket peer scans */}
            {gameMode === 'wifi' && (
              <div style={{ 
                backgroundColor: 'var(--luxury-card-bg)', 
                borderRadius: '24px', 
                padding: '22px', 
                marginBottom: '20px', 
                border: '1px solid var(--luxury-border)',
                boxShadow: 'var(--luxury-card-shadow)',
                transition: 'background-color 0.3s ease'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--luxury-gold)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={wifiOutline} />
                  Local Wi-Fi Subnet Peer Scan
                </h3>
                
                {isWifiScanning ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <IonSpinner name="crescent" style={{ '--color': 'var(--luxury-gold)' }} />
                    <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: 'var(--luxury-text-muted)' }}>Broadcasting UDP discovery ping...</p>
                  </div>
                ) : (
                  <div>
                    {connectedWifiPeer ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#81B64C', fontSize: '13px', margin: '5px 0 12px 0', fontWeight: '600' }}>
                        <IonIcon icon={checkmarkCircleOutline} />
                        Connected Peer: {connectedWifiPeer}
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--luxury-text-muted)', margin: '0 0 14px 0', fontWeight: '300' }}>Discover devices connected to the same local Wi-Fi router for zero-lag local battles.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                      {wifiPeers.map((peer) => (
                        <div key={peer.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'var(--ion-background-color)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--luxury-border)',
                          transition: 'background-color 0.3s ease'
                        }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>{peer.name}</span>
                            <span style={{ fontSize: '9px', color: 'var(--luxury-text-muted)' }}>IP: {peer.ipAddress}</span>
                          </div>
                          {peer.status === 'available' && (
                            <button 
                              onClick={() => connectToWifiPeer(peer)}
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
                              Connect
                            </button>
                          )}
                          {peer.status === 'connecting' && <IonSpinner name="dots" style={{ '--color': 'var(--luxury-gold)' }} />}
                          {peer.status === 'connected' && <IonIcon icon={checkmarkCircleOutline} style={{ color: '#81B64C' }} />}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={startWifiScan}
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
                      Broadcasting Local Wi-Fi Subnet Scan
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
                boxShadow: 'var(--luxury-card-shadow)',
                transition: 'background-color 0.3s ease'
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--ion-background-color)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--luxury-border)', transition: 'background-color 0.3s ease' }}>
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
              marginBottom: '30px', 
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

              {/* Dynamic horizontal duration selectors - Thoughtful classical arrays */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '18px' }}>
                {[3, 5, 10, 15, 20].map((t) => (
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

            {/* Launch Active Game Button */}
            <button 
              onClick={handleHostGame}
              disabled={(gameMode === 'friend' && !roomCode) || (gameMode === 'wifi' && !connectedWifiPeer)}
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
                transition: 'opacity 0.2s, background-color 0.3s ease, color 0.3s ease'
              }}
            >
              {gameMode === 'computer' ? (
                <>
                  <IonIcon icon={playOutline} />
                  Start Match vs Computer
                </>
              ) : gameMode === 'friend' ? (
                <>
                  <IonIcon icon={playOutline} />
                  Play Online
                </>
              ) : (
                <>
                  <IonIcon icon={wifiOutline} />
                  Host Local Wi-Fi Match
                </>
              )}
            </button>

          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: ACTIVE GAME BOARD VIEW                            */}
        {/* ========================================================= */}
        {activeView === 'board' && (
          <div style={{ color: 'var(--ion-text-color)', padding: '16px 8px' }}>

            {/* Split-Screen: Board + Side Panel */}
            <IonGrid style={{ padding: 0 }}>
              <IonRow>
                {/* Left: Chessboard Column */}
                <IonCol size="12" sizeMd="7" sizeLg="8" style={{ padding: '8px' }}>
                  
                  {/* Opponent Profile Card (Visible on mobile only, above the board) */}
                  <div className="mobile-profile" style={{ marginBottom: '12px' }}>
                    {renderProfileCard('opponent')}
                  </div>

                  <div style={{ 
                    width: '100%', 
                    maxWidth: '550px',
                    margin: '0 auto',
                    backgroundColor: 'var(--ion-background-color)', 
                    transition: 'background-color 0.3s ease' 
                  }}>
                    <Chessboard
                      position={gameFen}
                      onPieceDrop={onDrop}
                      boardWidth={window.innerWidth > 600 ? 550 : window.innerWidth - 32}
                      boardOrientation={selectedColor === 'black' ? 'black' : 'white'}
                      customDarkSquareStyle={{ backgroundColor: '#5C6479' }}
                      customLightSquareStyle={{ backgroundColor: '#ECEFF4' }}
                      customBoardStyle={{ borderRadius: '0px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
                      arePiecesDraggable={!isEngineThinking && isClockRunning}
                      customSquareStyles={{
                        ...(lastMove && {
                          [lastMove.from]: { backgroundColor: 'rgba(199, 168, 76, 0.2)' },
                          [lastMove.to]: { backgroundColor: 'rgba(199, 168, 76, 0.2)' }
                        })
                      }}
                    />
                  </div>

                  {/* User Profile Card (Visible on mobile only, right below the board) */}
                  <div className="mobile-profile" style={{ marginTop: '12px' }}>
                    {renderProfileCard('user')}
                  </div>

                </IonCol>

                {/* Right: Side Panel Column */}
                <IonCol size="12" sizeMd="5" sizeLg="4" style={{ padding: '8px' }}>
                  <div className="right-panel-container">
                    
                    {/* TOP STACK */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
                      
                      {/* 1. Opponent Profile Card (Desktop Only) */}
                      <div className="desktop-profile">
                        {renderProfileCard('opponent')}
                      </div>

                      {/* 2. Active Match Status Banner */}
                      <div style={{ 
                        padding: '12px 16px', 
                        borderRadius: '12px', 
                        backgroundColor: 'var(--luxury-card-bg)', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        textAlign: 'center', 
                        borderLeft: '4px solid var(--luxury-gold)', 
                        boxShadow: 'var(--luxury-card-shadow)', 
                        transition: 'background-color 0.3s ease' 
                      }}>
                        {gameStatus}
                      </div>

                      {/* 3. Moves Played Log (PGN Format) */}
                      <div style={{ 
                        backgroundColor: 'var(--luxury-card-bg)', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        border: '1px solid var(--luxury-border)', 
                        boxShadow: 'var(--luxury-card-shadow)', 
                        transition: 'background-color 0.3s ease', 
                        flexGrow: 1, 
                        minHeight: '120px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: 'var(--luxury-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moves Played</h3>
                        {history.length === 0 ? (
                          <p style={{ color: 'var(--luxury-text-muted)', margin: 0, fontSize: '13px', fontWeight: '300', flexGrow: 1 }}>Waiting for first move...</p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '160px', overflowY: 'auto', flexGrow: 1 }}>
                            {history.map((move, index) => (
                              <span key={index} style={{ padding: '3px 7px', backgroundColor: 'var(--ion-background-color)', borderRadius: '6px', color: 'var(--ion-text-color)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
                                {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* BOTTOM STACK */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {/* 4. History Review Toolbar (The newly corrected ⏮ ◀ ▶ ⏭ layout row) */}
                      <IonGrid style={{ padding: 0 }}>
                        <IonRow>
                          <IonCol size="3">
                            <IonButton expand="block" color="medium" fill="outline" onClick={goToFirst} disabled={moveIndex === 0 || isEngineThinking}>
                              <IonIcon slot="icon-only" icon={playSkipBackOutline} />
                            </IonButton>
                          </IonCol>
                          <IonCol size="3">
                            <IonButton expand="block" color="medium" fill="outline" onClick={goToPrev} disabled={moveIndex === 0 || isEngineThinking}>
                              <IonIcon slot="icon-only" icon={chevronBackOutline} />
                            </IonButton>
                          </IonCol>
                          <IonCol size="3">
                            <IonButton expand="block" color="medium" fill="outline" onClick={goToNext} disabled={moveIndex >= history.length || isEngineThinking}>
                              <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                            </IonButton>
                          </IonCol>
                          <IonCol size="3">
                            <IonButton expand="block" color="medium" fill="outline" onClick={goToLast} disabled={moveIndex >= history.length || isEngineThinking}>
                              <IonIcon slot="icon-only" icon={playSkipForwardOutline} />
                            </IonButton>
                          </IonCol>
                        </IonRow>
                      </IonGrid>

                      {/* 5. Primary Quick Actions (Resign / Restart side-by-side as clean, equal-width blocks) */}
                      <IonGrid style={{ padding: 0 }}>
                        <IonRow>
                          <IonCol size="6">
                            <IonButton expand="block" color="danger" fill="outline" onClick={handleResign} disabled={isEngineThinking}>
                              <IonIcon slot="start" icon={closeOutline} />
                              Resign
                            </IonButton>
                          </IonCol>
                          <IonCol size="6">
                            <IonButton expand="block" color="primary" fill="outline" onClick={startNewGame} disabled={isEngineThinking}>
                              <IonIcon slot="start" icon={refreshOutline} />
                              Restart
                            </IonButton>
                          </IonCol>
                        </IonRow>
                      </IonGrid>

                      {/* 6. Your User Profile Card (Desktop Only) */}
                      <div className="desktop-profile">
                        {renderProfileCard('user')}
                      </div>

                    </div>

                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>

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

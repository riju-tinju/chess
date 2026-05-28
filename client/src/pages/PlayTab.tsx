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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
  IonItem,
  IonList,
  IonToast,
  IonToggle,
  IonAccordion,
  IonAccordionGroup
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
  optionsOutline
} from 'ionicons/icons';
import { StockfishEngine } from '../services/stockfishService';

type GameMode = 'computer' | 'bluetooth' | 'friend';
type ChessColor = 'white' | 'black' | 'random';

interface BluetoothDevice {
  id: string;
  name: string;
  status: 'paired' | 'discovered' | 'connecting';
}

const PlayTab: React.FC = () => {
  const { t } = useTranslation();
  
  // Game State
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  
  const [gameMode, setGameMode] = useState<GameMode>('computer');
  const [gameFen, setGameFen] = useState(chessRef.current.fen());
  const [gameStatus, setGameStatus] = useState<string>('White to move');
  const [history, setHistory] = useState<string[]>([]);
  const [isEngineThinking, setIsEngineThinking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // UI Flow State (Settings vs Active Game Board)
  const [isGameActive, setIsGameActive] = useState<boolean>(false);

  // --- MATCH CONFIGURATION STATES (Matching your visual template exactly) ---
  const [selectedColor, setSelectedColor] = useState<ChessColor>('white');
  const [sameTimeBoth, setSameTimeBoth] = useState<boolean>(true);
  const [timeControl, setTimeControl] = useState<number>(5); // Default 5 mins
  const [sameIncrementBoth, setSameIncrementBoth] = useState<boolean>(true);
  const [increment, setIncrement] = useState<number>(0); // Default no increment
  const [handicap, setHandicap] = useState<string>('none');

  // Interactive Digital Clocks
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  // Bluetooth States
  const [isBtScanning, setIsBtScanning] = useState<boolean>(false);
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([
    { id: 'dev_1', name: 'Grandmaster iPad Pro', status: 'paired' },
    { id: 'dev_2', name: 'OnePlus 12 (Discovered)', status: 'discovered' },
    { id: 'dev_3', name: 'Pixel 8 Pro (Discovered)', status: 'discovered' }
  ]);
  const [connectedBtDevice, setConnectedBtDevice] = useState<string | null>(null);

  // Friend Link States
  const [roomCode, setRoomCode] = useState<string>('');
  const [isLobbyConnecting, setIsLobbyConnecting] = useState<boolean>(false);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.terminate();
    };
  }, []);

  // Clock Countdown logic
  useEffect(() => {
    let interval: any;
    if (isGameActive && isClockRunning && !chessRef.current.isGameOver()) {
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
  }, [isGameActive, isClockRunning, gameFen]);

  // AI thinking triggers
  useEffect(() => {
    const chess = chessRef.current;
    if (isGameActive && gameMode === 'computer' && chess.turn() === 'b' && !chess.isGameOver() && !isEngineThinking) {
      setIsEngineThinking(true);
      setGameStatus('Computer is thinking...');
      
      const timer = setTimeout(() => {
        engineRef.current?.getBestMove(chess.fen(), 10, (bestMove) => {
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
          
          try {
            chess.move({ from, to, promotion });
            
            // Add increment to computer's clock
            if (increment > 0) {
              setBlackTime((t) => t + increment);
            }
            
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
  }, [gameFen, gameMode, isGameActive]);

  // Format digital clocks into mm:ss
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
        setGameStatus(`Checkmate! Game Over.`);
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

  // Drag and drop handler
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

      // Add time increment
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

  // Host/Start Game Action (Launches Active Chessboard view)
  const handleHostGame = () => {
    // Determine player color setup
    let finalColor = selectedColor;
    if (selectedColor === 'random') {
      finalColor = Math.random() > 0.5 ? 'white' : 'black';
    }

    // Configure clocks based on settings
    const initialClocks = timeControl * 60;
    setWhiteTime(initialClocks);
    setBlackTime(initialClocks);
    
    // Clear history and configure initial board state
    const cleanGame = new Chess();
    
    // Apply Handicap settings if configured
    if (handicap === 'knight') {
      // Remove White's queens knight (b1) for advantage
      cleanGame.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR b KQkq - 1 1');
    } else if (handicap === 'queen') {
      // Remove White's queen (d1)
      cleanGame.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 1 1');
    }

    chessRef.current = cleanGame;
    setGameFen(cleanGame.fen());
    setHistory([]);
    setGameStatus('White to move');
    
    // Launch active board state
    setIsGameActive(true);
    setIsClockRunning(true);
    setToastMessage(`Match hosted successfully! Same Time: ${formatTime(initialClocks)}`);
  };

  // Return to settings configure panel
  const returnToSettings = () => {
    setIsClockRunning(false);
    setIsGameActive(false);
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

  // --- Bluetooth Controls ---
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
      setToastMessage(`Connected via Bluetooth to ${device.name}! Ready to Host.`);
    }, 1500);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1A1E2B', '--color': '#FFFFFF' }}>
          <IonTitle>{isGameActive ? 'Active Match' : t('tabs.play')}</IonTitle>
          {isGameActive && (
            <IonButton 
              slot="end" 
              fill="clear" 
              style={{ '--color': '#C9A84C', 'font-weight': '600' }}
              onClick={returnToSettings}
            >
              <IonIcon icon={optionsOutline} slot="start" />
              Settings
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': '#1A1E2B' }}>
        
        {/* ========================================================= */}
        {/* VIEW A: ACTIVE GAME BOARD VIEW                            */}
        {/* ========================================================= */}
        {isGameActive ? (
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
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>WHITE (Player)</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'w' ? '#C9A84C' : '#FFFFFF' }}>
                  {formatTime(whiteTime)}
                </span>
              </div>
              <div style={{ alignSelf: 'center', color: '#888', fontWeight: 'bold' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>BLACK (Opponent)</span>
                <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: chessRef.current.turn() === 'b' ? '#C9A84C' : '#FFFFFF' }}>
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
                borderLeft: '4px solid #C9A84C'
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
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#C9A84C' }}>Moves Played</h3>
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
        ) : (
          
          // =========================================================
          // VIEW B: PREMIUM SETUP & MATCH CONFIGURATION VIEW         
          // =========================================================
          <div className="ion-padding" style={{ maxWidth: '550px', margin: '0 auto', color: '#FFFFFF' }}>
            
            {/* Game Mode Segment selector */}
            <div style={{ marginBottom: '20px' }}>
              <IonSegment 
                value={gameMode} 
                onIonChange={(e) => setGameMode(e.detail.value as GameMode)}
                style={{ 
                  '--background': '#121212',
                  '--color': '#A0A6B5',
                  '--color-checked': '#121212',
                  '--background-checked': '#C9A84C',
                  borderRadius: '8px'
                }}
              >
                <IonSegmentButton value="computer" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>vs Computer</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="bluetooth" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>Bluetooth</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="friend" style={{ margin: '2px' }}>
                  <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>Friend Challenge</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {/* BT scanning dashboard if in Bluetooth Mode */}
            {gameMode === 'bluetooth' && (
              <IonCard style={{ '--background': '#1E1E1E', margin: '0 0 20px 0', borderRadius: '8px' }}>
                <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A84C', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonIcon icon={bluetoothOutline} />
                    Step 1: Pair Bluetooth Local Controller
                  </h3>
                  {isBtScanning ? (
                    <div style={{ textAlign: 'center', padding: '15px' }}>
                      <IonSpinner name="crescent" color="warning" />
                      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Searching for antennas...</p>
                    </div>
                  ) : (
                    <div>
                      {connectedBtDevice ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#81B64C', fontSize: '13px', margin: '5px 0' }}>
                          <IonIcon icon={checkmarkCircleOutline} />
                          Ready to play on: <strong>{connectedBtDevice}</strong>
                        </div>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>No paired controller found. Scan nearby to pair.</p>
                      )}
                      
                      <IonGrid style={{ padding: 0 }}>
                        <IonRow>
                          {btDevices.map((dev) => dev.status === 'discovered' && (
                            <IonCol size="6" key={dev.id}>
                              <IonButton expand="block" size="small" fill="outline" color="warning" onClick={() => connectToBtDevice(dev)}>
                                Connect {dev.name.split(' ')[0]}
                              </IonButton>
                            </IonCol>
                          ))}
                        </IonRow>
                      </IonGrid>

                      <IonButton expand="block" color="warning" size="small" fill="clear" onClick={startBluetoothScan} style={{ marginTop: '5px' }}>
                        Scan local frequencies
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            )}

            {/* Friend Room Code Generator if in Friend Mode */}
            {gameMode === 'friend' && (
              <IonCard style={{ '--background': '#1E1E1E', margin: '0 0 20px 0', borderRadius: '8px' }}>
                <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A84C', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonIcon icon={linkOutline} />
                    Step 1: Matchmaking Room Link
                  </h3>
                  {!roomCode ? (
                    <IonButton expand="block" color="warning" size="small" onClick={() => {
                      setIsLobbyConnecting(true);
                      setTimeout(() => {
                        setRoomCode('LOBBY_' + Math.random().toString(36).substring(2, 6).toUpperCase());
                        setIsLobbyConnecting(false);
                      }, 1000);
                    }}>
                      {isLobbyConnecting ? <IonSpinner name="dots" /> : 'Generate Room Code'}
                    </IonButton>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2E3440', padding: '6px 12px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#81B64C' }}>Lobby Code: {roomCode}</span>
                      <IonButton fill="clear" size="small" style={{ '--color': '#C9A84C' }} onClick={() => {
                        navigator.clipboard.writeText(`https://chessapp.com/lobby/${roomCode}`);
                        setToastMessage('Lobby copied!');
                      }}>
                        Copy
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            )}

            {/* CONFIG SECTION 1: YOUR COLOR SELECTION */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#A0A6B5', margin: '0 0 10px 4px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      border: selectedColor === 'white' ? '2px solid #C9A84C' : '2px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '4px' }}>♔</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedColor === 'white' ? '#C9A84C' : '#FFFFFF' }}>White</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('black')}
                    style={{
                      padding: '16px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#1E1E1E',
                      border: selectedColor === 'black' ? '2px solid #C9A84C' : '2px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '4px' }}>♚</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedColor === 'black' ? '#C9A84C' : '#FFFFFF' }}>Black</span>
                  </div>
                </IonCol>

                <IonCol size="4" style={{ padding: '0 4px' }}>
                  <div 
                    onClick={() => setSelectedColor('random')}
                    style={{
                      padding: '16px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#1E1E1E',
                      border: selectedColor === 'random' ? '2px solid #C9A84C' : '2px solid transparent',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '22px', display: 'block', marginBottom: '4px' }}>🎲</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: selectedColor === 'random' ? '#C9A84C' : '#FFFFFF' }}>Random</span>
                  </div>
                </IonCol>
              </IonRow>
            </div>

            {/* CONFIG SECTION 2: TIME CONTROL */}
            <div style={{ marginBottom: '25px', backgroundColor: '#1E1E1E', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#A0A6B5', margin: '0 0 15px 0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={timerOutline} />
                Time Control
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px' }}>Same time for both</span>
                <IonToggle checked={sameTimeBoth} onIonChange={(e) => setSameTimeBoth(e.detail.checked)} style={{ '--background': '#2E3440' }} />
              </div>

              {/* Dynamic horizontal duration selectors */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '15px' }}>
                {[1, 2, 3, 5, 10].map((t) => (
                  <IonButton 
                    key={t}
                    size="small"
                    color={timeControl === t ? 'warning' : 'medium'}
                    fill={timeControl === t ? 'solid' : 'outline'}
                    onClick={() => setTimeControl(t)}
                    style={{ 'font-weight': '600', 'min-width': '65px' }}
                  >
                    {t} min
                  </IonButton>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px' }}>Same increment for both</span>
                <IonToggle checked={sameIncrementBoth} onIonChange={(e) => setSameIncrementBoth(e.detail.checked)} style={{ '--background': '#2E3440' }} />
              </div>

              {/* Increments buttons */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px' }}>
                {[0, 1, 2, 3, 5].map((inc) => (
                  <IonButton 
                    key={inc}
                    size="small"
                    color={increment === inc ? 'warning' : 'medium'}
                    fill={increment === inc ? 'solid' : 'outline'}
                    onClick={() => setIncrement(inc)}
                    style={{ 'font-weight': '600', 'min-width': '75px' }}
                  >
                    {inc === 0 ? 'No inc' : `+${inc}s`}
                  </IonButton>
                ))}
              </div>
            </div>

            {/* CONFIG SECTION 3: ACCORDION HANDICAP */}
            <div style={{ marginBottom: '25px' }}>
              <IonAccordionGroup>
                <IonAccordion value="handicaps" style={{ '--background': '#1E1E1E', color: '#FFFFFF', borderRadius: '8px', overflow: 'hidden' }}>
                  <IonItem slot="header" style={{ '--background': '#1E1E1E', '--color': '#FFFFFF' }}>
                    <IonIcon icon={scaleOutline} slot="start" style={{ color: '#C9A84C' }} />
                    <IonLabel>
                      <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Handicap</h3>
                      <p style={{ fontSize: '11px', color: '#888' }}>Optional - give one side an advantage</p>
                    </IonLabel>
                  </IonItem>
                  <div className="ion-padding" slot="content" style={{ backgroundColor: '#1E1E1E', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div 
                      onClick={() => setHandicap('none')}
                      style={{ padding: '10px', borderRadius: '4px', backgroundColor: handicap === 'none' ? '#2E3440' : 'transparent', border: handicap === 'none' ? '1px solid #C9A84C' : '1px solid transparent', cursor: 'pointer', fontSize: '13px' }}
                    >
                      🛡️ None (Standard Equal Match)
                    </div>
                    <div 
                      onClick={() => setHandicap('knight')}
                      style={{ padding: '10px', borderRadius: '4px', backgroundColor: handicap === 'knight' ? '#2E3440' : 'transparent', border: handicap === 'knight' ? '1px solid #C9A84C' : '1px solid transparent', cursor: 'pointer', fontSize: '13px' }}
                    >
                      🐎 Knight Advantage (White plays without Queen's Knight b1)
                    </div>
                    <div 
                      onClick={() => setHandicap('queen')}
                      style={{ padding: '10px', borderRadius: '4px', backgroundColor: handicap === 'queen' ? '#2E3440' : 'transparent', border: handicap === 'queen' ? '1px solid #C9A84C' : '1px solid transparent', cursor: 'pointer', fontSize: '13px' }}
                    >
                      👑 Queen Advantage (White plays without Queen d1)
                    </div>
                  </div>
                </IonAccordion>
              </IonAccordionGroup>
            </div>

            {/* ACTION FOOTER: HOST GAME BUTTON (WiFi symbol) */}
            <IonButton 
              expand="block" 
              color="warning" 
              onClick={handleHostGame}
              disabled={(gameMode === 'bluetooth' && !connectedBtDevice) || (gameMode === 'friend' && !roomCode)}
              style={{ 
                '--background': '#C9A84C', 
                '--color': '#121212',
                'font-weight': '700',
                height: '48px',
                fontSize: '15px',
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
                  Host Game Locally
                </>
              )}
            </IonButton>

          </div>
        )}

        {/* Toast notifications */}
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

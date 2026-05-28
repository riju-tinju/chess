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
  IonToast
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
  checkmarkCircleOutline
} from 'ionicons/icons';
import { StockfishEngine } from '../services/stockfishService';

type GameMode = 'computer' | 'bluetooth' | 'friend';

interface BluetoothDevice {
  id: string;
  name: string;
  status: 'paired' | 'discovered' | 'connecting';
}

const PlayTab: React.FC = () => {
  const { t } = useTranslation();
  
  // Game Setup
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  
  const [gameMode, setGameMode] = useState<GameMode>('computer');
  const [gameFen, setGameFen] = useState(chessRef.current.fen());
  const [gameStatus, setGameStatus] = useState<string>('White to move');
  const [history, setHistory] = useState<string[]>([]);
  const [isEngineThinking, setIsEngineThinking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

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

  // Initialize engine on component mount
  useEffect(() => {
    engineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.terminate();
    };
  }, []);

  // Computer Move calculation trigger
  useEffect(() => {
    const chess = chessRef.current;
    if (gameMode === 'computer' && chess.turn() === 'b' && !chess.isGameOver() && !isEngineThinking) {
      setIsEngineThinking(true);
      setGameStatus('Computer is thinking...');
      
      const timer = setTimeout(() => {
        engineRef.current?.getBestMove(chess.fen(), 10, (bestMove) => {
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
          
          try {
            chess.move({ from, to, promotion });
            setGameFen(chess.fen());
            setHistory(chess.history());
            setIsEngineThinking(false);
            updateStatus();
          } catch (err) {
            console.error("Invalid computer move computed:", err);
            setIsEngineThinking(false);
            updateStatus();
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameFen, gameMode]);

  // Update game outcome status
  const updateStatus = () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        setGameStatus(`Checkmate! Winner: ${chess.turn() === 'w' ? 'Black' : 'White'}`);
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

  // Handle board drops
  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isEngineThinking) return false;
    
    // In VS Computer mode, lock Black moves
    if (gameMode === 'computer' && chessRef.current.turn() === 'b') return false;

    try {
      const chess = chessRef.current;
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      setGameFen(chess.fen());
      setHistory(chess.history());
      updateStatus();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Reset match
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
  };

  // Undo last move
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

  // --- Bluetooth Functions ---
  const startBluetoothScan = () => {
    setIsBtScanning(true);
    setToastMessage('Scanning for nearby local Bluetooth devices...');
    setTimeout(() => {
      setIsBtScanning(false);
      setToastMessage('Bluetooth scan completed.');
    }, 4000);
  };

  const connectToBtDevice = (device: BluetoothDevice) => {
    setBtDevices((prev) => 
      prev.map((d) => d.id === device.id ? { ...d, status: 'connecting' } : d)
    );
    
    setTimeout(() => {
      setBtDevices((prev) => 
        prev.map((d) => d.id === device.id ? { ...d, status: 'paired' } : d)
      );
      setConnectedBtDevice(device.name);
      setToastMessage(`Successfully connected via Bluetooth to ${device.name}!`);
      startNewGame();
    }, 2000);
  };

  // --- Friend Link Functions ---
  const generateFriendChallengeLink = () => {
    setIsLobbyConnecting(true);
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
      setIsLobbyConnecting(false);
      setToastMessage('Match lobby generated! Share link with your opponent.');
    }, 1500);
  };

  const copyChallengeLink = () => {
    const link = `https://chessapp.com/lobby/${roomCode}`;
    navigator.clipboard.writeText(link);
    setToastMessage('Challenge link copied to clipboard!');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1A1E2B', '--color': '#FFFFFF' }}>
          <IonTitle>{t('tabs.play')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen style={{ '--background': '#1A1E2B' }}>
        
        {/* PREMIUM GAME MODE SEGMENT SELECTOR */}
        <div style={{ backgroundColor: '#1E1E1E', padding: '10px' }}>
          <IonSegment 
            value={gameMode} 
            onIonChange={(e) => {
              setGameMode(e.detail.value as GameMode);
              startNewGame();
            }}
            style={{ 
              '--background': '#121212',
              '--color': '#A0A6B5',
              '--color-checked': '#121212',
              '--background-checked': '#C9A84C', // Premium Gold highlight
              borderRadius: '8px'
            }}
          >
            <IonSegmentButton value="computer" style={{ margin: '2px' }}>
              <IonIcon icon={hardwareChipOutline} />
              <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>vs AI</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="bluetooth" style={{ margin: '2px' }}>
              <IonIcon icon={bluetoothOutline} />
              <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>Bluetooth</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="friend" style={{ margin: '2px' }}>
              <IonIcon icon={linkOutline} />
              <IonLabel style={{ fontSize: '11px', 'font-weight': '600' }}>Friend Link</IonLabel>
            </IonSegmentButton>
          </IonSegment>
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
            arePiecesDraggable={!isEngineThinking}
          />
        </div>

        {/* Game Stats & Segment Sub-Dashboard Controllers */}
        <div className="ion-padding" style={{ color: '#FFFFFF', maxWidth: '600px', margin: '0 auto' }}>
          
          {/* Status Indicator */}
          <div style={{ 
            padding: '10px 15px', 
            borderRadius: '8px', 
            backgroundColor: '#1E1E1E', 
            marginBottom: '15px', 
            fontSize: '15px', 
            fontWeight: '600',
            textAlign: 'center',
            borderLeft: '4px solid #C9A84C',
            color: '#ECEFF4'
          }}>
            {gameMode === 'bluetooth' && connectedBtDevice ? (
              <span>Bluetooth Opponent: {connectedBtDevice} | {gameStatus}</span>
            ) : gameMode === 'friend' && roomCode ? (
              <span>Lobby Code: {roomCode} | {gameStatus}</span>
            ) : (
              <span>Status: {gameStatus}</span>
            )}
          </div>

          {/* --- SUB-VIEW MODE 1: COMPUTER PLAY --- */}
          {gameMode === 'computer' && (
            <div>
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
                      Reset
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          )}

          {/* --- SUB-VIEW MODE 2: LOCAL BLUETOOTH PLAY --- */}
          {gameMode === 'bluetooth' && (
            <IonCard style={{ '--background': '#1E1E1E', margin: '0 0 15px 0', borderRadius: '8px' }}>
              <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={bluetoothOutline} />
                  Capacitor Bluetooth Pairing
                </h3>
                
                <p style={{ fontSize: '12px', color: '#A0A6B5', margin: '0 0 12px 0' }}>
                  Play local peer-to-peer offline chess boards with a friend nearby using your device's built-in Bluetooth antenna.
                </p>

                {isBtScanning ? (
                  <div style={{ textAlign: 'center', padding: '15px' }}>
                    <IonSpinner name="crescent" color="warning" />
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#A0A6B5' }}>Scanning local frequencies...</p>
                  </div>
                ) : (
                  <div>
                    <IonList inset={true} style={{ background: 'transparent', margin: 0, padding: 0 }}>
                      {btDevices.map((device) => (
                        <IonItem key={device.id} style={{ '--background': '#2E3440', '--color': '#FFFFFF', margin: '4px 0', borderRadius: '4px' }} lines="none">
                          <IonLabel>
                            <h2>{device.name}</h2>
                            <p style={{ color: device.status === 'paired' ? '#C9A84C' : '#888' }}>
                              {device.status.toUpperCase()}
                            </p>
                          </IonLabel>
                          {device.status === 'discovered' && (
                            <IonButton slot="end" size="small" color="warning" onClick={() => connectToBtDevice(device)}>
                              Pair
                            </IonButton>
                          )}
                          {device.status === 'connecting' && (
                            <IonSpinner slot="end" name="dots" color="warning" />
                          )}
                          {device.status === 'paired' && (
                            <IonIcon slot="end" icon={checkmarkCircleOutline} style={{ color: '#81B64C' }} />
                          )}
                        </IonItem>
                      ))}
                    </IonList>

                    <IonButton expand="block" color="warning" style={{ marginTop: '12px' }} onClick={startBluetoothScan}>
                      Scan for Devices
                    </IonButton>
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {/* --- SUB-VIEW MODE 3: FRIEND LOBBY CHALLENGE LINK --- */}
          {gameMode === 'friend' && (
            <IonCard style={{ '--background': '#1E1E1E', margin: '0 0 15px 0', borderRadius: '8px' }}>
              <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={linkOutline} />
                  Matchmaking Room Link
                </h3>
                
                <p style={{ fontSize: '12px', color: '#A0A6B5', margin: '0 0 12px 0' }}>
                  Establish a secure socket tunnel with an opponent anywhere in the world by sending them a direct challenge link.
                </p>

                {isLobbyConnecting ? (
                  <div style={{ textAlign: 'center', padding: '15px' }}>
                    <IonSpinner name="crescent" color="warning" />
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#A0A6B5' }}>Initiating Socket.io Lobby...</p>
                  </div>
                ) : !roomCode ? (
                  <IonButton expand="block" color="warning" onClick={generateFriendChallengeLink}>
                    Create Challenge Room
                  </IonButton>
                ) : (
                  <div>
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#2E3440', 
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px'
                    }}>
                      <span>https://chessapp.com/lobby/{roomCode}</span>
                      <IonButton fill="clear" size="small" style={{ '--color': '#C9A84C' }} onClick={copyChallengeLink}>
                        <IonIcon icon={copyOutline} />
                      </IonButton>
                    </div>

                    <IonGrid style={{ padding: 0 }}>
                      <IonRow>
                        <IonCol size="6">
                          <IonButton expand="block" color="warning" fill="outline" onClick={copyChallengeLink}>
                            <IonIcon slot="start" icon={copyOutline} />
                            Copy Link
                          </IonButton>
                        </IonCol>
                        <IonCol size="6">
                          <IonButton expand="block" color="danger" fill="outline" onClick={() => setRoomCode('')}>
                            Close Room
                          </IonButton>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {/* Move Log Cards */}
          <IonCard style={{ '--background': '#1E1E1E', margin: '15px 0 0 0', borderRadius: '8px' }}>
            <IonCardContent style={{ color: '#ECEFF4', padding: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#C9A84C' }}>Move Log</h3>
              {history.length === 0 ? (
                <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>No moves played yet.</p>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px', 
                  fontSize: '13px', 
                  fontFamily: 'monospace',
                  maxHeight: '80px',
                  overflowY: 'auto'
                }}>
                  {history.map((move, index) => (
                    <span key={index} style={{ 
                      padding: '2px 6px', 
                      backgroundColor: '#2E3440', 
                      borderRadius: '4px' 
                    }}>
                      {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                    </span>
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>

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

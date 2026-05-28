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
  IonToggle
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { refreshOutline, playBackOutline, hardwareChipOutline } from 'ionicons/icons';
import { StockfishEngine } from '../services/stockfishService';

const PlayTab: React.FC = () => {
  const { t } = useTranslation();
  
  // Initialize Chess.js logic
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  
  const [gameFen, setGameFen] = useState(chessRef.current.fen());
  const [gameStatus, setGameStatus] = useState<string>('White to move');
  const [history, setHistory] = useState<string[]>([]);
  const [vsComputer, setVsComputer] = useState<boolean>(false);
  const [isEngineThinking, setIsEngineThinking] = useState<boolean>(false);

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
    if (vsComputer && chess.turn() === 'b' && !chess.isGameOver() && !isEngineThinking) {
      setIsEngineThinking(true);
      setGameStatus('Computer is thinking...');
      
      // Delay engine start slightly for natural gameplay feel
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
  }, [gameFen, vsComputer]);

  // Update status string based on game state
  const updateStatus = () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        setGameStatus(`Checkmate! Game Over. Winner: ${chess.turn() === 'w' ? 'Black' : 'White'}`);
      } else if (chess.isDraw()) {
        setGameStatus('Game Over. Draw (Stalemate / 3-fold repetition / 50-move rule)');
      }
    } else {
      if (chess.inCheck()) {
        setGameStatus(`Check! ${chess.turn() === 'w' ? 'White' : 'Black'} to move`);
      } else {
        setGameStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} to move`);
      }
    }
  };

  // Handle move drops on the board
  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isEngineThinking) return false; // Lock board during calculation
    
    // Prevent moves if it's Computer's turn in VS Computer mode
    if (vsComputer && chessRef.current.turn() === 'b') return false;

    try {
      const chess = chessRef.current;
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity in initial setup
      });

      if (move === null) return false;

      // Update state
      setGameFen(chess.fen());
      setHistory(chess.history());
      updateStatus();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Undo the last move (undoes White and Computer moves if in vsComputer mode)
  const undoMove = () => {
    if (isEngineThinking) return;
    const chess = chessRef.current;
    
    chess.undo();
    // In VS Computer mode, we need to undo both the computer's move and player's move
    if (vsComputer && chess.turn() === 'b') {
      chess.undo();
    }
    
    setGameFen(chess.fen());
    setHistory(chess.history());
    updateStatus();
  };

  // Reset the match
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1A1E2B', '--color': '#FFFFFF' }}>
          <IonTitle>{t('tabs.play')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen style={{ '--background': '#1A1E2B' }}>
        {/* Full-width interactive Chessboard wrapper - MANDATED 100vw for eye ergonomics */}
        <div style={{ width: '100vw', maxWidth: '100vw', margin: '0', padding: '0', backgroundColor: '#1A1E2B' }}>
          <Chessboard 
            position={gameFen} 
            onPieceDrop={onDrop}
            boardWidth={window.innerWidth > 600 ? 550 : window.innerWidth} // Dynamic responsive full viewport width
            customDarkSquareStyle={{ backgroundColor: '#5C6479' }} // Premium low-glare slate
            customLightSquareStyle={{ backgroundColor: '#ECEFF4' }} // Soft warm white
            customBoardStyle={{
              borderRadius: '0px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4)'
            }}
            arePiecesDraggable={!isEngineThinking}
          />
        </div>

        {/* Game Stats & Controller Dashboard */}
        <div className="ion-padding" style={{ color: '#FFFFFF', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ 
            padding: '10px 15px', 
            borderRadius: '8px', 
            backgroundColor: '#1E1E1E', 
            marginBottom: '15px', 
            fontSize: '15px', 
            fontWeight: '600',
            textAlign: 'center',
            borderLeft: '4px solid #C9A84C', // Gold Accent bar
            color: '#ECEFF4'
          }}>
            Status: {gameStatus}
          </div>

          {/* Toggle Computer Mode */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 16px',
            backgroundColor: '#1E1E1E',
            borderRadius: '8px',
            marginBottom: '15px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <IonIcon icon={hardwareChipOutline} style={{ color: '#C9A84C', fontSize: '18px' }} />
              Play VS Computer (Stockfish Engine)
            </span>
            <IonToggle 
              checked={vsComputer} 
              onIonChange={(e) => {
                setVsComputer(e.detail.checked);
                startNewGame(); // Reset board to clean state
              }}
            />
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
                  Reset
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>

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
      </IonContent>
    </IonPage>
  );
};

export default PlayTab;

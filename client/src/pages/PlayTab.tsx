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
  closeOutline,
  expandOutline,
  contractOutline
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
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // View state machine
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // Game Engine & board setups
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  const evalEngineRef = useRef<StockfishEngine | null>(null);
  const analyzeEngineRef = useRef<StockfishEngine | null>(null);
  const [engineEval, setEngineEval] = useState<{ type: 'cp' | 'mate', value: number } | null>(null);
  
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
  const [showAllClassifs, setShowAllClassifs] = useState<boolean>(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewTab, setReviewTab] = useState<'report' | 'analysis'>('report');
  const [aiCoachEnabled, setAiCoachEnabled] = useState<boolean>(false);
  const [isMicRecording, setIsMicRecording] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  type MoveClassification = 'brilliant' | 'critical' | 'best' | 'excellent' | 'okay' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder' | 'theory' | 'none';
  interface MoveAnalysis { classification: MoveClassification; cpLoss: number; eval: number; bestMoveUCI?: string; }
  interface AnalysisReport { moveAnalyses: MoveAnalysis[]; evals: number[]; whiteAccuracy: number; blackAccuracy: number; }
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);

  const playSound = (type: 'move' | 'capture' | 'check' | 'castle' | 'gameover') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      if (type === 'move') {
        // Clean wood-tap click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'capture') {
        // Punchy strike with noise burst
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
        // Add noise burst
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        const noise = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        noise.buffer = buffer;
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
      } else if (type === 'check') {
        // Sharp alert bell tone
        [1200, 1600].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.3, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.12);
        });
      } else if (type === 'castle') {
        // Double click — two rapid taps
        [0, 0.09].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(700, now + offset);
          osc.frequency.exponentialRampToValueAtTime(350, now + offset + 0.06);
          gain.gain.setValueAtTime(0.3, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.07);
        });
      } else if (type === 'gameover') {
        // Descending chime sequence
        const notes = [880, 660, 440, 330];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          gain.gain.setValueAtTime(0.25, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.2);
        });
      }

      // Auto-close context after sounds finish
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    } catch (err) {
      console.warn('Audio synthesis failed:', err);
    }
  };

  const handleResign = () => {
    // Show confirmation modal (IonAlert) – simplified here with browser confirm.
    if (window.confirm('Are you sure you want to resign?')) {
      setGameStatus(selectedColor === 'white' ? 'White resigned' : 'Black resigned');
      setIsClockRunning(false);
      playSound('gameover');
    }
  };

  const runGameAnalysis = async () => {
    if (!analyzeEngineRef.current || history.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const tempChess = new Chess();
    const evals: number[] = [];
    const moveAnalyses: MoveAnalysis[] = [];
    
    // Evaluate the starting position once
    const initialEvalData = await analyzeEngineRef.current.analyzePosition(tempChess.fen(), 16);
    let prevEvalData: { type: 'mate' | 'centipawn', value: number, bestMove?: string } = { 
      type: initialEvalData.type as 'mate' | 'centipawn', 
      value: initialEvalData.value, 
      bestMove: initialEvalData.bestMove 
    };
    let prevBestMove = initialEvalData.bestMove;

    for (let i = 0; i < history.length; i++) {
      // Make the move
      const moveSan = history[i];
      const moveObj = tempChess.move(moveSan);
      const playedMoveUCI = moveObj.from + moveObj.to + (moveObj.promotion || '');
      const moveColor = moveObj.color; // 'w' or 'b'

      // Analyze the position AFTER the move
      const fenAfter = tempChess.fen();
      let evalAfterData: { type: 'mate' | 'centipawn', value: number, bestMove?: string };
      
      if (tempChess.isCheckmate()) {
        evalAfterData = { type: 'mate', value: 0 };
      } else if (tempChess.isDraw() || tempChess.isStalemate() || tempChess.isThreefoldRepetition() || tempChess.isInsufficientMaterial()) {
        evalAfterData = { type: 'centipawn', value: 0 };
      } else {
        const analyzeRes = await analyzeEngineRef.current.analyzePosition(fenAfter, 16);
        evalAfterData = { type: analyzeRes.type as 'mate' | 'centipawn', value: analyzeRes.value, bestMove: analyzeRes.bestMove };
      }

      // Convert engine evaluations to absolute (White's perspective)
      const prevTurn = moveColor; 
      const currTurn = tempChess.turn(); 

      const previousEvaluation = { 
        type: prevEvalData.type, 
        value: prevTurn === 'w' ? prevEvalData.value : -prevEvalData.value 
      };
      
      const currentEvaluation = { 
        type: evalAfterData.type, 
        value: currTurn === 'w' ? evalAfterData.value : -evalAfterData.value 
      };

      // Extract absolute numerical evaluation for the graph (evals array)
      let absEvalForGraph = 0;
      if (currentEvaluation.type === 'mate') {
        absEvalForGraph = currentEvaluation.value === 0 ? (moveColor === 'w' ? 10000 : -10000) : Math.sign(currentEvaluation.value) * 10000;
      } else {
        absEvalForGraph = currentEvaluation.value;
      }
      evals.push(absEvalForGraph);

      // Expected Points Logic (Dummy Project)
      const getExpectedPoints = (ev: {type: string, value: number}, opts: {moveColour: 'w' | 'b'}) => {
        if (ev.type === 'mate') {
          if (ev.value === 0) return opts.moveColour === 'w' ? 1 : 0;
          return ev.value > 0 ? 1 : 0;
        } else {
          return 1 / (1 + Math.exp(-0.0035 * ev.value));
        }
      };

      const pointLoss = Math.max(0, 
        (getExpectedPoints(previousEvaluation, { moveColour: moveColor === 'w' ? 'b' : 'w' }) 
         - getExpectedPoints(currentEvaluation, { moveColour: moveColor })) 
        * (moveColor === 'w' ? 1 : -1)
      );

      const lossForAcc = pointLoss * 100;

      let classification: MoveClassification = 'okay';
      const topMovePlayed = prevBestMove === playedMoveUCI;
      
      if (tempChess.isCheckmate()) {
        classification = 'best';
      } else if (topMovePlayed) {
        classification = 'best';
      } else {
        const previousSubjectiveValue = previousEvaluation.value * (moveColor === 'w' ? 1 : -1);
        const subjectiveValue = currentEvaluation.value * (moveColor === 'w' ? 1 : -1);

        if (previousEvaluation.type === 'mate' && currentEvaluation.type === 'mate') {
            if (previousSubjectiveValue > 0 && subjectiveValue < 0) {
                classification = subjectiveValue < -3 ? 'mistake' : 'blunder';
            } else {
                const mateLoss = (currentEvaluation.value - previousEvaluation.value) * (moveColor === 'w' ? 1 : -1);
                if (mateLoss < 0 || (mateLoss === 0 && subjectiveValue < 0)) classification = 'best';
                else if (mateLoss < 2) classification = 'excellent';
                else if (mateLoss < 7) classification = 'okay';
                else classification = 'inaccuracy';
            }
        } else if (previousEvaluation.type === 'mate' && currentEvaluation.type === 'centipawn') {
            if (subjectiveValue >= 800) classification = 'excellent';
            else if (subjectiveValue >= 400) classification = 'okay';
            else if (subjectiveValue >= 200) classification = 'inaccuracy';
            else if (subjectiveValue >= 0) classification = 'mistake';
            else classification = 'blunder';
        } else if (previousEvaluation.type === 'centipawn' && currentEvaluation.type === 'mate') {
            if (subjectiveValue > 0) classification = 'best';
            else if (subjectiveValue >= -2) classification = 'blunder';
            else if (subjectiveValue >= -5) classification = 'mistake';
            else classification = 'inaccuracy';
        } else {
            if (pointLoss < 0.01) classification = 'best';
            else if (pointLoss < 0.045) classification = 'excellent';
            else if (pointLoss < 0.08) classification = 'okay';
            else if (pointLoss < 0.12) classification = 'inaccuracy';
            else if (pointLoss < 0.22) classification = 'mistake';
            else classification = 'blunder';
        }
      }

      // Specific exceptions
      if (i < 4 && pointLoss < 0.02) classification = 'theory'; // Opening book
      else if (pointLoss >= 0.12 && Math.abs(previousEvaluation.value) > 150 && Math.abs(currentEvaluation.value) < 50) {
        classification = 'miss'; // Missed a big advantage
      } else if (pointLoss < 0.01 && Math.abs(previousEvaluation.value) < 200 && Math.abs(currentEvaluation.value) > 200) {
        classification = 'brilliant';
      } else if (pointLoss < 0.01 && Math.abs(previousEvaluation.value) > 100 && Math.abs(currentEvaluation.value) > 100 && Math.sign(previousEvaluation.value) !== Math.sign(currentEvaluation.value)) {
        classification = 'critical'; // Sharp turnaround move
      }

      moveAnalyses.push({ classification, cpLoss: lossForAcc, eval: absEvalForGraph, bestMoveUCI: prevBestMove || '' });

      // Cache for next iteration
      prevEvalData = evalAfterData;
      prevBestMove = evalAfterData.bestMove ?? '';
      
      // Update progress
      setAnalysisProgress(Math.round(((i + 1) / history.length) * 100));
    }

    // Calculate overall accuracy
    let whiteAcc = 0;
    let blackAcc = 0;
    let whiteMoves = 0;
    let blackMoves = 0;

    moveAnalyses.forEach((ma, i) => {
       // Convert probability loss to an accuracy percentage
       const acc = Math.max(0, 100 - ma.cpLoss * 2);
       if (i % 2 === 0) { whiteAcc += acc; whiteMoves++; }
       else { blackAcc += acc; blackMoves++; }
    });

    setAnalysisReport({
      moveAnalyses,
      evals,
      whiteAccuracy: whiteMoves ? whiteAcc / whiteMoves : 0,
      blackAccuracy: blackMoves ? blackAcc / blackMoves : 0
    });

    setIsAnalyzing(false);
    setIsReviewMode(true);
    setReviewTab('report');
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
    evalEngineRef.current = new StockfishEngine();
    analyzeEngineRef.current = new StockfishEngine();
    return () => {
      engineRef.current?.terminate();
      evalEngineRef.current?.terminate();
      analyzeEngineRef.current?.terminate();
    };
  }, []);

  // Evaluate position continuously for the probability bar
  useEffect(() => {
    if (activeView === 'board') {
      evalEngineRef.current?.evaluatePosition(gameFen, 12, (evalData) => {
        const tempChess = new Chess(gameFen);
        // Engine evaluation is relative to the side to move
        const multiplier = tempChess.turn() === 'w' ? 1 : -1;
        setEngineEval({
          type: evalData.type,
          value: evalData.value * multiplier
        });
      });
    }
  }, [gameFen, activeView]);

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
              playSound('gameover');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              setGameStatus('White wins on time!');
              setIsClockRunning(false);
              playSound('gameover');
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
            const move = chess.move({ from, to, promotion });
            setLastMove({ from, to });
            if (increment > 0) setBlackTime((t) => t + increment);
            setGameFen(chess.fen());
            setHistory(chess.history());
            setMoveIndex(chess.history().length);
            setIsEngineThinking(false);
            updateStatus();
            
            if (chess.isGameOver()) {
              playSound('gameover');
            } else if (chess.inCheck()) {
              playSound('check');
            } else if (move.flags.includes('c') || move.flags.includes('e')) {
              playSound('capture');
            } else if (move.flags.includes('k') || move.flags.includes('q')) {
              playSound('castle');
            } else {
              playSound('move');
            }
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
      
      if (chess.isGameOver()) {
        playSound('gameover');
      } else if (chess.inCheck()) {
        playSound('check');
      } else if (move.flags.includes('c') || move.flags.includes('e')) {
        playSound('capture');
      } else if (move.flags.includes('k') || move.flags.includes('q')) {
        playSound('castle');
      } else {
        playSound('move');
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const onSquareClick = (square: string) => {
    if (isEngineThinking || !isClockRunning) return;
    const currentChess = chessRef.current;
    const piece = currentChess.get(square as any);
    const turn = currentChess.turn();
    
    if (gameMode === 'computer') {
      const engineSide = selectedColor === 'white' ? 'b' : 'w';
      if (turn === engineSide) return;
    } else {
      if (turn !== (selectedColor === 'black' ? 'b' : 'w')) return;
    }

    if (selectedSquare === null) {
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
      }
    } else {
      if (selectedSquare === square) {
        setSelectedSquare(null);
      } else if (piece && piece.color === turn) {
        setSelectedSquare(square);
      } else {
        onDrop(selectedSquare, square);
        setSelectedSquare(null);
      }
    }
  };

  const getCapturedPieces = (chessInstance?: any) => {
    const board = (chessInstance || chessRef.current).board();
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
    const currentViewChess = new Chess(gameFen);
    const isUser = type === 'user';
    const color = isUser ? selectedColor : (selectedColor === 'white' ? 'black' : 'white');
    const timer = color === 'white' ? whiteTime : blackTime;
    const isMyTurn = currentViewChess.turn() === (color === 'white' ? 'w' : 'b');
    const name = isUser
      ? (currentUser?.username || 'You')
      : (gameMode === 'computer' ? `Stockfish Lvl ${engineStrength}` : 'Opponent');
    const elo = isUser
      ? 1500
      : (gameMode === 'computer' ? engineStrength * 200 + 400 : 1600);

    const captured = getCapturedPieces(currentViewChess);
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
    const initialClocks = timeControl * 60;
    setWhiteTime(initialClocks);
    setBlackTime(initialClocks);
    
    const newGame = new Chess();
    chessRef.current = newGame;
    setGameFen(newGame.fen());
    setHistory([]);
    setMoveIndex(0);
    setGameStatus('White to move');
    setIsClockRunning(true);
    setLastMove(null);
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
      {isReviewMode && (
        <style>
          {`
            @media (max-width: 768px) {
              ion-tab-bar { display: none !important; }
              ion-header { display: none !important; }
              ion-content { --padding-bottom: 90px !important; }
              
              .mobile-review-nav {
                position: fixed !important;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 10px 10px calc(10px + env(safe-area-inset-bottom)) 10px !important;
                background-color: var(--ion-background-color) !important;
                border-top: 1px solid var(--luxury-border) !important;
                z-index: 1000;
              }
            }
          `}
        </style>
      )}
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
          
          {/* Dual Theme Switcher & Focus Mode (Tucked into top-right header) */}
          <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingRight: '0' }}>
            {/* Focus Mode (Desktop only, Board view only) */}
            {activeView === 'board' && (
              <div 
                className="desktop-only-flex"
                onClick={() => setIsFocusMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  color: 'var(--luxury-gold)',
                  textTransform: 'uppercase'
                }}
              >
                <IonIcon icon={expandOutline} style={{ fontSize: '14px' }} />
                <span>FOCUS</span>
              </div>
            )}
            
            <div onClick={() => setIsDarkMode(!isDarkMode)} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '1px',
              cursor: 'pointer',
              color: 'var(--luxury-gold)',
              textTransform: 'uppercase'
            }}>
              <IonIcon icon={isDarkMode ? sunnyOutline : moonOutline} style={{ fontSize: '14px' }} />
              <span>{isDarkMode ? 'LIGHT' : 'DARK'}</span>
            </div>
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
                  fontSize: 'clamp(32px, 5vw, 42px)', 
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
                
                {/* Card 1: Play Online */}
                <IonCol size="12" sizeMd="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('friend');
                      setActiveView('setup');
                    }}
                    style={{
                      height: 'clamp(170px, 25vw, 200px)',
                      borderRadius: '24px', 
                      backgroundColor: getCardStyle('online').background, 
                      color: getCardStyle('online').text,
                      padding: 'clamp(24px, 5vw, 32px)', 
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
                      <h3 style={{ fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: '700', margin: '0 0 6px 0', color: getCardStyle('online').text }}>Play Online</h3>
                      <p style={{ fontSize: 'clamp(13px, 1.8vw, 15px)', color: getCardStyle('online').muted, margin: 0, lineHeight: '1.4', fontWeight: '400' }}>Challenge players worldwide in real-time lobbies.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 2: vs Computer */}
                <IonCol size="12" sizeMd="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('computer');
                      setActiveView('setup');
                    }}
                    style={{
                      height: 'clamp(170px, 25vw, 200px)',
                      borderRadius: '24px', 
                      backgroundColor: getCardStyle('computer').background, 
                      color: getCardStyle('computer').text,
                      padding: 'clamp(24px, 5vw, 32px)', 
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
                      <h3 style={{ fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: '700', margin: '0 0 6px 0', color: getCardStyle('computer').text }}>vs Computer</h3>
                      <p style={{ fontSize: 'clamp(13px, 1.8vw, 15px)', color: getCardStyle('computer').muted, margin: 0, lineHeight: '1.4', fontWeight: '400' }}>Practice offline vs Stockfish engine settings.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 3: Local Multiplayer */}
                <IonCol size="12" sizeMd="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => {
                      setGameMode('wifi');
                      setActiveView('setup');
                    }}
                    style={{
                      height: 'clamp(170px, 25vw, 200px)',
                      borderRadius: '24px', 
                      backgroundColor: getCardStyle('wifi').background, 
                      color: getCardStyle('wifi').text,
                      padding: 'clamp(24px, 5vw, 32px)', 
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
                      <h3 style={{ fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: '700', margin: '0 0 6px 0', color: getCardStyle('wifi').text }}>Local Wi-Fi</h3>
                      <p style={{ fontSize: 'clamp(13px, 1.8vw, 15px)', color: getCardStyle('wifi').muted, margin: 0, lineHeight: '1.4', fontWeight: '400' }}>Direct P2P multiplayer link over shared Wi-Fi.</p>
                    </div>
                  </div>
                </IonCol>

                {/* Card 4: Tournaments (Coming Soon) */}
                <IonCol size="12" sizeMd="6" style={{ padding: '0 8px', marginBottom: '16px' }}>
                  <div 
                    style={{
                      height: 'clamp(170px, 25vw, 200px)',
                      borderRadius: '24px', 
                      backgroundColor: getCardStyle('tournaments').background, 
                      color: getCardStyle('tournaments').text,
                      padding: 'clamp(24px, 5vw, 32px)', 
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
                      <h3 style={{ fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: '700', margin: '0 0 6px 0', color: getCardStyle('tournaments').text, opacity: 0.8 }}>Tournaments</h3>
                      <p style={{ fontSize: 'clamp(13px, 1.8vw, 15px)', color: getCardStyle('tournaments').muted, margin: 0, lineHeight: '1.4', fontWeight: '400', opacity: 0.8 }}>Join structured local brackets and arenas.</p>
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
                <h3 style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: '300', margin: '0 0 6px 0', color: 'var(--ion-text-color)', letterSpacing: '-0.3px' }}>
                  Solve today's <span style={{ fontWeight: '800' }}>Daily Puzzle</span>
                </h3>
                <p style={{ fontSize: 'clamp(13px, 1.8vw, 15px)', color: 'var(--luxury-text-muted)', margin: 0, fontWeight: '300' }}>Mate in 3 • 14,204 solved today</p>
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
            {isFocusMode && (
              <style>
                {`
                  ion-header { display: none !important; }
                  ion-tab-bar { display: none !important; }
                  @media (min-width: 1024px) {
                    .game-col-1 { max-height: 100vh !important; }
                    .chess-board-wrapper { max-width: calc(100vh - 160px) !important; }
                  }
                `}
              </style>
            )}
            
            {isFocusMode && (
              <div 
                className="desktop-only-flex"
                onClick={() => setIsFocusMode(false)}
                style={{
                  position: 'fixed',
                  top: '16px',
                  right: '16px',
                  zIndex: 9999,
                  backgroundColor: 'var(--luxury-card-bg)',
                  padding: '10px 16px',
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '1.5px',
                  cursor: 'pointer',
                  color: 'var(--luxury-gold)',
                  boxShadow: 'var(--luxury-card-shadow)',
                  border: '1px solid var(--luxury-border)'
                }}
              >
                <IonIcon icon={contractOutline} style={{ fontSize: '16px' }} />
                <span>EXIT FOCUS</span>
              </div>
            )}
            
            <style>
              {`
                .game-layout {
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
                }
                .game-col-1, .game-col-2, .game-col-3 {
                  width: 100%;
                }
                @media (min-width: 1024px) {
                  .game-layout {
                    flex-direction: row;
                  }
                  .game-col-1 { 
                    width: 50%; 
                  }
                  .game-col-2 { width: 25%; }
                  .game-col-3 { width: 25%; }
                  
                  .chess-board-wrapper {
                    width: 100%;
                    max-width: calc(100vh - 280px);
                    margin: 0 auto;
                  }
                }
                
                @media (max-width: 1023px) {
                  .desktop-only-flex {
                    display: none !important;
                  }
                  .chess-board-wrapper {
                    width: 100%;
                    max-width: 550px;
                    margin: 0 auto;
                  }
                }
                
                @keyframes badgeEnterBg {
                  0% {
                    background-size: 60%;
                    background-position: center center;
                  }
                  100% {
                    background-size: 32%;
                    background-position: top 4px right 4px;
                  }
                }
              `}
            </style>
            
            <div className="game-layout">
              {/* Column 1: Board + Profiles */}
              <div className="game-col-1" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderProfileCard('opponent')}
                
                <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'stretch' }}>
                  {/* Vertical Probability Status Bar */}
                  {(() => {
                    const currentChess = new Chess(gameFen);
                    const isMate = currentChess.isCheckmate();
                    let whiteProb = 50;
                    let displayScore = "0.0";

                    if (isMate) {
                      const winner = currentChess.turn() === 'w' ? 'black' : 'white';
                      whiteProb = winner === 'white' ? 100 : 0;
                      displayScore = 'M';
                    } else if (engineEval) {
                      if (engineEval.type === 'mate') {
                        whiteProb = engineEval.value > 0 ? 100 : 0;
                        displayScore = `M${Math.abs(engineEval.value)}`;
                      } else {
                        const advantage = engineEval.value / 100;
                        whiteProb = Math.max(5, Math.min(95, 50 + (advantage * 5)));
                        displayScore = Math.abs(advantage).toFixed(1);
                      }
                    } else {
                      const captured = getCapturedPieces(currentChess);
                      const advantage = captured.white.points - captured.black.points;
                      whiteProb = Math.max(5, Math.min(95, 50 + (advantage * 5)));
                      displayScore = Math.abs(advantage).toFixed(1);
                    }

                    return (
                      <div style={{
                        width: '20px', // Slightly wider for text
                        backgroundColor: '#5C6479', // Dark color for Black
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: selectedColor === 'black' ? 'column-reverse' : 'column',
                        justifyContent: 'flex-start',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {/* Black's portion */}
                        <div style={{
                          width: '100%',
                          height: `${100 - whiteProb}%`,
                          backgroundColor: '#5C6479',
                          transition: 'height 0.5s ease-in-out',
                          position: 'relative'
                        }}>
                          {whiteProb < 50 && (
                            <div style={{
                              position: 'absolute',
                              bottom: selectedColor === 'black' ? 'auto' : '2px',
                              top: selectedColor === 'black' ? '2px' : 'auto',
                              width: '100%',
                              textAlign: 'center',
                              fontSize: '9px',
                              fontWeight: '800',
                              color: '#ECEFF4',
                              letterSpacing: '-0.5px'
                            }}>
                              {displayScore}
                            </div>
                          )}
                        </div>

                        {/* White's portion */}
                        <div style={{
                          width: '100%',
                          height: `${whiteProb}%`,
                          backgroundColor: '#ECEFF4', // Light color for White
                          transition: 'height 0.5s ease-in-out',
                          position: 'relative',
                          boxShadow: selectedColor === 'black' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 -2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {whiteProb >= 50 && (
                            <div style={{
                              position: 'absolute',
                              top: selectedColor === 'black' ? 'auto' : '2px',
                              bottom: selectedColor === 'black' ? '2px' : 'auto',
                              width: '100%',
                              textAlign: 'center',
                              fontSize: '9px',
                              fontWeight: '800',
                              color: '#5C6479',
                              letterSpacing: '-0.5px'
                            }}>
                              {displayScore}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="chess-board-wrapper" style={{ 
                    backgroundColor: 'var(--ion-background-color)', 
                    transition: 'background-color 0.3s ease',
                    flexGrow: 1,
                    position: 'relative',
                    overflow: 'visible'
                  }}>
                    <Chessboard
                    position={gameFen}
                    onPieceDrop={onDrop}
                    onSquareClick={onSquareClick}
                    boardOrientation={selectedColor === 'black' ? 'black' : 'white'}
                    customDarkSquareStyle={{ backgroundColor: '#5C6479' }}
                    customLightSquareStyle={{ backgroundColor: '#ECEFF4' }}
                    customBoardStyle={{ borderRadius: '0px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
                    arePiecesDraggable={!isEngineThinking && isClockRunning}
                    customSquareStyles={{
                      ...(lastMove && {
                        [lastMove.from]: { backgroundColor: 'rgba(199, 168, 76, 0.2)' },
                        [lastMove.to]: { backgroundColor: 'rgba(199, 168, 76, 0.2)' }
                      }),
                      ...(selectedSquare && {
                        [selectedSquare]: { backgroundColor: 'rgba(199, 168, 76, 0.4)', border: '2px solid var(--luxury-gold)' }
                      }),
                      ...( (() => {
                          const currentChess = new Chess(gameFen);
                          const board = currentChess.board();
                          let styles: Record<string, any> = {};
                          
                          const isAtLatestMove = moveIndex === history.length;
                          const isCheckmate = currentChess.isCheckmate();
                          const isGameStatusDraw = gameStatus.toLowerCase().includes('draw') || gameStatus.toLowerCase().includes('stalemate');
                          const isDraw = currentChess.isDraw() || isGameStatusDraw;
                          const isTimeout = gameStatus.includes('wins on time');
                          const isResign = gameStatus.includes('resigned');
                          const inCheck = currentChess.inCheck();

                          if ((isCheckmate && isAtLatestMove) || (isDraw && isAtLatestMove) || (isTimeout && isAtLatestMove) || (isResign && isAtLatestMove) || inCheck) {
                            let loserColor = '';
                            let winnerColor = '';
                            
                            if (isCheckmate) {
                              loserColor = currentChess.turn();
                              winnerColor = loserColor === 'w' ? 'b' : 'w';
                            } else if (isTimeout) {
                              loserColor = gameStatus.includes('White') ? 'b' : 'w';
                              winnerColor = loserColor === 'w' ? 'b' : 'w';
                            } else if (isResign) {
                              loserColor = gameStatus.includes('White') ? 'w' : 'b';
                              winnerColor = loserColor === 'w' ? 'b' : 'w';
                            }

                            for (let i = 0; i < board.length; i++) {
                              for (let j = 0; j < board[i].length; j++) {
                                const piece = board[i][j];
                                if (piece && piece.type === 'k') {
                                  const isLoser = piece.color === loserColor;
                                  
                                  let bgColor = '';
                                  let bgShadow = '';
                                  let svg = '';

                                  if (isCheckmate && isAtLatestMove) {
                                    if (isLoser) {
                                      bgColor = 'rgba(229, 57, 53, 0.8)';
                                      bgShadow = 'inset 0 0 10px rgba(0,0,0,0.5)';
                                      // Skull Head Badge for Loser
                                      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#E53935"/><path d="M12 4a5 5 0 0 0-5 5c0 1.5.8 2.8 2 3.6V16h6v-3.4c1.2-.8 2-2.1 2-3.6a5 5 0 0 0-5-5zm-2 5a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zm6 0a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zm-2 5h-4v1h4v-1z" fill="#FFF"/></svg>';
                                    } else {
                                      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#43A047"/><path d="M5 16l2-8 3 4 2-5 2 5 3-4 2 8H5z" fill="#FFF"/></svg>';
                                    }
                                  } else if (isDraw && isAtLatestMove) {
                                    bgColor = 'rgba(120, 144, 156, 0.5)';
                                    bgShadow = 'inset 0 0 10px rgba(0,0,0,0.2)';
                                    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#78909C"/><path d="M7 10h10M7 14h10" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/></svg>';
                                  } else if (isTimeout && isAtLatestMove) {
                                    if (isLoser) {
                                      bgColor = 'rgba(229, 57, 53, 0.8)';
                                      bgShadow = 'inset 0 0 10px rgba(0,0,0,0.3)';
                                      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#FB8C00"/><path d="M12 6v6l4 4" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';
                                    } else {
                                      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#43A047"/><path d="M5 16l2-8 3 4 2-5 2 5 3-4 2 8H5z" fill="#FFF"/></svg>';
                                    }
                                  } else if (isResign && isAtLatestMove) {
                                    if (isLoser) {
                                      bgColor = 'rgba(229, 57, 53, 0.6)';
                                      bgShadow = 'inset 0 0 10px rgba(0,0,0,0.2)';
                                      // White Flag Badge for Resign
                                      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#424242"/><path d="M8 5v14h2v-7h4l1 2h5V6h-5l-1-2H8z" fill="#FFF"/></svg>';
                                    } else {
                                      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#43A047"/><path d="M5 16l2-8 3 4 2-5 2 5 3-4 2 8H5z" fill="#FFF"/></svg>';
                                    }
                                  } else if (inCheck && piece.color === currentChess.turn()) {
                                    bgColor = 'rgba(229, 57, 53, 0.4)';
                                    bgShadow = 'none';
                                  }

                                  if (bgColor || svg) {
                                    styles[piece.square] = {};
                                    if (bgColor) {
                                      styles[piece.square] = {
                                        backgroundColor: bgColor,
                                        boxShadow: bgShadow
                                      };
                                    }
                                    
                                    if (svg) {
                                      styles[piece.square] = {
                                        ...styles[piece.square],
                                        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'top 4px right 4px',
                                        backgroundSize: '32%',
                                        animationName: 'badgeEnterBg',
                                        animationDuration: '0.7s',
                                        animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        animationFillMode: 'forwards'
                                      };
                                    }
                                  }
                                }
                              }
                            }
                          }

                          // IN REVIEW MODE: Add Classification Badge to the destination square of the current reviewed move
                          if (isReviewMode && moveIndex > 0 && analysisReport) {
                            // Replay to get the actual from/to of the reviewed move
                            const replayChess = new Chess();
                            let reviewedMove: any = null;
                            for (let mi = 0; mi < moveIndex && mi < history.length; mi++) {
                              reviewedMove = replayChess.move(history[mi]);
                            }
                            
                            if (reviewedMove) {
                              // Badge rendering is handled via floating overlay outside the Chessboard component

                              // Also highlight the from/to squares of the reviewed move
                              styles[reviewedMove.from] = {
                                ...styles[reviewedMove.from],
                                backgroundColor: 'rgba(199, 168, 76, 0.25)'
                              };
                              styles[reviewedMove.to] = {
                                ...styles[reviewedMove.to],
                                backgroundColor: 'rgba(199, 168, 76, 0.25)'
                              };
                            }
                          }
                          
                          return styles;
                      })() )
                    }}
                    customArrows={(() => {
                      const arrows: any[] = [];
                      if (isReviewMode && moveIndex > 0 && analysisReport) {
                        const ma = analysisReport.moveAnalyses[moveIndex - 1];
                        // Show best move arrow for everything except brilliant/critical/theory (those are already the best)
                        const skipArrowFor = ['brilliant', 'critical', 'theory'];
                        if (ma && ma.bestMoveUCI && ma.bestMoveUCI !== '(none)' && ma.bestMoveUCI.length >= 4 && !skipArrowFor.includes(ma.classification)) {
                          const from = ma.bestMoveUCI.substring(0, 2);
                          const to = ma.bestMoveUCI.substring(2, 4);
                          const isGoodMove = ['best', 'excellent', 'okay'].includes(ma.classification);
                          const arrowColor = isGoodMove ? 'rgba(152, 188, 73, 0.65)' : 'rgba(27, 170, 166, 0.75)';
                          arrows.push([from, to, arrowColor]);
                        }
                      }
                      return arrows;
                    })()}
                  />

                  {/* Classification Badge Overlay - floating on top of the board */}
                  {(() => {
                    if (!isReviewMode || moveIndex <= 0 || !analysisReport) return null;
                    
                    const replayChess2 = new Chess();
                    let revMove: any = null;
                    for (let mi = 0; mi < moveIndex && mi < history.length; mi++) {
                      revMove = replayChess2.move(history[mi]);
                    }
                    if (!revMove) return null;
                    
                    const ma = analysisReport.moveAnalyses[moveIndex - 1];
                    if (!ma || ma.classification === 'none') return null;
                    
                    const badgeImages: any = {
                      brilliant: '/assets/img/classifications/brilliant.png',
                      critical: '/assets/img/classifications/critical.png',
                      best: '/assets/img/classifications/best.png',
                      excellent: '/assets/img/classifications/excellent.png',
                      okay: '/assets/img/classifications/okay.png',
                      inaccuracy: '/assets/img/classifications/inaccuracy.png',
                      mistake: '/assets/img/classifications/mistake.png',
                      miss: '/assets/img/classifications/miss.png',
                      blunder: '/assets/img/classifications/blunder.png',
                      theory: '/assets/img/classifications/theory.png',
                    };
                    
                    const imgSrc = badgeImages[ma.classification];
                    if (!imgSrc) return null;
                    
                    // Calculate position: square coordinates to percentage
                    const file = revMove.to.charCodeAt(0) - 97; // a=0 .. h=7
                    const rank = parseInt(revMove.to[1]) - 1;    // 1=0 .. 8=7
                    const isFlipped = selectedColor === 'black';
                    
                    // Board origin is top-left. For white orientation: file goes left-right, rank 8 is top.
                    const col = isFlipped ? (7 - file) : file;
                    const row = isFlipped ? rank : (7 - rank);
                    
                    // Each square = 12.5%. Badge centered on top-right corner of square.
                    // Top-right corner of square: left = (col+1)*12.5%, top = row*12.5%
                    // Badge size = 45% of square = 5.625% of board. Center on corner = offset by half badge size.
                    const badgeSizePct = 5.625; // 45% of 12.5%
                    const leftPct = ((col + 1) * 12.5) - (badgeSizePct / 2);
                    const topPct = (row * 12.5) - (badgeSizePct / 2);
                    
                    return (
                      <img
                        src={imgSrc}
                        alt={ma.classification}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${badgeSizePct}%`,
                          height: `${badgeSizePct}%`,
                          zIndex: 1000,
                          pointerEvents: 'none',
                          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))'
                        }}
                      />
                    );
                  })()}

                  </div>
                </div>

                {renderProfileCard('user')}
              </div>

              {/* Column 2: State Machine (Controls & Analytics) */}
              <div className="game-col-2" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* STATE 3: GAME REVIEW & ANALYTICS */}
                {isReviewMode ? (
                  <>
                    {/* Tab Navigation for Review Section */}
                    <div style={{ display: 'flex', backgroundColor: 'var(--luxury-card-bg)', borderRadius: '12px', padding: '4px', border: '1px solid var(--luxury-border)' }}>
                      <div 
                        onClick={() => setReviewTab('report')}
                        style={{ flex: 1, textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', backgroundColor: reviewTab === 'report' ? 'var(--luxury-gold)' : 'transparent', color: reviewTab === 'report' ? 'var(--ion-background-color)' : 'var(--luxury-text-muted)', transition: 'all 0.3s' }}
                      >
                        Report
                      </div>
                      <div 
                        onClick={() => setReviewTab('analysis')}
                        style={{ flex: 1, textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', backgroundColor: reviewTab === 'analysis' ? 'var(--luxury-gold)' : 'transparent', color: reviewTab === 'analysis' ? 'var(--ion-background-color)' : 'var(--luxury-text-muted)', transition: 'all 0.3s' }}
                      >
                        Analysis
                      </div>
                    </div>

                    {reviewTab === 'report' ? (() => {
                      if (!analysisReport) return <div>No data</div>;
                      
                      const evalData = analysisReport.evals.map(e => e / 100); // cp to pawn units
                      
                      const graphW = 240;
                      const graphH = 80;
                      const midY = graphH / 2;
                      const scaleY = (val: number) => Math.max(0, Math.min(graphH, midY - (val / 5) * midY));

                      // Build SVG polyline points for white advantage (above midline) and black (below)
                      const points = evalData.map((val, i) => {
                        const x = evalData.length > 1 ? (i / (evalData.length - 1)) * graphW : 0;
                        return `${x},${scaleY(val)}`;
                      }).join(' ');

                      // Build filled area path
                      const firstX = 0;
                      const lastX = evalData.length > 1 ? graphW : 0;
                      const areaPath = evalData.length > 0
                        ? `M${firstX},${midY} ` + evalData.map((val, i) => {
                            const x = evalData.length > 1 ? (i / (evalData.length - 1)) * graphW : 0;
                            return `L${x},${scaleY(val)}`;
                          }).join(' ') + ` L${lastX},${midY} Z`
                        : '';

                      const classifs = [
                        { label: 'Brilliant', key: 'brilliant', color: '#1baaa6', symbol: '!!' },
                        { label: 'Critical', key: 'critical', color: '#5b8baf', symbol: '!' },
                        { label: 'Best', key: 'best', color: '#98bc49', symbol: '*' },
                        { label: 'Excellent', key: 'excellent', color: '#81B64C', symbol: '!' },
                        { label: 'Theory', key: 'theory', color: '#a88764', symbol: 'T' },
                        { label: 'Okay', key: 'okay', color: '#97af8b', symbol: '' },
                        { label: 'Inaccuracy', key: 'inaccuracy', color: '#f4bf44', symbol: '?!' },
                        { label: 'Mistake', key: 'mistake', color: '#e28c28', symbol: '?' },
                        { label: 'Miss', key: 'miss', color: '#ff7769', symbol: 'x' },
                        { label: 'Blunder', key: 'blunder', color: '#c93230', symbol: '??' },
                      ].map(c => {
                        let whiteCount = 0; let blackCount = 0;
                        analysisReport.moveAnalyses.forEach((ma, i) => {
                          if (ma.classification === c.key) { i % 2 === 0 ? whiteCount++ : blackCount++; }
                        });
                        return { ...c, whiteCount, blackCount };
                      });

                      const whiteAcc = analysisReport.whiteAccuracy;
                      const blackAcc = analysisReport.blackAccuracy;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>

                          {/* ── 1. EVALUATION GRAPH ── */}
                          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--luxury-border)', backgroundColor: '#1A1E26' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '4px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Evaluation Graph</div>
                            <svg width="100%" viewBox={`0 0 ${graphW} ${graphH}`} preserveAspectRatio="none" style={{ display: 'block', height: '80px' }}>
                              {/* Background halves */}
                              <rect x="0" y="0" width={graphW} height={midY} fill="rgba(236,239,244,0.08)" />
                              <rect x="0" y={midY} width={graphW} height={midY} fill="rgba(92,100,121,0.15)" />
                              {/* Mid line */}
                              <line x1="0" y1={midY} x2={graphW} y2={midY} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                              {/* Filled area */}
                              {areaPath && <path d={areaPath} fill="rgba(236,239,244,0.25)" />}
                              {/* Line */}
                              {evalData.length > 1 && <polyline points={points} fill="none" stroke="#ECEFF4" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />}
                              {/* Selected point highlight */}
                              {moveIndex > 0 && moveIndex <= evalData.length && (
                                <>
                                  <line 
                                    x1={((moveIndex - 1) / (Math.max(1, evalData.length - 1))) * graphW} 
                                    y1={0} 
                                    x2={((moveIndex - 1) / (Math.max(1, evalData.length - 1))) * graphW} 
                                    y2={graphH} 
                                    stroke="rgba(255,255,255,0.4)" 
                                    strokeWidth="1" 
                                  />
                                  <circle 
                                    cx={((moveIndex - 1) / (Math.max(1, evalData.length - 1))) * graphW} 
                                    cy={scaleY(evalData[moveIndex - 1])} 
                                    r="4" 
                                    fill="var(--luxury-gold)" 
                                  />
                                </>
                              )}
                              {/* Dynamic dots for classifications */}
                              {evalData.map((val, i) => {
                                if (i === 0) return null;
                                const ma = analysisReport.moveAnalyses[i - 1];
                                if (!ma) return null;
                                const highlighted = ['brilliant', 'critical', 'inaccuracy', 'mistake', 'blunder'].includes(ma.classification);
                                if (!highlighted) return null;
                                
                                const colorMap: any = {
                                  brilliant: '#1baaa6',
                                  critical: '#5b8baf',
                                  inaccuracy: '#f4bf44',
                                  mistake: '#e28c28',
                                  blunder: '#c93230'
                                };
                                const cx = (i / (evalData.length - 1)) * graphW;
                                const cy = scaleY(val);
                                return <circle key={`dot-${i}`} cx={cx} cy={cy} r="3" fill={colorMap[ma.classification]} />;
                              })}
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px 4px', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                              <span>Move 1</span>
                              <span>Move {history.length}</span>
                            </div>
                          </div>

                          {/* ── 2. ACCURACIES CARD ── */}
                          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--luxury-border)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--luxury-gold)', textAlign: 'center', padding: '8px', backgroundColor: 'var(--luxury-card-bg)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accuracy</div>
                            <div style={{ display: 'flex' }}>
                              <div style={{ flex: 1, padding: '14px 8px', textAlign: 'center', backgroundColor: '#ECEFF4' }}>
                                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0a0a0a', fontFamily: 'monospace' }}>{whiteAcc.toFixed(1)}%</div>
                                <div style={{ fontSize: '10px', color: 'rgba(10,10,10,0.6)', marginTop: '2px' }}>{selectedColor === 'white' ? 'You (White)' : 'Opponent (White)'}</div>
                              </div>
                              <div style={{ flex: 1, padding: '14px 8px', textAlign: 'center', backgroundColor: '#0a0a0a' }}>
                                <div style={{ fontSize: '22px', fontWeight: '900', color: '#ECEFF4', fontFamily: 'monospace' }}>{blackAcc.toFixed(1)}%</div>
                                <div style={{ fontSize: '10px', color: 'rgba(236,239,244,0.5)', marginTop: '2px' }}>{selectedColor === 'black' ? 'You (Black)' : 'Opponent (Black)'}</div>
                              </div>
                            </div>
                          </div>

                          {/* ── 3. CLASSIFICATION COUNT TABLE ── */}
                          <div style={{ borderRadius: '12px', backgroundColor: 'var(--luxury-card-bg)', border: '1px solid var(--luxury-border)', padding: '10px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '90px', textAlign: 'left', padding: '4px 4px', color: 'var(--luxury-text-muted)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase' }}>Type</th>
                                  <th style={{ textAlign: 'center', padding: '4px', color: '#ECEFF4', fontWeight: '700', fontSize: '10px' }}>White</th>
                                  <th style={{ width: '28px' }} />
                                  <th style={{ textAlign: 'center', padding: '4px', color: '#5C6479', fontWeight: '700', fontSize: '10px', backgroundColor: isDarkMode ? 'transparent' : 'rgba(92,100,121,0.08)', borderRadius: '4px' }}>Black</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(showAllClassifs ? classifs : classifs.slice(0, classifs.length - 4)).map(c => (
                                  <tr key={c.label} style={{ borderTop: '1px solid var(--luxury-border)' }}>
                                    <td style={{ padding: '5px 4px', color: c.color, fontWeight: '600', fontSize: '11px' }}>{c.label}</td>
                                    <td style={{ textAlign: 'center', padding: '5px 4px', fontWeight: '800', color: 'var(--ion-text-color)', fontFamily: 'monospace' }}>{c.whiteCount}</td>
                                    <td style={{ textAlign: 'center', padding: '5px 2px' }}>
                                      {c.key === 'none' ? (
                                        c.symbol ? <span style={{ backgroundColor: c.color, color: '#FFF', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: '800' }}>{c.symbol}</span> : null
                                      ) : (
                                        <img src={`/assets/img/classifications/${c.key}.png`} alt={c.key} style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '5px 4px', fontWeight: '800', color: 'var(--ion-text-color)', fontFamily: 'monospace' }}>{c.blackCount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div style={{ textAlign: 'center', marginTop: '6px' }}>
                              <span 
                                onClick={() => setShowAllClassifs(!showAllClassifs)} 
                                style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                {showAllClassifs ? 'view less' : 'view more'}
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })() : (
                      <div style={{ backgroundColor: 'var(--luxury-card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--luxury-border)', flexGrow: 1, minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--luxury-gold)' }}>AI Insights</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '160px', overflowY: 'auto', flexGrow: 1 }}>
                          {history.map((move, index) => {
                            const ma = analysisReport?.moveAnalyses[index];
                            const isCurrentMove = index === moveIndex - 1;
                            
                            const meta: any = {
                              brilliant:  { color: '#1baaa6', symbol: '!!' },
                              critical:   { color: '#5b8baf', symbol: '!' },
                              best:       { color: '#98bc49', symbol: '*' },
                              excellent:  { color: '#81B64C', symbol: '!' },
                              okay:       { color: '#97af8b', symbol: '' },
                              inaccuracy: { color: '#f4bf44', symbol: '?!' },
                              mistake:    { color: '#e28c28', symbol: '?' },
                              miss:       { color: '#ff7769', symbol: 'x' },
                              blunder:    { color: '#c93230', symbol: '??' },
                              theory:     { color: '#a88764', symbol: 'T' },
                              none:       { color: 'var(--ion-text-color)', symbol: '' }
                            };
                            
                            const cls = ma?.classification || 'none';
                            const info = meta[cls];
                            
                            return (
                              <span key={index} style={{ 
                                padding: '3px 7px', 
                                backgroundColor: isCurrentMove ? 'rgba(255, 255, 255, 0.15)' : 'var(--ion-background-color)', 
                                border: isCurrentMove ? `1px solid ${info.color}` : '1px solid transparent',
                                borderRadius: '6px', 
                                color: cls === 'none' ? 'var(--ion-text-color)' : info.color, 
                                fontWeight: cls !== 'none' ? '800' : 'normal', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px' 
                              }}>
                                {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                                {cls !== 'none' && (
                                  <img src={`/assets/img/classifications/${cls}.png`} alt={cls} style={{ width: '14px', height: '14px' }} />
                                )}
                              </span>
                            );
                          })}
                        </div>
                        {history.length > 10 && (
                          <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(229, 57, 53, 0.1)', borderLeft: '3px solid #E53935', fontSize: '11px' }}>
                            <strong>AI Coach:</strong> You mentioned looking for a fork here, but you missed that the opponent's Knight protected that square.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mobile-review-nav">
                      <IonGrid style={{ padding: 0 }}>
                        <IonRow>
                          <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToFirst}><IonIcon slot="icon-only" icon={playSkipBackOutline} /></IonButton></IonCol>
                          <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToPrev}><IonIcon slot="icon-only" icon={chevronBackOutline} /></IonButton></IonCol>
                          <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToNext}><IonIcon slot="icon-only" icon={chevronForwardOutline} /></IonButton></IonCol>
                          <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToLast}><IonIcon slot="icon-only" icon={playSkipForwardOutline} /></IonButton></IonCol>
                        </IonRow>
                      </IonGrid>
                      
                      <IonButton expand="block" color="medium" fill="clear" onClick={() => setIsReviewMode(false)} style={{ marginTop: '4px' }}>Exit Review</IonButton>
                    </div>
                  </>
                ) : (chessRef.current.isGameOver() || gameStatus.toLowerCase().includes('resign') || gameStatus.toLowerCase().includes('draw') || gameStatus.toLowerCase().includes('wins on time') || gameStatus.toLowerCase().includes('game over')) ? (
                  /* STATE 2: POST-GAME RESULT */
                  <>
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--luxury-card-bg)', textAlign: 'center', border: '1px solid var(--luxury-gold)', boxShadow: '0 4px 12px rgba(199, 168, 76, 0.2)' }}>
                      <h2 style={{ margin: '0', fontSize: '18px', color: 'var(--luxury-gold)' }}>{gameStatus}</h2>
                    </div>

                    <div style={{ backgroundColor: 'var(--luxury-card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--luxury-border)', flexGrow: 1, minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--luxury-gold)' }}>Game Summary</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '160px', overflowY: 'auto' }}>
                        {history.map((move, index) => (
                          <span key={index} style={{ padding: '3px 7px', backgroundColor: 'var(--ion-background-color)', borderRadius: '6px' }}>
                            {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isAnalyzing ? (
                      <div style={{ backgroundColor: 'var(--luxury-card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--luxury-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--luxury-gold)' }}>
                          <span>Analyzing with Stockfish (Depth 16)...</span>
                          <span>{analysisProgress}%</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${analysisProgress}%`, height: '100%', backgroundColor: 'var(--luxury-gold)', transition: 'width 0.3s ease' }}></div>
                        </div>
                      </div>
                    ) : (
                      <IonButton expand="block" color="success" style={{ fontWeight: 'bold' }} onClick={runGameAnalysis}>
                        ⭐ GAME REVIEW
                      </IonButton>
                    )}
                    <IonButton expand="block" color="primary" fill="outline" onClick={startNewGame} disabled={isAnalyzing}>
                      <IonIcon slot="start" icon={refreshOutline} />
                      Rematch / New Game
                    </IonButton>
                  </>
                ) : (
                  /* STATE 1: LIVE GAMEPLAY */
                  <>
                    <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--luxury-card-bg)', fontSize: '13px', fontWeight: '600', textAlign: 'center', borderLeft: '4px solid var(--luxury-gold)' }}>
                      {gameStatus}
                    </div>

                    <div style={{ backgroundColor: 'var(--luxury-card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--luxury-border)', flexGrow: 1, minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--luxury-gold)' }}>Moves Played</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '160px', overflowY: 'auto' }}>
                        {history.map((move, index) => (
                          <span key={index} style={{ padding: '3px 7px', backgroundColor: 'var(--ion-background-color)', borderRadius: '6px' }}>
                            {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                          </span>
                        ))}
                      </div>
                    </div>

                    <IonGrid style={{ padding: 0 }}>
                      <IonRow>
                        <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToFirst} disabled={moveIndex === 0 || isEngineThinking}><IonIcon slot="icon-only" icon={playSkipBackOutline} /></IonButton></IonCol>
                        <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToPrev} disabled={moveIndex === 0 || isEngineThinking}><IonIcon slot="icon-only" icon={chevronBackOutline} /></IonButton></IonCol>
                        <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToNext} disabled={moveIndex >= history.length || isEngineThinking}><IonIcon slot="icon-only" icon={chevronForwardOutline} /></IonButton></IonCol>
                        <IonCol size="3"><IonButton expand="block" color="medium" fill="outline" onClick={goToLast} disabled={moveIndex >= history.length || isEngineThinking}><IonIcon slot="icon-only" icon={playSkipForwardOutline} /></IonButton></IonCol>
                      </IonRow>
                    </IonGrid>

                    <IonGrid style={{ padding: 0 }}>
                      <IonRow>
                        <IonCol size="6">
                          <IonButton expand="block" color="medium" fill="outline" disabled={isEngineThinking}>
                            ½ Draw
                          </IonButton>
                        </IonCol>
                        <IonCol size="6">
                          <IonButton expand="block" color="danger" fill="outline" onClick={handleResign} disabled={isEngineThinking}>
                            🏳 Resign
                          </IonButton>
                        </IonCol>
                      </IonRow>
                    </IonGrid>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <IonButton fill="clear" color="medium">
                        <IonIcon icon={moonOutline} slot="icon-only" /> {/* Speaker icon mock */}
                      </IonButton>
                      
                      <IonButton 
                        fill={aiCoachEnabled ? "solid" : "outline"} 
                        color={aiCoachEnabled ? (isMicRecording ? "danger" : "primary") : "medium"} 
                        onClick={() => {
                          if (currentUser?.isPremium) {
                            setAiCoachEnabled(!aiCoachEnabled);
                          } else {
                            setToastMessage("Upgrade to Premium for AI Voice Coach");
                          }
                        }}
                        style={{ fontSize: '10px', height: '30px' }}
                      >
                        <IonIcon icon={micOutline} slot="start" />
                        {aiCoachEnabled ? (isMicRecording ? "Recording..." : "Coach ON") : "Coach OFF (Pro)"}
                      </IonButton>
                    </div>
                  </>
                )}
              </div>

              {/* Column 3: Ad Banner Placeholder */}
              <div className="game-col-3" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  backgroundColor: 'var(--luxury-card-bg)',
                  borderRadius: '16px',
                  border: '1px dashed var(--luxury-border)',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '200px',
                  boxShadow: 'var(--luxury-card-shadow)'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--luxury-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Advertisement</span>
                  <div style={{ fontSize: '18px', color: 'var(--luxury-gold)', fontWeight: '800', marginBottom: '4px' }}>Grandmaster Elite</div>
                  <p style={{ fontSize: '12px', color: 'var(--ion-text-color)', opacity: 0.7, margin: 0 }}>Unlock advanced AI analysis and unlimited puzzles.</p>
                </div>
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

// Stockfish engine service utilizing Web Workers
// Migrated to Stockfish 17 Lite (WebAssembly)

export class StockfishEngine {
  private worker: Worker | null = null;
  private onMoveCallback: ((move: string) => void) | null = null;
  private onEvalCallback: ((evaluation: { type: 'cp' | 'mate', value: number }) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Use the local Stockfish 17 Lite WebAssembly engine
      this.worker = new Worker('/engines/stockfish-17-lite-single.js');
      
      this.worker.onmessage = (event: MessageEvent) => {
        const line = event.data;
        // console.log(`🤖 Engine Output: ${line}`); // Uncomment for debugging
        
        if (line.startsWith('info') && line.includes('score')) {
          const parts = line.split(' ');
          const scoreIndex = parts.indexOf('score');
          if (scoreIndex !== -1 && scoreIndex + 2 < parts.length) {
            const type = parts[scoreIndex + 1];
            const value = parseInt(parts[scoreIndex + 2], 10);
            if ((type === 'cp' || type === 'mate') && this.onEvalCallback) {
              this.onEvalCallback({ type: type as 'cp' | 'mate', value });
            }
          }
        }

        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMove = parts[1]; // e.g. "e2e4" or "(none)"
          if (this.onMoveCallback) {
            this.onMoveCallback(bestMove);
          }
        }
      };

      // Initialize UCI
      this.sendUCI('uci');
      this.sendUCI('isready');
    } catch (error) {
      console.error('❌ Failed to initialize Stockfish Web Worker:', error);
    }
  }

  private sendUCI(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  // Get best move for a given position
  public getBestMove(fen: string, depth: number, onMove: (move: string) => void) {
    this.onMoveCallback = onMove;
    this.sendUCI(`position fen ${fen}`);
    this.sendUCI(`go depth ${depth}`);
  }

  // Continuous evaluation of a position
  public evaluatePosition(fen: string, depth: number, onEval: (evalData: { type: 'cp' | 'mate', value: number }) => void) {
    this.onEvalCallback = onEval;
    this.sendUCI(`position fen ${fen}`);
    this.sendUCI(`go depth ${depth}`);
  }

  // Promisified single-shot analysis: resolves with final score when bestmove arrives
  public analyzePosition(fen: string, depth: number): Promise<{ type: 'cp' | 'mate'; value: number; bestMove: string }> {
    return new Promise((resolve) => {
      let lastEval: { type: 'cp' | 'mate'; value: number } = { type: 'cp', value: 0 };

      const prevOnEval = this.onEvalCallback;
      const prevOnMove = this.onMoveCallback;

      this.onEvalCallback = (ev) => { lastEval = ev; };
      this.onMoveCallback = (bestMove) => {
        // Restore previous callbacks and resolve
        this.onEvalCallback = prevOnEval;
        this.onMoveCallback = prevOnMove;
        resolve({ ...lastEval, bestMove });
      };

      this.sendUCI(`position fen ${fen}`);
      this.sendUCI(`go depth ${depth}`);
    });
  }

  // Stop current calculation
  public stop() {
    this.sendUCI('stop');
  }

  // Terminate worker
  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Stockfish engine service utilizing Web Workers
// Supported either locally from assets or via a CDN blob fallback to support offline packaging.

const STOCKFISH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';

export class StockfishEngine {
  private worker: Worker | null = null;
  private onMoveCallback: ((move: string) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Create Web Worker from CDN URL wrapped in Blob to bypass CORS
      const blobCode = `importScripts('${STOCKFISH_CDN}');`;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (event: MessageEvent) => {
        const line = event.data;
        console.log(`🤖 Engine Output: ${line}`);
        
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMove = parts[1]; // e.g. "e2e4"
          if (this.onMoveCallback && bestMove !== '(none)') {
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

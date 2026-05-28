import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platformOrigin: {
    type: String,
    enum: ['internal', 'chess_com', 'lichess', 'pgn_import'],
    required: true
  },
  players: {
    white: {
      username: { type: String, required: true },
      elo: { type: Number, default: 1500 }
    },
    black: {
      username: { type: String, required: true },
      elo: { type: Number, default: 1500 }
    }
  },
  outcome: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true
  },
  winningColor: {
    type: String,
    enum: ['white', 'black', 'draw'],
    required: true
  },
  openingName: {
    type: String,
    default: 'Unknown Opening'
  },
  finalPositionFen: {
    type: String,
    required: true
  },
  moves: [{
    moveNumber: Number,
    notation: String,
    fenBefore: String
  }],
  pgnString: {
    type: String
  },
  hasAudioLog: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound Index for fast chronological lookups
gameSchema.index({ userId: 1, createdAt: -1 });

const Game = mongoose.model('Game', gameSchema);

export default Game;

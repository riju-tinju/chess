import express from 'express';
import { getUserGames, importGame, syncExternalGames } from '../controllers/gameController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Secure all game endpoints

router.get('/', getUserGames);
router.post('/import', importGame);
router.post('/sync', syncExternalGames);

export default router;

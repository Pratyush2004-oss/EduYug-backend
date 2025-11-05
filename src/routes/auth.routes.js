import express from 'express';
import { attemptInitialQuiz, checkAuth, getLeaderBoard, loginUser, registerUser } from '../controllers/auth.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get("/check-auth", AuthMiddleware, checkAuth);
router.post('/attempt-initial-quiz', AuthMiddleware, attemptInitialQuiz);
router.get("/get-leaderboard", AuthMiddleware, getLeaderBoard);

export default router;
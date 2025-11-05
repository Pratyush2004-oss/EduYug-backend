import express from 'express';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { completeCourseChapter, createCourse, EnrollToCourse, getAllEnrolledCourses, getAllFlashcardList, getAllQnList, getAllQuizes, getCourseById, getFlashcardContent, getQaContent, getQuizContent, getRecommendedCourses, submitQuiz } from '../controllers/course.controller.js';

const router = express.Router();
// create and enroll course route
router.post('/create-course', AuthMiddleware, createCourse);
router.post("/enroll-course", AuthMiddleware, EnrollToCourse);

// course content related routes
router.get('/get-enrolled-courses', AuthMiddleware, getAllEnrolledCourses);
router.get('/get-recommended-courses', AuthMiddleware, getRecommendedCourses);
router.get('/get-course-content/:courseId', AuthMiddleware, getCourseById);
router.put('/complete-course-chapter', AuthMiddleware, completeCourseChapter);

// quiz related routes
router.get('/get-all-course-quizes', AuthMiddleware, getAllQuizes);
router.get('/get-single-quiz/:quizId', AuthMiddleware, getQuizContent);
router.post('/quiz-submit', AuthMiddleware, submitQuiz);

// qna related routes
router.get('/get-all-course-qnas', AuthMiddleware, getAllQnList);
router.get('/get-single-qa/:qaId', AuthMiddleware, getQaContent);

// flashcard related Routes
router.get('/get-all-flashcards', AuthMiddleware, getAllFlashcardList);
router.get('/get-single-flashcard/:flashcardId', AuthMiddleware, getFlashcardContent);


export default router;
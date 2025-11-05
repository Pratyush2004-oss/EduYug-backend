import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctAns: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    }
});

const QuizModel = mongoose.model('Quiz', quizSchema);
export default QuizModel;

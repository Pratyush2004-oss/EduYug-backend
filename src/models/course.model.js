import mongoose from "mongoose";

// sub schema for chapter content
const contentSchema = new mongoose.Schema({
    code: {
        type: String
    },
    example: {
        type: String
    },
    explain: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    }
}, { _id: false });

// sub schema for chapters
const chapterSchema = new mongoose.Schema({
    chapterName: {
        type: String,
        required: true
    },
    content: [contentSchema],
}, { _id: false });

// sub schema for qa
const qaSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    }
}, { _id: false });

// sub schema for flashcards
const flashcardSchema = new mongoose.Schema({
    front: {
        type: String,
        required: true
    },
    back: {
        type: String,
        required: true
    }
}, { _id: false });

// sub schema for quiz
const quizSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [
        {
            type: String,
            required: true
        }
    ],
    correctAns: {
        type: String,
        required: true
    }
}, { _id: false });

// sub schema for quiz result
const quizResultSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    userAnswer: {
        type: String,
        required: true
    },
    correctAnswer: {
        type: String,
        required: true
    }
}, { _id: false });

// youtube video Schema
const videoSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String
    }
}, { _id: false });

// main schema for course
const courseSchema = new mongoose.Schema({
    banner_image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        required: true,
        enum: ["Easy", "Intermediate", "Advanced"]
    },
    chapters: [chapterSchema],
    completedChapter: [{
        type: Number
    }],
    courseTitle: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    description: {
        type: String,
        required: true
    },
    flashcards: [flashcardSchema],
    qa: [qaSchema],
    quiz: [quizSchema],
    quizResult: [quizResultSchema],
    quizMarks: {
        type: Number,
        default: 0
    },
    videos: [videoSchema]
}, {
    timestamps: true
});
const CourseModel = mongoose.model('Course', courseSchema);
export default CourseModel;
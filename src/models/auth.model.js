import mongoose from "mongoose";

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
    },
    category: {
        type: String,
        required: true
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    domains: [
        {
            type: String,
            required: true
        }
    ],
    quiz: [quizSchema],
    quizMarks: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    tokens: {
        type: Number,
        default: 25
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    streak: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

export const UserModel = mongoose.model('User', userSchema);
export default UserModel;
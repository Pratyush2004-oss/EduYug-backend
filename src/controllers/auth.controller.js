import expressAsyncHandler from "express-async-handler";
import UserModel from "../models/auth.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import QuizModel from "../models/quiz.model.js";

// generate token
const generateToken = (id) => {
    return jwt.sign({ id }, ENV.JWT_SECRET);
};

// register user
export const registerUser = expressAsyncHandler(async (req, res, next) => {
    try {
        const { name, email, password, domains } = req.body;
        // check  for all the fields
        if (!name || !email || !password || !domains || !Array.isArray(domains) || domains.length === 0) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // check for existing user
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        };

        // encrypt the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // generate quiz according to the domains
        const quiz = [];
        for (const domain of domains) {
            const domainQuiz = await QuizModel.aggregate([
                {
                    $match: { category: domain }
                },
                {
                    $sample: { size: 5 }
                },
                {
                    $project: { question: 1, options: 1, correctAns: 1, category: 1 }
                }
            ]);
            quiz.push(...domainQuiz);
        }

        // create the user
        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            domains,
            quiz
        });

        // generate token
        const token = generateToken(user._id);
        res.status(201).json({
            message: "User registered successfully, Now attempt the quiz",
            token,
            tokens: user.tokens,
            streak: user.streak,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                domains: user.domains,
                quizMarks: user.quizMarks,
                quiz: user.quiz,
            }
        });

    } catch (error) {
        console.log("Error in register user controller: " + error);
        next(error);
    }
});

// login controller
export const loginUser = expressAsyncHandler(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // check for validation
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // check for user
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // check for password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const userDetails = {
            _id: user._id,
            name: user.name,
            email: user.email,
            domains: user.domains,
            quizMarks: user.quizMarks,
            quiz: user.quiz
        }

        // generate the token
        const token = generateToken(user._id);

        res.status(200).json({
            message: "User logged in successfully",
            token,
            tokens: user.tokens,
            user: userDetails,
            streak: user.streak
        });
    } catch (error) {
        console.log("Error in login user controller: " + error);
        next(error);
    }

});

// check for user
export const checkAuth = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized, user not found" });
        }
        const updatedUser = await UserModel.findById(user._id).select("-password");
        res.status(200).json({
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                domains: updatedUser.domains,
                quizMarks: updatedUser.quizMarks,
                quiz: updatedUser.quiz
            },
            tokens: updatedUser.tokens,
            streak: updatedUser.streak
        });

    } catch (error) {
        console.log("Error in check-user controller: " + error);
        next(error);
    }
});

// attempt Initial Quiz
export const attemptInitialQuiz = expressAsyncHandler(async (req, res, next) => {
    try {
        const { quizMarks } = req.body;
        const user = req.user;
        const userToUpdate = await UserModel.findById(user._id);
        if (!userToUpdate) {
            return res.status(401).json({ message: "Unauthorized, user not found" });
        }
        userToUpdate.quiz = undefined;
        userToUpdate.quizMarks = quizMarks;
        userToUpdate.tokens += quizMarks;
        await userToUpdate.save();
        res.status(200).json({ message: "Quiz attempted successfully" });
    } catch (error) {
        console.log("Error in attempt-initial-quiz controller: " + error);
        next(error);
    }
});

// get leader Board
export const getLeaderBoard = expressAsyncHandler(async (req, res, next) => {
    try {
        const users = await UserModel.aggregate([
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    tokens: 1
                }
            },
            {
                $sort: { tokens: -1 }
            }
        ]);
        res.status(200).json({ users });
    } catch (error) {
        console.log("Error in get-leader-board controller: " + error);
        next(error);
    }
});
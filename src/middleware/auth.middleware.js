import expressAsyncHandler from "express-async-handler";
import { ENV } from "../config/env.js";
import jwt from "jsonwebtoken";
import UserModel from "../models/auth.model.js";

// auth middleware
export const AuthMiddleware = expressAsyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            // verify token 
            const decoded = jwt.verify(token, ENV.JWT_SECRET);

            // finding the user
            if (!decoded) {
                return res.status(401).json({ message: "Invalid token, access denied" });
            }
            const user = await UserModel.findById(decoded.id)
                .select("-password")
            if (!user) {
                return res.status(401).json({ message: "Unauthorized, user not found" });
            }
            req.user = {
                _id: user._id,
                name: user.name,
                email: user.email,
                domains: user.domains,
                quizMarks: user.quizMarks
            };
            next();
        } catch (error) {
            return res.status(401).json({ message: "Invalid token, access denied" });
        }
    } catch (error) {
        console.log("Error in auth middleware: " + error);
        next(error);
    }
})
import expressAsyncHandler from "express-async-handler";
import { chatWithGemini } from "../config/AI-Config.js";
import { getCourseLevel } from "../config/getCourseLevel.js";
import CourseModel from "../models/course.model.js";
import fetchYoutubeData from "../config/YoutubeConfig.js";
import UserModel from "../models/auth.model.js";

const getBannerImage = (category) => {
    const bannerImage = category.replaceAll(" ", "-");
    return `${bannerImage}-${Math.floor(Math.random() * 6) + 1}.png`;
}

// create course controller
export const createCourse = expressAsyncHandler(async (req, res, next) => {
    try {
        const { userInput } = req.body;
        const user = req.user;

        const fetchedUser = await UserModel.findById(user._id);
        if (!fetchedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!userInput) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // check whether user have enough tokens to create the course
        if (fetchedUser.tokens < 10) {
            return res.status(403).json({ message: "You don't have enough tokens to create a course" });
        }

        // if the course title is already in the database
        const exisingCourses = await CourseModel.find({ courseTitle: userInput });
        if (exisingCourses.length > 0) {
            for (let crs of exisingCourses) {
                if (crs.createdBy && crs.createdBy.toString() === user._id.toString()) {
                    return res.status(200).json({
                        message: "You have already created this course"
                    });
                }
            }
            // enroll to the course
            const template = exisingCourses[0];
            await CourseModel.create({
                banner_image: template.banner_image,
                courseTitle: template.courseTitle,
                category: template.category,
                chapters: template.chapters,
                createdBy: user._id,
                quiz: template.quiz,
                flashcards: template.flashcards,
                qa: template.qa,
                difficulty: template.difficulty,
                description: template.description,
                videos: template.videos
            })
            // deduce the tokens from the user
            fetchedUser.tokens -= 10;
            await fetchedUser.save();
            return res.status(200).json({
                message: "Course created successfully", tokens: fetchedUser.tokens
            });
        }

        // otherwise create a new course
        const aiResponse = await chatWithGemini(userInput);
        if (!aiResponse) {
            return res.status(500).json({ message: "AI didn't respond" });

        }

        // aiResponse may be already object or JSON string; normalize
        let parsed;
        try {
            parsed = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
        } catch (err) {
            console.error("Failed to parse Gemini response:", err);
            return res.status(500).json({ message: "Invalid JSON from AI" });
        }

        // Extract course object from possible shapes:
        // { courses: [ { ... } ] } or { ...course fields... }
        let courseObj = null;
        if (Array.isArray(parsed.courses) && parsed.courses.length > 0) {
            courseObj = parsed.courses[0];
        } else if (parsed.course) {
            courseObj = parsed.course;
        } else if (parsed && typeof parsed === "object") {
            courseObj = parsed;
        }

        if (!courseObj || !courseObj.courseTitle) {
            console.error("Parsed AI response missing course object or title:", parsed);
            return res.status(500).json({ message: "AI response missing course data" });
        }

        // ensure banner image derived from category if not provided
        const banner = courseObj.banner_image || getBannerImage(courseObj.category || "general");

        // get the video link for the course
        const videoData = await fetchYoutubeData(courseObj.courseTitle);

        // create course with current user as creator
        const newCourse = new CourseModel({
            banner_image: banner,
            courseTitle: courseObj.courseTitle,
            category: courseObj.category,
            chapters: courseObj.chapters || [],
            createdBy: req.user._id,
            quiz: courseObj.quiz || [],
            flashcards: courseObj.flashcards || [],
            qa: courseObj.qa || [],
            difficulty: courseObj.difficulty || "Easy",
            description: courseObj.description || "",
            videos: videoData
        });
        await newCourse.save();
        // deduce the tokens from the user
        fetchedUser.tokens -= 10;
        await fetchedUser.save();

        return res.status(200).json({ message: "Course created successfully", tokens: fetchedUser.tokens });
    } catch (error) {
        console.log("Error in create course controller: " + error);
        next(error);
    }
});

// enroll to the course
export const EnrollToCourse = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const { courseId } = req.body;

        // check for the user
        const fetchedUser = await UserModel.findById(user._id);
        // check whether the fetched user have enough tokens to enroll to the course
        if (!fetchedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        if (fetchedUser.tokens < 5) {
            return res.status(403).json({ message: "You don't have enough tokens to enroll to the course" });
        }

        // check for the couse with same title and category
        const existingCourse = await CourseModel.findOne({ courseTitle: course.courseTitle, category: course.category, createdBy: user._id });
        if (existingCourse) {
            return res.status(200).json({
                message: "You have already enrolled to this course",
                courseId: existingCourse._id,
                completedChapter: existingCourse.completedChapter,
                tokens: fetchedUser.tokens
            });
        }

        // create a new course with similar content but now for the current user
        const newCourse = await CourseModel.create({
            banner_image: course.banner_image,
            courseTitle: course.courseTitle,
            category: course.category,
            chapters: course.chapters,
            createdBy: user._id,
            quiz: course.quiz,
            flashcards: course.flashcards,
            qa: course.qa,
            difficulty: course.difficulty,
            description: course.description,
            videos: course.videos
        })

        // update the user tokens
        fetchedUser.tokens -= 5;
        await fetchedUser.save();

        res.status(200).json({
            message: "Enrolled to the course successfully",
            courseId: newCourse._id,
            completedChapter: newCourse.completedChapter,
            tokens: fetchedUser.tokens
        });
    } catch (error) {
        console.log("Error in Enrolling to the course" + error);
        next(error);
    }
});

// get all the enrolled courses for the user
export const getAllEnrolledCourses = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const courses = await CourseModel.aggregate([
            {
                $match: { createdBy: { $eq: user._id } }
            },
            {
                $project: {
                    _id: 1,
                    courseTitle: 1,
                    banner_image: 1,
                    category: 1,
                    chaptersCount: { $size: "$chapters" },
                    completedChaptersCount: { $size: "$completedChapter" },
                    createdAt: 1,
                    difficulty: 1
                }
            },
            {
                $sort: { completedChaptersCount: 1 }
            }
        ]);
        res.status(200).json({ courses });
    } catch (error) {
        console.log("Error in get all enrolled courses controller: " + error);
        next(error);
    }
});

// get course by id
export const getCourseById = expressAsyncHandler(async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const course = await CourseModel.findById(courseId).select("chapters completedChapter -_id description videos");
        if (!course) return res.status(404).json({ message: "Course not found" });
        res.status(200).json({ course });
    } catch (error) {
        console.log("Error in get course by id controller: " + error);
        next(error);
    }
});

// complete course chapter
export const completeCourseChapter = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const { courseId, chapterId } = req.body;

        const course = await CourseModel.findById(courseId);

        // get the user that is to be updated
        const userToUpdate = await UserModel.findById(user._id);
        if(!userToUpdate) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        if (!course.createdBy) {
            return res.status(404).json({ message: "Course not found" });
        }
        // check if the user have the access for the course
        if (course.createdBy.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "You don't have access to this course" });
        }
        // check if the chapter is already completed
        if (course.completedChapter.includes(chapterId)) {
            return res.status(200).json({ message: "Chapter already completed" });
        }

        course.completedChapter.push(chapterId);

         // ===== STREAK LOGIC =====
        // Behavior:
        // - if lastActive is the same calendar day -> do nothing (already active today)
        // - if lastActive is exactly yesterday (previous calendar day) -> streak += 1
        // - otherwise (missed one or more days) -> reset streak to 0
        // After evaluation we update lastActive to now.
        const now = new Date();
        const lastActive = userToUpdate.lastActive ? new Date(userToUpdate.lastActive) : null;

        const isSameCalendarDay = lastActive &&
            lastActive.getFullYear() === now.getFullYear() &&
            lastActive.getMonth() === now.getMonth() &&
            lastActive.getDate() === now.getDate();

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = lastActive &&
            lastActive.getFullYear() === yesterday.getFullYear() &&
            lastActive.getMonth() === yesterday.getMonth() &&
            lastActive.getDate() === yesterday.getDate();

        if (isSameCalendarDay) {
            // already active today -> no change to streak
        } else if (isYesterday) {
            // consecutive day -> increment streak
            userToUpdate.streak = (userToUpdate.streak || 0) + 1;
        } else {
            // missed at least one day -> reset streak to 0
            userToUpdate.streak = 0;
        }

        // update lastActive to now (mark activity)
        userToUpdate.lastActive = now;
        // ===== END STREAK LOGIC =====

        await course.save();
        await userToUpdate.save();
        res.status(200).json({ message: "Chapter completed successfully", streak: userToUpdate.streak });
    } catch (error) {
        console.log("Error in complete course chapter controller: " + error);
        next(error);
    }
});

// get recommended Courses
export const getRecommendedCourses = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const courses = [];
        const userCourses = await CourseModel.aggregate([
            { $match: { createdBy: user._id } },
            { $project: { courseTitle: 1 } },
        ]);
        const difficulty = getCourseLevel(user.quizMarks);

        // helper to build a domain pipeline that de-duplicates by title (case-insensitive)
        const buildDomainPipeline = (domain) => [
            { $match: { category: domain, courseTitle: { $nin: userCourses.map((c) => c.courseTitle) }, difficulty: { $in: difficulty } } },
            // normalize title and mark ownership so we can prefer user's own course (if present)
            { $addFields: { courseTitleLower: { $toLower: "$courseTitle" }, owned: { $cond: [{ $eq: ["$createdBy", user._id] }, 1, 0] } } },
            // prefer owned courses and newest ones
            { $sort: { owned: -1, createdAt: -1 } },
            // group by normalized title to dedupe across createdBy
            { $group: { _id: "$courseTitleLower", doc: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            // random sample after grouping (ensures unique titles)
            { $sample: { size: 5 } },
            // project only needed fields
            { $project: { _id: 1, courseTitle: 1, banner_image: 1, difficulty: 1, chaptersCount: { $size: "$chapters" }, category: 1 } },
        ];

        for (const domain of user.domains) {
            const domainCourses = await CourseModel.aggregate(buildDomainPipeline(domain));
            courses.push({ domain, courses: domainCourses });
        }

        // Miscellaneous: pick courses not created by user and dedupe by title as well
        const miscPipeline = [
            { $match: { createdBy: { $ne: user._id } } },
            { $addFields: { courseTitleLower: { $toLower: "$courseTitle" } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$courseTitleLower", doc: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sample: { size: 5 } },
            { $project: { _id: 1, courseTitle: 1, banner_image: 1, chaptersCount: { $size: "$chapters" }, difficulty: 1, category: 1 } },
        ];
        const miscellaneous = await CourseModel.aggregate(miscPipeline);
        courses.push({ domain: "Miscellaneous", courses: miscellaneous });

        res.status(200).json({ courses });
    } catch (error) {
        console.log("Error in get recommended courses controller: " + error);
        next(error);
    }
});

// get all FlashcardList
export const getAllFlashcardList = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const flashcards = await CourseModel.aggregate([
            {
                $match: { createdBy: user._id },
            },
            {
                $project: {
                    _id: 1,
                    courseTitle: 1,
                    flashcardsCount: { $size: "$flashcards" },
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);
        res.status(200).json({ flashcards });
    } catch (error) {
        console.log("Error in getAllFlashcardList controller");
        next(error);
    }
});

// get flashcard of the course by id
export const getFlashcardContent = expressAsyncHandler(async (req, res, next) => {
    try {
        const { flashcardId } = req.params;
        const flashcardDetail = await CourseModel.findById(flashcardId).select("flashcards -_id");
        if (!flashcardDetail) return res.status(404).json({ message: "Flashcard not found" });
        res.status(200).json({ flashcardDetail: flashcardDetail.flashcards });
    } catch (error) {
        console.log("Error in getFlashcardContent controller");
        next(error);
    }
});

// get all qa list of the course
export const getAllQnList = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const qas = await CourseModel.aggregate([
            {
                $match: { createdBy: user._id },
            },
            {
                $project: {
                    _id: 1,
                    courseTitle: 1,
                    qaCount: { $size: "$qa" },
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);
        res.status(200).json({ qas });
    } catch (error) {
        console.log("Error in getAllQnList controller" + error);
        next(error);
    }
});

// get qa by course Id
export const getQaContent = expressAsyncHandler(async (req, res, next) => {
    try {
        const { qaId } = req.params;
        const qaDetail = await CourseModel.findById(qaId).select("qa -_id");
        res.status(200).json({ qaDetail: qaDetail.qa });
    } catch (error) {
        console.log("Error in getQnContent controller" + error);
        next(error);
    }
});

// get all quizes of the courses enrolled by the user
export const getAllQuizes = expressAsyncHandler(async (req, res, next) => {
    try {
        const user = req.user;
        const quizes = await CourseModel.aggregate([
            {
                $match: { createdBy: user._id },
            },
            {
                $project: {
                    _id: 1,
                    courseTitle: 1,
                    quizesCount: { $size: "$quiz" },
                    quizesResult: {
                        $size: {
                            $filter: {
                                input: "$quizResult",
                                as: "quizResult",
                                cond: { $eq: ["$$quizResult.isCorrect", true] }
                            }
                        }
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ])
        res.status(200).json({ quizes });
    } catch (error) {
        console.log("Error in getAllQuizes controller : " + error.message);
        next(error);
    }
});

// get quiz by courseid
export const getQuizContent = expressAsyncHandler(async (req, res, next) => {
    try {
        const { quizId } = req.params;
        const quizDetail = await CourseModel.findById(quizId).select("quiz -_id");
        res.status(200).json({ quizDetail: quizDetail.quiz });
    } catch (error) {
        console.log("Error in getQnContent controller");
        next(error);
    }
});

// submit quiz
export const submitQuiz = expressAsyncHandler(async (req, res, next) => {
    try {
        const { quizResult, quizId, marks } = req.body;
        if (!quizResult || !quizId || !Array.isArray(quizResult) || !quizResult.length) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const user = req.user;

        // update the token value of the current user also in the database
        const userToUpdate = await UserModel.findById(user._id);
        if (!userToUpdate) {
            return res.status(404).json({ message: "User not found" });
        }
        const result = await CourseModel.findOne({ _id: quizId, createdBy: user._id });
        if (!result) {
            return res.status(404).json({ message: "Course not found" });
        }

        // update tokens if improved marks
        if (typeof marks === "number" && marks > (result.quizMarks || 0)) {
            userToUpdate.tokens += (marks - (result.quizMarks || 0));
        }

        // ===== STREAK LOGIC =====
        // Behavior:
        // - if lastActive is the same calendar day -> do nothing (already active today)
        // - if lastActive is exactly yesterday (previous calendar day) -> streak += 1
        // - otherwise (missed one or more days) -> reset streak to 0
        // After evaluation we update lastActive to now.
        const now = new Date();
        const lastActive = userToUpdate.lastActive ? new Date(userToUpdate.lastActive) : null;

        const isSameCalendarDay = lastActive &&
            lastActive.getFullYear() === now.getFullYear() &&
            lastActive.getMonth() === now.getMonth() &&
            lastActive.getDate() === now.getDate();

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = lastActive &&
            lastActive.getFullYear() === yesterday.getFullYear() &&
            lastActive.getMonth() === yesterday.getMonth() &&
            lastActive.getDate() === yesterday.getDate();

        if (isSameCalendarDay) {
            // already active today -> no change to streak
        } else if (isYesterday) {
            // consecutive day -> increment streak
            userToUpdate.streak = (userToUpdate.streak || 0) + 1;
        } else {
            // missed at least one day -> reset streak to 0
            userToUpdate.streak = 0;
        }

        // update lastActive to now (mark activity)
        userToUpdate.lastActive = now;
        // ===== END STREAK LOGIC =====

        // persist quiz result & marks on the course doc
        result.quizResult = quizResult;
        result.quizMarks = marks;
        await result.save();
        await userToUpdate.save();

        res.status(200).json({ "message": "Quiz submitted successfully", tokens: userToUpdate.tokens, streak: userToUpdate.streak });
    } catch (error) {
        console.log("Error in submit Quiz controller : " + error.message);
        next(error);
    }
});

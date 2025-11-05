// ...existing code...
import CourseModel from "../models/course.model.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./env.js";
// ...existing code...

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "datanew.json");

async function seed({ wipe = false } = {}) {
  const MONGO_URI = ENV.MONGO_URI;
  if (!MONGO_URI) {
    console.error("MONGO_URI / DATABASE_URL not found in environment (.env)");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected to MongoDB");

  const raw = fs.readFileSync(DATA_FILE, "utf8");
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse JSON file:", DATA_FILE, err);
    process.exit(1);
  }

  // payload may be an array of { courses: [...] } or an object with courses array
  let courses = [];
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (Array.isArray(entry.courses)) {
        courses.push(...entry.courses);
      } else if (entry && typeof entry === "object" && entry.course) {
        courses.push(entry.course);
      }
    }
  } else if (payload && Array.isArray(payload.courses)) {
    courses = payload.courses;
  } else {
    console.warn("No courses array found in datanew.json");
  }

  if (courses.length === 0) {
    console.log("No courses to seed. Exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (wipe) {
    // remove all the courses with `createdBy` is null
    await CourseModel.deleteMany({ createdBy: { $exists: false } });
    console.log("Existing courses removed (wipe)");
  }

  const getBannerImage = (category) => {
    if (!category) return `banner-${Math.floor(Math.random() * 6) + 1}.png`;
    const bannerImage = String(category).replaceAll(" ", "-");
    return `${bannerImage}-${Math.floor(Math.random() * 6) + 1}.png`;
  };

  for (const course of courses) {
    try {
      // Ensure course has a courseTitle
      if (!course || !course.courseTitle) {
        console.warn("Skipping course without courseTitle:", course);
        continue;
      }

      // Prepare upsert payload; provide defaults where sensible
      const toUpsert = {
        ...course,
        banner_image: getBannerImage(course.category),
      };

      // Upsert by unique courseTitle so seeding is idempotent
      await CourseModel.updateOne(
        { courseTitle: course.courseTitle },
        { $set: toUpsert },
        { upsert: true }
      );

      console.log("Upserted:", course.courseTitle);
    } catch (err) {
      console.error("Failed to upsert:", course.courseTitle ?? "(no title)", err);
    }
  }

  await mongoose.disconnect();
  console.log("Seeding complete");
  process.exit(0);
}

// allow `--wipe` flag to clear collection first
const wipeFlag = process.argv.includes("--wipe");
seed({ wipe: wipeFlag }).catch((err) => {
  console.error(err);
  process.exit(1);
});
// ...existing code...
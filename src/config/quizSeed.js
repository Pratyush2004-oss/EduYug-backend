// ...existing code...
import QuizModel from "../models/quiz.model.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./env.js";
// ...existing code...

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "quizzes_extracted.json");

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function seedToSeedCollection(quizzes) {
  const seedSchema = new mongoose.Schema({}, { strict: false, collection: "seed" });
  const SeedModel = mongoose.models.Seed || mongoose.model("Seed", seedSchema);
  await SeedModel.deleteMany({ type: "quiz" });
  const docs = quizzes.map((q, i) => ({ type: "quiz", index: i, payload: q, seededAt: new Date() }));
  if (docs.length === 0) return;
  await SeedModel.insertMany(docs);
  console.log(`Inserted ${docs.length} docs into seed collection`);
}

function normalizeString(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

async function seed({ wipe = false } = {}) {
  const MONGO_URI = ENV.MONGO_URI;
  if (!MONGO_URI) {
    console.error("MONGO_URI / DATABASE_URL not found in environment (.env)");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected to MongoDB");

  const raw = fs.readFileSync(DATA_FILE, "utf8");
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse quizzes.json:", err);
    await mongoose.disconnect();
    process.exit(1);
  }

  const quizzes = Array.isArray(payload) ? payload : Array.isArray(payload.courses) ? payload.courses : [];
  if (quizzes.length === 0) {
    console.log("No quizzes found in quizzes.json");
    await mongoose.disconnect();
    process.exit(0);
  }

  // collect pools for distractors
  const answersPool = [];
  const optionsPool = [];

  for (const q of quizzes) {
    if (q && q.correctAns) answersPool.push(normalizeString(q.correctAns));
    if (Array.isArray(q.options)) {
      q.options.forEach((o) => {
        const s = normalizeString(o);
        if (s) optionsPool.push(s);
      });
    }
  }

  // ensure some fallback distractors
  const fallbackDistractors = ["None of the above", "All of the above", "Not sure", "Both A and B"];

  // prepare docs
  const validDocs = [];
  const skipped = [];

  for (let i = 0; i < quizzes.length; i++) {
    const rawQ = quizzes[i];
    const question = normalizeString(rawQ.question);
    const correctAns = normalizeString(rawQ.correctAns);
    const category = normalizeString(rawQ.category) || "General";

    if (!question || !correctAns) {
      skipped.push({ index: i, reason: "missing question or correctAns" });
      continue;
    }

    // start with provided options (filtered)
    const provided = Array.isArray(rawQ.options)
      ? rawQ.options.map((o) => normalizeString(o)).filter(Boolean)
      : [];

    const optionsSet = new Set(provided);
    optionsSet.add(correctAns); // ensure correct answer is present

    // fill with distractors until have 4 options
    const candidates = [...new Set([...optionsPool, ...answersPool, ...fallbackDistractors])].filter(
      (c) => c && c !== correctAns
    );

    let cIdx = 0;
    while (optionsSet.size < 4 && cIdx < candidates.length) {
      optionsSet.add(candidates[cIdx]);
      cIdx++;
    }

    // if still less than 4, pad with generic entries
    while (optionsSet.size < 4) {
      optionsSet.add(`Option ${optionsSet.size + 1}`);
    }

    const optionsArr = shuffleArray(Array.from(optionsSet));

    // ensure schema fields match your model: question, options (array), correctAns, category
    validDocs.push({
      question,
      options: optionsArr,
      correctAns,
      category,
    });
  }

  if (wipe) {
    await QuizModel.deleteMany({});
    console.log("Existing quizzes removed");
  }

  if (validDocs.length === 0) {
    console.log("No valid quiz documents to insert after normalization.");
  } else {
    try {
      // bulk insert
      const inserted = await QuizModel.insertMany(validDocs, { ordered: false });
      console.log(`Inserted ${inserted.length} quizzes`);
    } catch (err) {
      // partial failures possible; log summary
      console.error("Insert error (some docs may have failed):", err.message || err);
    }
  }

  // also write to generic seed collection for tracking
  try {
    await seedToSeedCollection(quizzes);
  } catch (err) {
    console.error("Failed to seed 'seed' collection:", err);
  }

  await mongoose.disconnect();
  console.log(`Seeding complete. valid: ${validDocs.length}, skipped: ${skipped.length}`);
  process.exit(0);
}

// allow `--wipe` flag
const wipeFlag = process.argv.includes("--wipe");
seed({ wipe: wipeFlag }).catch((err) => {
  console.error(err);
  process.exit(1);
});
// ...existing code...
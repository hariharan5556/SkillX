import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createRequire } from "module";
import { 
  saveApplicationToSupabase, 
  updateApplicationInSupabase,
  uploadResumeToSupabase,
  saveVerificationQuestions
} from "./supabase-client.js";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ dest: "uploads/" });

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Database initialization
const db = new Database("skillmatch.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT,
    required_languages TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    resume_text TEXT,
    extracted_skills TEXT,
    languages TEXT,
    match_score INTEGER,
    assessment_score INTEGER DEFAULT 0,
    overall_score INTEGER DEFAULT 0,
    sent_to_admin INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS verification_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER,
    question TEXT,
    expected_answer_logic TEXT,
    skill_targeted TEXT,
    FOREIGN KEY(candidate_id) REFERENCES candidates(id)
  );
  
  CREATE TABLE IF NOT EXISTS pending_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    job_id INTEGER,
    resume_text TEXT,
    extracted_skills TEXT,
    languages TEXT,
    match_score INTEGER,
    questions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  );
`);

// Backfill columns for older databases.
const candidateColumns = db.prepare("PRAGMA table_info(candidates)").all() as Array<{ name: string }>;
if (!candidateColumns.some((c) => c.name === "sent_to_admin")) {
  db.exec("ALTER TABLE candidates ADD COLUMN sent_to_admin INTEGER DEFAULT 0");
}
const jobColumns = db.prepare("PRAGMA table_info(jobs)").all() as Array<{ name: string }>;
if (!jobColumns.some((c) => c.name === "status")) {
  db.exec("ALTER TABLE jobs ADD COLUMN status TEXT DEFAULT 'active'");
}

// Seed some jobs if empty
const jobCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };
if (jobCount.count === 0) {
  const insertJob = db.prepare("INSERT INTO jobs (title, description, required_skills, required_languages) VALUES (?, ?, ?, ?)");
  insertJob.run("Senior Frontend Engineer", "Expert in React, TypeScript, and Tailwind CSS.", "React, TypeScript, Tailwind CSS, Vite, UI/UX", "English");
  insertJob.run("Backend Developer", "Node.js expert with database experience.", "Node.js, Express, SQLite, PostgreSQL, Redis", "English");
  insertJob.run("AI Specialist", "Experience with LLMs and prompt engineering.", "Python, Gemini API, OpenAI, Machine Learning, NLP", "English, Python");
}

app.use(express.json());

// AI Service (optional - submission still works without it)
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// API Routes
app.get("/api/jobs", (req: any, res: any) => {
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
  res.json(jobs);
});

app.post("/api/upload-resume", upload.single("resume"), async (req: any, res: any) => {
  try {
    const { name, email, jobId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let resumeContent = "";
    if (file.mimetype === "application/pdf") {
      try {
        const dataBuffer = fs.readFileSync(file.path);
        const parsePdf = typeof pdf === "function" ? pdf : pdf.default;
        if (typeof parsePdf !== "function") {
          throw new Error("PDF parser is not a function");
        }
        const data = await parsePdf(dataBuffer);
        resumeContent = data.text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        resumeContent = fs.readFileSync(file.path, "utf-8");
      }
    } else {
      resumeContent = fs.readFileSync(file.path, "utf-8");
    }

    // Get job details
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as any;
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // STEP 1: Extract skills and languages (Gemini first, fallback heuristic)
    console.log(`📄 Analyzing resume for ${name}...`);
    const knownLanguages = ["english", "tamil", "hindi", "malayalam", "kannada", "telugu", "spanish", "french", "german"];
    const rawResume = (resumeContent || "").toLowerCase();
    let skills = "No skills found";
    let detectedLanguages: string[] = [];
    let primaryLanguage = "English";

    if (ai) {
      try {
        const extractionResponse = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: `Analyze this resume comprehensively:
          1. Extract all professional skills (technical and soft skills)
          2. Identify ALL languages mentioned or used in the resume (spoken languages like English, Spanish, French, etc.)
          3. Detect the primary language of the resume text itself
          
          Resume Text:
          ${resumeContent}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                skills: { type: Type.STRING },
                languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                primary_language: { type: Type.STRING }
              },
              required: ["skills", "languages", "primary_language"]
            }
          }
        });

        const extractionData = JSON.parse(extractionResponse.text || "{}");
        skills = extractionData.skills || skills;
        detectedLanguages = extractionData.languages || detectedLanguages;
        primaryLanguage = extractionData.primary_language || primaryLanguage;
      } catch (aiError) {
        console.error("⚠️ Gemini extraction failed, using fallback extraction:", aiError);
      }
    }

    if (skills === "No skills found") {
      // Fallback: infer from job required skills and resume text overlap.
      const requiredSkills = (job.required_skills || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const matched = requiredSkills.filter((s: string) => rawResume.includes(s.toLowerCase()));
      skills = (matched.length ? matched : requiredSkills).join(", ") || "General skills";
    }

    if (!detectedLanguages.length) {
      detectedLanguages = knownLanguages
        .filter((l) => rawResume.includes(l))
        .map((l) => l.charAt(0).toUpperCase() + l.slice(1));
      if (!detectedLanguages.length) {
        detectedLanguages = [(job.required_languages || "English").split(",")[0].trim() || "English"];
      }
    }

    const languagesStr = detectedLanguages.join(", ");

    console.log(`✅ Extracted Skills: ${skills}`);
    console.log(`🌐 Detected Languages: ${languagesStr}`);
    console.log(`📝 Primary Language: ${primaryLanguage}`);

    // STEP 2: Calculate language-aware match score
    const jobSkills = job.required_skills.toLowerCase().split(",").map((s: string) => s.trim());
    const candidateSkills = skills.toLowerCase().split(",").map((s: string) => s.trim());
    const jobLanguages = (job.required_languages || "English").toLowerCase().split(",").map((l: string) => l.trim());
    const candidateLanguages = detectedLanguages.map((l: string) => l.toLowerCase().trim());

    // Skill match calculation
    const skillMatches = candidateSkills.filter((s: string) => 
      jobSkills.some(js => js.includes(s) || s.includes(js))
    );
    const skillMatchPercent = Math.round((skillMatches.length / jobSkills.length) * 100);

    // Language match calculation
    const languageMatches = candidateLanguages.filter((l: string) => 
      jobLanguages.some(jl => jl.includes(l) || l.includes(jl))
    );
    const languageMatchPercent = Math.round((languageMatches.length / jobLanguages.length) * 100);

    // Combined match score (70% skills, 30% languages)
    const matchScore = Math.round((skillMatchPercent * 0.7) + (languageMatchPercent * 0.3));

    console.log(`📊 Skill Match: ${skillMatchPercent}%, Language Match: ${languageMatchPercent}%, Overall Match: ${matchScore}%`);

    // STEP 3: Skip assessment - Save directly to candidates (admin portal)
    console.log(`💾 Saving candidate directly to admin portal...`);
    
    const insertCandidate = db.prepare(
      "INSERT INTO candidates (name, email, resume_text, extracted_skills, languages, match_score, assessment_score, overall_score, sent_to_admin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'submitted')"
    );
    const candidateResult = insertCandidate.run(
      name,
      email,
      resumeContent,
      skills,
      languagesStr,
      matchScore,
      0,
      matchScore
    );
    const candidateId = candidateResult.lastInsertRowid;

    // STEP 4: Save to Supabase (including file upload)
    let supabaseApplicationId = null;
    try {
      // Upload resume file to Supabase Storage
      const fileBuffer = fs.readFileSync(file.path);
      const { fileName: supabaseFileName, url: resumeUrl } = await uploadResumeToSupabase(
        fileBuffer,
        file.originalname,
        file.mimetype
      );

      // Save application data to Supabase
      const supabaseData = {
        name,
        email,
        job_id: parseInt(jobId),
        job_title: job.title,
        resume_file_name: supabaseFileName,
        resume_file_url: resumeUrl,
        resume_text: resumeContent,
        extracted_skills: skills,
        detected_languages: languagesStr,
        primary_language: primaryLanguage,
        match_score: matchScore,
        skill_match_percent: skillMatchPercent,
        language_match_percent: languageMatchPercent,
        status: 'submitted',
        sent_to_admin: true
      };

      const supabaseApp = await saveApplicationToSupabase(supabaseData);
      supabaseApplicationId = supabaseApp.id;

      console.log(`💾 Application saved to Supabase (ID: ${supabaseApplicationId})`);
    } catch (supabaseError) {
      console.error('⚠️  Supabase save failed, continuing with SQLite only:', supabaseError);
    }

    console.log(`✅ Candidate submitted to admin portal (ID: ${candidateId})`);

    // STEP 5: Return success - no assessment needed
    res.json({
      success: true,
      candidateId,
      supabaseId: supabaseApplicationId,
      matchScore,
      skillMatchPercent,
      languageMatchPercent,
      detectedLanguages: languagesStr,
      name,
      email,
      message: "Matches are found. Your application has been submitted successfully.",
      adminPortalUrl: "http://localhost:3001",
      savedToSupabase: !!supabaseApplicationId
    });

  } catch (error) {
    console.error("Error processing resume:", error);
    res.status(500).json({ error: "Failed to process resume" });
  }
});

// NEW ENDPOINT: Submit assessment answers
app.get("/api/admin/candidates", (req: any, res: any) => {
  const candidates = db.prepare(`
    SELECT c.id, c.name, c.email, c.extracted_skills, c.languages, c.match_score, c.assessment_score, c.overall_score, c.status, c.created_at, c.resume_text,
           GROUP_CONCAT(json_object('question', q.question, 'skill', q.skill_targeted, 'result', q.expected_answer_logic), '||') as questions_data
    FROM candidates c
    LEFT JOIN verification_questions q ON c.id = q.candidate_id
    WHERE c.sent_to_admin = 1
    GROUP BY c.id
    ORDER BY c.overall_score DESC, c.created_at DESC
  `).all();
  
  // Parse questions_data into proper format
  const formattedCandidates = (candidates as any[]).map(c => ({
    ...c,
    questions_detail: c.questions_data ? c.questions_data.split('||').map(q => {
      try {
        return JSON.parse(q);
      } catch {
        return { question: q, skill: 'Unknown', result: '' };
      }
    }) : []
  }));
  
  res.json(formattedCandidates);
});

app.get("/api/candidate/:id", (req: any, res: any) => {
  const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id);
  const questions = db.prepare("SELECT * FROM verification_questions WHERE candidate_id = ?").all();
  res.json({ candidate, questions });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ ERROR: Port ${PORT} is already in use.`);
      console.error(`Please stop the other process or change the PORT in server.ts`);
      process.exit(1);
    } else {
      console.error('Server error:', error);
      throw error;
    }
  });
}

startServer();

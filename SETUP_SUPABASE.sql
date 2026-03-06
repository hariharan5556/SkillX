-- ============================================
-- COMPLETE SUPABASE SETUP SQL
-- For Skill X Application (Both Main App & Admin Portal)
-- ============================================
-- INSTRUCTIONS:
-- 1. Go to https://sridopqtpjqgicmrinle.supabase.co
-- 2. Click "SQL Editor" in left sidebar
-- 3. Click "New query"
-- 4. Copy ALL of this SQL and paste it
-- 5. Click "Run" button
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: applications
-- Stores ALL candidate applications (used by both hosts)
-- ============================================
DROP TABLE IF EXISTS applications CASCADE;

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  job_title TEXT,
  
  -- Resume Files
  resume_file_name TEXT,
  resume_file_url TEXT,
  resume_text TEXT,
  
  -- AI Analysis
  extracted_skills TEXT,
  detected_languages TEXT,
  primary_language TEXT,
  
  -- Scores
  match_score INTEGER DEFAULT 0,
  skill_match_percent INTEGER DEFAULT 0,
  language_match_percent INTEGER DEFAULT 0,
  assessment_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending',
  sent_to_admin BOOLEAN DEFAULT FALSE,
  
  -- Assessment Data (JSON)
  assessment_questions JSONB,
  assessment_answers JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABLE 2: jobs
-- Job postings (shared by both hosts)
-- ============================================
DROP TABLE IF EXISTS jobs CASCADE;

CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  required_skills TEXT,
  required_languages TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 3: verification_questions
-- Assessment questions for each application
-- ============================================
DROP TABLE IF EXISTS verification_questions CASCADE;

CREATE TABLE verification_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  skill_targeted TEXT,
  expected_keywords TEXT,
  answer TEXT,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES (Speed up queries)
-- ============================================
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_overall_score ON applications(overall_score);
CREATE INDEX idx_applications_sent_to_admin ON applications(sent_to_admin);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_verification_questions_app_id ON verification_questions(application_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (submit application)
CREATE POLICY "Anyone can submit applications"
ON applications FOR INSERT
WITH CHECK (true);

-- Allow anyone to SELECT (read applications)
CREATE POLICY "Anyone can read applications"
ON applications FOR SELECT
USING (true);

-- Allow anyone to UPDATE (for assessment submission)
CREATE POLICY "Anyone can update applications"
ON applications FOR UPDATE
USING (true);

-- Enable RLS on jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active jobs
CREATE POLICY "Anyone can read active jobs"
ON jobs FOR SELECT
USING (true);

-- Enable RLS on verification_questions
ALTER TABLE verification_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone full access to questions
CREATE POLICY "Anyone can manage questions"
ON verification_questions FOR ALL
USING (true);

-- ============================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to applications table
CREATE TRIGGER trigger_update_applications
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Apply to jobs table
CREATE TRIGGER trigger_update_jobs
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INSERT SAMPLE JOBS
-- ============================================
INSERT INTO jobs (title, description, required_skills, required_languages, status) VALUES
('Senior Frontend Engineer', 'Build modern web applications with React and TypeScript. Lead frontend architecture decisions.', 'React, TypeScript, Tailwind CSS, Vite, JavaScript, HTML, CSS, Redux, Next.js', 'English', 'active'),
('Backend Developer', 'Develop robust server-side applications with Node.js. Design scalable APIs and databases.', 'Node.js, Express, PostgreSQL, SQLite, MongoDB, REST API, GraphQL, Redis', 'English', 'active'),
('Full Stack Engineer', 'Work on both frontend and backend systems. Build end-to-end features.', 'React, Node.js, TypeScript, Express, PostgreSQL, MongoDB, Docker, Git', 'English', 'active'),
('AI/ML Specialist', 'Develop AI-powered features using LLMs and machine learning. Work with Gemini, OpenAI APIs.', 'Python, Machine Learning, NLP, Gemini API, OpenAI, TensorFlow, PyTorch, LangChain', 'English, Python', 'active'),
('DevOps Engineer', 'Manage cloud infrastructure and CI/CD pipelines. Ensure system reliability.', 'Docker, Kubernetes, AWS, Azure, GitHub Actions, Terraform, Linux, Monitoring', 'English', 'active');

-- ============================================
-- VIEW: qualified_candidates
-- Used by Admin Portal (localhost:3001)
-- Shows only candidates with score >= 75%
-- ============================================
CREATE OR REPLACE VIEW qualified_candidates AS
SELECT 
  a.id,
  a.name,
  a.email,
  a.job_id,
  a.job_title,
  a.resume_file_url,
  a.resume_text,
  a.extracted_skills,
  a.detected_languages,
  a.primary_language,
  a.match_score,
  a.skill_match_percent,
  a.language_match_percent,
  a.assessment_score,
  a.overall_score,
  a.status,
  a.sent_to_admin,
  a.assessment_questions,
  a.assessment_answers,
  a.created_at,
  a.updated_at,
  j.title as job_title_full,
  j.description as job_description,
  j.required_skills as job_required_skills
FROM applications a
LEFT JOIN jobs j ON a.job_id = j.id
WHERE a.overall_score >= 75 
  AND a.sent_to_admin = TRUE
ORDER BY a.overall_score DESC, a.created_at DESC;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if tables were created successfully
DO $$
BEGIN
  RAISE NOTICE '✅ Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - applications (stores all candidate data)';
  RAISE NOTICE '  - jobs (5 sample jobs added)';
  RAISE NOTICE '  - verification_questions (assessment questions)';
  RAISE NOTICE '';
  RAISE NOTICE 'View Created:';
  RAISE NOTICE '  - qualified_candidates (for admin portal)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Go to Storage in Supabase';
  RAISE NOTICE '  2. Create a new bucket named: resumes';
  RAISE NOTICE '  3. Make it PRIVATE (toggle off Public)';
  RAISE NOTICE '  4. Save and test your application!';
END $$;

-- ============================================
-- DONE! Your database is ready for both:
-- - Main App (localhost:3000) - User submissions
-- - Admin Portal (localhost:3001) - View qualified candidates
-- ============================================

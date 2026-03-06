-- ============================================
-- SUPABASE SCHEMA FOR SKILL X APPLICATION
-- ============================================
-- This SQL should be run in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: applications
-- Stores all user applications with resume data
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  job_title TEXT,
  
  -- Resume Storage
  resume_file_name TEXT,
  resume_file_url TEXT, -- URL from Supabase Storage
  resume_text TEXT, -- Extracted text content
  
  -- Analysis Results
  extracted_skills TEXT,
  detected_languages TEXT,
  primary_language TEXT,
  
  -- Scoring
  match_score INTEGER DEFAULT 0,
  skill_match_percent INTEGER DEFAULT 0,
  language_match_percent INTEGER DEFAULT 0,
  assessment_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'assessing', 'qualified', 'rejected'
  sent_to_admin BOOLEAN DEFAULT FALSE,
  
  -- Assessment Questions (JSON)
  assessment_questions JSONB,
  assessment_answers JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABLE: jobs
-- Stores job postings
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  required_skills TEXT,
  required_languages TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'draft'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: verification_questions
-- Stores assessment questions for candidates
-- ============================================
CREATE TABLE IF NOT EXISTS verification_questions (
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
-- STORAGE BUCKET: resumes
-- Stores uploaded resume files
-- ============================================
-- Run this in the Supabase Storage dashboard or via API
-- Storage bucket name: 'resumes'
-- Public: false (private)
-- Allowed MIME types: application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to insert applications (for user submissions)
CREATE POLICY "Allow public insert on applications"
ON applications FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Allow authenticated users to read all applications (for admin)
CREATE POLICY "Allow authenticated read on applications"
ON applications FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to update applications
CREATE POLICY "Allow authenticated update on applications"
ON applications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to read active jobs
CREATE POLICY "Allow public read on jobs"
ON jobs FOR SELECT
TO public
USING (status = 'active');

-- Enable RLS on verification_questions table
ALTER TABLE verification_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to manage verification questions
CREATE POLICY "Allow authenticated full access on verification_questions"
ON verification_questions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_overall_score ON applications(overall_score);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_verification_questions_application_id ON verification_questions(application_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional)
-- ============================================
INSERT INTO jobs (title, description, required_skills, required_languages, status) VALUES
('Senior Frontend Engineer', 'Expert in React, TypeScript, and Tailwind CSS.', 'React, TypeScript, Tailwind CSS, Vite, UI/UX', 'English', 'active'),
('Backend Developer', 'Node.js expert with database experience.', 'Node.js, Express, SQLite, PostgreSQL, Redis', 'English', 'active'),
('AI Specialist', 'Experience with LLMs and prompt engineering.', 'Python, Gemini API, OpenAI, Machine Learning, NLP', 'English, Python', 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- VIEWS
-- ============================================

-- View: Qualified candidates only (for admin portal)
CREATE OR REPLACE VIEW qualified_candidates AS
SELECT 
  a.*,
  j.title as job_title_full,
  j.description as job_description
FROM applications a
LEFT JOIN jobs j ON a.job_id = j.id
WHERE a.overall_score >= 75 AND a.sent_to_admin = TRUE
ORDER BY a.overall_score DESC, a.created_at DESC;

-- ============================================
-- COMPLETE!
-- ============================================
-- After running this SQL:
-- 1. Create a Storage bucket named 'resumes' in Supabase dashboard
-- 2. Set bucket to private
-- 3. Configure allowed file types: PDF, TXT, DOC, DOCX
-- 4. Note your Supabase URL and anon key for .env file

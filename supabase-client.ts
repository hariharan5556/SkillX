import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  WARNING: Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
}

// Create Supabase client (with dummy values if not configured to prevent errors)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey && 
         supabaseUrl !== '' && supabaseAnonKey !== '';
};

// Types for database tables
export interface Application {
  id?: string;
  name: string;
  email: string;
  job_id: number;
  job_title?: string;
  resume_file_name?: string;
  resume_file_url?: string;
  resume_text?: string;
  extracted_skills?: string;
  detected_languages?: string;
  primary_language?: string;
  match_score?: number;
  skill_match_percent?: number;
  language_match_percent?: number;
  assessment_score?: number;
  overall_score?: number;
  status?: string;
  sent_to_admin?: boolean;
  assessment_questions?: any;
  assessment_answers?: any;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
}

export interface Job {
  id?: number;
  title: string;
  description?: string;
  required_skills?: string;
  required_languages?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper functions for Supabase operations

/**
 * Save application to Supabase
 */
export async function saveApplicationToSupabase(data: Application) {
  try {
    const { data: result, error } = await supabase
      .from('applications')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }

    console.log('✅ Application saved to Supabase:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
    throw error;
  }
}

/**
 * Update application in Supabase
 */
export async function updateApplicationInSupabase(id: string, data: Partial<Application>) {
  try {
    const { data: result, error } = await supabase
      .from('applications')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('✅ Application updated in Supabase:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to update Supabase:', error);
    throw error;
  }
}

/**
 * Upload resume file to Supabase Storage
 */
export async function uploadResumeToSupabase(file: Buffer, fileName: string, mimeType: string) {
  try {
    const uniqueFileName = `${Date.now()}-${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(uniqueFileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(uniqueFileName);

    console.log('✅ Resume uploaded to Supabase Storage:', uniqueFileName);
    return {
      fileName: uniqueFileName,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Failed to upload to Supabase Storage:', error);
    throw error;
  }
}

/**
 * Get all jobs from Supabase
 */
export async function getJobsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch jobs from Supabase:', error);
    return [];
  }
}

/**
 * Get qualified candidates from Supabase
 */
export async function getQualifiedCandidatesFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('sent_to_admin', true)
      .gte('overall_score', 75)
      .order('overall_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch candidates from Supabase:', error);
    return [];
  }
}

/**
 * Save verification questions to Supabase
 */
export async function saveVerificationQuestions(applicationId: string, questions: any[]) {
  try {
    const questionsData = questions.map(q => ({
      application_id: applicationId,
      question: q.question,
      skill_targeted: q.skill_targeted,
      expected_keywords: q.expected_keywords || q.logic
    }));

    const { data, error } = await supabase
      .from('verification_questions')
      .insert(questionsData)
      .select();

    if (error) throw error;
    console.log(`✅ ${questions.length} verification questions saved to Supabase`);
    return data;
  } catch (error) {
    console.error('Failed to save verification questions:', error);
    throw error;
  }
}

/**
 * Save job to Supabase
 */
export async function saveJobToSupabase(job: Job) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  
  try {
    const { data: result, error } = await supabase
      .from('jobs')
      .insert([job])
      .select()
      .single();

    if (error) {
      console.error('Supabase job save error:', error);
      throw error;
    }

    console.log('✅ Job saved to Supabase:', result.id);
    return result;
  } catch (error) {
    console.error('Failed to save job to Supabase:', error);
    throw error;
  }
}

export default supabase;

# 🚀 Supabase Integration Setup Guide for Skill X

## Overview
This guide will help you set up Supabase to store application data (name, email, resume documents) from your Skill X hiring application.

## What Gets Saved to Supabase

When a user clicks "Submit for Verification", the following data is automatically saved to Supabase:

### 📄 Application Data
- **Name** - Candidate's full name
- **Email** - Candidate's email address
- **Resume File** - Uploaded document (PDF, TXT, DOCX)
- **Resume Text** - Extracted text content
- **Job Information** - Job ID and title
- **Skills** - AI-extracted skills from resume
- **Languages** - Detected languages (English, Spanish, etc.)
- **Match Score** - Calculated skill & language match percentage
- **Status** - Application stage (pending, assessing, qualified, rejected)

### 📊 Assessment Data
- **Questions** - AI-generated technical questions
- **Answers** - Candidate's responses
- **Assessment Score** - Evaluation results
- **Overall Score** - Combined final score

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** (or **"New Project"** if you already have an account)
3. Sign in with GitHub or create an account
4. Click **"New project"**
5. Select your organization
6. Enter project details:
   - **Name**: skill-x-hiring (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for testing
7. Click **"Create new project"**
8. Wait 2-3 minutes for project setup to complete

---

## Step 2: Set Up Database Tables

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of the `supabase-schema.sql` file from your project
4. Paste it into the SQL Editor
5. Click **"Run"** button (bottom right)
6. You should see: "Success. No rows returned"

This creates:
- ✅ `applications` table (stores candidate data)
- ✅ `jobs` table (job postings)
- ✅ `verification_questions` table (assessment questions)
- ✅ Row Level Security policies
- ✅ Indexes for performance
- ✅ Seed data (3 example jobs)

---

## Step 3: Create Storage Bucket for Resumes

1. Click **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `resumes`
   - **Public**: **OFF** (Keep private for security)
   - **File size limit**: 50 MB (or your preference)
   - **Allowed MIME types**: Add these one by one:
     - `application/pdf`
     - `text/plain`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. Click **"Create bucket"**

### Set Storage Policies

1. Click on the `resumes` bucket
2. Click **"Policies"** tab
3. Click **"New policy"**
4. Select **"Custom"** policy
5. Policy #1: Allow uploads
   ```sql
   INSERT policy:
   Policy name: Allow public uploads
   Target roles: public
   WITH CHECK expression: true
   ```
6. Click **"Review"** → **"Save policy"**

7. Create Policy #2: Allow authenticated reads
   ```sql
   SELECT policy:
   Policy name: Allow authenticated reads
   Target roles: authenticated
   USING expression: true
   ```
8. Click **"Review"** → **"Save policy"**

---

## Step 4: Get Your Supabase Credentials

1. In your Supabase dashboard, click **"Settings"** (gear icon, bottom left)
2. Click **"API"** in the settings menu
3. You'll see two important values:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
Copy this entire URL

### API Keys
You'll see two keys:
- **anon public** - This is what you need (safe to use in frontend/backend)
- **service_role** - DON'T use this (has admin access)

Copy the **anon public** key

---

## Step 5: Configure Your Application

1. Open the `.env` file in your project root (`D:\Skill X 2\skill-x\.env`)
2. Update with your Supabase credentials:

```env
# GEMINI_API_KEY: Required for Gemini AI API calls.
GEMINI_API_KEY=your-actual-gemini-api-key

# APP_URL: The URL where this applet is hosted.
APP_URL=http://localhost:3000

# SUPABASE CONFIGURATION
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...your-long-key-here
```

3. Save the file
4. Restart both applications:

```powershell
# Kill existing servers
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start main app
cd "D:\Skill X 2\skill-x"
npm run dev

# In another terminal, start admin portal
cd "D:\Skill X 2\skill-x\admin-portal"
npm run dev
```

---

## Step 6: Test the Integration

### Test Application Submission

1. Open http://localhost:3000 in your browser
2. Click on any job posting
3. Fill in the application form:
   - Name: Test User
   - Email: test@example.com
   - Upload a sample resume (PDF or TXT)
4. Click **"Submit for Verification"**

### Check Console Logs

You should see in the terminal:
```
📄 Analyzing resume for Test User...
✅ Extracted Skills: React, JavaScript, Node.js
🌐 Detected Languages: English
📝 Primary Language: English
📊 Skill Match: 67%, Language Match: 100%, Overall Match: 77%
🧠 Generating language-aware assessment...
✅ Generated 5 assessment questions
💾 Application saved to Supabase (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

### Verify in Supabase Dashboard

1. Go to your Supabase project
2. Click **"Table Editor"** in the sidebar
3. Click **"applications"** table
4. You should see your test application with:
   - Name and email
   - Resume text
   - Extracted skills
   - Languages detected
   - Match scores
   - Status: "assessing"

5. Click **"Storage"** in the sidebar
6. Click **"resumes"** bucket
7. You should see the uploaded resume file

---

## Step 7: Test Assessment Submission

1. In the browser, answer the 5 assessment questions
2. Click **"Submit Assessment"**
3. Check console logs for:
   ```
   📝 Evaluating assessment for Test User...
   📊 Assessment Score: 82%, Overall Score: 79%
   ✅ Score 79% >= 75% - Forwarding to admin portal!
   💾 Supabase application updated (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
   ```

4. In Supabase Table Editor, refresh the `applications` table
5. The application should now show:
   - Status: "qualified" (if score >= 75%)
   - Assessment score: 82
   - Overall score: 79
   - sent_to_admin: true
   - Assessment answers saved

---

## What Happens When User Submits?

### Step 1: Resume Upload (Click "Submit for Verification")
```
User fills form → Uploads resume → Clicks Submit
↓
Backend receives file
↓
1. PDF/text extraction
2. AI analyzes languages & skills
3. Calculates match score
↓
File uploaded to Supabase Storage
↓
Application data saved to Supabase 'applications' table
↓
Return assessment questions to user
```

### Step 2: Assessment Completion
```
User answers questions → Clicks "Submit Assessment"
↓
AI evaluates answers
↓
Calculates overall score
↓
Updates Supabase application record:
  - assessment_score
  - overall_score
  - status ('qualified' or 'rejected')
  - sent_to_admin (true if >= 75%)
↓
If qualified: Shows success message
If rejected: Shows feedback message
```

---

## Viewing Your Data

### View All Applications
```sql
SELECT 
  name, 
  email, 
  job_title, 
  match_score, 
  assessment_score, 
  overall_score, 
  status,
  created_at
FROM applications
ORDER BY created_at DESC;
```

### View Qualified Candidates (>= 75%)
```sql
SELECT * FROM applications
WHERE overall_score >= 75 AND sent_to_admin = TRUE
ORDER BY overall_score DESC;
```

### View Resume Files
```sql
SELECT 
  name,
  email,
  resume_file_name,
  resume_file_url
FROM applications;
```

---

## Troubleshooting

### Error: "Supabase save failed"
- Check that SUPABASE_URL and SUPABASE_ANON_KEY are correctly set in `.env`
- Verify the values don't have extra spaces or quotes
- Restart the server after changing `.env`

### Error: "Failed to upload to Supabase Storage"
- Verify the `resumes` bucket exists
- Check storage policies are set correctly
- Ensure file size is under the bucket limit

### No data appearing in Supabase
- Check console logs for error messages
- Verify tables were created (run schema SQL again if needed)
- Check network connectivity to Supabase

### Resume file not uploading
- Verify storage bucket policies allow public inserts
- Check file MIME type is allowed
- Ensure file size is under limit

---

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Use Environment Variables**
   - All Supabase credentials are in `.env`
   - Never hardcode keys in source code

3. **Row Level Security**
   - Already configured in schema
   - Public can insert applications
   - Only authenticated users can view all data

4. **Private Storage**
   - Resume bucket is private
   - Only authenticated users can download files

---

## Database Schema Reference

### applications Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| name | TEXT | Candidate name |
| email | TEXT | Candidate email |
| job_id | INTEGER | Reference to job |
| resume_file_name | TEXT | Filename in storage |
| resume_file_url | TEXT | URL to download file |
| resume_text | TEXT | Extracted content |
| extracted_skills | TEXT | AI-detected skills |
| detected_languages | TEXT | Languages found |
| match_score | INTEGER | 0-100 match percentage |
| assessment_score | INTEGER | Test score 0-100 |
| overall_score | INTEGER | Combined score |
| status | TEXT | pending/assessing/qualified/rejected |
| sent_to_admin | BOOLEAN | Forwarded to admin (>= 75%) |
| created_at | TIMESTAMP | When submitted |

---

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run schema SQL
3. ✅ Create storage bucket
4. ✅ Configure `.env` with credentials
5. ✅ Test application submission
6. ✅ Verify data in Supabase dashboard

### Optional Enhancements

- **Email Notifications**: Use Supabase Edge Functions to send emails
- **Real-time Updates**: Use Supabase Realtime for live admin dashboard
- **Advanced Analytics**: Query application data for insights
- **Data Export**: Export qualified candidates to CSV

---

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

---

**Setup Complete! 🎉**

Your Skill X application now saves all candidate data (name, email, resume) to Supabase when they click "Submit for Verification".

# Skill X - Intelligent Hiring System

## 🚀 System Overview

Skill X is a sophisticated dual-portal hiring system that uses AI to analyze resumes with **language-aware assessment** and **conditional forwarding** to admin based on performance.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER FLOW (Port 3000)                    │
├─────────────────────────────────────────────────────────────┤
│ 1. User uploads resume for a job                           │
│ 2. AI analyzes languages & skills from resume + job        │
│ 3. Calculate match percentage (70% skills, 30% languages)  │
│ 4. Generate ON-SPOT assessment (language-aware)            │
│ 5. User answers questions                                  │
│ 6. AI evaluates answers → Assessment percentage            │
│ 7. Calculate Overall Score = (Match + Assessment) / 2      │
│ 8. IF Overall Score >= 75%:                                │
│    ✅ Forward to Admin Portal (Port 3001)                 │
│    ELSE:                                                    │
│    ❌ Reject with feedback                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ADMIN FLOW (Port 3001)                    │
├─────────────────────────────────────────────────────────────┤
│ 1. View only qualified candidates (Overall Score >= 75%)   │
│ 2. See Language combinations used                          │
│ 3. Review Match, Assessment, and Overall scores            │
│ 4. Read candidate answers to assessment questions          │
│ 5. Make hiring decisions                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Running Applications

### Port Configuration
| Application | URL | Purpose |
|-------------|-----|---------|
| **User Portal** | http://localhost:3000 | Job applications, resume upload, on-spot assessment |
| **Admin Portal** | http://localhost:3001 | Candidate review, hiring decisions (qualified only) |

### Starting the Applications

**Option 1: Automatic Start (Separate Windows)**
```powershell
# Main App
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Skill X 2\skill-x'; npm run dev" -WindowStyle Normal

# Admin Portal (wait 3-4 seconds)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Skill X 2\skill-x\admin-portal'; npm run dev" -WindowStyle Normal
```

**Option 2: Manual Start**
```powershell
# Terminal 1 - Main App
cd "D:\Skill X 2\skill-x"
npm run dev

# Terminal 2 - Admin Portal
cd "D:\Skill X 2\skill-x\admin-portal"
npm run dev
```

## 🎯 Key Features

### 1. Language-Aware Analysis
- Detects ALL languages in resume (English, Spanish, French, etc.)
- Identifies primary language of resume text
- Matches languages between job requirements and candidate
- Combined scoring: **70% skills match + 30% language match**

### 2. On-Spot Assessment
- Generates 5 technical questions based on:
  - Candidate's detected languages
  - Job requirements
  - Language combination (multilingual context)
- Questions adapt to the candidate's primary language
- Uses technical terminology from all languages candidate knows

### 3. AI-Powered Evaluation
- Evaluates candidate answers against expected keywords
- Assesses technical accuracy and depth
- Measures language proficiency in responses
- Calculates percentage score for each answer

### 4. Conditional Forwarding
- **Threshold: 75% overall score**
- Only qualified candidates appear in Admin Portal
- Failed applications receive constructive feedback
- No manual admin filtering required

### 5. Dual-Host Architecture
- Separate databases queries (same DB, different filters)
- Port 3000: All applicants (pre-screening)
- Port 3001: Qualified only (>= 75% score)

## 📊 Scoring System

### Match Score (70% weight)
```
Match Score = (Matching Skills / Required Skills) * 100
              + (Matching Languages / Required Languages) * 100
              / 2
```

### Assessment Score (30% weight)
```
Assessment Score = AVG(Answer Scores)
Each answer scored 0-100 by AI based on:
- Expected keywords
- Technical accuracy
- Depth of understanding
- Language proficiency
```

### Overall Score (Forwarding Criteria)
```
Overall Score = (Match Score + Assessment Score) / 2

IF Overall Score >= 75%:
  → Save to candidates table (sent_to_admin = 1)
  → Visible in Admin Portal
ELSE:
  → Delete from pending_assessments
  → Show rejection message
```

## 🗄️ Database Schema

### Tables

**jobs**
- id, title, description
- required_skills (comma-separated)
- **required_languages** (comma-separated)
- created_at

**candidates** (Qualified only - sent_to_admin = 1)
- id, name, email, resume_text
- extracted_skills, languages
- **match_score** (skills + language match)
- **assessment_score** (on-spot test results)
- **overall_score** (combined final score)
- **sent_to_admin** (1 = qualified, visible to admin)
- status, created_at

**verification_questions**
- id, candidate_id
- question, skill_targeted
- expected_answer_logic (stores actual answer + score)

**pending_assessments** (Temporary storage)
- Stores applications during assessment phase
- Deleted after final evaluation
- Not visible to admin

## 🔄 Complete User Journey

### Step 1: Resume Upload
```
User selects job → Uploads resume → System extracts:
- Skills: React, TypeScript, Node.js
- Languages: English, Spanish
- Primary Language: English
```

### Step 2: Match Calculation
```
Job Requirements:
- Skills: React, Node.js, MongoDB
- Languages: English

Skill Match: 2/3 = 67%
Language Match: 1/1 = 100%
Match Score: (67% * 0.7) + (100% * 0.3) = 77%
```

### Step 3: Assessment Generation
```
AI generates 5 questions in English (primary language)
Using terms from both English and Spanish contexts
Questions target: React, TypeScript, Node.js
```

### Step 4: User Answers
```
User completes assessment questionnaire
Each answer evaluated by AI
Scores: [85%, 90%, 70%, 80%, 95%]
Assessment Score: 84%
```

### Step 5: Final Decision
```
Overall Score = (77% + 84%) / 2 = 80.5%

80.5% >= 75% ✅
→ Application FORWARDED to Admin Portal
→ Candidate visible at http://localhost:3001
```

## 🛠️ Configuration

### Environment Variables (.env)
```env
GEMINI_API_KEY=your-actual-api-key-here
APP_URL=http://localhost:3000
```

⚠️ **Important**: Add your real Gemini API key to `.env` file
Get one free at: https://aistudio.google.com/app/apikey

## 📡 API Endpoints

### User Portal (Port 3000)
- `GET /api/jobs` - List all job postings
- `POST /api/upload-resume` - Upload resume, get assessment
- `POST /api/submit-assessment` - Submit answers, get results
- `GET /api/admin/candidates` - Admin view (filtered: overall_score >= 75%)

### Admin Portal (Port 3001)
- `GET /api/admin/candidates` - List qualified candidates only
- `GET /api/candidate/:id` - Get candidate details
- `GET /api/jobs` - List job postings

## 🎨 Frontend Features

### User Portal
- Job browsing gallery
- Resume upload with drag-and-drop
- Real-time language detection display
- Interactive assessment form
- Score breakdown visualization
- Success/rejection feedback

### Admin Portal
- Qualified candidates table
- 4-column score display (Match, Assessment, Overall, Languages)
- Candidate detail sidebar
- Assessment answers review
- Hire/Decline actions

## 🔐 Security & Privacy

- Resumes stored securely in database
- PDF parsing with fallback to text
- Failed applications not stored permanently
- Admin sees only qualified candidates
- Language-aware data privacy

## 📈 Analytics Visible to Admin

For each qualified candidate:
- **Match Score**: Skills & language alignment
- **Assessment Score**: On-spot test performance
- **Overall Score**: Combined qualification metric
- **Languages**: All detected languages
- **Skills**: Extracted technical capabilities
- **Answers**: Full assessment responses with scores

## 🚨 Troubleshooting

### Port Already in Use
```powershell
# Kill all Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Restart applications
```

### Missing Gemini API Key
```
Error: API key should be set when using the Gemini API

Solution: Add your API key to .env file
```

### No Candidates in Admin Portal
This is **expected behavior** if:
- No applications have been submitted yet
- All recent applications scored below 75%

To test:
1. Apply with a strong matching resume
2. Answer assessment questions thoroughly
3. Ensure overall score reaches 75%+

## 📚 Technologies Used

### Backend
- Node.js + Express
- TypeScript (tsx runtime)
- better-sqlite3 (database)
- Gemini AI (Google GenAI SDK)
- Multer (file uploads)
- pdf-parse (PDF extraction)

### Frontend
- React 19
- React Router v7
- Tailwind CSS v4
- Framer Motion (animations)
- Lucide Icons

### Development
- Vite (build tool)
- TypeScript
- ESM modules

## 📄 License & Credits

Built for advanced hiring workflows with AI-powered candidate assessment.

---

**Created by**: Skill X Team  
**Last Updated**: March 5, 2026  
**System Status**: ✅ Both portals active and linked

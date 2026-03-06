# 🎯 MCQ-Based Assessment System - Complete Guide

Your Skill X application now features an AI-powered MCQ (Multi-Choice Question) assessment system!

## 🚀 What's New

### On Host 3000 (Main Application)

#### Stage 1: Upload Resume
- User fills in name, email
- Uploads resume file (PDF, DOCX, TXT)
- clicks "Submit for Verification"

#### Stage 2: MCQ Assessment ⭐ NEW
**What happens:**
1. ✅ Resume content is displayed for reference
2. ✅ AI generates 5 MCQ questions based on:
   - Skills extracted from resume
   - Job requirements
   - Candidate's primary language
3. ✅ Each question has 4 options (A, B, C, D)
4. ✅ Questions are in the candidate's primary language

**User Experience:**
- See their uploaded resume at the top
- Answer each MCQ question by selecting A, B, C, or D
- All questions must be answered before submission
- Real-time validation with visual feedback

#### Stage 3: Results
- MCQ Score: Based on correct answers (0-100%)
- Match Score: Resume skills vs job requirements (70% weight)
- Overall Score: Combined score (30% weight on assessment)
- **If Overall Score ≥ 75%**: Application forwarded to Admin Portal
- **If Overall Score < 75%**: Feedback message

---

## 📊 How Scoring Works

### MCQ Scoring
```
MCQ Score = (Correct Answers / Total Questions) × 100
Example: 4/5 correct = 80%
```

### Overall Score Calculation
```
Overall Score = (Match Score × 0.7) + (MCQ Score × 0.3)
                 └─ Resume Match ─┘   └─ Assessment ─┘

Threshold: Must be ≥ 75% to proceed to admin portal
```

### Example
- Resume Match = 80%
- MCQ Score = 75%
- Overall = (80 × 0.7) + (75 × 0.3) = 56 + 22.5 = **78.5%** ✅ Qualified!

---

## 🧪 How to Test

### Test Case 1: High Scorer
1. Go to http://localhost:3000
2. Click any job posting
3. Fill in:
   - Name: Alice Cooper
   - Email: alice@example.com
   - Upload a resume mentioning: React, TypeScript, Node.js, JavaScript
4. Review resume displayed
5. Answer all MCQ questions correctly (select the right options)
6. Submit
7. **Expected**: Overall score ≥ 75%, forwarded to admin portal

### Test Case 2: Lower Scorer
1. Go to http://localhost:3000
2. Click "Backend Developer" job
3. Fill in:
   - Name: Bob Smith
   - Email: bob@example.com
   - Upload a resume with generic technical skills
4. Answer ~2-3 MCQ questions correctly
5. Submit
6. **Expected**: Overall score < 75%, "Keep Improving" message

### Test Case 3: Verify Admin Portal
1. Complete assessment with score ≥ 75%
2. Go to http://localhost:3001 (Admin Portal)
3. Click "Candidates" in sidebar
4. View qualified candidates
5. Click on candidate name
6. **Verify**: See their MCQ performance details

---

## 🔍 MCQ Question Structure

Each MCQ question includes:

```typescript
{
  "question": "What is the primary purpose of React hooks?",
  "skill_targeted": "React",
  "options": {
    "A": "To replace class components entirely",
    "B": "To add state and other React features to functional components",
    "C": "To improve performance in all cases",
    "D": "To simplify CSS styling"
  },
  "correct_answer": "B",
  "explanation": "React hooks enable state management and side effects in functional components..."
}
```

---

## 🛠️ Technical Implementation

### Backend Changes (server.ts)

**Question Generation:**
- Updated Gemini prompt to generate MCQ format
- Each question has 4 options (A, B, C, D) and one correct answer
- Explanation provided for learning purposes

**Answer Validation:**
```typescript
// Validate MCQ answers
let correctCount = 0;
questions.forEach((q, i) => {
  const isCorrect = answers[i] === q.correct_answer;
  correctCount += isCorrect ? 1 : 0;
});
const assessmentScore = (correctCount / questions.length) * 100;
```

**Scoring Calculation:**
```typescript
const assessmentScore = Math.round((correctCount / questions.length) * 100);
const overallScore = Math.round((matchScore * 0.7) + (assessmentScore * 0.3));
```

### Frontend Changes (App.tsx)

**MCQ UI Component:**
- Radio buttons for each option (A, B, C, D)
- Visual feedback when option selected
- Resume content display in assessment stage
- All-or-nothing submission (all questions required)

**Answer Storage:**
```typescript
// Answers stored as object: { 0: "B", 1: "A", 2: "D", ... }
const answers = { [questionIndex]: selectedOption }
```

---

## 📱 User Flow Diagram

```
Start Application
       ↓
  [Stage 1: Upload Resume]
       ↓
  [Process Resume]
       ↓
  [Generate MCQ Questions]
       ↓
  [Stage 2: Display MCQ Assessment]
       ├─ Show Resume Content
       ├─ Show 5 MCQ Questions
       └─ Get Candidate Answers
       ↓
  [Validate Answers]
       ↓
  [Calculate Scores]
       ├─ MCQ Score (based on correct answers)
       ├─ Match Score (resume vs job)
       └─ Overall Score (combined)
       ↓
  [Decision Point]
       ├── Overall ≥ 75% → Forward to Admin Portal ✅
       └── Overall < 75% → Show Improvement Message ❌
```

---

## 🎨 UI Features

### Assessment Page
- ✅ Resume display in scrollable section
- ✅ Clear question numbering (1-5)
- ✅ Skill category label per question
- ✅ Radio button options with golden highlight on selection
- ✅ Visual feedback for selected answers
- ✅ Submit button (disabled until all answered)

### Result Page
- ✅ Success/Failure indicator (trophy or alert icon)
- ✅ Three score metrics (Match, Assessment, Overall)
- ✅ Clear qualification message
- ✅ Personalized feedback

---

## 🌐 Multi-Language Support

Questions are generated in the candidate's **primary language**:
- Detected from resume content
- Supported languages: English, Spanish, French, German, Japanese, etc.
- Technical terminology adapted to language context
- Culturally-aware scenarios included

**Example:** English resume → Questions in English

---

## 🔐 Admin Portal Features

### View Candidate MCQ Results
1. Go to http://localhost:3001
2. Click "Candidates" → Select a candidate
3. In the right panel, see:
   - MCQ answers and correctness
   - Overall performance
   - Question explanations
   - Full resume content

### Export Candidate Data
- Download candidate profile
- View complete assessment history
- Track language-based variations

---

## 📈 Performance Metrics

Track the following for analytics:

1. **Average MCQ Score**: Mean score across all candidates
2. **Qualification Rate**: % of candidates scoring ≥ 75%
3. **Answer Distribution**: Which options chosen most often
4. **Common Mistakes**: Most frequently missed questions
5. **Skill-Based Performance**: Scores by skill category

---

## 🚀 Next Steps

### Planned Enhancements

1. **Difficulty Levels**
   - Easy, Medium, Hard question variants
   - Adaptive difficulty based on first answer
   
2. **Answer Explanations**
   - Show explanation after submission
   - Link to learning resources
   
3. **Partial Credit**
   - Award points for near-correct answers
   - Consider answer reasoning

4. **Question Bank**
   - Pre-built questions per skill
   - Reduced generation latency

5. **Analytics Dashboard**
   - Candidate performance trends
   - Question effectiveness analysis

---

## ❓ FAQ

**Q: Can candidates see correct answers after submission?**
A: Not yet, but this is planned. They'll receive explanations with next release.

**Q: How many questions are generated?**
A: Currently 5 MCQ questions per assessment (configurable in server.ts).

**Q: What if a candidate runs out of time?**
A: No timeout is implemented. Assessment can be completed at candidate's pace.

**Q: Are questions customized per job?**
A: Yes! Questions are tailored to the job's required skills and languages.

**Q: Can the same candidate take the assessment twice?**
A: Yes, they can reapply. Each application has its own unique assessment.

---

## 🐛 Troubleshooting

### Issue: Questions not showing up
- Check if Gemini API key is configured
- Verify job has required_skills and required_languages defined
- Check browser console for errors

### Issue: Assessment score is 0%
- Ensure answers are properly formatted (A, B, C, or D)
- Verify question JSON includes correct_answer field
- Check database for assessment record

### Issue: Application not forwarded to admin
- Verify overall score calculation: (match × 0.7) + (assessment × 0.3)
- Check if overall score is ≥ 75%
- Review admin portal for qualified candidates

---

## 📞 Support

For issues or questions:
1. Check server logs for errors
2. Review browser developer console
3. Verify Gemini API configuration
4. Check database records in skillmatch.db

---

**Last Updated:** March 5, 2026  
**Version:** 2.0 - MCQ Assessment System  
**Status:** ✅ Active & Running

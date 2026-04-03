# TraceGrade — Product Requirements

> *"Giving the power of paper back to our education."*

## Vision

TraceGrade is a **paper-exam-first** platform that lets teachers create, print, and AI-grade paper exams in minutes — not hours. While the world rushes to digitize everything, TraceGrade embraces the reality that millions of classrooms still run on pencil and paper. Teachers build structured exams, print them, hand them out, then snap a photo of each completed sheet and let AI do the grading.

The core loop is simple: **Create → Print → Distribute → Collect → Scan → Grade → Review.**

## Problem

Paper exams aren't going away, but grading them is painful:

- Teachers spend 5–10+ hours per week hand-grading paper exams and quizzes
- There is no fast way to turn a stack of handwritten answer sheets into a gradebook
- Existing tools either ignore paper entirely (LMS platforms) or require proprietary scan sheets (Scantron)
- Open-ended and multi-part questions — the ones that matter most — get no AI support at all

Teachers need a tool that **meets them where they are**: paper in hand, grades due tomorrow.

## Target Users

| Role | Focus | Status |
|------|-------|--------|
| **Teacher** | Paper exam lifecycle: create, print, grade with AI, review results | Active (MVP) |
| **Admin** | School-wide oversight, teacher management, performance dashboards | Planned |
| **Counselor** | At-risk student monitoring, intervention tracking | Planned |

> See [roles.md](roles.md) for detailed per-role feature breakdown.

## Core Features (MVP — Teacher)

Features are ordered by priority. The paper exam lifecycle is the product's primary value.

| # | Feature | What it does |
|---|---------|-------------|
| 1 | **Exam Builder** | Create structured exam templates with three question types: multiple choice, multi-part, and open-ended. Teachers start in a full-page builder, choose the exam name and linked class, then move into rubric setup. No JSON or code required. |
| 2 | **Integrated Rubrics** | Each question gets its rubric defined inline during exam creation: expected answer (typed text OR uploaded photo of handwritten answer key), point value, acceptable variations, and grading notes. Rubrics are required before AI grading can run. |
| 3 | **Exam Print** | Preview a clean, print-ready version of any exam and print it directly from the browser. Multiple choice shows labeled bubbles; open-ended shows lined answer space; multi-part shows indented sub-questions. |
| 4 | **Exam Export** | Export any exam template as a JSON file for backup or sharing. |
| 5 | **AI Paper Grading** | Upload a photo (or PDF) of a student's completed paper exam → AI grades every question against the rubric → returns per-question scores, confidence levels, and feedback — instantly. |
| 6 | **Confidence Review** | Submissions where AI confidence falls below the teacher's threshold are flagged for manual review. Teacher can approve, adjust, or re-scan. |
| 7 | **Classes & Students** | Create classes, enroll students, manage rosters. Lightweight — exists to support the grading pipeline. |
| 8 | **Gradebook** | View and edit per-student grades across classes. Auto-calculated averages. Populated by AI grading results and manual entry. |
| 9 | **Auth** | Register/login with JWT. Role selection at signup (only Teacher active for MVP). |

## Post-MVP Features

| Feature | Priority |
|---------|----------|
| Homework assignment tracking | P2 |
| Admin & Counselor portals | P2 |
| Parent/Student read-only portal | P2 |
| Advanced analytics (trends, at-risk alerts) | P2 |
| Grade curves & bulk adjustments | P2 |
| Drawable canvas for handwritten answer keys | P2 |
| PDF report export (grade reports, transcripts) | P2 |
| Attendance tracking | P3 |
| Standards-based grading | P3 |
| LMS integrations (Canvas, Google Classroom) | P3 |
| Mobile native apps | P3 |

## Success Metrics

| Metric | Target |
|--------|--------|
| Teachers signed up (3 months) | 100 |
| Exams created per active teacher (monthly) | 4+ |
| Exams printed per active teacher (monthly) | 4+ |
| Submissions graded by AI (monthly) | 500+ |
| Weekly active usage | 3× per week |
| Grading time reduction vs. hand-grading | 60% faster |
| Semester retention | 70% |
| NPS | 40+ |

## Constraints

- **Budget**: ~$100–300/month AWS for MVP
- **Timeline**: 3–4 month MVP
- **Compliance**: FERPA-aware data handling
- **Browser**: Modern browsers only (last 2 versions)
- **Language**: English only for MVP

## Technical Stack (summary)

> Full technical specs in [../specs/decisions.md](../specs/decisions.md)

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Tailwind + Vite |
| Backend | Java 21 + Spring Boot 3.x + Spring Data JPA |
| Database | PostgreSQL 15+ (RDS) |
| Auth | JWT + BCrypt via Spring Security |
| AI | OpenAI Vision API for handwriting grading |
| Infra | AWS (S3, CloudFront, ECS, RDS) |
| Local dev | Docker Compose |



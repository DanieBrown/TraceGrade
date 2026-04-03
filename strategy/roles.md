# TraceGrade — Role Definitions

## Overview

TraceGrade uses three user roles. Only **Teacher** is active for MVP. Admin and Counselor are visible in the registration dropdown but disabled ("Coming Soon").

---

## Teacher (Active)

The primary user. TraceGrade is built around the teacher's paper exam lifecycle: create, print, distribute, collect, scan, grade, review.

### What they can do today

| Area | Capabilities |
|------|-------------|
| **Exam Builder** | Create structured exam templates in a full-page two-step flow: choose the exam name, link it to an existing class, then build questions and rubrics with the visual editor. No JSON or code required. |
| **Integrated Rubrics** | Define rubric inline per question during exam creation: typed expected answer OR uploaded photo of handwritten answer key, point value, acceptable variations, grading notes. |
| **Exam Print** | Preview a print-ready formatted exam and print directly from the browser via a Print button. |
| **Exam Export** | Export any exam template as JSON for backup or sharing. |
| **AI Paper Grading** | Upload a photo or PDF of a student's completed paper exam → AI grades every question against the rubric → per-question scores, confidence, and feedback — instantly. |
| **Confidence Review** | Submissions below the teacher's active review threshold are flagged for manual review; teacher can open a dedicated grading workspace, adjust per-question scores, record scoring rationale, approve, override, or request re-scan. |
| **Classes** | Create, edit, archive classes with grading scale / school year / period. |
| **Students** | Add, edit, deactivate students; open a full student profile page with roster details, class placement, recorded grades, and performance summaries. |
| **Grades** | View gradebook per class; enter/edit individual grades; auto-calculated averages. |
| **Auth** | Register, login, JWT-based sessions. |
| **Settings** | Account settings, confidence threshold configuration. |

### Planned additions

- Drawable canvas for handwritten answer keys (currently image upload only)
- Homework assignment tracking
- Batch grade upload via CSV
- Grade category weighting configuration
- Student performance trends / analytics
- PDF grade report export

### Baseline UI Scenarios

#### 1. Onboarding
Register → land on empty Dashboard → prompted to create first exam → create first class → add students → Dashboard populates with class card and student count.

#### 2. Paper Exam Lifecycle (Primary Flow)
Create exam via the full-page builder → choose the exam name and linked class with class search → move to the Rubrics step → pick question types (multiple choice, multi-part, open-ended) → define rubric inline per question (type answer or upload photo of handwritten answer key) → preview print-ready exam → print exam → hand out to students → collect completed exams.

#### 3. AI Grading & Review
Navigate to Grade Exam → select exam and student → upload photo of completed paper exam → AI grades instantly with per-question breakdown and confidence → review and adjust scores → save grades → land on the student's profile page with updated class performance and recorded grades.

#### 4. Confidence Review
Dashboard shows flagged submissions count → open Manual Review queue → launch a dedicated manual grading workspace → review AI breakdown question-by-question → adjust scores and add scoring rationale when needed → save the final grade to the student record or approve the AI score as-is.

#### 5. Gradebook
AI-graded and manually-entered scores populate the Gradebook → review the grade summary by class → averages auto-calculated.

---

## Admin (Planned)

School principals and administrators. Focused on oversight, not daily grading.

### Planned capabilities

| Area | Capabilities |
|------|-------------|
| **Teacher oversight** | View list of teachers, their classes, grading activity |
| **School-wide dashboards** | Aggregated performance metrics across all classes |
| **Student search** | Search any student in the school, view cross-class performance |
| **Configuration** | Manage school-level settings (grading policies, academic calendar) |
| **Reports** | School-wide grade distribution reports, teacher activity reports |

### Not in scope for Admin

- Direct grade entry (that's the teacher's job)
- Individual student grading workflow
- AI exam grading

### Baseline UI Scenarios

#### 5. Teacher Oversight
Login → Dashboard shows school-wide metrics → drill into teacher list → view a teacher's classes and grading activity → flag underperforming classes for follow-up.

#### 6. Student Search
Search any student by name → view cross-class performance summary → see grade trends across all teachers in one view.

#### 7. Reports & Configuration
Pull school-wide grade distribution report → adjust grading policies or academic calendar settings → export PDF for board review.

---

## Counselor (Planned)

Academic counselors monitoring student wellbeing and performance.

### Planned capabilities

| Area | Capabilities |
|------|-------------|
| **At-risk monitoring** | Dashboard of students with declining grades or below-threshold performance |
| **Student profiles** | View any student's grade history across all classes and teachers |
| **Intervention tracking** | Log notes and interventions per student |
| **Alerts** | Configurable alerts when students drop below grade thresholds |
| **Reports** | Per-student academic summary for parent meetings |

### Not in scope for Counselor

- Grade entry or modification
- Class management
- AI grading workflow

### Baseline UI Scenarios

#### 8. At-Risk Monitoring
Login → Dashboard shows at-risk students sorted by urgency → click a student → see grade history across all classes → view trend visualization.

#### 9. Intervention Tracking
Open at-risk student profile → log an intervention note → schedule follow-up → receive alert if grades continue declining after intervention.

#### 10. Parent Meeting Prep
Search student → generate academic summary report → print/export per-student report with grade breakdown across all classes.

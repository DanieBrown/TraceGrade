# TraceGrade — Learnings & Decisions

Running log of key decisions, trade-offs, and lessons learned during development.

---

## Architecture

| Decision | Rationale |
|----------|-----------|
| **Monorepo** (`packages/frontend` + `packages/backend`) | Single version history, shared tooling, simpler CI/CD for a small team |
| **Layered Spring Boot** (Controller → Service → Repository) | Clear separation of concerns; easy to test each layer independently |
| **School-scoped API endpoints** (`/api/schools/{schoolId}/...`) | Multi-tenant ready from day one; avoids painful refactor later |
| **JWT auth (not sessions)** | Stateless backend, simpler horizontal scaling, no Redis dependency for auth |
| **DevAuthenticationFilter** for local dev | Auto-authenticates with a hardcoded teacher UUID in dev/docker profiles — no login friction during development |

## Frontend

| Decision | Rationale |
|----------|-----------|
| **No global state library** (no Redux/Zustand) | Page-level `useState` + API calls is sufficient for current scale; avoids premature complexity |
| **Axios instance with CSRF cookie** | Consistent base URL + token injection; CSRF cookie fetched on app boot |
| **`VITE_SCHOOL_ID` env var** | Frontend resolves school-scoped URLs at build time; simple for single-school MVP |
| **Routes for exam workspaces, modals for quick edits** | Once a flow needs search, progress steps, and secondary API calls, a dedicated page is clearer than a modal; lightweight edit tasks can still stay in overlays |
| **Tailwind + CSS custom properties** | Design tokens via CSS vars (`--accent-gold`, `--bg-surface`, etc.); Tailwind for layout utilities |

## AI Grading

| Decision | Rationale |
|----------|-----------|
| **OpenAI Vision API** (not custom model) | Fastest path to working handwriting grading; avoid ML infrastructure for MVP |
| **95% confidence threshold** | Below this, flag for manual review; configurable per teacher later |
| **Per-question scoring** | More useful than just a total score; teachers can see exactly where AI is uncertain |
| **Async SQS-based grading pipeline** | Batch uploads shouldn't block the UI; queue decouples upload from grading |

## Lessons Learned

### Keep TODO tracking in GitHub Projects, not in-repo files
We had a `specs/TODO-list.md` that became severely stale — most items marked "open" were actually implemented. GitHub Projects (or Issues) are the single source of truth for task status.

### Cyclic navigation is easy to create accidentally
ExamsPage → "Create Exam" → PaperExamsPage → "Create Paper Exam" → ExamsPage. Neither had a creation form. Fix: merge into single `/exams` hub with a modal for creation and `/exams/:examId` for grading.

### Backend stubs with empty packages cause silent 404s
The `classroom/` package existed with entity + repository but no service/controller. The frontend Classes page got 404s with no obvious error — it looked like a frontend bug. Always ship at least a skeleton controller when you create the entity.

### API URL patterns must match exactly between frontend and backend
Frontend `gradesApi.ts` used `/classes` but backend expected `/schools/{schoolId}/classes`. This only surfaces at runtime, not at build time. Consider a shared API contract or at least list all endpoints in one place.

### Registration role field — add early, restrict later
Adding the role field to `RegisterRequest` now (even though only TEACHER is allowed) means the backend DTO is ready when Admin/Counselor registration is enabled. The frontend shows the disabled options as "Coming Soon" for transparency.

### Keep use cases aligned with runtime gating and configurable behavior
The teacher grading flow now requires complete rubric coverage before AI grading can run, and confidence review uses a teacher-configurable threshold. Use-case language that hardcodes "95%" or skips rubric setup becomes stale quickly and causes planning drift. Keep acceptance criteria aligned with live UX copy and backend enforcement.

### Upload acceptance criteria should match validator rules, not assumptions
Submission upload currently accepts JPG, PNG, PDF, and HEIC. Specs that say "image only" while examples include PDF create contradictory requirements and test confusion. Tie use-case wording to actual validator allow-lists.

### Paper exam lifecycle is the product — everything else is support
TraceGrade's unique value is the paper exam loop: create → print → distribute → collect → scan → AI grade → review. Generic grade management (classes, students, gradebook) exists only to support that loop. Homework was demoted to Post-MVP because it adds scope without reinforcing the core story. When in doubt about feature priority, ask: "Does this make the paper exam lifecycle faster or better?" If not, it's Post-MVP.

### Structured question builder > JSON textarea for exam creation
Asking teachers to paste JSON for question creation was a developer shortcut that would never work in production. A visual builder with explicit question types (multiple choice, multi-part, open-ended) and inline rubric creation is necessary for the target audience. The backend `questionsJson` TEXT field is flexible enough to store the structured format — no migration needed.

### Integrating rubric creation into exam building reduces friction
Separating exam creation from rubric setup created a two-step flow that confused teachers and left exams in a "not ready for grading" limbo. Making rubric definition part of the exam builder (answer per question as you build it) ensures every saved exam is grading-ready by default. Keep the separate Rubric page as an "edit" path, not the primary setup path.

### Print capability unlocks the real classroom workflow
The entire selling point of "paper-first" is meaningless if teachers can't print the exam they build. CSS `@media print` + `window.print()` is sufficient for MVP — no backend PDF generation needed. The print preview component must render a clean layout: header, numbered questions with type-appropriate answer spaces, no app chrome.

### Issue intake should stay lightweight but still protect strategy-doc sync
Bug logging works better as one bullet per independent problem than as a mini spec. Keep intake lightweight for speed, then decide during resolution whether `roles.md`, `use-cases.md`, `PRD.md`, `decisions.md`, or `learnings.md` must be updated to reflect the final behavior change.

### Teacher dashboards need one primary CTA and explicit post-action confirmation
When the dashboard exposes the same task in multiple places, the interface feels more cluttered than helpful. Keep one primary "Create exam" entry in the dashboard shell, let supporting surfaces focus on status/navigation, and make manual-review actions say exactly that the score was saved to the student record so successful actions never feel like no-ops.

### Move from modal to route when a record becomes a workspace
Student details started as a quick modal, but once teachers needed class performance, recorded grades, and profile edits in the same place, the modal became too cramped and context-poor. Use a dedicated route whenever a record needs its own working surface, navigation context, or follow-up actions.

### Manual review needs a focused grading workspace once rationale is required
Inline accordion adjustments work for tiny corrections, but they break down once teachers need question-by-question scoring and written rationale. When manual review becomes a real grading task, give it a dedicated page with a recalculated final score and explicit save action.

### Class-linked exam creation should scaffold the gradebook relationship automatically
Teachers think in terms of classes first, not detached templates. The exam builder now creates or reuses an "Exams" grade category, creates the class assignment, and then saves the exam template against that assignment so the workflow stays class-scoped without asking teachers to manage extra setup steps.

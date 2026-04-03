# TraceGrade — Issue Intake

Use this file to log issues you want fixed. Each bullet should be one independent problem.

You do not need to fully spec the issue. A brief description is enough for me to investigate, fix, and follow up.

When a fix leads to a confirmed product, UX, role, or logic change, update the matching strategy docs before closing it:

- `roles.md` for permission or capability changes
- `use-cases.md` for user-flow or acceptance-criteria changes
- `PRD.md` for MVP scope or feature definition changes
- `decisions.md` for architecture or technical decision changes
- `learnings.md` for patterns, lessons, or trade-offs worth preserving

---

## How To Add Issues

Add one bullet per issue under `Active Issues`.

Recommended format:

- `[Area]` brief problem description

Examples:

- `[Frontend]` Dashboard cards feel too cramped on laptop screens
- `[Backend]` Exam submission upload fails for PDF files over 5 MB
- `[Full Stack]` Manual review count does not match flagged submissions list
- `[UX]` Create Exam flow is confusing because rubric setup feels hidden

Optional details you can add after a bullet if useful:

- page or route
- what you expected
- what happened instead
- repro steps
- screenshot note or error text

---

## What I Will Do

For each bullet, I will treat it as a separate issue and:

- investigate the problem
- make the fix if it is actionable in the repo
- verify the change as best as possible
- update `roles.md`, `use-cases.md`, `PRD.md`, `decisions.md`, or `learnings.md` if the fix changes strategy-level behavior
- once I verify with the user that each "bullet" or issue is complete. I will remove it from the active issues section below.

---

## Active Issues

 - [frontend][refactor] Lets redesign the ui to utilize existing components online instead of hard writing everything. I am thinking of using marterial UI and its necessary components: 
 https://mui.com/material-ui/getting-started/
 https://mui.com/material-ui/all-components/

 Try to use context 7 as much as necessary along with fonrent design skill to accomplish this task.
- [full stack][homework] When creating homework. There is no flow to assign a question and answer for the material of this work item on that page. Lets make it similar to a full page experience and match it with the experience we have for creating exams.

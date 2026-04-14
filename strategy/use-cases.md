# TraceGrade — Use Cases & Acceptance Criteria

Each use case is written in Gherkin format and represents a full user flow. Use cases are grouped by role and ordered by a typical user journey.

> **Source of truth for role capabilities:** See [`roles.md`](roles.md)  
> **Scope guidance (in/out of MVP):** See [`PRD.md`](PRD.md)

---

## Role: Teacher (MVP — Active)

The Teacher is the primary user of TraceGrade. All MVP features are built for this role.

---

### UC-T-01: Teacher Registration

**Feature:** A new teacher creates a TraceGrade account.

```gherkin
Feature: Teacher Registration

  Scenario: Successful registration with valid credentials
    Given the user is on the Register page
    And they have not previously registered with this email
    When they enter a valid first name, last name, email, and password
    And they select "Teacher" as their role
    And they submit the registration form
    Then their account is created
    And they are redirected to the Dashboard
    And the Dashboard shows an empty state with a prompt to create their first class

  Scenario: Registration fails with an already-used email
    Given the user is on the Register page
    When they enter an email that already has an account
    And they submit the form
    Then they see an inline error: "An account with this email already exists"
    And they remain on the Register page

  Scenario: Registration fails with missing required fields
    Given the user is on the Register page
    When they submit the form with one or more required fields left empty
    Then the empty fields are highlighted with validation errors
    And the form is not submitted

  Scenario: Admin and Counselor roles are visible but disabled
    Given the user is on the Register page
    When they view the Role dropdown
    Then they see "Teacher", "Admin (Coming Soon)", and "Counselor (Coming Soon)"
    And only "Teacher" is selectable
```

---

### UC-T-02: Teacher Login

**Feature:** A returning teacher logs into their account.

```gherkin
Feature: Teacher Login

  Scenario: Successful login with valid credentials
    Given the user is on the Login page
    And they have an existing Teacher account
    When they enter their email and password
    And they submit the login form
    Then they are authenticated via JWT
    And they are redirected to the Dashboard

  Scenario: Login fails with invalid password
    Given the user is on the Login page
    When they enter a valid email with an incorrect password
    And they submit the login form
    Then they see an error: "Invalid email or password"
    And they remain on the Login page

  Scenario: JWT session persists across page refresh
    Given the teacher is logged in
    When they refresh the browser
    Then they remain authenticated
    And they land on the Dashboard without being redirected to Login

  Scenario: Session expires after token TTL
    Given the teacher is logged in
    And their JWT token has expired
    When they attempt to access any protected page
    Then they are redirected to the Login page
```

---

### UC-T-03: Dashboard Overview

**Feature:** The teacher sees a summary of their paper exam activity on the Dashboard. The primary call-to-action is exam creation.

```gherkin
Feature: Teacher Dashboard

  Background:
    Given the teacher is logged in

  Scenario: Empty dashboard for a newly registered teacher
    Given the teacher has no classes, students, or exams
    When they view the Dashboard
    Then they see an empty state
    And the primary prompt is "Create your first exam"
    And a secondary prompt to "Create a class" is visible

  Scenario: Dashboard leads with exam-focused quick actions
    Given the teacher has created one or more exams
    When they view the Dashboard
    Then the primary quick action card is "Create Exam"
    And the secondary quick action shows the review queue count badge
    And class cards are visible below with name, period, and student count

  Scenario: Dashboard surfaces flagged submissions that need review
    Given one or more student submissions have AI confidence below the teacher's active review threshold
    When the teacher views the Dashboard
    Then a manual review queue count indicator is visible
    And clicking it navigates to the Manual Review Queue
```

---

### UC-T-04: Class Management

**Feature:** The teacher creates and manages their classes.

```gherkin
Feature: Class Management

  Background:
    Given the teacher is logged in
    And they are on the Classes page

  Scenario: Create a new class
    Given the teacher clicks "Create Class"
    When they enter a class name, grading scale, school year, and period
    And they submit the form
    Then the new class appears in the class list
    And the class card shows the correct name and period

  Scenario: Edit an existing class
    Given the teacher selects an existing class
    When they open the class detail and update the class name or period
    And save the changes
    Then the updated details are reflected on the class card

  Scenario: Archive a class
    Given the teacher selects an existing class
    When they choose to archive it
    Then the class is removed from the active class list
    And it is no longer visible on the Dashboard
    And the class and its data are preserved (not deleted)

  Scenario: Open a class gradebook from the class card
    Given the teacher is on the Classes page
    When they click "Grades" on a class card
    Then they are taken to the Grades page
    And that class is preselected in the gradebook context

  Scenario: Creating a class without a name fails
    Given the teacher clicks "Create Class"
    When they submit the form with no class name entered
    Then a validation error appears indicating the name is required
    And the class is not saved
```

---

### UC-T-05: Student Management

**Feature:** The teacher adds and manages students within a class.

```gherkin
Feature: Student Management

  Background:
    Given the teacher is logged in
    And they have at least one active class

  Scenario: Add a student to a class
    Given the teacher is viewing a class
    When they click "Add Student"
    And they enter the student's first name, last name, and email
    And they submit the form
    Then the student appears in the class student list
    And the class card on the Dashboard updates the student count

  Scenario: Edit student information from the student profile page
    Given a student exists in a class
    When the teacher opens the student's profile page
    And updates the student's name, email, or active status
    And saves
    Then the student record reflects the updated information
    And the teacher remains on the student's profile page

  Scenario: Deactivate a student
    Given a student exists in a class
    When the teacher deactivates the student
    Then the student is no longer shown in the active student list
    But the student's grade history is preserved

  Scenario: View student profile
    Given a student exists in a class
    When the teacher clicks on the student's name
    Then a dedicated student profile page opens
    And it shows the student's profile information, class context, current status, and recorded grades
    And it calculates the student's overall average from recorded gradebook points
    And it shows 0.0% when no recorded gradebook points exist yet
    And it summarizes the student's class performance where gradebook data exists
    And the teacher can page through one class summary at a time when multiple classes are available
```

---

### UC-T-06: Exam Builder & Integrated Rubric Creation

**Feature:** The teacher creates structured paper exams in a full-page two-step flow. Step one captures the exam basics and links the exam to an existing class; step two defines the question builder and inline rubrics.

```gherkin
Feature: Exam Builder with Integrated Rubrics

  Background:
    Given the teacher is logged in
    And they are on the Exams page

  Scenario: Create an exam with multiple choice questions
    Given the teacher clicks "Create Exam"
    And a full-page exam builder opens with a "Basic information" step and a "Rubrics" step
    And they enter exam basics (name, linked class, optional topic)
    When the class search returns a matching class
    And they select the suggested class so the field autofills
    And they continue to the Rubrics step
    And they click "Add Question" and select "Multiple Choice"
    And they enter the question prompt
    And they add answer options (e.g., A, B, C, D) with text for each
    And they mark the correct answer option
    And they set the points for this question
    Then the question is added to the exam with its rubric auto-configured
    And the total points auto-update to reflect the new question
    And the exam remains linked to the selected class resources

  Scenario: Create an exam with open-ended questions
    Given the teacher is building an exam
    When they click "Add Question" and select "Open-Ended"
    And they enter the question prompt
    And they enter the expected answer as text
    Or they upload a photo of a handwritten answer key
    And they set the points, acceptable variations, and optional grading notes
    Then the question and its rubric are added to the exam

  Scenario: Create an exam with multi-part questions
    Given the teacher is building an exam
    When they click "Add Question" and select "Multi-Part"
    And they enter the parent question prompt
    And they add one or more sub-questions (each with its own type, answer, and points)
    Then the multi-part question is added with rubrics for each sub-question
    And the total points reflect the sum of all sub-question points

  Scenario: Edit an existing exam in the shared builder flow
    Given the teacher has an existing exam template on the Exams page
    When they click the exam card
    Then the full-page exam builder opens in edit mode
    And the exam name, topic, questions, and rubric details are preloaded
    When they save their changes
    Then the existing exam template is updated
    And the teacher returns to the Exams page

  Scenario: Upload handwritten answer key image for a question
    Given the teacher is setting up an open-ended or multi-part question
    When they click "Upload Answer Key Image"
    And they select a photo of their handwritten expected answer
    Then the image is uploaded and linked to the question's rubric
    And a thumbnail preview of the uploaded image is shown

  Scenario: Rubric is created automatically alongside the exam
    Given the teacher has built an exam with one or more questions
    And each question has an expected answer (text or image) and points
    When they save the exam
    Then the exam template is created
    And answer rubrics are created for every question automatically
    And the exam is immediately ready for AI grading

  Scenario: Exam template requires rubric coverage before AI grading
    Given an exam template exists with one or more questions
    And one or more question rubrics have no expected answer
    When the teacher opens the grading flow for that template
    Then AI grading is blocked
    And the teacher is prompted to complete the missing rubrics

  Scenario: Edit an existing exam template
    Given an exam template exists
    When the teacher opens the exam detail modal
    And updates questions, answers, or metadata
    And saves
    Then the exam and its rubrics reflect the updated information

  Scenario: Exam creation fails without a name
    Given the teacher opens the "Create Exam" form
    When they submit without entering an exam name
    Then a validation error appears for the name field
    And the exam is not saved

  Scenario: Edit rubrics separately via the Rubric page
    Given an exam template exists
    When the teacher navigates to the exam's rubric page
    Then they can edit individual question rubrics (answer text, image, points, variations, notes)
    And changes are saved without affecting the exam template structure
```

---

### UC-T-06a: Exam Print

**Feature:** The teacher previews and prints a clean, formatted paper exam directly from the browser.

```gherkin
Feature: Exam Print

  Background:
    Given the teacher is logged in
    And at least one exam template exists with questions

  Scenario: Preview a print-ready exam
    Given the teacher is on the Exams page
    When they click "Print" on an exam card (or from the exam detail modal)
    Then a print preview opens showing a clean, formatted exam layout
    And the header shows the exam name, subject, and a blank line for student name and date
    And questions are numbered sequentially

  Scenario: Multiple choice questions show labeled answer bubbles
    Given the exam contains multiple choice questions
    When the print preview renders
    Then each multiple choice question shows the prompt and labeled options (A, B, C, D...)
    And answer bubbles or boxes are displayed for the student to mark

  Scenario: Open-ended questions show blank answer space
    Given the exam contains open-ended questions
    When the print preview renders
    Then each open-ended question shows the prompt
    And a lined blank area is displayed for the student to write their answer

  Scenario: Multi-part questions show indented sub-questions
    Given the exam contains multi-part questions
    When the print preview renders
    Then the parent question prompt is shown
    And sub-questions are indented beneath it with their own answer spaces

  Scenario: Print the exam via browser print dialog
    Given the teacher is viewing the print preview
    When they click the "Print" button
    Then the browser's native print dialog opens
    And the page is formatted for clean printing (no navigation, no sidebar, exam content only)
```

---

### UC-T-06b: Exam Export

**Feature:** The teacher exports exam templates for backup or sharing.

```gherkin
Feature: Exam Export

  Background:
    Given the teacher is logged in
    And they are on the Exams page

  Scenario: Export an exam template as JSON
    Given an exam template exists
    When the teacher clicks "Export" on the exam card or detail modal
    Then a JSON file is downloaded to their computer
    And the file contains the exam metadata, questions, and rubric data
```

---

### UC-T-07: AI Paper Exam Grading

**Feature:** The teacher uploads a photo (or PDF) of a student's completed paper exam and receives instant AI-generated grades measured by confidence score.

```gherkin
Feature: AI Paper Exam Grading

  Background:
    Given the teacher is logged in
    And at least one exam template exists with complete rubric coverage
    And at least one student is enrolled in a class

  Scenario: Upload a photo of a completed paper exam and grade it instantly
    Given the teacher navigates to "Grade Exam"
    When they select an exam template
    And they select a student
    And they upload a photo of the student's completed paper exam (JPG, PNG, PDF, or HEIC)
    And they submit
    Then the AI processes the submission against the rubric
    And returns a per-question score breakdown with confidence levels
    And a total score and overall confidence level are displayed
    And the grade is saved and visible in the Gradebook

  Scenario: AI grades multiple choice questions by matching selected answers
    Given the exam contains multiple choice questions
    When the AI processes the uploaded photo
    Then it identifies the student's selected answer for each multiple choice question
    And scores it against the correct answer defined in the rubric

  Scenario: AI grades open-ended questions using the answer key
    Given the exam contains open-ended questions with text or image answer keys
    When the AI processes the uploaded photo
    Then it reads the student's handwritten response
    And compares it to the expected answer (text and/or handwritten answer key image)
    And assigns a score with confidence and feedback

  Scenario: Submission is flagged for manual review due to low confidence
    Given the teacher uploads a photo of a completed paper exam
    When the AI returns a confidence score below the teacher's active review threshold
    Then the submission is flagged
    And it appears in the Manual Review Queue
    And the teacher is notified on the Dashboard

  Scenario: Uploading an invalid file type is rejected
    Given the teacher is on the grading upload screen
    When they attempt to upload an unsupported file type (e.g., DOCX)
    Then they see an error indicating accepted types are JPG, PNG, PDF, and HEIC
    And the file is not submitted to the AI

  Scenario: Teacher views per-question AI breakdown
    Given a submission has been graded by AI
    When the teacher opens the grading result
    Then they see each question listed
    With its assigned score, maximum points, AI confidence, and AI feedback per question

  Scenario: Saving a grading result moves into student context
    Given a submission has been graded by AI
    When the teacher confirms or adjusts the score and saves the grade
    Then the grade is written to the student record
    And the student profile page opens
    And the teacher can review the student's recorded grades and class performance
```

---

### UC-T-08: Manual Review Queue

**Feature:** The teacher reviews and resolves AI submissions that were flagged for low confidence.

```gherkin
Feature: Manual Review Queue (Confidence Review)

  Background:
    Given the teacher is logged in
    And one or more submissions have been flagged (AI confidence is below the teacher's active review threshold)

  Scenario: View flagged submissions
    Given the teacher navigates to the Manual Review Queue
    Then they see a list of all flagged submissions
    And each row shows the submission reference, AI score, confidence level, and an entry point into manual grading

  Scenario: Approve an AI grade as-is
    Given the teacher opens a flagged submission in the dedicated manual grading view
    And they agree with the AI-assigned scores
    When they click "Approve"
    Then the grade is marked as finalized
    And it is written to the student record and Gradebook
    And the submission is removed from the Review Queue

  Scenario: Override one or more AI scores with scoring rationale
    Given the teacher opens a flagged submission in the dedicated manual grading view
    When they edit one or more per-question scores manually
    And they add scoring rationale for the adjusted questions
    And click "Save Final Grade"
    Then the overridden scores are saved
    And the final grade reflects the teacher's corrections
    And the rationale is stored with the teacher override
    And the submission is removed from the Review Queue

  Scenario: Request a re-scan of the submission
    Given the teacher opens a flagged submission
    And they believe the image was unclear or incorrectly processed
    When they select "Request Re-scan"
    Then the submission is re-queued for AI grading
    And the teacher is notified when the new result is available
```

---

### UC-T-09: Gradebook

**Feature:** The teacher views and manages grades across their classes.

```gherkin
Feature: Gradebook

  Background:
    Given the teacher is logged in
    And they have at least one class with enrolled students

  Scenario: View gradebook for a class
    Given the teacher navigates to the Grades page
    When they select a class
    Then they see a list of students with their current grades
    And the average grade for the class is displayed

  Scenario: Manually enter a grade for a student
    Given the teacher is viewing the gradebook for a class
    When they click on a student's grade cell
    And enter a numeric grade
    And save
    Then the grade is updated in the gradebook
    And the class average recalculates automatically

  Scenario: Edit an existing grade
    Given a grade already exists for a student
    When the teacher clicks on the grade cell
    And changes the value
    And saves
    Then the grade is updated
    And the class average updates accordingly
```

---

### UC-T-10: Homework Management

> **Status:** Active planning workflow. Homework remains separate from Gradebook records and AI grading.

**Feature:** The teacher creates homework assignments in a full-page two-step flow so questions and expected answers stay attached to the planning record.

```gherkin
Feature: Homework Management

  Background:
    Given the teacher is logged in

  Scenario: Create a homework assignment with structured materials
    Given the teacher navigates to the Homework page
    When they click "Create Homework"
    Then a full-page builder opens with a "Basic information" step and a "Materials" step
    When they enter a homework title and optional planning details
    And they continue to the Materials step
    And they add one or more questions with expected answers
    And they save the homework
    Then the assignment appears in the homework list
    And the saved homework keeps the structured questions and expected answers with the record
    And no Gradebook rows or columns are created

  Scenario: View upcoming homework assignments
    Given the teacher has one or more homework assignments
    When they view the Homework page
    Then assignments are listed with their name, due date, and class label
    And the page explains that homework records do not create Gradebook rows or columns
    And the page paginates the list when more than ten homework records exist

  Scenario: Creating a homework assignment without a title fails
    Given the teacher opens the homework builder
    When they continue or save without entering a homework title
    Then a validation error appears for the title field
    And the homework is not saved

  Scenario: Creating a homework assignment without expected answers fails
    Given the teacher is on the Materials step of the homework builder
    And one or more questions are missing an expected answer
    When they click "Create homework"
    Then a validation error explains which question needs answer coverage
    And the assignment is not saved
```

---

### UC-T-11: Account Settings

**Feature:** The teacher manages their own account information and grading preferences.

```gherkin
Feature: Account Settings

  Background:
    Given the teacher is logged in

  Scenario: View current account settings
    Given the teacher navigates to the Settings page
    Then they see their current name and email displayed
    And they see their active confidence review threshold
    And they see their selected AI grading model

  Scenario: Update account information
    Given the teacher is on the Settings page
    When they update their name or any editable field
    And save the changes
    Then the updated information is reflected in the UI

  Scenario: Update confidence review threshold
    Given the teacher is on the Settings page
    When they set a valid confidence review threshold and save
    Then the updated threshold is reflected in the UI
    And future AI review gating uses that saved threshold

  Scenario: Update AI grading model
    Given the teacher is on the Settings page
    And the selected AI provider is configured on the server
    When they choose a different AI grading model and save
    Then the selected AI grading model is persisted for that teacher
    And future grading requests use that saved model

  Scenario: Reject an AI grading model that is not configured
    Given the teacher is on the Settings page
    And the selected AI provider is missing its server API key
    When they try to save that AI grading model
    Then the selected AI grading model remains unchanged
    And the UI explains that the provider is not configured

  Scenario: Navigate back to dashboard from Settings
    Given the teacher is on the Settings page
    When they click the main navigation link to Dashboard
    Then they are taken back to the Dashboard without losing any changes they saved
```

---

### UC-T-12: Workspace Navigation

**Feature:** The teacher moves between main workspaces and keeps recent context visible in the header.

```gherkin
Feature: Workspace Navigation

  Background:
    Given the teacher is logged in

  Scenario: Review recent main-page navigation in the workspace header
    Given the teacher has navigated between multiple main workspace pages
    When they view the workspace header on any authenticated page
    Then they see up to five recent main-page destinations in order
    And opening a detail route does not add a new history entry
```

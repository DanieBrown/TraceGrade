# TraceGrade

A modern teacher productivity and grade management platform built with React and Java Spring Boot.

## Overview

TraceGrade is a streamlined tool that helps teachers efficiently manage classes, students, assignments, and grades. It eliminates the complexity of full LMS systems while providing more functionality than basic spreadsheets.

AI-powered exam generation is still coming soon. Rubric-driven grading of handwritten student submissions is already supported in the teacher workflow.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Redux Toolkit and Zustand
- **Build Tool**: Vite
- **HTTP Client**: Axios

### Backend
- **Framework**: Java Spring Boot 3.x (Java 21 LTS)
- **Architecture**: Layered Architecture (Controller → Service → Repository)
- **ORM**: Spring Data JPA with Hibernate
- **Database**: PostgreSQL 15+
- **Cache**: Redis (Spring Data Redis)
- **Security**: Spring Security with JWT
- **Validation**: Jakarta Bean Validation
- **Testing**: JUnit 5, Mockito, TestContainers
- **Build Tool**: Maven or Gradle
- **Migrations**: Flyway

### Infrastructure
- **Cloud Provider**: Amazon Web Services (AWS)
- **Frontend Hosting**: S3 + CloudFront
- **Backend Hosting**: ECS (Docker containers)
- **Database**: Amazon RDS PostgreSQL
- **Cache**: Amazon ElastiCache Redis
- **IaC**: Terraform
- **Local Development**: Docker Compose for full-stack containerization

## Architecture

The application follows a modern layered architecture:

```
┌─────────────────────────────────────────┐
│         React SPA (Frontend)             │
│  Tailwind CSS + shadcn/ui + Redux        │
└──────────────────┬──────────────────────┘
                   │ REST API (JSON)
┌──────────────────▼──────────────────────┐
│      Spring Boot Backend (Java 21)       │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Presentation Layer (Controllers)  │ │
│  │  - REST Endpoints (@RestController)│ │
│  │  - DTO Validation (@Valid)         │ │
│  │  - Exception Handling              │ │
│  └──────────────┬─────────────────────┘ │
│                 │                        │
│  ┌──────────────▼─────────────────────┐ │
│  │  Application Layer (Services)      │ │
│  │  - Business Logic (@Service)       │ │
│  │  - Transactions (@Transactional)   │ │
│  │  - Caching (@Cacheable)            │ │
│  └──────────────┬─────────────────────┘ │
│                 │                        │
│  ┌──────────────▼─────────────────────┐ │
│  │  Domain Layer (Repository)         │ │
│  │  - JPA Entities (@Entity)          │ │
│  │  - Spring Data Repositories        │ │
│  └──────────────┬─────────────────────┘ │
└─────────────────┼──────────────────────┘
                  │
┌─────────────────▼──────────────────────┐
│      PostgreSQL + Redis                 │
└─────────────────────────────────────────┘
```

## Project Structure

```
TraceGrade/
├── packages/
│   ├── frontend/              # React TypeScript application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── store/
│   │   │   └── api/
│   │   └── package.json
│   │
│   └── backend/               # Java Spring Boot application
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/tracegrade/
│       │   │   │   ├── presentation/    # Controllers, DTOs
│       │   │   │   ├── application/     # Services, Mappers
│       │   │   │   ├── domain/          # Entities, Repositories
│       │   │   │   ├── infrastructure/  # Security, Cache
│       │   │   │   └── config/          # Configuration
│       │   │   └── resources/
│       │   │       ├── application.yml
│       │   │       └── db/migration/    # Flyway migrations
│       │   └── test/
│       └── pom.xml
│
├── infrastructure/            # Terraform IaC
├── specs/                     # Technical specifications
│   ├── decisions.md           # Technical decisions
│   └── TODO-list.md          # Implementation tasks
├── strategy/                  # Product documents
│   └── PRD.md                # Product requirements
└── README.md
```

## Key Features

### Current Features (MVP)
- **User Authentication**: JWT-based authentication with Spring Security
- **Class Management**: Create and manage multiple classes with custom grading scales
- **Student Management**: Track students across multiple classes
- **Assignment Creation**: Organize assignments by categories with weighted grades
- **Grade Entry**: Efficient grade entry with automatic calculations
- **Grade Calculations**: Real-time calculation of weighted averages
- **Reporting**: Export grade reports as CSV
- **Paper Exam Grading**: Set up answer rubrics, upload handwritten student submissions from the teacher portal, run AI grading, and save grades after review

### FEAT-025 Dashboard Stats API (Backend)
- **Endpoint**: `GET /api/schools/{schoolId}/dashboard/stats`
- **Auth/Response**: Bearer-secured endpoint returning `ApiResponse<DashboardStatsResponse>`
- **Response Fields**: `totalStudents`, `classCount` (currently `0`), `gradedThisWeek`, `pendingReviews`, `classAverage` (one decimal), `letterGrade` (`A|B|C|D|F`)
- **Scope Boundary**: FEAT-025 covers backend API delivery only; FEAT-026 frontend dashboard wiring to consume this endpoint is explicitly out of scope.

### FEAT-028 Exams Page UI (Frontend)
- **Route**: `/exams` — dedicated Exams page for viewing and managing exam templates in a structured list/card UI
- **Entry Points**: 
  - Navigate from top navigation menu (Exams link in TopNav)
  - Direct URL access via browser refresh to `/exams`
- **Supported UI States**:
  - **Loading State**: Displayed while exam template data is being fetched from the backend
  - **Error State**: Displayed when the API call fails (network error, timeout, or server error); includes retry control
  - **Empty State**: Displayed when no exam templates exist; provides clear CTA for creating the first exam
  - **Populated State**: Displays exam template list with structured cards, each showing title, question count (if available), and total points (if available)
- **Per-Item Actions**: Each exam card includes a primary action (open/manage/view) for proceeding into exam workflow
- **Non-Regression**: Existing `PaperExamsPage` (`/paper-exams`) route and behavior remain completely intact; FEAT-028 is isolated to the new `/exams` route and does not affect paper exam grading workflows

### FEAT-043 Classes Management UI (Frontend)
- **Route**: `/classes` — dedicated Classes page for teachers to manage active classes.
- **Entry Points**:
  - Navigate from top navigation (Dashboard → Classes → Students)
  - Direct URL access via browser refresh to `/classes`
- **Supported Teacher Flows**:
  - View active classes with `name`, `subject`, `period`, and `school year`
  - Create a class from `+ New Class` and see it in the list without full app reload
  - Edit an existing class with pre-filled values and save updates
  - Archive a class with confirmation so it is removed from the active list view
- **Supported UI States**:
  - **Loading State** while class data is being fetched or mutations are in progress
  - **Error State** with actionable feedback and retry support when requests fail
  - **Empty State** with helpful copy and create CTA when no classes exist

### FEAT-047 Batch Grading UI (Frontend)
- **Entry Point**: `Classes` page card action `Batch Grade` opens class-scoped workflow route:
  - `/classes/:classId/batch-grading?className=<name>&assignmentId=<assignment-uuid>`
- **Missing Context Handling**:
  - the class card still opens the batch-grading route when assignment context is unavailable
  - the workflow then shows route-level guidance to add a valid `assignmentId` before submission
- **Workflow Steps**: `Upload` → `Map Students` → `Processing` → `Summary`
- **Mapping Rules**:
  - every uploaded file must be mapped to one enrolled student
  - duplicate student assignments are blocked
  - non-enrolled student mappings are blocked
  - submit stays disabled until mapping validation passes
- **Processing States** (per student row): `queued`, `processing`, `completed`, `failed`
- **Summary Metrics**:
  - pass rate
  - fail rate
  - average score (completed rows with score only)
  - flagged review count
- **Failed-only Retry**:
  - `Retry Failed` resubmits only failed rows
  - completed rows are never resubmitted
- **Refresh / Reconnect Restore**:
  - in-progress and recent terminal state restore from `sessionStorage`
  - restore is class-scoped and expires with TTL (default 30 minutes)

### Planned Features (Post-MVP)
- **AI Exam Generation**: Generate custom exams using AI based on topic, difficulty, and learning objectives
- **Confidence-Based Review**: AI flags submissions with low confidence (<95%) for teacher review
- **Manual Review Queue**: Review and approve AI-graded submissions with side-by-side comparison

## Documentation

### Product & Planning
- [Product Requirements Document](strategy/PRD.md) - Product vision, features, and user stories
- [Technical Decisions](specs/decisions.md) - Complete technical specifications and architecture
- [TODO List](specs/TODO-list.md) - Implementation tasks and roadmap

### Docker & Development
- **[Quick Start Guide](QUICKSTART.md)** - Get started in 2 minutes ⚡
- [Docker Setup Summary](DOCKER-SETUP-SUMMARY.md) - Complete overview of Docker infrastructure
- [Docker Guide](DOCKER.md) - Detailed Docker and Docker Compose documentation
- [Full Teacher Scenario](DOCKER.md#full-teacher-scenario-rubric-to-grading) - End-to-end rubric setup, student submission upload, AI grading, and grade save walkthrough
- [Makefile](Makefile) - Command shortcuts (run `make help`)

## Development

### Prerequisites

**Option 1: Docker (Recommended)**
- Docker 20.10+
- Docker Compose 2.0+

**Option 2: Local Development**
- Node.js 18+ and pnpm
- Java 21 LTS
- Maven or Gradle
- PostgreSQL 15+
- Redis 7+

### Getting Started

#### Using Docker (Recommended)

The easiest way to run TraceGrade locally is using Docker Compose:

```bash
# 1. Clone the repository
git clone <repository-url>
cd TraceGrade

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker compose up

# 4. Access the application
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8080
# - pgAdmin (optional): http://localhost:5050
```

**Stop the application:**
```bash
docker compose down
```

For detailed Docker documentation, see [DOCKER.md](DOCKER.md).

#### Manual Setup (Without Docker)

1. Clone the repository
2. Set up PostgreSQL and Redis locally
3. Configure environment variables (see `.env.example`)
4. Run the backend: `mvn spring-boot:run` or `./gradlew bootRun`
5. Run the frontend: `pnpm install && pnpm dev`

If your existing dev database still contains Flyway history entry `V8__seed_demo_teacher.sql`, run the one-time remediation steps in [DOCKER.md](DOCKER.md) before restarting the backend.

## Full Teacher Scenario

Use this walkthrough when you want to validate the teacher-managed paper exam flow end to end.

### Preconditions

- Docker services are running and healthy
- `OPENAI_API_KEY` is set in `.env`; without it, rubric setup and file upload work, but AI grading will not complete successfully
- The chosen exam template has structured questions in its `questionsJson`
- At least one student exists in the `Students` page
- This is a teacher-managed submission flow today: the teacher uploads the student's handwritten work from the teacher portal rather than using a separate student-facing submission portal

### End-to-End Flow

1. Open `Students` and create a student with `+ Add Student` if you do not already have one available to grade.
2. Open `Exams` and choose an exam template with the questions you want to grade.
3. Open the exam's grading view. If grading is blocked because rubric coverage is incomplete, use `Set Up Rubric`.
4. On the rubric page, save one rubric entry per question:
  - enter `Expected answer`, or upload a teacher answer image, or both
  - set `Points available`
  - optionally add `Acceptable variations` and `Grading notes`
  - click `Save Question N Rubric`
5. Continue until the rubric page shows full coverage for all required questions, then return to the exam grading page.
6. In `Select Student to Grade`, choose the student whose handwritten work you want to process.
7. In `Upload Student's Handwritten Exam`, add the scanned or photographed submission file and click `Upload 1 file` or `Upload remaining files`.
8. After the upload finishes and `Grade with AI` appears, click it to enqueue grading and wait for the result.
9. Review the returned grading result:
  - a clear submission should return AI scoring that can be saved immediately
  - a low-confidence or hard-to-read submission may show `Manual Review Required`, but this is still a successful grading run that now needs teacher review before final save
10. Click `Save Grades for <student>` to finalize the graded result in the teacher workflow.

For the full Docker-specific walkthrough, including local validation notes, see [DOCKER.md](DOCKER.md#full-teacher-scenario-rubric-to-grading).

## Testing

- **Frontend**: Jest/Vitest for unit tests, Playwright/Cypress for E2E
- **Backend**: JUnit 5 for unit tests, TestContainers for integration tests
- **Target Coverage**: 80%+ code coverage

**Run checks locally**:
```bash
cd packages/frontend
npm run lint           # Frontend linting
npm run type-check    # TypeScript validation
npm run build         # Build validation (includes route wiring)
```

## Deployment

- **CI/CD**: GitHub Actions
- **Environments**: Development, Staging, Production
- **Infrastructure**: AWS (ECS, RDS, ElastiCache, S3, CloudFront)
- **IaC**: Terraform

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

All rights reserved.

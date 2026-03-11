# TraceGrade

A modern teacher productivity and grade management platform built with React and Java Spring Boot.

## Overview

TraceGrade is a streamlined tool that helps teachers efficiently manage classes, students, assignments, and grades. It eliminates the complexity of full LMS systems while providing more functionality than basic spreadsheets.

**Coming Soon**: AI-powered exam generation and automatic grading of handwritten student submissions using computer vision.

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

### Planned Features (Post-MVP)
- **AI Exam Generation**: Generate custom exams using AI based on topic, difficulty, and learning objectives
- **Handwritten Answer Grading**: Upload photos of student work and get automatic grading via GPT-4 Vision
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

## Testing

- **Frontend**: Jest/Vitest for unit tests, Playwright/Cypress for E2E
- **Backend**: JUnit 5 for unit tests, TestContainers for integration tests
- **Target Coverage**: 80%+ code coverage

### FEAT-028 Exams Page Verification Checklist

The Exams page (FEAT-028) includes automated and manual verification checks aligned to acceptance criteria (AC-001 through AC-006):

| Criteria | Verification | Status |
|----------|--------------|--------|
| **AC-001: Route & Navigation** | Navigate to `/exams` from TopNav; confirm Exams page renders. Direct URL access to `/exams` via browser refresh also works. | `npm run build` validates route wiring |
| **AC-002: List & Metadata** | With exam template data available, confirm each item shows title, question count (if available), and total points (if available) | Manual: load populated Exams page; verify metadata rendering |
| **AC-003: State Branches** | Confirm loading, error, and empty states render correctly when API is pending, fails, or returns zero results | Manual: simulate pending/error/empty responses; verify each state appears |
| **AC-004: Per-Item Actions** | Each exam card includes a primary open/manage action; action is clickable and keyboard-focusable | Manual: navigate exam cards with keyboard; click action control |
| **AC-005: Paper Exams Non-Regression** | Navigate to `/paper-exams` after FEAT-028 changes; verify existing page still renders and all interactions remain available | Manual: access `/paper-exams` route; test existing paper exam workflow |
| **AC-006: Missing Field Handling** | Provide exam data missing optional fields (e.g., no question count); confirm page remains stable without runtime errors | Manual: verify long titles do not break layout; missing metadata is handled safely |

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

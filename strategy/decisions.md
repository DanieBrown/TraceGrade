# Technical Decisions & Specifications

This document contains all technical decisions, architecture details, and implementation specifications for TraceGrade.

---

## Table of Contents
1. [Technical Stack](#technical-stack)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [API Design](#api-design)
5. [Authentication & Authorization](#authentication--authorization)
6. [Deployment & Hosting](#deployment--hosting)
7. [Environment Configuration](#environment-configuration)
8. [Third-Party Integrations](#third-party-integrations)
9. [Performance & Scalability](#performance--scalability)
10. [Security Requirements](#security-requirements)
11. [Testing Strategy](#testing-strategy)
12. [Monitoring & Observability](#monitoring--observability)
13. [Documentation](#documentation)
14. [Architectural Decision Records (ADRs)](#architectural-decision-records-adrs)

---

## Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: Redux Toolkit for global state, Zustand for lightweight local state
- **Build Tool**: Vite
- **HTTP Client**: Axios with interceptors for auth

### Backend
- **Framework**: Java Spring Boot 3.x (Java 21 LTS)
- **API Style**: RESTful API with JSON responses
- **ORM/Database Client**: Spring Data JPA with Hibernate for PostgreSQL
- **Authentication**: Spring Security with JWT tokens and BCrypt password hashing
- **Validation**: Jakarta Bean Validation (Hibernate Validator)
- **Build Tool**: Maven or Gradle
- **Testing**: JUnit 5, Mockito, TestContainers

### Database
- **Primary Database**: PostgreSQL 15+ (Amazon RDS)
- **Cache Layer**: Redis for session management and frequently accessed data
- **Search Engine**: PostgreSQL full-text search (sufficient for MVP, may upgrade to Elasticsearch post-MVP)
- **Migrations**: Flyway for versioned database migrations (recommended) or Liquibase

### Infrastructure
- **Hosting Provider**: Amazon Web Services (AWS)
  - Frontend: S3 + CloudFront for static site hosting
  - Backend: EC2 instances or ECS for containerized Go services
  - Database: Amazon RDS for PostgreSQL
  - Cache: Amazon ElastiCache for Redis
- **Container Strategy**: Docker containers with Spring Boot packaged as JAR, Docker Compose for local development, AWS ECS for production
- **CDN**: AWS CloudFront for frontend assets and static content
- **Load Balancing**: AWS Application Load Balancer (ALB)

---

## Architecture


**Architecture Overview:**
- **Frontend**: React SPA served from S3 via CloudFront CDN
- **Backend**: Java Spring Boot REST API running in Docker containers on ECS
- **Database**: Amazon RDS PostgreSQL for persistent data
- **Cache**: ElastiCache Redis for sessions and grade calculations (Spring Data Redis)
- **Load Balancing**: ALB distributes traffic to ECS tasks
- **Monitoring**: CloudWatch for logs and metrics, Spring Boot Actuator for health checks

### Monorepo vs Polyrepo
**Monorepo Approach** using **pnpm workspaces**:
- Simplifies dependency management
- Easier to maintain consistent tooling and CI/CD
- Shared TypeScript types between frontend and backend (if needed)
- Single version control history

Structure:
- `packages/frontend` - React application
- `packages/backend` - Java Spring Boot API server with Layered Architecture
- `infrastructure/` - Terraform IaC files

### Backend Architecture: Layered Spring Boot Architecture

The backend follows a **layered architecture pattern** with strict separation of concerns, following Spring Boot best practices:

#### Layer 1: Presentation Layer (REST Controllers)
Responsible for HTTP request handling and data validation using Spring MVC.

**Responsibilities:**
- Ensure data quality and validation from incoming JSON traffic using Jakarta Bean Validation
- Parse and validate request parameters with `@Valid` and `@RequestBody`
- Delegate business logic to the Service Layer via dependency injection
- Return appropriate HTTP responses with proper status codes using `ResponseEntity`
- Handle only request validation errors (4xx response codes)
- Use DTOs (Data Transfer Objects) for request/response models

**Spring Boot Implementation:**
- Use `@RestController` and `@RequestMapping` annotations
- Apply method-level `@GetMapping`, `@PostMapping`, etc.
- Inject services via constructor injection with `@RequiredArgsConstructor` (Lombok)
- Use `@Valid` for automatic validation
- Implement `@ControllerAdvice` for global exception handling
- Testing: Use `@WebMvcTest` for controller tests, mock service layers with `@MockBean`

#### Layer 2: Service Layer
The core business logic layer exclusively interacting with the Presentation layer.

**Responsibilities:**
- Implement all business logic and domain rules
- Validate data and apply business constraints
- Coordinate with Data Access layer via Repository interfaces
- Include all auditing and logging capabilities with SLF4J/Logback
- Define service-level exceptions for response mapping
- Handle all business rule validation and data transformation
- Manage transactions with `@Transactional`

**Spring Boot Implementation:**
- Use `@Service` annotation for service classes
- Apply `@Transactional` for transaction management
- Inject repositories via constructor injection
- Use custom exceptions extending `RuntimeException`
- Implement business logic methods that return DTOs or domain models
- Use Spring's validation and conversion services
- Apply caching with `@Cacheable`, `@CacheEvict` annotations
- Testing: Use `@ExtendWith(MockitoExtension.class)` for unit tests, mock repositories with `@Mock`

#### Layer 3: Data Access Layer (Repository)
Manages interaction between application and data storage system using Spring Data JPA.

**Responsibilities:**
- Execute database queries and commands exclusively
- Manage database connections and transactions via Spring's connection pooling
- Provide an interchangeable suite of data operations through repository interfaces
- Interact exclusively with Service Layer only
- Define JPA entities with proper annotations and relationships

**Spring Boot Implementation:**
- Use `@Repository` annotation (optional with Spring Data JPA)
- Extend `JpaRepository<Entity, ID>` or `CrudRepository<Entity, ID>` interfaces
- Define custom query methods following Spring Data naming conventions
- Use `@Query` annotation for complex JPQL or native SQL queries
- Apply `@Entity`, `@Table`, `@Id`, `@GeneratedValue` annotations on entities
- Define relationships with `@ManyToOne`, `@OneToMany`, `@ManyToMany`
- Use database migrations with Flyway or Liquibase
- Testing: Use `@DataJpaTest` with TestContainers for repository tests

### Directory Structure
```
TraceGrade/
├── packages/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/        # React components
│   │   │   ├── pages/             # Page-level components
│   │   │   ├── features/          # Feature-based modules
│   │   │   │   ├── auth/
│   │   │   │   ├── classes/
│   │   │   │   ├── students/
│   │   │   │   └── grades/
│   │   │   ├── store/             # Redux store configuration
│   │   │   ├── api/               # API client and hooks
│   │   │   ├── utils/             # Utility functions
│   │   │   ├── types/             # TypeScript types
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── backend/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/
│       │   │   │   └── com/tracegrade/
│       │   │   │       ├── TraceGradeApplication.java    # Main entry point
│       │   │   │       ├── config/                       # Configuration classes
│       │   │   │       │   ├── SecurityConfig.java       # Spring Security config
│       │   │   │       │   ├── JwtConfig.java            # JWT configuration
│       │   │   │       │   ├── RedisConfig.java          # Redis/Cache config
│       │   │   │       │   └── WebConfig.java            # CORS, interceptors
│       │   │   │       ├── presentation/                 # Presentation Layer (Controllers)
│       │   │   │       │   ├── controller/
│       │   │   │       │   │   ├── AuthController.java
│       │   │   │       │   │   ├── ClassController.java
│       │   │   │       │   │   ├── StudentController.java
│       │   │   │       │   │   ├── GradeController.java
│       │   │   │       │   │   └── AssignmentController.java
│       │   │   │       │   ├── dto/                      # Data Transfer Objects
│       │   │   │       │   │   ├── request/
│       │   │   │       │   │   │   ├── LoginRequest.java
│       │   │   │       │   │   │   ├── ClassRequest.java
│       │   │   │       │   │   │   └── GradeRequest.java
│       │   │   │       │   │   └── response/
│       │   │   │       │   │       ├── ApiResponse.java
│       │   │   │       │   │       ├── UserResponse.java
│       │   │   │       │   │       └── ClassResponse.java
│       │   │   │       │   └── exception/                # Exception handlers
│       │   │   │       │       ├── GlobalExceptionHandler.java
│       │   │   │       │       └── CustomExceptions.java
│       │   │   │       ├── application/                  # Service Layer (Business Logic)
│       │   │   │       │   ├── service/
│       │   │   │       │   │   ├── AuthService.java
│       │   │   │       │   │   ├── ClassService.java
│       │   │   │       │   │   ├── StudentService.java
│       │   │   │       │   │   ├── GradeService.java
│       │   │   │       │   │   └── AssignmentService.java
│       │   │   │       │   ├── mapper/                   # Entity-DTO mappers
│       │   │   │       │   │   ├── UserMapper.java
│       │   │   │       │   │   ├── ClassMapper.java
│       │   │   │       │   │   └── GradeMapper.java
│       │   │   │       │   └── validation/               # Custom validators
│       │   │   │       ├── domain/                       # Data Access Layer
│       │   │   │       │   ├── model/                    # JPA Entities
│       │   │   │       │   │   ├── User.java
│       │   │   │       │   │   ├── Class.java
│       │   │   │       │   │   ├── Student.java
│       │   │   │       │   │   ├── Assignment.java
│       │   │   │       │   │   ├── Grade.java
│       │   │   │       │   │   ├── GradeCategory.java
│       │   │   │       │   │   └── ClassEnrollment.java
│       │   │   │       │   └── repository/               # Spring Data JPA repositories
│       │   │   │       │       ├── UserRepository.java
│       │   │   │       │       ├── ClassRepository.java
│       │   │   │       │       ├── StudentRepository.java
│       │   │   │       │       ├── GradeRepository.java
│       │   │   │       │       └── AssignmentRepository.java
│       │   │   │       ├── infrastructure/               # Infrastructure concerns
│       │   │   │       │   ├── security/                 # Security filters, JWT
│       │   │   │       │   │   ├── JwtAuthenticationFilter.java
│       │   │   │       │   │   ├── JwtTokenProvider.java
│       │   │   │       │   │   └── UserDetailsServiceImpl.java
│       │   │   │       │   └── cache/                    # Cache implementation
│       │   │   │       └── shared/                       # Shared utilities
│       │   │   │           ├── constant/                 # Constants
│       │   │   │           └── util/                     # Utility classes
│       │   │   └── resources/
│       │   │       ├── application.yml                   # Main configuration
│       │   │       ├── application-dev.yml               # Dev profile
│       │   │       ├── application-prod.yml              # Production profile
│       │   │       └── db/migration/                     # Flyway migrations
│       │   │           ├── V1__create_users_table.sql
│       │   │           ├── V2__create_classes_table.sql
│       │   │           └── V3__create_students_table.sql
│       │   └── test/
│       │       └── java/
│       │           └── com/tracegrade/
│       │               ├── presentation/                  # Controller tests
│       │               ├── application/                   # Service tests
│       │               ├── domain/                        # Repository tests
│       │               └── integration/                   # Integration tests
│       ├── pom.xml                                       # Maven dependencies
│       ├── mvnw                                          # Maven wrapper
│       └── Dockerfile
│
├── infrastructure/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── docker-compose.yml         # Local development
│
├── .github/
│   └── workflows/                 # CI/CD pipelines
│
├── strategy/
│   └── PRD.md                     # Product requirements
│
├── .gitignore
├── README.md
└── pnpm-workspace.yaml
```

### AI Grading Architecture (Post-MVP)

The AI-powered grading system uses an asynchronous processing pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Teacher Actions                            │
│  1. Upload Answer Rubric Images → S3                            │
│  2. Upload Student Submission Images → S3                        │
│  3. Trigger Grading (single or batch)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              Spring Boot Backend (Grading Service)               │
│  - Validate uploads (format, size, permissions)                 │
│  - Create StudentSubmission and GradingResult records           │
│  - Publish grading jobs to SQS queue                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    AWS Lambda (Image Processor)                  │
│  1. Convert HEIC/PDF to JPG/PNG                                 │
│  2. Optimize images (compression, resize if needed)             │
│  3. Correct orientation, enhance contrast                       │
│  4. Upload processed images back to S3                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│               Grading Worker (Spring Boot Service)               │
│  - Poll SQS for grading jobs                                    │
│  - Fetch submission images and answer rubric from S3            │
│  - Call OpenAI Vision API (GPT-4V) with:                        │
│    • Student submission image                                   │
│    • Answer rubric image                                        │
│    • Grading instructions                                       │
│  - Parse AI response (scores, feedback, confidence)             │
│  - Store GradingResult with confidence score                    │
│  - Flag for review if confidence < 95%                          │
│  - Update Grade record if auto-approved                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      Manual Review Queue                         │
│  - Teachers see submissions with confidence < 95%               │
│  - Side-by-side view: student answer vs rubric vs AI grade     │
│  - Teacher can approve, modify, or override AI grade            │
│  - Approved grades update Grade records                         │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Asynchronous Processing**: Grading jobs run in background via SQS to handle batch uploads
- **Image Preprocessing**: Lambda functions ensure consistent image format/quality for AI
- **OpenAI Vision API**: GPT-4 Vision analyzes both student and rubric images
- **Confidence Threshold**: Configurable (default 95%) to balance automation vs accuracy
- **Teacher Control**: All AI grades available for review; low-confidence flagged automatically
- **Scalability**: SQS queue + worker pool can scale horizontally for large batch jobs
- **Cost Optimization**: Batch similar requests, cache rubric images, optimize image sizes

---

## Data Model

**Relationships:**
- One User (teacher) has many Classes
- One School has many Homework assignments
- One Class has many Students (M:N via ClassEnrollment)
- One Class has many Assignments
- One Assignment belongs to one GradeCategory
- Students have many Grades, and Assignments have many Grades (M:N relationship)

**AI Grading Relationships (Post-MVP):**
- One User (teacher) has many ExamTemplates
- One ExamTemplate has many AnswerRubrics (one per question)
- One Assignment can have one ExamTemplate (optional)
- One StudentSubmission belongs to one Assignment and one Student
- One StudentSubmission has one GradingResult
- One GradingResult can link to one Grade (final grade record)
- One GradingResult can be reviewed by one User (teacher)

### Core Entities

#### Entity: User
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | String(255) | Unique, Required | User email for login |
| password_hash | String(255) | Required | Bcrypt hashed password |
| first_name | String(100) | Required | User's first name |
| last_name | String(100) | Required | User's last name |
| role | Enum | Required | teacher, principal, counselor |
| is_active | Boolean | Default: true | Account status |
| created_at | Timestamp | Required | Account creation time |
| updated_at | Timestamp | Required | Last update time |

#### Entity: Class
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| teacher_id | UUID | FK → User, Required | Owner of the class |
| name | String(200) | Required | Class name (e.g., "Math 101") |
| subject | String(100) | Optional | Subject area |
| period | String(50) | Optional | Class period/time |
| school_year | String(20) | Required | Academic year (e.g., "2024-2025") |
| grading_scale | JSON | Optional | Custom grading scale configuration |
| is_active | Boolean | Default: true | Archive old classes |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: Student
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| teacher_id | UUID | FK → User, Required | Teacher who manages student |
| first_name | String(100) | Required | Student's first name |
| last_name | String(100) | Required | Student's last name |
| student_id | String(50) | Optional | School ID number |
| email | String(255) | Optional | Student email |
| grade_level | Integer | Optional | Grade level (9-12, etc.) |
| notes | Text | Optional | Teacher notes about student |
| is_active | Boolean | Default: true | Archive graduated students |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: ClassEnrollment (Junction Table)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| class_id | UUID | FK → Class, Required | Class reference |
| student_id | UUID | FK → Student, Required | Student reference |
| enrolled_at | Timestamp | Required | Enrollment date |
| dropped_at | Timestamp | Optional | If student dropped the class |

#### Entity: GradeCategory
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| class_id | UUID | FK → Class, Required | Which class this category belongs to |
| name | String(100) | Required | e.g., "Homework", "Tests", "Projects" |
| weight | Decimal(5,2) | Required | Percentage weight (0-100) |
| drop_lowest | Integer | Default: 0 | Number of lowest grades to drop |
| color | String(7) | Optional | Hex color for UI |
| created_at | Timestamp | Required | |

#### Entity: Assignment
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| class_id | UUID | FK → Class, Required | Which class this assignment is for |
| category_id | UUID | FK → GradeCategory, Required | Assignment category |
| name | String(200) | Required | Assignment name |
| description | Text | Optional | Assignment details |
| max_points | Decimal(10,2) | Required | Maximum possible score |
| due_date | Date | Optional | When assignment is due |
| assigned_date | Date | Optional | When assignment was given |
| is_published | Boolean | Default: true | Hide from students if false |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: Grade
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| assignment_id | UUID | FK → Assignment, Required | Which assignment |
| student_id | UUID | FK → Student, Required | Which student |
| points_earned | Decimal(10,2) | Optional | Score earned (null if not graded) |
| status | Enum | Default: pending | pending, graded, excused, missing, incomplete |
| notes | Text | Optional | Feedback or notes |
| graded_at | Timestamp | Optional | When grade was entered |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: Homework
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| school_id | UUID | FK → School, Required | School scope for the homework record |
| title | String(200) | Required | Homework title |
| description | Text | Optional | Teacher-facing planning notes |
| class_name | String(200) | Optional | Display label for the class context |
| due_date | Date | Optional | Due date shown on the planner |
| status | Enum | Default: draft | draft, published, closed, archived |
| max_points | Decimal(10,2) | Optional | Live point total derived from the homework materials |
| materials_json | JSON/TEXT | Optional | Structured list of homework questions and expected answers |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

### AI Grading Entities (Post-MVP)

#### Entity: ExamTemplate
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| teacher_id | UUID | FK → User, Required | Teacher who created the template |
| assignment_id | UUID | FK → Assignment, Optional | Linked assignment if used |
| name | String(200) | Required | Template name |
| subject | String(100) | Optional | Subject area (Math, Science, etc.) |
| topic | String(200) | Optional | Specific topic covered |
| difficulty_level | Enum | Optional | easy, medium, hard, advanced |
| total_points | Decimal(10,2) | Required | Total points for the exam |
| questions_json | JSON | Required | Array of questions with type, text, points |
| pdf_url | String(500) | Optional | S3 URL to generated PDF |
| generation_prompt | Text | Optional | AI prompt used to generate exam |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: AnswerRubric
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| exam_template_id | UUID | FK → ExamTemplate, Required | Associated exam template |
| question_number | Integer | Required | Question number in exam |
| answer_text | Text | Optional | Text description of correct answer |
| answer_image_url | String(500) | Optional | S3 URL to handwritten answer image |
| points_available | Decimal(10,2) | Required | Maximum points for this question |
| acceptable_variations | JSON | Optional | Array of acceptable answer variations |
| grading_notes | Text | Optional | Special grading instructions |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: StudentSubmission
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| assignment_id | UUID | FK → Assignment, Required | Which assignment this is for |
| student_id | UUID | FK → Student, Required | Which student submitted |
| exam_template_id | UUID | FK → ExamTemplate, Optional | Associated exam template if applicable |
| submission_images_urls | JSON | Required | Array of S3 URLs to uploaded images |
| original_format | String(10) | Required | Original file format (jpg, png, pdf, heic) |
| processing_status | Enum | Default: pending | pending, processing, completed, failed |
| submitted_at | Timestamp | Required | When images were uploaded |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

#### Entity: GradingResult
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| submission_id | UUID | FK → StudentSubmission, Required | Which submission was graded |
| grade_id | UUID | FK → Grade, Optional | Linked to final grade record |
| ai_score | Decimal(10,2) | Optional | AI-calculated score |
| final_score | Decimal(10,2) | Optional | Final score (after teacher review) |
| confidence_score | Decimal(5,2) | Required | AI confidence (0-100%) |
| needs_review | Boolean | Default: false | True if confidence < 95% |
| question_scores | JSON | Required | Per-question scores and feedback |
| ai_feedback | Text | Optional | AI-generated feedback |
| teacher_override | Boolean | Default: false | True if teacher modified AI grade |
| reviewed_by | UUID | FK → User, Optional | Teacher who reviewed |
| reviewed_at | Timestamp | Optional | When review occurred |
| processing_time_ms | Integer | Optional | Time taken to grade (milliseconds) |
| created_at | Timestamp | Required | |
| updated_at | Timestamp | Required | |

### Indexes & Performance Considerations

**Required Indexes:**
- `users(email)` - Unique index for login queries
- `classes(teacher_id, is_active)` - Composite index for teacher's active classes
- `students(teacher_id, is_active)` - Find teacher's students
- `class_enrollments(class_id, student_id)` - Unique composite for enrollment lookups
- `grade_categories(class_id)` - Find categories for a class
- `assignments(class_id, is_published)` - Find assignments for a class
- `grades(assignment_id)` - Find all grades for an assignment
- `grades(student_id, assignment_id)` - Unique composite for grade lookups

**AI Grading Indexes (Post-MVP):**
- `exam_templates(teacher_id)` - Find teacher's exam templates
- `answer_rubrics(exam_template_id, question_number)` - Find rubric for specific question
- `student_submissions(assignment_id, student_id)` - Find submissions for assignment/student
- `student_submissions(processing_status)` - Queue pending submissions for processing
- `grading_results(submission_id)` - Find grading result for submission
- `grading_results(needs_review, reviewed_at)` - Find unreviewed submissions for manual review queue

**Performance Strategies:**
- Use Redis to cache calculated grade averages with Spring Cache abstraction (invalidate on grade updates)
- Denormalize: Consider adding `current_average` field to ClassEnrollment for quick access
- Pagination: Use Spring Data's `Pageable` and `Page<T>` for queries (50-100 records per page)
- Batch operations: Allow bulk grade entry to reduce database round-trips using `saveAll()`
- Database connection pooling with HikariCP (Spring Boot default)

---

## API Design

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/auth/register | Create new user | No |
| POST | /api/auth/login | Authenticate user | No |
| POST | /api/auth/logout | End session | Yes |

### Resource Endpoints

**Classes:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/classes | List all classes for current teacher | Yes |
| POST | /api/classes | Create a new class | Yes |
| GET | /api/classes/:id | Get class details | Yes |
| PUT | /api/classes/:id | Update class information | Yes |
| DELETE | /api/classes/:id | Delete/archive a class | Yes |
| GET | /api/classes/:id/students | List students enrolled in class | Yes |
| GET | /api/classes/:id/assignments | List assignments for class | Yes |
| GET | /api/classes/:id/gradebook | Get complete gradebook view | Yes |

**Students:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/students | List all students for current teacher | Yes |
| POST | /api/students | Create a new student | Yes |
| GET | /api/students/:id | Get student details | Yes |
| PUT | /api/students/:id | Update student information | Yes |
| DELETE | /api/students/:id | Delete/archive a student | Yes |
| GET | /api/students/:id/grades | Get all grades for a student | Yes |
| POST | /api/classes/:classId/students/:studentId | Enroll student in class | Yes |
| DELETE | /api/classes/:classId/students/:studentId | Remove student from class | Yes |

**Assignments:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/classes/:classId/assignments | List assignments for a class | Yes |
| POST | /api/classes/:classId/assignments | Create new assignment | Yes |
| GET | /api/assignments/:id | Get assignment details | Yes |
| PUT | /api/assignments/:id | Update assignment | Yes |
| DELETE | /api/assignments/:id | Delete assignment | Yes |
| GET | /api/assignments/:id/grades | Get all grades for assignment | Yes |

**Grades:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/grades | Enter a single grade | Yes |
| POST | /api/grades/bulk | Bulk grade entry for assignment | Yes |
| PUT | /api/grades/:id | Update a grade | Yes |
| DELETE | /api/grades/:id | Delete a grade | Yes |
| GET | /api/students/:id/grades/summary | Get grade summary/averages | Yes |

**Grade Categories:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/classes/:classId/categories | List grade categories for class | Yes |
| POST | /api/classes/:classId/categories | Create new category | Yes |
| PUT | /api/categories/:id | Update category | Yes |
| DELETE | /api/categories/:id | Delete category | Yes |

**Reports:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/classes/:id/report/export | Export class grades as CSV | Yes |
| GET | /api/students/:id/report | Generate student progress report | Yes |

**AI Grading (Post-MVP):**

**Exam Templates:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/exam-templates | List teacher's exam templates | Yes |
| POST | /api/exam-templates/generate | Generate exam using AI (GPT-4) | Yes |
| GET | /api/exam-templates/:id | Get exam template details | Yes |
| PUT | /api/exam-templates/:id | Update exam template | Yes |
| DELETE | /api/exam-templates/:id | Delete exam template | Yes |
| GET | /api/exam-templates/:id/pdf | Download generated PDF | Yes |

**Answer Rubrics:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/exam-templates/:id/rubrics | List rubrics for exam template | Yes |
| POST | /api/exam-templates/:id/rubrics | Create answer rubric (with image upload) | Yes |
| PUT | /api/rubrics/:id | Update rubric | Yes |
| DELETE | /api/rubrics/:id | Delete rubric | Yes |
| POST | /api/rubrics/:id/upload-image | Upload handwritten answer image | Yes |

**Student Submissions:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/assignments/:id/submissions | Upload student submission images | Yes |
| POST | /api/assignments/:id/submissions/batch | Batch upload multiple submissions | Yes |
| GET | /api/submissions/:id | Get submission details | Yes |
| DELETE | /api/submissions/:id | Delete submission | Yes |
| GET | /api/assignments/:id/submissions | List all submissions for assignment | Yes |

**AI Grading:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/submissions/:id/grade | Trigger AI grading for submission | Yes |
| POST | /api/assignments/:id/grade-all | Trigger AI grading for all submissions | Yes |
| GET | /api/grading-results/:id | Get grading result details | Yes |
| GET | /api/grading-results/review-queue | Get submissions needing manual review | Yes |
| PUT | /api/grading-results/:id/review | Teacher review/approval of AI grade | Yes |
| POST | /api/grading-results/:id/override | Override AI grade with manual grade | Yes |

### API Response Format
```json
{
  "success": true,
  "data": {},
  "error": null
}
```

### Error Codes
| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Authentication & Authorization

### Authentication Method
**JWT (JSON Web Tokens)** with the following flow:
1. User submits email/password to `/api/auth/login`
2. Server validates credentials against bcrypt-hashed password
3. Server generates JWT with user ID, email, and role
4. JWT expires after 7 days (configurable)
5. Frontend stores JWT in httpOnly cookie + localStorage (for mobile)
6. JWT included in Authorization header: `Bearer <token>`
7. Middleware validates JWT on protected routes

### OAuth Providers (if applicable)
**Post-MVP Feature**: In future iterations, support OAuth for:
- Google Workspace (common in schools)
- Microsoft Azure AD (common in school districts)

MVP will focus on email/password authentication only.

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| Teacher | Full CRUD on own classes, students, assignments, and grades |
| Principal | Read access to all classes and grades across school; can view reports |
| Counselor | Read access to student grades for assigned students; can add notes |

### Session Management
- **Session Duration**: 7 days for standard login, 24 hours for "Remember Me" unchecked
- **Refresh Token Strategy**:
  - Access token expires after 7 days
  - Refresh tokens stored in Redis with 30-day expiration
  - Frontend automatically refreshes token when within 1 day of expiration
- **Logout Behavior**:
  - Invalidate JWT by adding to Redis blacklist
  - Clear cookies and localStorage
  - Redirect to login page

---

## Deployment & Hosting

### Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | localhost:3000 | Local development |
| Staging | staging.example.com | Pre-production testing |
| Production | example.com | Live application |

### CI/CD Pipeline
- **CI Tool**: GitHub Actions
- **Triggers**:
  - Push to `main` branch → Deploy to production
  - Push to `develop` branch → Deploy to staging
  - Pull requests → Run tests and linting
- **Steps**:
  1. **Lint**: Run ESLint (frontend) and Checkstyle/SpotBugs (backend)
  2. **Test**: Run Jest/Vitest tests (frontend) and JUnit 5 tests with Maven/Gradle (backend)
  3. **Build**:
     - Frontend: Build React app with Vite
     - Backend: Build Spring Boot JAR with Maven (`mvn clean package`) or Gradle (`./gradlew build`)
  4. **Docker**: Build and push Docker images to ECR
  5. **Deploy**:
     - Update ECS service with new task definition
     - Upload frontend build to S3 and invalidate CloudFront cache

### Domain & DNS
- **Domain Registrar**: Namecheap or Google Domains
- **DNS Provider**: AWS Route 53 (integrated with AWS infrastructure)
- **SSL/TLS**: AWS Certificate Manager (ACM) for free SSL certificates on CloudFront and ALB

### Infrastructure as Code
**Terraform** for infrastructure management:
- VPC, subnets, security groups
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- ECS cluster and task definitions
- S3 buckets and CloudFront distributions
- Route 53 DNS records
- IAM roles and policies

**Benefits**: Version-controlled infrastructure, reproducible environments, easy staging/production parity

---

## Environment Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL connection string | Yes | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis connection string | Yes | redis://host:6379 |
| JWT_SECRET | Secret key for signing JWT tokens | Yes | 64-char random string |
| JWT_EXPIRATION | Token expiration duration | Yes | 168h (7 days) |
| PORT | Server port | Yes | 8080 |
| ENVIRONMENT | Environment name | Yes | development, staging, production |
| CORS_ORIGIN | Allowed CORS origins | Yes | https://app.tracegrade.com |
| AWS_REGION | AWS region | Yes | us-east-1 |
| AWS_ACCESS_KEY_ID | AWS credentials | Yes (prod) | AKIA... |
| AWS_SECRET_ACCESS_KEY | AWS credentials | Yes (prod) | secret-key |
| FRONTEND_URL | Frontend application URL | Yes | https://app.tracegrade.com |
| LOG_LEVEL | Logging verbosity | No | info, debug, error |
| OPENAI_API_KEY | OpenAI API key for AI features | No (Post-MVP) | sk-... |
| MAX_IMAGE_SIZE_MB | Max upload size for submission images | No (Post-MVP) | 10 |
| AI_CONFIDENCE_THRESHOLD | Confidence threshold for manual review | No (Post-MVP) | 95.0 |

### Secrets Management
- **Development**: `.env` files (gitignored, template provided as `.env.example`)
- **Production**: AWS Systems Manager Parameter Store or AWS Secrets Manager
  - Secrets injected into ECS tasks as environment variables
  - Automatic rotation for database credentials
- **CI/CD**: GitHub Secrets for GitHub Actions workflows
- **Never commit**: `.env` files, credentials, or sensitive keys to version control

---

## Third-Party Integrations

### Required Services

**MVP Phase:**
| Service | Purpose | Required For |
|---------|---------|--------------|
| AWS SES | Email | Password reset, welcome emails |
| AWS S3 | File storage | Grade report exports, future file uploads |

**Post-MVP:**
| Service | Purpose | Required For |
|---------|---------|--------------|
| OpenAI API | AI Services | Exam generation (GPT-4), handwriting recognition & grading (GPT-4 Vision) |
| Stripe | Payments | Premium subscription billing |
| Twilio/SendGrid | Transactional Email | Enhanced email notifications |
| Google/Microsoft OAuth | Single Sign-On | School integrations |

### API Keys Required

**MVP:**
- AWS credentials (Access Key ID, Secret Access Key)
- JWT secret (self-generated, stored securely)

**Post-MVP:**
- OpenAI API key (for GPT-4 and GPT-4 Vision API)
- Stripe API keys (publishable and secret)
- Google OAuth credentials (client ID, client secret)
- Microsoft Azure AD credentials
- SendGrid API key

---

## Performance & Scalability

### Performance Requirements
- **Target Page Load Time**: < 2 seconds on 3G connection
- **Target API Response Time**: < 200ms for p95 (simple queries), < 500ms for complex grade calculations
- **Core Web Vitals Targets**:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

### Expected Load
- **Concurrent Users**: 100-500 teachers during peak grading periods
- **Requests per Second**: 50-100 RPS during peak (grade entry periods)
- **Data Volume**:
  - 500 teachers × 100 students avg = 50,000 students
  - 50,000 students × 50 assignments avg = 2.5M grade records
  - Database size: ~5-10GB for first year

### Scaling Strategy
**Horizontal Scaling:**
- ECS Auto Scaling based on CPU/memory utilization (target 70%)
- Add more ECS tasks when load increases
- Database read replicas for read-heavy operations

**Vertical Scaling:**
- Start with t3.medium RDS instance, scale to larger instances as needed
- Upgrade ECS task definitions (CPU/memory) based on profiling

**Auto-Scaling Rules:**
- Scale up: CPU > 70% for 3 minutes
- Scale down: CPU < 30% for 10 minutes
- Min tasks: 2 (high availability)
- Max tasks: 10 (cost control)

**Caching Strategy:**
- Cache grade calculations in Redis (30-minute TTL)
- CloudFront CDN for frontend assets (1-hour TTL)
- Database query result caching for class rosters

---

## Security Requirements

### Security Measures
See [TODO-list.md](./TODO-list.md#security-requirements) for security implementation tasks.

### Compliance Requirements
- FERPA compliance for educational data privacy

### Data Privacy
- **Data Retention Policy**: TBD
- **PII Handling**: All student data encrypted at rest and in transit
- **Data Export**: Teachers can export their class data as CSV

---

## Testing Strategy

### Testing Approach

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Jest/Vitest | 80% |
| Integration Tests | Playwright/Cypress | Critical paths |
| E2E Tests | Playwright/Cypress | Happy paths |

### Test Environments
- **Local Development**: Developers run unit and integration tests before committing
- **CI Pipeline**: All tests run on every pull request via GitHub Actions
- **Staging Environment**: E2E tests run after deployment to staging
- **Pre-Production**: Smoke tests before promoting to production

---

## Monitoring & Observability

### Logging
- **Log Provider**: AWS CloudWatch Logs
- **Log Levels**:
  - `error`: System errors, exceptions, failed operations
  - `warn`: Deprecation warnings, recoverable errors
  - `info`: Request logs, important state changes
  - `debug`: Detailed debugging (disabled in production)
- **Structured Logging**: JSON format with request ID for tracing

### Error Tracking
- **Tool**: Sentry
  - Frontend: Capture React errors, unhandled promise rejections
  - Backend: Capture Go panics and errors
  - Source maps for readable stack traces
  - User context (anonymized) for debugging

### Analytics
- **Tool**: PostHog (privacy-friendly, self-hostable)
- **Key Events to Track**:
  - User registration and login
  - Class creation and management
  - Grade entry (count, not values)
  - Report exports
  - Feature adoption rates
  - User retention and engagement
- **Privacy**: No PII in analytics, aggregate data only

### Uptime Monitoring
- **Tool**: UptimeRobot (free tier sufficient for MVP)
- **Monitoring**:
  - API health endpoint: `/api/health` (5-minute intervals)
  - Frontend accessibility check (5-minute intervals)
  - Database connectivity check
- **Alerting**:
  - Email and Slack notifications for downtime
  - Alert if down for > 2 minutes
  - AWS CloudWatch alarms for critical metrics (CPU, memory, DB connections)

---

## Documentation

### Required Documentation
See [TODO-list.md](./TODO-list.md#documentation) for documentation tasks.

### Code Documentation
- JSDoc for TypeScript/JavaScript code
- Javadoc for Java code (classes, methods, complex algorithms)
- OpenAPI/Swagger annotations for REST endpoints with SpringDoc
- Inline comments for complex business logic
- Architectural decision records (ADRs) for major technical decisions

---

## Architectural Decision Records (ADRs)

This section documents significant architectural decisions made for the TraceGrade platform.

---

### ADR-002: School Entity and Multi-Tenant Architecture

**Date:** 2026-02-05
**Status:** Proposed
**Decision Makers:** Development Team
**Related Issues:** [[FEAT-021]](https://github.com/DanieBrown/TraceGrade/issues/21)

---

#### Context

TraceGrade currently operates with a flat user structure where teachers, principals, and counselors exist independently without any organizational hierarchy. As the platform scales, we need to introduce organizational structure to:

1. Support multiple schools using the platform
2. Provide school-level analytics and reporting
3. Enable different pricing models for school-affiliated vs independent accounts
4. Lay the foundation for future school district features
5. Ensure data isolation between different schools

**Current State:**
- Users (teachers, principals, counselors) exist independently
- No concept of organizational hierarchy
- All users have similar access patterns
- Pricing is uniform across all users
- No data isolation or multi-tenant capabilities

**Requirements:**
- Schools need to manage multiple users (teachers, principals)
- Different school types require different features (elementary, middle, high, university)
- Independent users should be warned about potential costs
- Data must be isolated between schools (security requirement)
- Performance must not degrade with multi-tenant filtering
- Existing users must continue to work (backward compatibility)

---

#### Decision

We will implement a **School entity** with **application-level multi-tenancy** using the following approach:

##### 1. Database Schema Design

**New Entity: School**
- Primary table with UUID identifier
- School type enum (ELEMENTARY, MIDDLE, HIGH, UNIVERSITY, OTHER)
- Contact information (address, phone, email, timezone)
- Soft delete capability (`is_active` flag)

**User Entity Modification**
- Add nullable `school_id` foreign key to User table
- `school_id = null` indicates independent account
- Foreign key with `ON DELETE SET NULL` to preserve user data if school deleted

**Indexing Strategy**
- Composite index on `(school_id, user_id)` for fast lookups
- Index on `(school_type, is_active)` for school queries
- Index on `(school_id, role)` for role-based school queries

##### 2. Multi-Tenancy Approach: Application-Level

We chose **application-level multi-tenancy** over database-level for the following reasons:

**Why Application-Level?**
- **Simpler Infrastructure:** Single database, single schema, easier to maintain
- **Cost-Effective:** No need for multiple database instances or schemas
- **Better Performance:** Query optimizer can leverage shared statistics and indexes
- **Easier Backups:** Single backup strategy for all tenants
- **Schema Migrations:** One migration applies to all tenants simultaneously
- **Sufficient Isolation:** Service-layer enforcement provides adequate security for our use case

**Why NOT Database-Level (Separate Databases)?**
- Higher infrastructure complexity (multiple databases)
- Higher costs (RDS instance per school)
- More complex backup and disaster recovery
- Schema migration complexity (must apply to each database)
- Overkill for our current security requirements

**Why NOT Schema-Level Multi-Tenancy?**
- PostgreSQL schema-per-tenant adds complexity
- Connection pooling complications
- Limited scalability (PostgreSQL has practical schema limits)
- Migrations still complex (iterate over all schemas)

##### 3. Data Isolation Strategy

**Service Layer Enforcement:**
```java
@Service
public class ClassService {
    public List<Class> getClassesForUser(User user) {
        if (user.getSchool() == null) {
            // Independent account - return only their classes
            return classRepository.findByTeacherId(user.getId());
        } else {
            // School account - return classes for their school
            return classRepository.findBySchoolIdAndTeacherId(
                user.getSchool().getId(),
                user.getId()
            );
        }
    }
}
```

**Repository Queries with Filtering:**
```java
@Repository
public interface ClassRepository extends JpaRepository<Class, UUID> {
    @Query("SELECT c FROM Class c WHERE c.school.id = :schoolId AND c.teacher.id = :teacherId")
    List<Class> findBySchoolIdAndTeacherId(
        @Param("schoolId") UUID schoolId,
        @Param("teacherId") UUID teacherId
    );
}
```

**Authorization Rules:**
- Teachers: Can only access data within their school
- Principals: Can access all data within their school (cross-teacher)
- Independent accounts: Can only access their own data
- System admin: Can access data across schools (future role)

##### 4. Independent Account Handling

**User Experience:**
- Independent users see a dismissible warning on dashboard
- Warning explains potential cost implications
- Link to pricing documentation
- Warning reappears on next login (stored in session, not database)

**Billing Strategy (Future):**
- School accounts: Covered under school subscription
- Independent accounts: Usage-based billing (per student, per AI grading, etc.)
- Clear cost transparency in UI

##### 5. Migration Strategy

**Phase 1: Schema Migration**
```sql
-- Create School table
CREATE TABLE schools (...);

-- Add school_id to users (nullable)
ALTER TABLE users ADD COLUMN school_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_school
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_users_school_id ON users(school_id);
```

**Phase 2: Data Migration**
- All existing users remain with `school_id = null` (independent)
- Manual admin task to create schools and assign users
- No data loss or breaking changes

**Phase 3: Service Layer Updates**
- Update all queries to respect school boundaries
- Add school filtering to service methods
- Implement authorization checks

---

#### Alternatives Considered

**Alternative 1: Database-per-Tenant (Rejected)**

*Pros:*
- Maximum data isolation
- Can optimize per tenant
- Easier to scale specific tenants

*Cons:*
- High infrastructure complexity
- Significant cost increase (multiple RDS instances)
- Migration complexity (apply to each database)
- Backup/recovery complexity
- Overkill for current scale

*Decision:* Rejected due to cost and complexity for MVP stage.

**Alternative 2: Schema-per-Tenant (Rejected)**

*Pros:*
- Better isolation than shared tables
- Lower cost than separate databases
- Can use PostgreSQL Row-Level Security (RLS)

*Cons:*
- Connection pooling complications
- Schema limit constraints in PostgreSQL
- More complex than application-level
- RLS can impact performance

*Decision:* Rejected in favor of simpler application-level approach.

**Alternative 3: Discriminator Column (Chosen)**

*Pros:*
- Simple to implement
- Low overhead
- Easy to query and debug
- Excellent performance with proper indexing
- Single backup/migration strategy

*Cons:*
- Requires disciplined service-layer enforcement
- Potential for query mistakes (forgot WHERE clause)
- Less isolation than schema/database-level

*Decision:* Accepted for MVP. Adequate for current requirements.

**Alternative 4: No School Entity (Rejected)**

*Pros:*
- Simplest approach
- No changes needed

*Cons:*
- Can't support school organizations
- Can't offer school subscriptions
- No way to scale to school districts
- Limits product-market fit

*Decision:* Rejected. School entity is essential for product vision.

---

#### Consequences

**Positive Consequences:**

1. **Product Capabilities:**
   - Enables school subscriptions (major revenue stream)
   - Supports school-level analytics and reporting
   - Differentiates pricing models
   - Foundation for future school district features

2. **Technical Benefits:**
   - Simple implementation (low complexity)
   - Good performance with proper indexing
   - Easy to maintain and debug
   - No infrastructure cost increase
   - Single backup and migration strategy

3. **User Experience:**
   - Clear school affiliation in profile
   - Transparent cost communication for independent users
   - School-level features and branding (future)

**Negative Consequences:**

1. **Security Responsibilities:**
   - Must enforce school boundaries in ALL service methods
   - Risk of developer error (forgetting school filter)
   - Requires code review diligence
   - Integration tests MUST verify data isolation

2. **Performance:**
   - All queries now require school filtering (slight overhead)
   - Indexes critical for performance (must maintain)
   - Query planner may be less efficient than separate databases

3. **Complexity:**
   - Service layer logic more complex
   - Must handle independent vs school accounts
   - Authorization rules more nuanced

**Mitigation Strategies:**

1. **Prevent Query Mistakes:**
   - Use Spring Data JPA method naming conventions (enforces parameters)
   - Code review checklist includes school filtering verification
   - Integration tests for cross-tenant access attempts
   - Consider custom JPA interceptor to auto-inject school filter

2. **Performance Monitoring:**
   - Monitor query performance with school filters
   - Use `EXPLAIN ANALYZE` to verify index usage
   - Add CloudWatch metrics for school-filtered queries
   - Load test with realistic multi-tenant data

3. **Security Testing:**
   - Penetration testing for tenant isolation
   - Automated tests for unauthorized cross-school access
   - Audit log for all school assignment changes
   - Regular security reviews of service layer

---

#### Monitoring & Success Metrics

**Key Metrics to Track:**

1. **Performance:**
   - Query response time for school-filtered queries (target: <200ms p95)
   - Database CPU usage (should not increase significantly)
   - Index hit rate for school_id indexes (target: >95%)

2. **Security:**
   - Number of unauthorized cross-school access attempts (target: 0)
   - Audit log entries for school assignment changes
   - Failed authorization checks (monitor for anomalies)

3. **User Experience:**
   - Independent account warning dismissal rate
   - School assignment completion rate
   - User confusion tickets related to school feature

4. **Business:**
   - Number of schools onboarded
   - School subscription conversion rate
   - Independent account retention vs school account retention

**Monitoring Tools:**
- **Query Performance:** PostgreSQL slow query log, CloudWatch metrics
- **Security:** Application audit logs, Sentry error tracking
- **User Experience:** PostHog analytics, support ticket analysis
- **Business:** Internal dashboards, subscription metrics

---

#### Future Enhancements

1. **School District Entity:** Parent organization containing multiple schools
2. **Cross-School Reporting:** District-level analytics (requires new role)
3. **School Settings:** Per-school configuration (grading scales, themes, etc.)
4. **School Branding:** Custom logos, colors, and terminology per school
5. **Row-Level Security:** Investigate PostgreSQL RLS as additional safety layer
6. **Sharding Strategy:** If we exceed 1000 schools, consider sharding by school_id

---

#### References

- [FEAT-021: Implement School Entity with Multi-Tenant Architecture](FEAT-021-school-entity.md)
- [Martin Fowler: Multi-Tenancy](https://martinfowler.com/articles/patterns-of-distributed-systems/multi-tenancy.html)
- [AWS Multi-Tenant SaaS Architecture](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/multi-tenant-design.html)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Spring Data JPA Best Practices](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)

---

#### Sign-Off

**Proposed By:** Development Team
**Date:** 2026-02-05
**Status:** Awaiting Review
**Reviewers:** [To be assigned]

**Next Steps:**
1. Review this ADR with team
2. Create GitHub issue for FEAT-021 ✅ [Completed - Issue #21](https://github.com/DanieBrown/TraceGrade/issues/21)
3. Estimate implementation effort (3-4 weeks)
4. Prioritize in backlog
5. Begin implementation once approved

---

### ADR-003: Rubric-First Exam Authoring Entry Point

**Date:** 2026-03-27
**Status:** Accepted
**Decision Makers:** Product + Engineering

---

#### Context

Teacher grading behavior requires complete rubric coverage before AI grading can run. An exam-first entry path can create a dead-end where teachers create templates, navigate to grading, and only then discover grading is blocked by missing rubric setup.

#### Decision

Adopt a rubric-first entry path as a first-class exam authoring flow:

1. Teachers can start exam creation from rubric setup.
2. The system creates or associates a draft exam while rubric entries are authored.
3. AI grading remains blocked until rubric coverage is complete.
4. Exam-first creation remains supported as an alternate path.

#### Consequences

Positive:
- Reduces teacher confusion and rework during initial setup.
- Aligns onboarding language with runtime grading gates.
- Improves first-run success for AI grading.

Trade-offs:
- Requires clear draft/publish state handling in exam workflows.
- Adds UX and API coordination between exam and rubric features.

#### Implementation Notes

- Update strategy docs and acceptance criteria to reflect rubric-first and exam-first parity.
- Treat rubric coverage as an explicit readiness gate for grading actions.
- Keep confidence review threshold language configurable per teacher in docs and UI copy.

---

### ADR-010: Paper-Exam-First Strategic Pivot

**Date:** 2026-03-31  
**Status:** Accepted  
**Deciders:** Product owner, development team

#### Context

TraceGrade was originally positioned as a "teacher-first grade management and AI-assisted exam grading platform" — a broad scope covering classes, students, grades, homework, and AI exam grading as co-equal features. After reviewing the competitive landscape and the core value proposition, it became clear that the **paper exam lifecycle** is the unique differentiator, not generic grade management (which every LMS already does).

Millions of classrooms still run on paper exams. No mainstream tool provides a seamless flow from exam creation → print → distribute → scan → AI grade → review. This is the gap TraceGrade fills.

#### Decision

1. **Reposition TraceGrade as a paper-exam-first platform.** The tagline is *"Giving the power of paper back to our education."*
2. **Reorder MVP feature priority** to lead with the paper exam lifecycle: Exam Builder → Integrated Rubrics → Print → Import/Export → AI Grading → Confidence Review. Classes, Students, Grades, and Auth are supporting features.
3. **Replace the JSON-textarea exam creation** with a structured visual question builder supporting three question types: multiple choice, multi-part, and open-ended.
4. **Integrate rubric creation into exam building** — teachers define the answer key per question as they create it (typed text or uploaded photo of handwritten answer). Eliminates the separate rubric setup step as the default path.
5. **Add Exam Print** — print-ready exam preview with `@media print` CSS and `window.print()`. No backend PDF generation.
6. **Add Exam Import/Export** — client-side JSON export/import for sharing and backup.
7. **Demote Homework to Post-MVP** — not part of the paper exam value proposition. Keep the lightweight homework planner accessible from navigation for discoverability, but do not treat it as a core grading workflow.
8. **Reorder navigation** — Exams stay prominent near the top of the app shell, while Homework remains a secondary planning link that does not feed Gradebook.

#### Consequences

**Positive:**
- Sharper product identity and marketing story
- Clear primary workflow: create → print → grade → review
- Integrated rubric creation reduces friction and steps-to-first-grade
- Print capability unlocks offline classroom workflows (the actual use case)

**Trade-offs:**
- Homework feature code remains visible in navigation as a planning-only workspace — contributors must remember that it is still Post-MVP and does not feed Gradebook
- Structured question builder is more complex to build than the JSON textarea
- Teachers who used the JSON textarea will transition to the new builder (breaking change for existing exam creation flow if any users exist)

#### Implementation Notes

- Backend `questionsJson` TEXT field is flexible enough — no schema migration needed
- Print is pure client-side CSS (`@media print`) + `window.print()`
- Export/Import is pure client-side JSON serialization — no new backend endpoints
- Handwritten answer key input = image upload (camera/file); drawable canvas deferred to Post-MVP

---

### ADR-011: Structured Homework Builder Without Gradebook Coupling

**Date:** 2026-04-02  
**Status:** Accepted  
**Deciders:** Product owner, development team

#### Context

Homework already existed as a lightweight planner entry in navigation, but creation was limited to a modal that captured only metadata. Teachers could not attach the actual assignment questions and expected answers, which made the record incomplete and inconsistent with the richer authoring experience used for exams. At the same time, coupling homework directly into Gradebook or AI grading would blur the product's paper-exam-first focus.

#### Decision

1. Replace modal-based homework creation with a dedicated two-step route: Basic information → Materials.
2. Persist homework questions and expected answers as structured `materials_json` on the homework record.
3. Keep homework separate from Gradebook rows, assignments, and AI grading workflows.
4. Reuse the structured question builder patterns from exam authoring where safe, but disable local-only answer image uploads until homework has a durable media persistence path.

#### Consequences

**Positive:**
- Homework records now retain the actual teacher-authored material instead of just title/due-date metadata.
- The user experience is consistent with other authoring workspaces that need steps and validation.
- Product boundaries stay clear: homework planning is richer, but it still does not mutate Gradebook.

**Trade-offs:**
- Homework materials are stored as JSON text, so future reporting/search features will need parsing or dedicated projections.
- Homework currently supports text-based expected answers only in the creation flow because image persistence is not yet wired for this record type.

#### Implementation Notes

- Add `materials_json` to the backend homework entity and API DTOs.
- Validate homework coverage at save time so each question has a prompt and expected answer.
- Keep the Homework page copy explicit that planner records do not create Gradebook rows or columns.

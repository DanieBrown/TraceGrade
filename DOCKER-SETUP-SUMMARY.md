# Docker Setup - Complete Summary

This document provides an overview of the complete Docker infrastructure that has been added to TraceGrade.

## 📋 What Was Created

### Core Docker Files

1. **[docker-compose.yml](docker-compose.yml)**
   - Main orchestration file
   - Defines 5 services: PostgreSQL, Redis, Backend, Frontend, pgAdmin
   - Includes health checks, volume mounts, and network configuration
   - Configured for development with hot-reload support

2. **[.env.example](.env.example)**
   - Environment variable template
   - Contains all configurable parameters with sensible defaults
   - Must be copied to `.env` before running

3. **[docker-compose.override.yml.example](docker-compose.override.yml.example)**
   - Template for local customizations
   - Allows developers to override settings without modifying main compose file
   - Git-ignored for personal configurations

### Frontend Docker Files

4. **[packages/frontend/Dockerfile](packages/frontend/Dockerfile)**
   - Multi-stage build (development, build, production)
   - Development stage with hot-reload support
   - Production stage with Nginx for serving static files
   - Optimized for minimal image size

5. **[packages/frontend/.dockerignore](packages/frontend/.dockerignore)**
   - Excludes unnecessary files from Docker context
   - Reduces build time and image size

6. **[packages/frontend/nginx.conf](packages/frontend/nginx.conf)**
   - Nginx configuration for production deployment
   - Handles React Router client-side routing
   - Includes security headers and gzip compression
   - Health check endpoint at `/health`

7. **[packages/frontend/.env.example](packages/frontend/.env.example)**
   - Frontend-specific environment variables
   - API URL configuration
   - Feature flags

### Backend Docker Files

8. **[packages/backend/Dockerfile](packages/backend/Dockerfile)**
   - Multi-stage build (build, runtime)
   - Uses Maven for dependency management and building
   - JRE-only runtime image for smaller size
   - Runs as non-root user for security
   - Health check using Spring Actuator

9. **[packages/backend/.dockerignore](packages/backend/.dockerignore)**
   - Excludes build artifacts and IDE files
   - Optimizes Docker build context

10. **[packages/backend/src/main/resources/application-docker.yml](packages/backend/src/main/resources/application-docker.yml)**
    - Docker-specific Spring Boot configuration
    - Database connection to PostgreSQL service
    - Redis cache configuration
    - Logging and actuator settings

11. **[packages/backend/.env.example](packages/backend/.env.example)**
    - Backend environment variables for local (non-Docker) development

### Documentation

12. **[DOCKER.md](DOCKER.md)** - Comprehensive Docker guide
    - Service descriptions
    - Common commands
    - Development workflows
    - Troubleshooting
    - Production deployment strategies

13. **[QUICKSTART.md](QUICKSTART.md)** - Quick reference guide
    - Get started in under 2 minutes
    - Essential commands
    - Common issues and solutions

14. **[Makefile](Makefile)** - Command shortcuts
    - `make setup` - Initial environment setup
    - `make up` - Start services
    - `make down` - Stop services
    - `make logs` - View logs
    - And more... (run `make help`)

### Configuration Files

15. **[packages/frontend/package.json](packages/frontend/package.json)**
    - Frontend dependencies
    - Build scripts configured for Docker

16. **[packages/frontend/vite.config.ts](packages/frontend/vite.config.ts)**
    - Vite configuration with Docker support
    - Host binding enabled
    - Polling enabled for hot-reload in volumes

17. **[packages/backend/pom.xml](packages/backend/pom.xml)**
    - Maven project configuration
    - Spring Boot 3.2.1 with Java 21
    - All necessary dependencies included

18. **[packages/backend/src/main/resources/application.yml](packages/backend/src/main/resources/application.yml)**
    - Main Spring Boot configuration
    - Profile-based configuration support

### Placeholder Application Files

19. **Frontend Placeholder**
    - `packages/frontend/index.html` - Entry HTML
    - `packages/frontend/src/main.tsx` - React entry point
    - `packages/frontend/src/App.tsx` - Sample React component
    - `packages/frontend/src/index.css` - Basic styles

20. **Backend Placeholder**
    - `packages/backend/src/main/java/com/tracegrade/TraceGradeApplication.java` - Main Spring Boot class
    - `packages/backend/src/main/resources/db/migration/V1__initial_schema.sql` - Initial Flyway migration

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │            │  │            │  │            │        │
│  │  Frontend  │  │  Backend   │  │  pgAdmin   │        │
│  │  (React)   │  │  (Spring)  │  │ (optional) │        │
│  │            │  │            │  │            │        │
│  │ Port: 5173 │  │ Port: 8080 │  │ Port: 5050 │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │               │               │                │
│        │    ┌──────────┴────────┐      │                │
│        │    │                   │      │                │
│        │    ▼                   ▼      │                │
│        │  ┌─────────┐      ┌─────────┐ │                │
│        │  │         │      │         │ │                │
│        └─▶│ Redis   │      │Postgres │◀┘                │
│           │         │      │         │                  │
│           │Port:6379│      │Port:5432│                  │
│           └─────────┘      └─────────┘                  │
│                                                          │
│  Network: tracegrade-network (bridge)                   │
│                                                          │
│  Volumes:                                                │
│  - postgres_data (PostgreSQL persistence)               │
│  - redis_data (Redis persistence)                       │
│  - backend_logs (Application logs)                      │
│  - ./packages/frontend/src → /app/src (hot-reload)     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# 1. Setup environment
cp .env.example .env

# 2. Start all services
docker compose up

# 3. Access the application
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8080
# - Health: http://localhost:8080/actuator/health
```

## 📦 Service Details

### PostgreSQL Database
- **Image**: `postgres:15-alpine`
- **Port**: 5432
- **Database**: tracegrade
- **Volume**: Persistent storage at `postgres_data`
- **Health Check**: `pg_isready` every 10s

### Redis Cache
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Volume**: Persistent storage at `redis_data`
- **Features**: AOF persistence enabled

### Backend (Spring Boot)
- **Build**: Multi-stage Maven build
- **Runtime**: Eclipse Temurin 21 JRE Alpine
- **Port**: 8080
- **Depends On**: PostgreSQL (healthy), Redis (healthy)
- **Features**:
  - JWT authentication ready
  - Flyway migrations auto-run
  - Redis caching configured
  - Actuator endpoints enabled
  - Runs as non-root user

### Frontend (React)
- **Build**: Node 18 Alpine with pnpm
- **Port**: 5173
- **Features**:
  - Hot-reload with volume mounts
  - Vite dev server
  - Production build with Nginx
  - Health check endpoint

### pgAdmin (Optional)
- **Image**: `dpage/pgadmin4:latest`
- **Port**: 5050
- **Usage**: Start with `docker compose --profile tools up`
- **Purpose**: Visual database management

## 🔧 Environment Configuration

All services are configured via environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | tracegrade | Database name |
| `POSTGRES_USER` | tracegrade | Database user |
| `POSTGRES_PASSWORD` | tracegrade_dev_password | Database password |
| `REDIS_PASSWORD` | tracegrade_redis_password | Redis password |
| `BACKEND_PORT` | 8080 | Backend API port |
| `FRONTEND_PORT` | 5173 | Frontend dev server port |
| `JWT_SECRET` | (long string) | JWT signing secret |

## 🛠️ Development Workflow

### Frontend Development
1. Code changes in `packages/frontend/src/` trigger hot-reload automatically
2. No container restart needed
3. See changes instantly in browser

### Backend Development
```bash
# Option 1: Rebuild container
docker compose build backend
docker compose up backend

# Option 2: Run backend locally, databases in Docker
docker compose up postgres redis
cd packages/backend
./mvnw spring-boot:run
```

### Database Migrations
1. Create migration in `packages/backend/src/main/resources/db/migration/`
2. Name it: `V{version}__{description}.sql`
3. Restart backend: `docker compose restart backend`

## 🐛 Troubleshooting

### Port Conflicts
Edit `.env` to change ports:
```env
FRONTEND_PORT=3000
BACKEND_PORT=8081
POSTGRES_PORT=5433
```

### Database Connection Issues
```bash
# Check service health
docker compose ps

# View logs
docker compose logs postgres
docker compose logs backend
```

### Complete Reset
```bash
# Stop and remove everything including data
docker compose down -v

# Rebuild from scratch
docker compose up --build
```

## 📊 Resource Usage

Estimated resource requirements:
- **Memory**: ~2GB total (all services)
- **Disk**: ~500MB (images) + data volumes
- **CPU**: Minimal during idle, moderate during builds

## 🔒 Security Notes

### Development
- Default passwords are for development only
- Services exposed on localhost only
- Non-root user in containers

### Production
- Change all passwords in `.env`
- Use Docker secrets or secret management service
- Enable HTTPS/TLS
- Restrict network access
- Use image scanning for vulnerabilities
- Regular security updates

## 📈 Production Deployment

### Build Production Images

```bash
# Frontend
docker build -t tracegrade-frontend:prod \
  --target production \
  ./packages/frontend

# Backend
docker build -t tracegrade-backend:prod \
  ./packages/backend
```

### Deploy to AWS ECS
The Docker setup is compatible with:
- AWS ECS/Fargate
- Amazon RDS (PostgreSQL)
- Amazon ElastiCache (Redis)
- Amazon ECR (container registry)

See infrastructure/ directory for Terraform configurations.

## 🧪 Testing the Setup

After running `docker compose up`, verify:

1. **Frontend**: Visit http://localhost:5173
   - Should see TraceGrade welcome page

2. **Backend Health**: Visit http://localhost:8080/actuator/health
   - Should return `{"status":"UP"}`

3. **Database**:
   ```bash
   docker compose exec postgres psql -U tracegrade -d tracegrade
   \dt  # Should show system_info table
   ```

4. **Redis**:
   ```bash
   docker compose exec redis redis-cli -a tracegrade_redis_password ping
   # Should return PONG
   ```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Spring Boot with Docker](https://spring.io/guides/gs/spring-boot-docker/)
- [Vite Docker Guide](https://vitejs.dev/guide/build.html)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

## 🎯 Next Steps

1. **Copy environment file**: `cp .env.example .env`
2. **Start services**: `docker compose up`
3. **Verify all services are healthy**: `docker compose ps`
4. **Start building**: Implement your features in `packages/frontend/src` and `packages/backend/src`

---

**Need help?** Check [DOCKER.md](DOCKER.md) for detailed documentation or [QUICKSTART.md](QUICKSTART.md) for a quick reference.

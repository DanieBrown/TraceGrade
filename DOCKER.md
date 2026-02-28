# Docker Setup Guide for TraceGrade

This guide explains how to run TraceGrade using Docker Compose for local development.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd TraceGrade
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Start all services**:
   ```bash
   docker compose up
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080
   - pgAdmin (optional): http://localhost:5050

5. **Stop all services**:
   ```bash
   docker compose down
   ```

## Docker Services

The Docker Compose setup includes the following services:

### Core Services (Always Running)

1. **PostgreSQL** (`postgres`)
   - Image: `postgres:15-alpine`
   - Port: `5432`
   - Database: `tracegrade`
   - Persistent volume: `postgres_data`

2. **Redis** (`redis`)
   - Image: `redis:7-alpine`
   - Port: `6379`
   - Persistent volume: `redis_data`

3. **Backend** (`backend`)
   - Spring Boot application (Java 21)
   - Port: `8080`
   - Auto-restarts on failure
   - Logs volume: `backend_logs`

4. **Frontend** (`frontend`)
   - React application (Vite dev server)
   - Port: `5173`
   - Hot-reload enabled via volume mounts

### Optional Services (Development Tools)

5. **pgAdmin** (`pgadmin`)
   - Database management UI
   - Port: `5050`
   - Start with: `docker compose --profile tools up`

## Common Commands

### Starting Services

```bash
# Start all services in foreground (see logs)
docker compose up

# Start all services in background (detached mode)
docker compose up -d

# Start specific service
docker compose up backend

# Start with optional tools (e.g., pgAdmin)
docker compose --profile tools up
```

### Stopping Services

```bash
# Stop all services (keeps volumes)
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v

# Stop specific service
docker compose stop backend
```

### Rebuilding Services

```bash
# Rebuild all images
docker compose build

# Rebuild and start
docker compose up --build

# Rebuild specific service
docker compose build backend
```

### Viewing Logs

```bash
# View all logs
docker compose logs

# View logs for specific service
docker compose logs backend

# Follow logs in real-time
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100
```

### Managing Containers

```bash
# List running containers
docker compose ps

# Execute command in running container
docker compose exec backend bash

# View container resource usage
docker stats
```

## Environment Configuration

### Default Configuration

The `.env.example` file contains default values suitable for local development:

```env
# Database
POSTGRES_DB=tracegrade
POSTGRES_USER=tracegrade
POSTGRES_PASSWORD=tracegrade_dev_password
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=tracegrade_redis_password
REDIS_PORT=6379

# Backend
BACKEND_PORT=8080
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8080/api
```

### Customizing Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and change values as needed

3. Restart services to apply changes:
   ```bash
   docker compose down
   docker compose up
   ```

## Development Workflow

### Hot Reload (Frontend)

The frontend service mounts your source code as a volume, enabling hot reload:

```yaml
volumes:
  - ./packages/frontend/src:/app/src
  - ./packages/frontend/public:/app/public
```

Changes to files in `packages/frontend/src` will automatically trigger a rebuild.

### Backend Development

For backend changes, you need to rebuild the container:

```bash
# After making changes to backend code
docker compose build backend
docker compose up backend
```

Alternatively, you can run the backend locally while using Docker for databases:

```bash
# Start only databases
docker compose up postgres redis

# In another terminal, run backend locally
cd packages/backend
./mvnw spring-boot:run
```

### Database Migrations

Flyway migrations run automatically when the backend starts. To add new migrations:

1. Create migration file in `packages/backend/src/main/resources/db/migration/`
2. Name it: `V{version}__{description}.sql` (e.g., `V1__initial_schema.sql`)
3. Restart backend: `docker compose restart backend`

#### One-time remediation for legacy `V8__seed_demo_teacher.sql` history

If your dev or Docker database was created before the dev seed migration moved to `V9`, remove the old Flyway history row once, then restart backend migrations.

1. Stop backend to prevent concurrent migrations:
   ```bash
   docker compose stop backend
   ```

2. Verify whether the legacy history row exists:
   ```bash
   docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT installed_rank, version, description, script, success FROM flyway_schema_history WHERE script = '\''V8__seed_demo_teacher.sql'\'';"'
   ```

3. Run one-time cleanup (safe no-op if row does not exist):
   ```bash
   docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM flyway_schema_history WHERE version = '\''8'\'' AND script = '\''V8__seed_demo_teacher.sql'\'';"'
   ```

4. Start backend and allow Flyway to apply `V8__add_user_confidence_threshold.sql` and `V9__seed_demo_teacher.sql`:
   ```bash
   docker compose up -d backend
   ```

5. Confirm post-remediation history:
   ```bash
   docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version, script, success FROM flyway_schema_history WHERE version IN ('\''8'\'', '\''9'\'') ORDER BY installed_rank;"'
   ```

For local (non-Docker) dev databases, run the same two SQL statements (`SELECT ... WHERE script = 'V8__seed_demo_teacher.sql'` then `DELETE ...`) against your local PostgreSQL instance before restarting the backend.

## Troubleshooting

### Port Conflicts

If you get "port already in use" errors:

1. Check what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5432

   # Linux/Mac
   lsof -i :5432
   ```

2. Change the port in `.env`:
   ```env
   POSTGRES_PORT=5433
   ```

3. Restart services

### Database Connection Issues

If the backend can't connect to the database:

1. Check if PostgreSQL is healthy:
   ```bash
   docker compose ps postgres
   ```

2. View PostgreSQL logs:
   ```bash
   docker compose logs postgres
   ```

3. Ensure the backend waits for PostgreSQL:
   ```bash
   # The backend has dependency on postgres health check
   depends_on:
     postgres:
       condition: service_healthy
   ```

### Volume Permissions

If you encounter permission errors:

```bash
# Linux/Mac: Fix volume permissions
sudo chown -R $USER:$USER ./packages

# Windows: Run Docker Desktop as administrator
```

### Clearing Everything

To completely reset your Docker environment:

```bash
# Stop and remove containers, networks, and volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# Start fresh
docker compose up --build
```

## Production Deployment

For production, use the production build target:

### Frontend (Production Build)

```bash
# Build production image
docker build -t tracegrade-frontend:prod \
  --target production \
  ./packages/frontend

# Run production container
docker run -p 80:80 tracegrade-frontend:prod
```

### Backend (Production Build)

```bash
# Build production image
docker build -t tracegrade-backend:prod \
  ./packages/backend

# Run with production environment
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=production \
  tracegrade-backend:prod
```

### Production Docker Compose

Create a `docker-compose.prod.yml` for production:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./packages/backend
      target: production
    environment:
      SPRING_PROFILES_ACTIVE: production
      # Use secrets for sensitive data
    # Add other production configurations

  frontend:
    build:
      context: ./packages/frontend
      target: production
    # Production nginx configuration
```

## Health Checks

All services include health checks:

### Backend
- Endpoint: `http://localhost:8080/actuator/health`
- Interval: 30s

### PostgreSQL
- Command: `pg_isready`
- Interval: 10s

### Redis
- Command: `redis-cli ping`
- Interval: 10s

### Frontend (Production)
- Endpoint: `http://localhost/health`
- Interval: 30s

## Best Practices

1. **Never commit `.env`**: Keep secrets out of version control
2. **Use volume mounts**: For development hot-reload
3. **Multi-stage builds**: Keep production images small
4. **Health checks**: Ensure services are ready before dependencies start
5. **Resource limits**: Add memory/CPU limits in production
6. **Logging**: Use structured logging and external log aggregation
7. **Secrets**: Use Docker secrets or environment-specific secret management

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Spring Boot with Docker](https://spring.io/guides/gs/spring-boot-docker/)
- [Vite Docker Guide](https://vitejs.dev/guide/build.html#docker)

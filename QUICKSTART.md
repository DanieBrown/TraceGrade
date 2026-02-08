# TraceGrade - Quick Start Guide

Get TraceGrade running in under 2 minutes!

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## 3 Simple Steps

### 1. Setup Environment

```bash
cp .env.example .env
```

### 2. Start the Application

```bash
docker compose up
```

### 3. Access the Application

Open your browser to:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **API Health Check**: http://localhost:8080/actuator/health

## That's It!

You now have a fully functional TraceGrade instance running with:
- ✅ React frontend with hot-reload
- ✅ Spring Boot backend
- ✅ PostgreSQL database
- ✅ Redis cache

## Stop the Application

```bash
docker compose down
```

## Optional: Database Management UI

Start with pgAdmin for visual database management:

```bash
docker compose --profile tools up
```

Then access pgAdmin at http://localhost:5050

**Default Credentials:**
- Email: `admin@tracegrade.local`
- Password: `admin`

**Connect to Database:**
- Host: `postgres`
- Port: `5432`
- Database: `tracegrade`
- Username: `tracegrade`
- Password: `tracegrade_dev_password`

## Common Commands

```bash
# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart backend

# Complete reset (removes all data)
docker compose down -v
```

## Using the Makefile (Alternative)

If you have `make` installed:

```bash
# Setup environment
make setup

# Start services
make up

# View logs
make logs-f

# Stop services
make down

# See all commands
make help
```

## Need More Details?

- Full Docker guide: [DOCKER.md](DOCKER.md)
- Complete README: [README.md](README.md)
- Technical specs: [specs/decisions.md](specs/decisions.md)

## Troubleshooting

### Port Already in Use

If ports 5173, 8080, or 5432 are already in use, edit `.env`:

```env
FRONTEND_PORT=3000
BACKEND_PORT=8081
POSTGRES_PORT=5433
```

Then restart:

```bash
docker compose down
docker compose up
```

### Services Won't Start

Check Docker is running:

```bash
docker --version
docker compose --version
```

View detailed logs:

```bash
docker compose logs backend
docker compose logs postgres
```

### Database Connection Issues

Wait for health checks to pass (takes ~10 seconds):

```bash
docker compose ps
```

All services should show "healthy" status.

## Next Steps

1. **Explore the API**: Visit http://localhost:8080/actuator/health
2. **View the Frontend**: Open http://localhost:5173
3. **Read the Docs**: Check out [DOCKER.md](DOCKER.md) for advanced usage
4. **Start Developing**: The frontend has hot-reload enabled, so changes appear instantly!

---

**Happy coding!** 🎉

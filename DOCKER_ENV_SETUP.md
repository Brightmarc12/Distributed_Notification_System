# Docker Container Networking - Environment Variables Guide

## Understanding Docker Container Networking

When services run **inside Docker containers**, they communicate using **service names** from `docker-compose.yml`, NOT `localhost`.

### Why?
- `localhost` inside a container refers to **that container itself**, not other containers
- Docker Compose creates a network where containers can reach each other by their **service names**
- Service names are defined in `docker-compose.yml` (e.g., `user_service`, `rabbitmq`, `postgres-db`)

## Important: Service Name vs Database Name

**`postgres-db` is NOT a database name - it's the Docker service name (hostname)!**

Think of it like this:
```
┌─────────────────────────────────────────┐
│  Docker Container: postgres-db          │  ← This is the SERVICE NAME (hostname)
│  ┌───────────────────────────────────┐  │
│  │  PostgreSQL Server                │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Database: user_service_db   │  │  │  ← These are the DATABASE NAMES
│  │  └─────────────────────────────┘  │  │     (you created these in pgAdmin)
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Database: template_service_db│  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Connection String Format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME
                    ↑         ↑
                    |         └─── Service name (postgres-db) for Docker
                    |             OR localhost for local development
                    └───────────── Database name (user_service_db or template_service_db)
```

**You already created the databases in pgAdmin - that's perfect!** You just need to change the HOST part from `localhost` to `postgres-db` when running in Docker.

## Service Names from docker-compose.yml

| Service Name | What It Is | Port |
|-------------|------------|------|
| `postgres-db` | PostgreSQL Database | 5432 |
| `redis` | Redis Cache | 6379 |
| `rabbitmq` | RabbitMQ Message Broker | 5672 (AMQP), 15672 (Management UI) |
| `user_service` | User Service | 3001 |
| `template_service` | Template Service | 3002 |
| `api_gateway_service` | API Gateway | 3000 |
| `email_service` | Email Service | (no exposed port) |
| `push_service` | Push Service | (no exposed port) |

## Environment Variables That Need Updating

### 1. **user_service/.env**

**For Local Development (localhost):**
```env
DATABASE_URL=postgresql://postgres:betozour30@localhost:5432/user_service_db
PORT=3001
```
*Breaking down the connection string:*
- `postgres` = PostgreSQL username (you used this in pgAdmin)
- `betozour30` = PostgreSQL password (from docker-compose.yml)
- `localhost` = hostname (your computer)
- `5432` = PostgreSQL port
- `user_service_db` = **database name** (the one you created in pgAdmin) ✅

**For Docker (use service name):**
```env
DATABASE_URL=postgresql://postgres:betozour30@postgres-db:5432/user_service_db
PORT=3001
```
*Breaking down the connection string:*
- `postgres` = PostgreSQL username (same as above)
- `betozour30` = PostgreSQL password (same as above)
- `postgres-db` = **hostname** (Docker service name, NOT a database name!)
- `5432` = PostgreSQL port (same)
- `user_service_db` = **database name** (same database you created in pgAdmin) ✅

**Change:** Only `localhost` → `postgres-db` (the hostname changes, database name stays the same!)

---

### 2. **template_service/.env**

**For Local Development (localhost):**
```env
DATABASE_URL=postgresql://postgres:betozour30@localhost:5432/template_service_db
PORT=3002
```
*Breaking down the connection string:*
- `postgres` = PostgreSQL username
- `betozour30` = PostgreSQL password
- `localhost` = hostname (your computer)
- `5432` = PostgreSQL port
- `template_service_db` = **database name** (the one you created in pgAdmin) ✅

**For Docker (use service name):**
```env
DATABASE_URL=postgresql://postgres:betozour30@postgres-db:5432/template_service_db
PORT=3002
```
*Breaking down the connection string:*
- `postgres` = PostgreSQL username (same)
- `betozour30` = PostgreSQL password (same)
- `postgres-db` = **hostname** (Docker service name)
- `5432` = PostgreSQL port (same)
- `template_service_db` = **database name** (same database you created in pgAdmin) ✅

**Change:** Only `localhost` → `postgres-db` (the hostname changes, database name stays the same!)

---

### 3. **api_gateway_service/.env**

**For Local Development (localhost):**
```env
RABBITMQ_URL=amqp://user:password@localhost:5672
USER_SERVICE_URL=http://localhost:3001
TEMPLATE_SERVICE_URL=http://localhost:3002
PORT=3000
```

**For Docker (use service names):**
```env
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
USER_SERVICE_URL=http://user_service:3001
TEMPLATE_SERVICE_URL=http://template_service:3002
PORT=3000
```

**Changes:**
- `localhost:5672` → `rabbitmq:5672` (for RabbitMQ)
- `localhost:3001` → `user_service:3001` (for User Service)
- `localhost:3002` → `template_service:3002` (for Template Service)

---

### 4. **email_service/.env**

**For Local Development (localhost):**
```env
RABBITMQ_URL=amqp://user:password@localhost:5672
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**For Docker (use service name):**
```env
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**Change:** `localhost:5672` → `rabbitmq:5672` (for RabbitMQ)

**Note:** SMTP settings don't change - they point to external email servers, not Docker services.

---

### 5. **push_service/.env**

**For Local Development (localhost):**
```env
RABBITMQ_URL=amqp://user:password@localhost:5672
FCM_CREDENTIALS_PATH=./fcm-service-account.json
```

**For Docker (use service name):**
```env
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
FCM_CREDENTIALS_PATH=./fcm-service-account.json
```

**Change:** `localhost:5672` → `rabbitmq:5672` (for RabbitMQ)

**Note:** FCM_CREDENTIALS_PATH should be relative to the container's working directory.

---

## Quick Reference: What Changes Where

| Environment Variable | Local Development | Docker Container |
|---------------------|-------------------|------------------|
| `DATABASE_URL` | `@localhost:5432` | `@postgres-db:5432` |
| `RABBITMQ_URL` | `@localhost:5672` | `@rabbitmq:5672` |
| `USER_SERVICE_URL` | `http://localhost:3001` | `http://user_service:3001` |
| `TEMPLATE_SERVICE_URL` | `http://localhost:3002` | `http://template_service:3002` |
| `REDIS_URL` (if used) | `redis://localhost:6379` | `redis://redis:6379` |

## Summary: What You Need to Know

### ✅ What Stays the Same:
- **Database names** (`user_service_db`, `template_service_db`) - You already created these in pgAdmin, keep using them!
- **PostgreSQL username** (`postgres`) - Same as you used in pgAdmin
- **PostgreSQL password** (`betozour30`) - From docker-compose.yml
- **Port numbers** (5432, 5672, 3001, etc.) - All stay the same
- **All other settings** (SMTP, FCM, etc.) - No changes needed

### 🔄 What Changes:
- **Only the HOSTNAME** in connection strings:
  - `localhost` → `postgres-db` (for database connections)
  - `localhost` → `rabbitmq` (for RabbitMQ connections)
  - `localhost` → `user_service` (for service-to-service HTTP calls)
  - `localhost` → `template_service` (for service-to-service HTTP calls)

### 🎯 The Key Point:
**`postgres-db` is just a hostname (like an address), NOT a database name!**

When you connect to PostgreSQL:
- **Hostname:** `postgres-db` (tells Docker which container to connect to)
- **Database:** `user_service_db` or `template_service_db` (the actual databases you created in pgAdmin)

Think of it like mailing a letter:
- **Hostname** = Street address (`postgres-db`)
- **Database name** = Apartment number (`user_service_db`)

## Important Notes

1. **Ports stay the same** - Only the hostname changes (localhost → service name)
2. **External services** (like SMTP) don't change - they're outside Docker
3. **Management UIs** - You still access RabbitMQ UI from your host machine at `http://localhost:15672`
4. **Port mappings** - The `ports:` in docker-compose.yml expose services to your host machine, but containers use service names internally

## Testing

After updating your `.env` files:
1. Build and start containers: `docker-compose up --build`
2. Check logs to verify connections are successful
3. Test API endpoints from your host machine (they still use `localhost` from outside Docker)


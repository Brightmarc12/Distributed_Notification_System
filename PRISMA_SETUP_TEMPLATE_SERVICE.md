# Prisma Setup for Template Service (Local Development)

## Prerequisites

- PostgreSQL is running (locally or in Docker)
- You have access to pgAdmin or psql command line
- Node.js and npm are installed

## Step-by-Step Instructions

### Step 1: Create the Database

**Option A: Using pgAdmin (GUI)**

1. Open pgAdmin
2. Connect to your PostgreSQL server (usually `localhost:5432`)
3. Right-click on "Databases" → "Create" → "Database..."
4. Set the database name: `template_service_db`
5. Set the owner: `postgres` (or your PostgreSQL user)
6. Click "Save"

**Option B: Using psql (Command Line)**

```bash
# Connect to PostgreSQL (you'll be prompted for password)
psql -U postgres -h localhost

# Once connected, create the database
CREATE DATABASE template_service_db;

# Exit psql
\q
```

**Option C: Using psql with password in command (one-liner)**

```bash
psql -U postgres -h localhost -c "CREATE DATABASE template_service_db;"
# You'll be prompted for password, or use PGPASSWORD environment variable
```

---

### Step 2: Set Up Environment Variables

Create or update `template_service/.env` file:

```env
DATABASE_URL=postgresql://postgres:betozour30@localhost:5432/template_service_db
PORT=3002
```

**Replace:**

- `postgres` with your PostgreSQL username (if different)
- `betozour30` with your PostgreSQL password (if different)
- `localhost:5432` with your PostgreSQL host and port (if different)

---

### Step 3: Navigate to Template Service Directory

```bash
cd template_service
```

---

### Step 4: Install Dependencies (if not already done)

```bash
npm install
```

---

### Step 5: Generate Prisma Client

This reads your `prisma/schema.prisma` and generates the Prisma Client code:

```bash
npx prisma generate
```

**Or using the npm script:**

```bash
npm run prisma:generate
```

**Expected output:**

```
✔ Generated Prisma Client (version X.X.X) to ./node_modules/@prisma/client
```

---

### Step 6: Run Prisma Migrations

This will apply all pending migrations to create the tables:

```bash
npx prisma migrate deploy
```

**Or if you want to create a new migration (development mode):**

```bash
npx prisma migrate dev
```

**Or using the npm script:**

```bash
npm run prisma:migrate
```

**Expected output:**

```
✔ Applied migration `20251110003210_init_templates`
```

---

### Step 7: Verify the Setup

**Option A: Check tables using Prisma Studio (GUI)**

```bash
npx prisma studio
# Or using npm script:
npm run prisma:studio
```

This will open a browser at `http://localhost:5555` where you can see your database tables.

**Option B: Check using pgAdmin**

1. Open pgAdmin
2. Navigate to: `Servers` → `PostgreSQL` → `Databases` → `template_service_db` → `Schemas` → `public` → `Tables`
3. You should see:
   - `Template`
   - `TemplateVersion`
   - `_prisma_migrations` (Prisma's migration tracking table)

**Option C: Check using psql**

```bash
psql -U postgres -h localhost -d template_service_db -c "\dt"
```

**Expected output:**

```
                    List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+----------
 public | Template              | table | postgres
 public | TemplateVersion       | table | postgres
 public | _prisma_migrations    | table | postgres
```

---

## Quick Reference: All Commands in Order

```bash
# 1. Navigate to template service
cd template_service

# 2. Install dependencies (if needed)
npm install

# 3. Generate Prisma Client
npx prisma generate
# OR: npm run prisma:generate

# 4. Run migrations
npx prisma migrate deploy
# OR: npm run prisma:migrate

# 5. (Optional) Open Prisma Studio to verify
npx prisma studio
# OR: npm run prisma:studio
```

---

## Troubleshooting

### Error: "Database `template_service_db` does not exist"

**Solution:** Make sure you created the database first (Step 1)

### Error: "Connection refused" or "ECONNREFUSED"

**Solution:**

- Check if PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Verify your `DATABASE_URL` in `.env` file
- Check PostgreSQL is listening on the correct port

### Error: "Authentication failed"

**Solution:**

- Verify username and password in `DATABASE_URL`
- Check PostgreSQL user permissions

### Error: "Migration already applied"

**Solution:** This is normal if migrations were already run. You can check migration status:

```bash
npx prisma migrate status
```

### Error: "Prisma Client not generated"

**Solution:** Run `npx prisma generate` first before running migrations

---

## What Each Command Does

| Command                   | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `prisma generate`       | Generates Prisma Client code from your schema    |
| `prisma migrate deploy` | Applies all pending migrations (production-safe) |
| `prisma migrate dev`    | Creates new migration + applies it (development) |
| `prisma migrate status` | Shows which migrations have been applied         |
| `prisma studio`         | Opens a GUI to view/edit your database           |

---

## Next Steps

After setting up the database:

1. Start the template service: `npm start` or `npm run dev`
2. Test the API endpoints
3. When ready for Docker, update `.env` to use `postgres-db` instead of `localhost`

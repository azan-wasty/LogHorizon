# LogHorizon

Sprint 1 delivers a full-stack foundation:
- Backend: Node.js + Express, layered architecture (controllers/services/models)
- Database: MSSQL via Prisma ORM
- Auth: JWT register/login, hashed passwords, roles (Admin/User)
- Admin: CRUD content management (including Discord links)
- Tagging: link Content to Tags (many-to-many)
- Frontend: Next.js (protected routes + preference selection UI + admin UI)

## Requirements
- Node.js 18+ (recommended)
- SQL Server running on your machine/network

## Database setup
Create a new database (you already created one). Example name: `LogHorizonDB`.

## Environment variables
Create `backend/.env`:

```env
# SQL Server
DB_SERVER=DESKTOP-I4HH826
DB_PORT=1433
DB_DATABASE=LogHorizonDB
DB_USER=sa
DB_PASSWORD=12345678

# App
PORT=6767
JWT_SECRET=replace_me

# Prisma can use this directly if you prefer (optional)
# DATABASE_URL="sqlserver://sa:12345678@DESKTOP-I4HH826:1433;database=LogHorizonDB;trustServerCertificate=true"
```

Create `frontend/.env.local` (optional):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:6767
```

## Run (dev)
### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Notes
- Preferences: users can have multiple preferences (Genre/Theme/Mood entries).
- Admin routes require `role=Admin`.
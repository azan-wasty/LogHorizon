# LogHorizon: Modernized Full-Stack Content Indexing

LogHorizon is a state-of-the-art content management platform featuring a high-fidelity architecture, automated metadata ingestion, and a premium dark-mode interface.

## Tech Stack
- Frontend: React (Vite) + Lucide Icons + Framer Motion
- Backend: Node.js (Express.js) - Layered Services/Controllers Architecture
- Database: PostgreSQL managed via Prisma ORM
- Automation: Advanced Ingestion Pipeline (Jikan, TMDB integration)

## Core Features
- Void Codex UI: A complete premium dark-mode interface using the "Electric Purple" design system.
- Automated Ingestion: Rapid metadata fetching for Anime, Manga, Movies, and TV with robust error handling.
- Library and Favourites: Personal content tracking with custom status updates and engagement metrics.
- Community and Events: Discord-integrated event hosting with administrative approval workflows.
- Member Management: Unified Admin Panel for user role management and content curation.
- Standardized Identity: Username-based identification system across all dashboard and profile views.
- Retractable Sidebar: Dynamic, responsive navigation with a sleek retractable tab system.

## Setup Instructions

### 1. Requirements
- Node.js 18+
- PostgreSQL database (e.g., Supabase or local instance)
- TMDB API Key (for movie and TV metadata fetching)

### 2. Database Setup
Ensure your PostgreSQL instance is active and the database is accessible via your connection string.

### 3. Environment Variables
In backend/.env:
```env
PORT=6767
JWT_SECRET=your_jwt_secret_here
DATABASE_URL="postgresql://user:pass@host:port/dbname"
TMDB_API_KEY=your_tmdb_key_here
```

### 4. Running the Application

Backend:
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at http://localhost:3000.

## Project Structure
- /backend: Express API, Prisma Schema, Ingestion Services.
- /frontend: React Application with custom design system.
- /docs: Official submission reports and iteration records.
- API_REFERENCE.md: Detailed endpoint technical documentation.

## Scrum Board Progress
- Start: [Initial Sprint Planning]
- During: [Development Phase]
- End: [Feature Finalization]

## Team
- Azan Wasty (@azan_w) - Lead Architect

---
Developed for Software Engineering | Spring 2026 | FAST-NUCES
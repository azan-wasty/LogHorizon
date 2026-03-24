#  LogHorizon: Modernized Full-Stack Content Indexing

Sprint 1 delivers a state-of-the-art content management foundation, transitioning the platform to a high-fidelity architecture with automated metadata ingestion and a premium dark-mode interface.

##  Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS v4 + Lucide Icons + Framer Motion
- **Backend**: Node.js (Express.js) - Layered Services/Controllers Architecture
- **Database**: Microsoft SQL Server (MSSQL) managed via Prisma ORM
- **Automation**: Ingestion Pipeline (Jikan, TMDB, Google Books API integration)

##  Sprint 1 Features
- **Void Codex UI**: A complete premium dark-mode redesign using the "Electric Purple" design system.
- **Automated Ingestion**: Rapid metadata fetching for Anime, Manga, Movies, TV, and Books.
- **Member Management**: Unified Admin Panel to promote users and manage content/tags.
- **Neural Nodes**: Preference selection system (Mood/Theme/Genre) for future recommendation engines.
- **Secure Auth**: JWT-based authentication with role-based access control (RBAC).

##  Setup Instructions

### 1. Requirements
- Node.js 18+
- Microsoft SQL Server
- [TMDB API Key](https://www.themoviedb.org/settings/api) (Optional: for movie ingestion)

### 2. Database Setup
Ensure your SQL Server instance is active and the database (e.g., `LogHorizonDB`) is created.

### 3. Environment Variables
**In `backend/.env`**:
```env
# SQL Server Connection string
DATABASE_URL="sqlserver://<user>:<pass>@<server>:<port>;database=LogHorizonDB;trustServerCertificate=true"

# App Settings
PORT=6767
JWT_SECRET=your_jwt_secret_here

# External APIs
TMDB_API_KEY=your_tmdb_key_here
```

### 4. Running the Application
**Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:3000` (or `3001/3002`).

##  Project Structure
- **/backend**: Express API, Prisma Schema, Ingestion Services.
- **/frontend**: React Application, Tailwind v4 Styles.
- **/docs**: Official submission reports and iteration records.
- **API_REFERENCE.md**: Detailed endpoint technical documentation.

## 👥 Team
- **Azan Wasty** (@azan_w) - Lead Architect 
- **Mahareb Ammar**  - Frontend
- **Ali Naveed**  - Tester

---
*Developed for  Fundamentals Of Software Engineering | Spring 2026 | FAST-NUCES*

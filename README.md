# LogHorizon: Modernized Full-Stack Content Indexing

LogHorizon is a state-of-the-art content management platform featuring a high-fidelity architecture, automated metadata ingestion, and a premium dark-mode interface.

##  Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS v4 + Lucide Icons + Framer Motion
- **Backend**: Node.js (Express.js) - Layered Services/Controllers Architecture
- **Database**: PostgreSQL managed via Prisma ORM
- **State Management**: @tanstack/react-query
- **3D & Visualization**: Three.js, @react-three/face-api, ogl, postprocessing
- **API Integrations**: Jikan (MAL), TMDB for automated metadata fetching

##  Core Features

- **Void Codex UI**: Complete premium dark-mode interface using the "Electric Purple" design system with glassmorphism effects
- **Automated Ingestion**: Rapid metadata fetching for Anime, Manga, Movies, and TV with robust error handling and Jikan/TMDB integration
- **Library & Favourites**: Personal content tracking with custom status updates (PLANNING, CURRENT, COMPLETED, DROPPED), ratings, and engagement metrics
- **Community & Events**: Discord-integrated event hosting with administrative approval workflows
- **Member Management**: Unified Admin Panel for user role management (User/ADMIN) and content curation
- **Standardized Identity**: Username-based identification system across all dashboard and profile views
- **Retractable Sidebar**: Dynamic, responsive navigation with a sleek retractable tab system
- **Recommendation Engine**: Weighted tag overlap and library-aware scoring with preference-based filtering
- **Content Relationships**: Parent/child content support for sequels, prequels, and adaptations
- **Activity Feed**: Logging of user actions (watching, favoriting, rating, reviewing) with reactions and comments

##  Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) database (Supabase, ElephantSQL, or local instance)
- TMDB API key (for movie and TV metadata fetching)

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=6767
JWT_SECRET=your_jwt_secret_here
DATABASE_URL="postgresql://user:pass@host:port/dbname"
TMDB_API_KEY=your_tmdb_key_here
```

Copy from `.env.example` for reference.

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 3. Database Setup

Ensure your PostgreSQL instance is active and accessible via your `DATABASE_URL`. Run Prisma migrations:

```bash
cd backend
npx prisma generate
npx prisma db push
# Or with migrations:
npx prisma migrate dev --name init
```

### 4. Running the Application

```bash
# Backend (development mode with auto-reload)
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

The application will be accessible at `http://localhost:3000`.

**Available Backend Scripts:**

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm run start` | Start production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create/manage migrations |
| `npm run prisma:studio` | Open Prisma Studio UI |

**Available Frontend Scripts:**

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

##  Project Structure

```
/backend         → Express API, Prisma Schema, Ingestion Services
/frontend        → React Application with custom design system
/docs            → Official submission reports and iteration records
API_REFERENCE.md → Detailed endpoint technical documentation
```

### Backend Routes (organised under `/api`)

- `/api/auth` - Registration, login, profile
- `/api/me` - Current user info
- `/api/preferences` - User preference management
- `/api/library` - Personal library (add/remove items, status/rating updates)
- `/api/content` - Public content listing and detail
- `/api/tags` - Public tag listing
- `/api/admin` - Admin-only: content CRUD, user management, tag management
- `/api/library` - Library operations
- `/api/favourites` - Favourite management
- `/api/recommendations` - Personalized content recommendations
- `/api/events` - Discord event management
- `/api/users` - Community/user management
- `/api/reviews` - Content reviews
- `/api/friends` - Friend system
- `/api/activity` - Activity feed

##  Development Notes

- **CORS**: Configured for `localhost:3000` (Vite) and `localhost:5173` (alternative dev server). Vercel deployments (`*.vercel.app`) are automatically allowed.
- **Authentication**: JWT-based with Bcrypt password hashing. Protected routes require `Authorization: Bearer <token>` header.
- **Admin Routes**: All `/admin/*` endpoints require valid JWT **and** role: `"Admin"` (returns 403 otherwise).
- **Rate Limiting**: Not implemented in current version; consider adding for production.

##  Deployment

- **Vercel**: The project includes `vercel.json` configs for both backend and frontend. Set environment variables in the Vercel dashboard.
- **Supabase**: Database connection strings are configured for Supabase PostgreSQL. The `DATABASE_URL` env var should point to your Supabase project.

##  Team

- **Azan Wasty** (@azan_w) - Lead Architect

##  License

Developed for Software Engineering | Spring 2026 | FAST-NUCES

---

*For detailed API documentation, see `API_REFERENCE.md` or the `api.md` file in the root.*
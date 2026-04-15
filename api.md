# LogHorizon API Reference

**Base URL:** `http://localhost:6767/api`  
**Auth:** Bearer token in `Authorization` header  
**Content-Type:** `application/json`

---

## Authentication

### Register
`POST /register`

**Body**
```json
{
  "username": "azan",
  "email": "azan@example.com",
  "password": "password123"
}
```

**Responses**
| Status | Meaning |
|--------|---------|
| 201 | Registered successfully |
| 400 | Validation error (username < 3 chars, invalid email, password < 8 chars) |
| 409 | Email or username already in use |

```json
{ "ok": true, "message": "registered", "user": { "id": 1, "username": "azan", "email": "...", "role": "User", "createdAt": "...", "updatedAt": "..." } }
```

---

### Login
`POST /login`

**Body**
```json
{
  "email": "azan@example.com",
  "password": "password123"
}
```

**Responses**
| Status | Meaning |
|--------|---------|
| 200 | Logged in, returns JWT |
| 401 | Invalid credentials |

```json
{ "ok": true, "token": "<jwt>", "user": { "id": 1, "username": "azan", "role": "User", ... } }
```

> Store the `token` value. Send it on every protected request:  
> `Authorization: Bearer <token>`

---

## Current User

### Get My Profile
`GET /me` 

```json
{ 
  "ok": true, 
  "user": { "id": 1, "username": "azan", "role": "User", "..." },
  "achievements": [
    { "id": "FIRST_COMPLETE", "title": "First Blood", "description": "Complete your first entry", "icon": "Swords", "unlockedAt": "..." }
  ]
}
```

---

## Preferences

### Get All Available Options
`GET /preferences/options`

```json
{
  "ok": true,
  "options": {
    "Genre":  [{ "id": 1, "type": "Genre", "value": "Action" }, ...],
    "Theme":  [{ "id": 7, "type": "Theme", "value": "Friendship" }, ...],
    "Mood":   [{ "id": 11, "type": "Mood", "value": "Chill" }, ...]
  }
}
```

---

### Get My Preferences
`GET /preferences/me` 

```json
{
  "ok": true,
  "preferenceOptionIds": [1, 3, 11],
  "preferences": {
    "Genre": [{ "id": 1, "type": "Genre", "value": "Action" }],
    "Mood":  [{ "id": 11, "type": "Mood", "value": "Chill" }]
  }
}
```

---

### Set My Preferences
`POST /preferences` 
Replaces all current preferences. Send empty array to clear.

**Body**
```json
{ "preferenceOptionIds": [1, 3, 11] }
```

```json
{ "ok": true, "message": "preferences saved", "preferenceOptionIds": [1, 3, 11] }
```

---

## User Library

### Get My Library
`GET /library`

Returns the user's saved items.

```json
{
  "ok": true,
  "library": [
    {
      "id": 1,
      "userId": 1,
      "contentId": 42,
      "status": "COMPLETED",
      "rating": 9,
      "createdAt": "...",
      "updatedAt": "...",
      "content": {
        "id": 42,
        "title": "Neon Genesis Evangelion",
        "category": "Anime",
        "...": "..."
      }
    }
  ]
}
```

---

### Update Library Item
`POST /library/update`

Add or update a library entry.

**Body**
```json
{
  "contentId": 42,
  "status": "COMPLETED",
  "rating": 9
}
```
`status` can be `"PLANNING"`, `"COMPLETED"`, `"CURRENT"`, `"DROPPED"`.
`rating` is optional (integer).

```json
{
  "ok": true,
  "entry": {
    "id": 1,
    "userId": 1,
    "contentId": 42,
    "status": "COMPLETED",
    "rating": 9,
    "...": "..."
  },
  "newUnlocks": [
    { "id": "FIRST_COMPLETE", "title": "First Blood", "description": "Complete your first entry", "icon": "Swords" }
  ]
}
```
*Note: `newUnlocks` will contain any freshly earned achievements triggered by this update.*

---

### Remove from Library
`DELETE /library/:contentId`

Removes an item from the library.

```json
{ "ok": true, "message": "Removed from library" }
```

---

## Recommendations

### Get Recommendations
`GET /recommendations`

Returns content ranked by weighted tag overlap and library-aware scoring.

**Query params (all optional)**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max items to return (default 20, max 50) |
| `offset` | number | Pagination offset (default 0) |
| `category` | string | Filter by category |

```json
{
  "ok": true,
  "recommendations": [
    {
      "id": 15,
      "title": "Steins;Gate",
      "category": "Anime",
      "...": "...",
      "_score": 6.5,
      "_matchedTags": [{ "id": 4, "type": "Genre", "name": "Sci-Fi", "weight": 3 }],
      "_inLibrary": false
    }
  ],
  "explore": [
    {
      "id": 20,
      "title": "A Silent Voice",
      "category": "Anime",
      "...": "...",
      "_score": 0,
      "_matchedTags": [],
      "_inLibrary": false
    }
  ],
  "total": 12,
  "hasPreferences": true,
  "preferenceCount": 3
}
```

---

### Get Recommendation Stats
`GET /recommendations/stats`

Returns statistics on recommendations matching the user's preferences, combined with library stats.

```json
{
  "ok": true,
  "stats": {
    "Anime": 15,
    "Manga": 3
  },
  "topGenres": ["Action", "Sci-Fi"],
  "matchRate": 45,
  "hasPreferences": true,
  "libraryStats": {
    "total": 10,
    "completed": 5,
    "planning": 3,
    "current": 2
  }
}
```

---

## Content (Public)

### List Content
`GET /content`

**Query params (all optional)**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category |
| `tagId` | number | Filter by tag ID |

```json
{
  "ok": true,
  "content": [
    {
      "id": 1,
      "title": "Attack on Titan",
      "category": "Anime",
      "description": "...",
      "discordLink": "https://discord.gg/...",
      "createdAt": "...",
      "updatedAt": "...",
      "tags": [{ "id": 2, "type": "Genre", "name": "Action" }]
    }
  ]
}
```

---

### Get Single Content
`GET /content/:id`

```json
{ "ok": true, "content": { ... } }
```

| Status | Meaning |
|--------|---------|
| 200 | Found |
| 404 | Not found |

---

## Tags (Public)

### List All Tags
`GET /tags`

```json
{
  "ok": true,
  "tags": {
    "Genre": [{ "id": 1, "type": "Genre", "name": "Action" }, ...],
    "Mood":  [{ "id": 5, "type": "Mood",  "name": "Chill" }, ...]
  }
}
```

---

## Admin — Content 

> All `/admin/*` routes require a valid JWT **and** `role: "Admin"`.  
> Returns `403` if role is not Admin.

### List Content
`GET /admin/content`

### Get Content
`GET /admin/content/:id`

### Create Content
`POST /admin/content`

**Body**
```json
{
  "title": "Attack on Titan",
  "category": "Anime",
  "description": "Humanity fights for survival against giant humanoids.",
  "discordLink": "https://discord.gg/example",
  "tagIds": [1, 5],
  "externalId": "16498",
  "source": "MAL",
  "coverImage": "https://cdn.myanimelist.net/...",
  "status": "Finished",
  "rating": 9.0,
  "externalUrl": "https://myanimelist.net/anime/16498"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| title | ✅ | |
| category | ✅ | |
| description | ✅ | |
| discordLink | ❌ | nullable |
| tagIds | ❌ | array of existing Tag IDs |
| externalId | ❌ | ID from source API |
| source | ❌ | `"MAL"` / `"AniList"` / `"Kitsu"` / `"Manual"` |
| coverImage | ❌ | poster URL |
| status | ❌ | `"Airing"` / `"Finished"` / `"Upcoming"` / `"Hiatus"` |
| rating | ❌ | float e.g. `8.7` |
| externalUrl | ❌ | link to source page |

**Response:** `201` with created content object.

---

### Automated Ingestion
`POST /admin/content/ingest`  
Scans external APIs (Jikan/MAL, Google Books, TMDB) and automatically creates a new content record with mapped tags.

**Body**
```json
{
  "title": "Neon Genesis Evangelion",
  "category": "Anime"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| title | ✅ | Exact title preferred |
| category | ✅ | `"Anime"` / `"Manga"` / `"Movie"` / `"TV"` / `"Book"` |

**Responses**
| Status | Meaning |
|--------|---------|
| 201 | Successfully fetched and created |
| 404 | Title not found in external index |
| 500 | External API error or DB failure |

```json
{
  "ok": true,
  "content": {
    "id": 42,
    "title": "Neon Genesis Evangelion",
    "category": "Anime",
    "description": "...",
    "externalId": "1",
    "source": "Jikan",
    "tags": [{ "tag": { "name": "Action", "type": "Genre" } }, ...]
  }
}
```

---

### Update Content
`PUT /admin/content/:id`

Same body as create but all fields optional. If `tagIds` is provided, **replaces** all tags on that content.

```json
{ "discordLink": "https://discord.gg/new-link", "tagIds": [1, 2, 3] }
```

---

### Delete Content
`DELETE /admin/content/:id`

```json
{ "ok": true, "message": "content deleted" }
```

---

## Admin — Tags 

### List Tags
`GET /admin/tags`

### Get Tag
`GET /admin/tags/:id`

### Create Tag
`POST /admin/tags`

```json
{ "type": "Genre", "name": "Horror" }
```

| Status | Meaning |
|--------|---------|
| 201 | Created |
| 409 | type + name combination already exists |

### Update Tag
`PUT /admin/tags/:id`

```json
{ "name": "Dark Horror" }
```

### Delete Tag
`DELETE /admin/tags/:id`

> Deleting a tag also removes it from all content (via cascade).

---

## User Management

Manage system users and access levels.

### List Users
`GET /admin/users`

**Responses**
```json
{
  "ok": true,
  "users": [
    {
      "id": 1,
      "username": "azan_a",
      "email": "azan90308@gmail.com",
      "role": "ADMIN",
      "createdAt": "2023-11-01T..."
    },
    ...
  ]
}
```

### Update User Role
`PUT /admin/users/:id/role`

**Request Body**
```json
{ "role": "ADMIN" } // or "USER"
```

**Responses**
| Status | Meaning |
|--------|---------|
| 200 | Role updated successfully |
| 400 | Invalid ID or role |
| 404 | User not found |

---

## Error Format

All errors follow this shape:

```json
{ "ok": false, "message": "human readable error" }
```

| Status | When |
|--------|------|
| 400 | Bad request / validation |
| 401 | Missing or invalid JWT |
| 403 | Valid JWT but not Admin |
| 404 | Resource not found |
| 409 | Unique constraint conflict |
| 500 | Server error |

---

## Auth Flow Summary

```
1. POST /register        → creates account
2. POST /login           → returns { token, user }
3. Store token           → localStorage / memory
4. All 🔒 requests      → Authorization: Bearer <token>
5. GET /me               → verify token, get user info
```

---

## Roles

| Role | Access |
|------|--------|
| `User` | Public endpoints + own preferences + `/me` |
| `Admin` | Everything above + all `/admin/*` endpoints |



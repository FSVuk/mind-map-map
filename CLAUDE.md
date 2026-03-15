# World Map Campaign Tool — CLAUDE.md

## Project Overview

An interactive web-based world map tool for a collaborative game project. The primary user (Alex) creates and edits content — placing map pins, writing lore notes, uploading concept art. The secondary user (David) consumes the content as a read-only interactive map he can explore, filter, and zoom into.

Think of it as a **zoomable map with Obsidian-style notes pinned to locations**, plus toggleable filter layers for terrain, factions, concept art, etc.

## Architecture

### Stack
- **Framework**: Next.js (App Router)
- **Map Engine**: Leaflet.js (zoomable tile-based map with overlay layers)
- **3D Terrain** (future): Three.js heightmap displacement rendering, embedded as a toggle view
- **Database**: SQLite (via `better-sqlite3` or Drizzle ORM with SQLite driver)
- **Image Storage**: Local filesystem (`/data/uploads/`) — images served via Next.js API route or static middleware
- **Styling**: Tailwind CSS
- **Deployment**: Docker on a VPS (Hetzner/DigitalOcean, ~$5-10/mo)

### Why These Choices
- SQLite + local file storage: simplest architecture that supports in-app editing and image uploads. Everything on one box. No external services for MVP.
- Leaflet.js: purpose-built for zoomable tile maps with overlay layers. Natively supports the filter/layer toggle pattern.
- Next.js: server-side API routes handle auth, file uploads, and database writes without a separate backend.

## Data Model

### Core Entities

```
Location {
  id: string (uuid)
  name: string
  description: string (markdown)
  latitude: float    // Leaflet CRS coordinates on the map image
  longitude: float
  icon_type: string  // e.g. "city", "landmark", "dungeon", "point_of_interest"
  created_at: datetime
  updated_at: datetime
}

Note {
  id: string (uuid)
  title: string
  content: string (markdown)
  category: enum ["faction", "history", "lore", "character", "item", "event"]
  created_at: datetime
  updated_at: datetime
}

LocationNote {
  location_id: fk -> Location
  note_id: fk -> Note
}
// Many-to-many: a location can have multiple notes, a note (e.g. a faction) can be linked to multiple locations

Image {
  id: string (uuid)
  filename: string
  filepath: string        // relative path in /data/uploads/
  alt_text: string
  image_type: enum ["concept_art", "map_overlay", "icon", "reference"]
  created_at: datetime
}

LocationImage {
  location_id: fk -> Location
  image_id: fk -> Image
  sort_order: int
}

MapLayer {
  id: string (uuid)
  name: string           // e.g. "Terrain", "Faction Control", "Points of Interest", "Concept Art"
  layer_type: enum ["base", "overlay", "marker_group"]
  description: string
  visible_by_default: boolean
  sort_order: int
}
```

### Map Tile System
The base map is a high-resolution image (exported from the AI-refined sketch). It needs to be sliced into tiles for smooth Leaflet zoom. Use `Leaflet.CRS.Simple` (pixel coordinates, not lat/lng) since this is a fictional map, not geographic.

Tile generation: use a script (Python with Pillow, or `gdal2tiles.py`) to slice the source image into `/{z}/{x}/{y}.png` tile directories. Store tiles in `/public/tiles/` or `/data/tiles/`.

## Auth & Modes

### Two modes, one app:

**Viewer Mode** (default — David's experience):
- Read-only map interaction
- Click pins to view location details, notes, concept art in a sidebar
- Toggle filter layers on/off
- Zoom and pan freely
- No editing UI visible

**Editor Mode** (Alex's experience):
- Accessed via `/admin` route or login prompt
- Auth: single admin password stored as `ADMIN_PASSWORD` env variable
- Session: set a secure httpOnly cookie on successful login
- Same map view PLUS an editor toolbar:
  - Click anywhere on map to place a new pin
  - Click existing pin → edit its name, description, linked notes, images
  - Inline markdown editor for notes (use a lightweight library like `react-markdown` for rendering, `@uiw/react-md-editor` or similar for editing)
  - Drag-and-drop image upload
  - Create/edit/delete notes (with category tagging)
  - Link/unlink notes to locations
  - Drag pins to reposition

### Auth Implementation
- `POST /api/auth/login` — validates password, sets session cookie
- Middleware checks cookie on `/admin` routes and API write endpoints
- All `GET` endpoints are public (no auth needed for viewer mode)
- All `POST/PUT/DELETE` endpoints require valid session

## Feature Priorities (MVP)

### P0 — Must have for MVP
1. Zoomable tile-based map display (Leaflet + CRS.Simple)
2. Pin placement on map (click to add in editor mode)
3. Location detail sidebar (click pin → see name, description, linked notes)
4. Markdown note editor (create, edit, link to locations)
5. Category-based note organization (factions, history, lore, etc.)
6. Admin auth (single password, cookie session)
7. Basic layer toggle (at minimum: "All Pins" on/off)

### P1 — Important, build soon after MVP
1. Image upload and association with locations
2. Concept art gallery per location (in sidebar)
3. Multiple named filter layers (terrain, factions, POIs, concept art)
4. Pin icon differentiation by type
5. Search/filter notes by category
6. Drag to reposition pins

### P2 — Nice to have / future
1. Three.js 3D terrain view toggle (heightmap-based)
2. Drawable overlay regions (paint faction boundaries on the map)
3. Note cross-linking (wiki-style `[[links]]` between notes)
4. Map versioning (swap in updated base maps without losing pin data)
5. Export/backup (dump SQLite + images as a zip)

## File Structure

```
/
├── CLAUDE.md
├── docker-compose.yml
├── Dockerfile
├── .env.example          # ADMIN_PASSWORD=changeme
├── package.json
├── next.config.js
├── tailwind.config.js
├── /public
│   └── /tiles            # Pre-sliced map tiles ({z}/{x}/{y}.png)
├── /data                 # Persistent volume in Docker
│   ├── app.db            # SQLite database
│   └── /uploads          # User-uploaded images
├── /src
│   ├── /app
│   │   ├── page.tsx                    # Viewer mode (public map)
│   │   ├── /admin
│   │   │   ├── page.tsx                # Editor mode (authed)
│   │   │   └── /login
│   │   │       └── page.tsx            # Login form
│   │   └── /api
│   │       ├── /auth/login/route.ts
│   │       ├── /locations/route.ts     # CRUD
│   │       ├── /notes/route.ts         # CRUD
│   │       ├── /images/upload/route.ts # File upload
│   │       └── /layers/route.ts        # Layer config
│   ├── /components
│   │   ├── MapView.tsx                 # Leaflet map wrapper
│   │   ├── LocationSidebar.tsx         # Detail panel
│   │   ├── NoteEditor.tsx              # Markdown editor
│   │   ├── LayerToggle.tsx             # Filter controls
│   │   ├── EditorToolbar.tsx           # Edit mode controls
│   │   └── PinMarker.tsx              # Custom Leaflet marker
│   ├── /lib
│   │   ├── db.ts                       # SQLite connection & queries
│   │   ├── auth.ts                     # Session management
│   │   └── tiles.ts                    # Tile path helpers
│   └── /types
│       └── index.ts                    # TypeScript interfaces
├── /scripts
│   └── generate-tiles.py              # Slice source map into tiles
└── /docs
    └── setup.md                        # Dev & deployment instructions
```

## Deployment

### Docker Setup
- Single `docker-compose.yml` with one service
- Mount `/data` as a Docker volume for persistence (SQLite + uploads)
- `ADMIN_PASSWORD` passed as environment variable
- Expose on port 3000 behind a reverse proxy (Caddy or nginx) with HTTPS
- Caddy is preferred for auto-SSL with Let's Encrypt

### Environment Variables
```
ADMIN_PASSWORD=<strong-password>
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/app.db
UPLOAD_DIR=/data/uploads
```

### Deployment Commands
```bash
docker compose up -d --build
```

## Map Setup Notes

The base map will be a high-resolution image created through this pipeline:
1. Hand sketch of the world
2. Refined via ComfyUI + Stable Diffusion + ControlNet (clean/modern cartographic style)
3. Exported as high-res PNG (ideally 4K+)
4. Sliced into Leaflet tiles via `scripts/generate-tiles.py`

For initial development, use a placeholder map image. The tile generation script should accept any source image and produce the tile directory structure.

The map uses `Leaflet.CRS.Simple` — coordinates are pixel-based, not geographic. Pin positions are stored as pixel coordinates on the base map.

## Design Guidelines

- **Clean and functional** — this is a tool, not a showcase. Prioritize usability.
- **Dark theme preferred** — easier on the eyes for long worldbuilding sessions, and map colors pop better against dark backgrounds.
- **Sidebar pattern**: clicking a pin opens a right-side panel with location details. Panel should be closeable and not obscure the map.
- **Layer toggle**: floating control panel (top-right or left sidebar) with checkboxes for each layer.
- **Editor toolbar**: appears at top of map in editor mode. Clear visual distinction from viewer mode (e.g. subtle colored border or "EDITING" indicator).
- **Typography**: clean sans-serif for UI, but markdown notes can render with slightly more expressive typography.

## Key Technical Decisions

- **Leaflet.CRS.Simple over geographic CRS**: This is a fictional map. Pixel coordinates are simpler and avoid projection headaches.
- **SQLite over Postgres**: Single-user writes (only Alex edits), no concurrent write pressure. SQLite is zero-config and backs up by copying one file.
- **Local file storage over S3**: Keeps the architecture simple for MVP. One VPS, one volume. Migrate to object storage later if image library grows large.
- **Server components for viewer, client components for editor**: Viewer mode can be mostly server-rendered for performance. Editor mode needs client interactivity.

## What NOT to Build

- No real-time collaboration (only one editor)
- No user registration system (single admin password)
- No map drawing/painting tools in the browser (map art is created externally)
- No procedural generation (all content is manually authored)
- No mobile-optimized layout for MVP (desktop-first, David will use this on a computer)

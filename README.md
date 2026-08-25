# LocalWeb Hunter

Sito pubblico (GitHub Pages): **https://sanfelix2004.github.io/localweb-hunter/**

Web app per **automatizzare la lead generation B2B locale**: trova attività commerciali senza sito web o con siti obsoleti/non responsive, le qualifica con un **Website Health Score (0-100)** e le contatta in 1 click via Email o WhatsApp con pitch generati dall'AI.

> GitHub Pages ospita la landing statica. La dashboard live (scan, score, pitch) è l’app Next.js: avviala in locale o su Vercel.

## Architettura

```
┌────────────────────────────────────────────────────────────────┐
│                     Next.js (App Router)                       │
│                                                                │
│  ┌──────────────┐        ┌───────────────────────────────────┐ │
│  │  Dashboard   │        │           API Routes              │ │
│  │  React 19    │◄──────►│                                   │ │
│  │  Tailwind 4  │        │  POST /api/scan       discovery   │ │
│  │  Leaflet     │        │  POST /api/analyze    scoring     │ │
│  │              │        │  GET  /api/leads      filtri      │ │
│  │  · tabella   │        │  POST /api/pitch      AI pitch    │ │
│  │  · mappa     │        │  POST /api/contact/email  Resend  │ │
│  │  · filtri    │        │  PATCH/DELETE /api/leads/[id]     │ │
│  └──────────────┘        └───────────────┬───────────────────┘ │
└──────────────────────────────────────────┼─────────────────────┘
                                           │ Prisma ORM
                          ┌────────────────▼────────────────┐
                          │  SQLite (dev) / Supabase (prod) │
                          │  tabelle: Scan, Lead            │
                          └─────────────────────────────────┘

Servizi esterni:
· Nominatim (geocoding città/CAP → coordinate)     — gratuito, no key
· Overpass API / OpenStreetMap (discovery POI)     — gratuito, no key
· Google PageSpeed API (scoring performance)       — opzionale
· OpenAI (cold-pitch AI)                           — opzionale, con fallback template
· Resend (invio email 1-click)                     — opzionale
· WhatsApp via link wa.me con messaggio precompilato
```

### 1. Discovery & Scraping Pipeline (`/api/scan`)

1. **Input**: zona (città, CAP o `lat,lon`) + categoria merceologica + raggio (0,5–20 km).
2. **Geocoding** con Nominatim (OpenStreetMap).
3. **Query Overpass** sulle coppie tag OSM della categoria (es. `amenity=restaurant`, `craft=plumber`) entro il raggio.
4. Estrazione di: nome, indirizzo, telefono, email, sito web, social link.
5. **Dedup** per `osmId` e salvataggio su database. I link Facebook/Instagram/Linktree nel campo "website" **non contano come sito vero** → lead `NO_WEBSITE`.

> Vuoi usare **Google Places API** invece di Overpass? La pipeline è isolata in `src/lib/overpass.ts`: basta implementare la stessa interfaccia `DiscoveredBusiness` con Places Nearby Search + Place Details.

### 2. Algoritmo di "Bruttezza" — Website Health Score (`src/lib/health.ts`)

Score **basso = sito pessimo = lead prioritario**. Parte da 100 e sottrae:

| Check | Penalità | Flag |
|---|---|---|
| Sito assente | score = 0 | `NO_WEBSITE` |
| Sito irraggiungibile | score = 5 | `SITE_UNREACHABLE` |
| Nessun HTTPS | −20 | `NO_SSL` |
| Meta viewport assente (non mobile-friendly) | −25 | `NOT_MOBILE_FRIENDLY` |
| Caricamento > 3s / > 6s | −10 / −15 | `SLOW_LOADING` |
| Flash, frameset, marquee | −15 | `DEPRECATED_TECH` |
| Layout a tabelle o doctype pre-HTML5 | −10 | `TABLE_LAYOUT` / `NO_MODERN_MARKUP` |
| Generator obsoleto (FrontPage, WP < 5…) | −10 | `OBSOLETE_GENERATOR` |
| Copyright fermo a ≥ 2 anni fa | −10 | `OUTDATED_COPYRIGHT` |
| Nessun meta description / OpenGraph | −10 | `POOR_SEO_META` |
| Google PageSpeed mobile < 50 (se API key) | −10 | `LOW_PAGESPEED` |

L'analisi gira server-side con user-agent mobile, concorrenza 5, timeout 15s. Ogni problema produce anche una **descrizione in italiano** riusata dal pitch generator.

### 3. AI Cold-Pitch Generator (`src/lib/pitch.ts`)

- Con `OPENAI_API_KEY`: prompt con i problemi **specifici** rilevati → messaggio email/WhatsApp ultra-personalizzato (max 130/80 parole, CTA leggera).
- Senza chiave: **template smart** che inserisce comunque i 3 problemi principali rilevati.
- Il pitch è modificabile in dashboard prima dell'invio.

### 4. Contatto 1-click

- **Email**: invio via Resend REST API (`RESEND_API_KEY` + `FROM_EMAIL`).
- **WhatsApp**: apertura `wa.me/<numero>?text=<pitch>` con numero normalizzato a formato internazionale (+39).
- Lo stato del lead passa automaticamente a `CONTACTED`.

## Setup

```bash
npm install
npx prisma migrate dev --name init   # crea il DB SQLite
cp .env.example .env                 # aggiungi le chiavi opzionali
npm run dev                          # http://localhost:3000
```

### Deploy con Supabase (produzione)

1. Crea un progetto Supabase ed esegui `supabase/schema.sql` nel SQL Editor.
2. In `prisma/schema.prisma` cambia `provider = "postgresql"`.
3. Imposta `DATABASE_URL` con la connection string Supabase.
4. `npx prisma generate && npm run build`.

## Schema Database

Due tabelle: **Scan** (storico ricerche: query, categoria, centro, raggio, n° risultati) e **Lead** (attività: anagrafica, contatti, social, coordinate, `hasWebsite`, `healthScore` 0-100, `healthFlags`, `healthDetail` JSON, pitch generati, stato `NEW → ANALYZED → CONTACTED → WON/DISCARDED`). Vedi `prisma/schema.prisma` (SQLite) e `supabase/schema.sql` (Postgres).

## Note legali

- Rispetta i [termini d'uso di Nominatim/Overpass](https://operations.osmfoundation.org/policies/nominatim/) (rate limit, User-Agent).
- Il cold outreach B2B è soggetto a GDPR/ePrivacy: usa i dati di contatto pubblici in modo conforme (interesse legittimo, opt-out chiaro nelle email).

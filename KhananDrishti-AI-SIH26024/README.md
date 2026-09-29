# KhananDrishti AI

KhananDrishti AI is a Smart India Hackathon SIH26024 concept implementation for **AI-Based Smart Governance and Compliance Monitoring System for Coal Mines**. It is designed to centralize field observations, statutory compliance, inspections, operational reporting, contractor workflows and AI-assisted decision support across mine sites.

## AI focus

- Explainable AI risk index across open governance records
- Predictive triage that ranks records using priority, due-date pressure and recurring signals
- Anomaly detection for operational metrics and high-severity risk outliers
- Recurring violation detection by mine and category
- Mine-level AI risk posture and compliance intelligence
- AI-generated action recommendations linked to observable record evidence
- Natural-language AI copilot backed by live governance data
- Optional server-side LLM integration through an OpenAI-compatible chat-completions endpoint; the analytics engine remains functional without a provider key
- Geo-tagged field reporting, camera evidence and offline queue
- MongoDB GridFS evidence storage

## Stack

Frontend: React + Vite + Leaflet + lucide-react
Backend: Node.js + Express + Mongoose + JWT + MongoDB
AI: Explainable analytics engine + optional OpenAI-compatible LLM endpoint
Storage: MongoDB + GridFS

## Local setup

### backend

Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, `JWT_SECRET` and `CLIENT_ORIGIN`.

Optional AI variables:

`AI_API_URL`

`AI_API_KEY`

`AI_MODEL`

`AI_SYSTEM_PROMPT`

Then run:

`npm install`

`npm run seed`

`npm start`

### frontend

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`, for example `http://localhost:5000/api`.

Then run:

`npm install`

`npm run dev`

## Production

Use a separate MongoDB Atlas project/database for this deployment. The example database name is `khanandrishti_governance`.

Render backend variables:

`MONGODB_URI=<new Atlas URI>`

`JWT_SECRET=<long random secret>`

`CLIENT_ORIGIN=https://khanandrishti-ai.vercel.app`

Optional: `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_SYSTEM_PROMPT`.

Vercel frontend variable:

`VITE_API_URL=https://khanandrishti-ai.onrender.com/api`

Vercel root directory: `frontend`

Render root directory: `backend`

Render build command: `npm install`

Render start command: `npm start`

Run `npm run seed` once against the new database. Never run the seed command against the previous Civic Pulse database.

## Demo accounts

`field@khanandrishti.demo` / `Field@123`

`manager@khanandrishti.demo` / `Mine@123`

`corporate@khanandrishti.demo` / `Corporate@123`

`regulator@khanandrishti.demo` / `Regulator@123`

Change demo credentials before any non-demo deployment.

## Prototype notice

This is a hackathon prototype for SIH26024. KhananDrishti AI is a project/platform name used for the prototype and does not claim to be an official government or KhananDrishti AI product.


Production frontend: https://khanandrishti-ai.vercel.app/
Production backend: https://khanandrishti-ai.onrender.com/


## production api routing

The frontend uses a same-origin `/api` path in production. Vercel rewrites `/api/*` to the Render backend, avoiding browser-side cross-origin API failures. Local development can still use `VITE_API_URL=http://localhost:5000/api`.


## production connectivity

The frontend uses the Vercel `/api` rewrite in production and falls back to the public Render API only when the rewrite is unavailable. The map preserves the Nagar Setu Carto tile source and uses the mining `/issues/nearby` endpoint for live nearby activity. Do not commit real `.env` files or credentials.


## Production API flow

Browser production requests use the same-origin `/api` path. `frontend/vercel.json` rewrites those requests to the Render backend, while the client has a direct Render fallback if the proxy is unavailable. The map uses the same Leaflet + CARTO tile layer pattern as Nagar Setu and calls the backend `/api/issues/nearby` endpoint for live geospatial records.


## AI provider
For free external LLM inference, configure the Render service with `AI_API_URL=https://openrouter.ai/api/v1/chat/completions`, `AI_MODEL=openrouter/free`, and `AI_API_KEY` set to your OpenRouter key.

## production data flow

- frontend is deployed from `frontend/` on Vercel.
- backend is deployed from `backend/` on Render.
- MongoDB Atlas stores the `khanandrishti_governance` database.
- production frontend requests use the Render API directly by default; `VITE_API_URL` can override the endpoint.
- the GIS page uses the same Leaflet + CARTO mapping approach as Nagar Setu, but mine/governance data comes only from the KhananDrishti API.
- the AI engine works without a paid API key using explainable analytics. an OpenRouter-compatible key is optional.

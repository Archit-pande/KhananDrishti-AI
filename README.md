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

`CLIENT_ORIGIN=https://<your-vercel-domain>`

Optional: `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_SYSTEM_PROMPT`.

Vercel frontend variable:

`VITE_API_URL=https://<your-render-service>.onrender.com/api`

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

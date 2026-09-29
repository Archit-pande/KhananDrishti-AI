# Coal India Limited

Coal India Limited Smart Mine Governance is a full-stack concept implementation for Smart India Hackathon problem statement SIH26024, **AI-Based Smart Governance and Compliance Monitoring System for Coal Mines**.

The problem statement calls for a centralized governance platform that integrates statutory compliance, inspections, safety observations, production reporting, contractor management, worker activity, regulatory reporting, field reporting, automated workflows and analytics across multiple mines and subsidiaries.

## What this build contains

- centralized mine governance dashboard
- compliance, safety, environment, equipment and contractor records
- geo-tagged field reporting with browser GPS
- camera/photo evidence capture
- offline queue for field reports and sync on reconnect
- Leaflet GIS map for geo-tagged governance records
- workflow tracking from reported to closed
- role-based access for field officers, mine officials, corporate managers and regulators
- risk scoring for governance records
- statistics for critical, high-risk and overdue records
- MongoDB GridFS evidence storage so uploads are not dependent on local Render disk
- responsive web interface
- rule-based governance assistant with an AI-ready extension point

## Stack

Frontend: React + Vite + Leaflet + lucide-react
Backend: Node.js + Express + Mongoose + JWT + MongoDB
Storage: MongoDB + GridFS

## Local setup

### backend

Copy `backend/.env.example` to `backend/.env` and set:

`MONGODB_URI`

`JWT_SECRET`

`CLIENT_ORIGIN`

Then:

`npm install`

`npm run seed`

`npm start`

### frontend

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to the backend API, for example `http://localhost:5000/api`.

Then:

`npm install`

`npm run dev`

## Separate production database

For the new deployment, use a separate MongoDB database named `coal_india_governance`. It can live in a separate Atlas project named `Coal India Limited` or in the same cluster with a different database name.

Example database path:

`mongodb+srv://<username>:<password>@<cluster>/coal_india_governance?retryWrites=true&w=majority`

Do not run the seed script against the previous project database.

## Render

Set these backend environment variables:

`MONGODB_URI=<new Coal India Limited MongoDB URI>`

`JWT_SECRET=<long random secret>`

`CLIENT_ORIGIN=https://<your-vercel-domain>`

Use the Render start command:

`npm start`

Run the seed command once against the new database:

`npm run seed`

## Vercel

Set:

`VITE_API_URL=https://<your-render-service>.onrender.com/api`

Build command:

`npm run build`

Output directory:

`dist`

## Demo accounts

`field@coalindia.demo` / `Field@123`

`manager@coalindia.demo` / `Mine@123`

`corporate@coalindia.demo` / `Corporate@123`

`regulator@coalindia.demo` / `Regulator@123`

Change demo credentials before any real deployment.


## Prototype notice
This is a hackathon prototype based on SIH26024. It uses Coal India Limited as the organizational context and branding for the prototype; it is not an official Coal India Limited software product.

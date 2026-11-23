# Neighbourhood Skill Exchange Platform

A responsive community-help web app for discovering skilled neighbours and posting local help requests. Built with React/Vite, Node/Express, MongoDB, and JWT.


## Features
- Register/login with password hashing and JWT
- Roles: Resident, Skilled Member (auto-assigned when registering with a profession/skills), Admin
- Neighbourhood-restricted skill discovery
- Profiles and availability updates
- Help request creation, urgency levels, accept/decline, cancel, and completion workflow
- Admin user management, blocking/unblocking, skill verification, and request monitoring
- Basic completed-request reviews
- Responsive mobile/desktop interface

## Prerequisites
- Node.js 18+
- MongoDB local installation or MongoDB Atlas connection string

## Run locally
1. In `backend`, copy `.env.example` to `.env`, set `MONGODB_URI` and a long random `JWT_SECRET`.
2. Install and run backend:
   ```powershell
   cd backend
   npm install
   npm run dev
   ```
3. In another terminal, configure frontend and run it:
   ```powershell
   cd frontend
   copy .env.example .env
   npm install
   npm run dev
   ```
4. Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Create an admin
Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (at least 12 characters) in `backend/.env` before seeding. The seed command no longer uses a predictable default password, then:
```powershell
cd backend
npm run seed:admin
```
The default sample admin values are intentionally only for local setup; replace them. The seed script creates the admin once and will not reset an existing account.

## Request flow
1. Resident posts a help request.
2. Matching skilled members in the same area see pending requests.
3. A skilled member accepts or declines.
4. Requester or helper marks accepted assistance completed.
5. Requester can submit a rating for completed assistance.

## API routes
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me`
- `GET /api/users/skilled`, admin: `GET /api/users`, `PATCH /api/users/:id/block`, `PATCH /api/users/:id/verify`
- `POST /api/requests`, `GET /api/requests`, `PATCH /api/requests/:id/respond`, `PATCH /api/requests/:id/status`
- `POST /api/reviews`, `GET /api/reviews/mine`

## Important limitations for demo/production
- This project is a learning/demo starter. It is not a certified emergency response service.
- No email, SMS, push, or live websocket notifications are implemented yet; refresh/reload fetches current data.
- In-app direct messaging, review display, advanced audit logs, verification document uploads, and geolocation are future improvements.
- Before production, add stronger request validation, CSRF protections if switching to cookies, structured logging, automated tests, deployment hardening, and secure account recovery.
- Use a generic neighbourhood/area only. Do not collect or publicly display exact home addresses.

## Root-level convenience commands
From the project root:
```powershell
npm run install:all
npm run dev:backend
# In a second terminal:
npm run dev:frontend
npm run build
```

For deployment, set `CLIENT_URL` to the exact frontend origin. Multiple allowed origins can be comma-separated. Never commit either `.env` file.

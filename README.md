# Karakoram Store

A responsive MERN stack e-commerce web app for selling authentic products from Hunza, Gilgit-Baltistan, Pakistan.

## Project Structure

This is a monorepo containing both the frontend and backend applications:

- `/client` - React (Vite) frontend application with Tailwind CSS.
- `/server` - Node.js (Express) backend application.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your MongoDB URI, JWT secret, Cloudinary credentials, etc.
5. Start the server (development mode):
   ```bash
   npm run dev
   ```
   The backend will start on `http://localhost:5000`.

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will start on `http://localhost:5173`.

## Deploying to Vercel

Deploy the frontend and backend as **two Vercel projects** from this repository. This is the recommended setup for a Vite + Express app.

### 1. Backend project

- Import the repository into Vercel.
- Set **Root Directory** to `server`.
- Add the production environment variables from `server/.env.example`:
  - `NODE_ENV=production`
  - `MONGODB_URI` — MongoDB Atlas connection string
  - `JWT_SECRET` and `JWT_EXPIRES_IN`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `CLIENT_URL` — the frontend production URL, for example `https://karakoram-store.vercel.app`
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` for OTP emails
- Deploy. The API is served from `https://<backend-project>.vercel.app/api`.
- Vercel functions do not persist local files, so image uploads require Cloudinary in production.

### 2. Frontend project

- Import the same repository into a second Vercel project.
- Set **Root Directory** to `client`.
- Add these environment variables:
  - `VITE_API_URL=https://<backend-project>.vercel.app/api`
  - `VITE_WHATSAPP_NUMBER`
  - `VITE_CLOUDINARY_CLOUD_NAME`
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- Deploy.

After the frontend URL is known, update the backend project's `CLIENT_URL` to that exact URL and redeploy the backend if it was set to a placeholder.

### Important notes

- Use MongoDB Atlas, not a local MongoDB instance, because Vercel cannot reach your computer.
- `server/uploads/` is intentionally ignored by Git. Configure Cloudinary before using the admin image uploads.
- Cross-site authentication uses `SameSite=None; Secure` cookies, so the frontend and backend must both use HTTPS in production.
- If you use a custom domain, set `CLIENT_URL` to the custom frontend domain.

## Features Planned

- Authentication & Authorization
- Product listings and filtering
- Shopping Cart & Checkout
- Order management
- Cloudinary integration for product images

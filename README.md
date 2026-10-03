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

## Features Planned

- Authentication & Authorization
- Product listings and filtering
- Shopping Cart & Checkout
- Order management
- Cloudinary integration for product images

# Doorstep Repair Service - Backend API

Lightweight Node.js / Express API service with automated Nodemailer email notifications for booking appliance repairs.

## Features
- **Booking Endpoint (`POST /api/book-service`)**: Saves booking details and sends instant email confirmation.
- **Health Check (`GET /api/health`)**: API liveness endpoint.
- **Booking Listing (`GET /api/bookings`)**: Retrieve active customer service bookings.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   Copy `.env.example` to `.env` and configure your port and SMTP credentials:
   ```env
   PORT=5000
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

3. Run the server:
   ```bash
   npm start
   ```
   Or run in dev mode with auto-reload:
   ```bash
   npm run dev
   ```

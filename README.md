# NIST-800 Compliance Dashboard

A professional dashboard for visualizing, tracking, and remediating NIST-800 controls using AWS Config, OpenAI, and modern cloud-native tools.

## Structure
- `/backend`: Node.js (TypeScript, Express, Prisma, AWS SDK v3, OpenAI)
- `/frontend`: React (TypeScript, Material UI, Chart.js)

## Features
- Interactive dashboard for NIST-800 controls
- AWS Config integration
- Resource and remediation tracking
- Database-backed notes and status
- OpenAI-powered remediation suggestions

## Setup

### Environment Configuration

1. Backend Environment
   - Copy `/backend/.env.example` to `/backend/.env`
   - Configure the following required variables:
     ```
     AWS_ACCESS_KEY_ID=your-access-key
     AWS_SECRET_ACCESS_KEY=your-secret-key
     AWS_REGION=us-east-1
     OPENAI_API_KEY=your-openai-api-key
     ```

2. Frontend Environment (optional)
   - Create `/frontend/.env` if needed for custom configuration

### Option 1: Docker Compose Setup (Recommended)

1. Prerequisites:
   - Docker and Docker Compose installed
   - Environment files configured (see above)

2. Build and start the containers:
   ```bash
   docker compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

4. Stop the containers:
   ```bash
   docker compose down
   ```

5. For a clean restart (removes volumes):
   ```bash
   docker compose down -v
   docker compose up --build
   ```

### Option 2: Manual Setup

See `/backend/README.md` and `/frontend/README.md` for manual setup instructions.

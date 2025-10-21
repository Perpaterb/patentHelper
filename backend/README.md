# Parenting Helper Backend API

Local Express.js API server for development. Converts to AWS Lambda in Phase 6.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Start production mode
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check with dependency status

## Development

### Running Locally
1. Ensure Docker services are running: `docker-compose up -d`
2. Start the server: `npm run dev`
3. Server runs on: http://localhost:3000

### Project Structure
```
backend/
├── server.js           # Express app entry point
├── routes/             # Route definitions
├── controllers/        # Request handlers (will become Lambda handlers)
├── services/           # Business logic (Lambda-compatible)
├── middleware/         # Express middleware (auth, validation, etc.)
├── utils/              # Utility functions
└── config/             # Configuration files
```

### Architecture Pattern

**Local Development (Phase 1-5):**
```
HTTP Request → Express Route → Controller → Service → Prisma → PostgreSQL
```

**Production (Phase 6):**
```
HTTP Request → API Gateway → Lambda Handler → Service → Prisma → RDS
```

**Key Principles:**
- Services are pure functions (no Express/Lambda dependencies)
- Controllers handle request/response transformation
- Easy to convert: Controller becomes Lambda handler wrapper

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## Linting & Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

See `../.env.example` for required environment variables.
Copy to `../.env.local` and fill in real values.

## Phase 6 Conversion

When deploying to AWS Lambda:
1. Services remain unchanged (already Lambda-compatible)
2. Controllers become Lambda handlers
3. Routes map to API Gateway endpoints
4. Express middleware becomes Lambda authorizers

---

**Development Status:** Phase 1 - Local Foundation
**Last Updated:** 2025-10-21

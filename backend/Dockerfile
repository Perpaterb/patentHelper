# Family Helper API - Unified Server
#
# Single container that includes:
# - Express.js API server
# - Puppeteer for call recording
# - FFmpeg for video/audio conversion
# - Sharp for image processing
#
# Used for both local Docker development and Lightsail deployment

FROM node:20-slim

# Install system dependencies
# - Chromium browser for Puppeteer
# - FFmpeg for video/audio processing
RUN apt-get update && apt-get install -y \
    # Chromium browser and dependencies
    chromium \
    fonts-liberation \
    # FFmpeg for media conversion
    ffmpeg \
    # Curl for health checks
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium (skip downloading)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install ALL dependencies (including sharp, puppeteer, ffmpeg libs)
# Note: In production, we don't use --omit=dev to keep build tools
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "server.js"]

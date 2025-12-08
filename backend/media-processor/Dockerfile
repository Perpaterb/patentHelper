# Media Processor Docker Container
# Provides video/audio conversion (ffmpeg), image conversion (sharp), and PDF generation
# Runs as HTTP server locally, mirrors Lambda ECR deployment in production

FROM node:20-slim

# Install system dependencies for ffmpeg, sharp, and other native modules
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start server
CMD ["node", "server.js"]

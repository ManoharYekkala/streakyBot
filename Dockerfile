FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist/ ./dist/

# Create data directory (Fly.io mounts volume at /data)
RUN mkdir -p /data

# Default database path (overridden by fly.toml env)
ENV DATABASE_PATH=/data/streaky.db

CMD ["node", "dist/index.js"]

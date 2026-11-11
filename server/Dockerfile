# ==============================================================================
# Dockerfile for Weighbridge RMC Backend (Node.js + Express + MySQL)
# ==============================================================================

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Install build dependencies if needed (e.g. for native modules)
RUN apk add --no-cache tzdata curl wget

# Copy package definitions
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy server code
COPY . .

# Ensure snapshots directory exists
RUN mkdir -p /app/public/snapshots

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=3001

# Expose backend API port
EXPOSE 3001

# Healthcheck endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fs http://localhost:3001/api/health || exit 1

# Start the Express server
CMD ["node", "index.js"]

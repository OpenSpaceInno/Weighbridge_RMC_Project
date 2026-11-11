# ==============================================================================
# Multi-stage Dockerfile for Weighbridge RMC Frontend (Vite + React + Nginx)
# ==============================================================================

# Stage 1: Build the Vite production bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (production + dev dependencies required to build)
RUN npm install

# Copy application code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_URL=/api
ARG VITE_SUPABASE_PROJECT_ID="oyispskpeugnovyfavus"
ARG VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95aXNwc2twZXVnbm92eWZhdnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzk5NDAsImV4cCI6MjA4MjcxNTk0MH0.s4APgscZLZl_9Xh3WBIHuPdm-Xw7UrS1AtFM_PWE9Nw"
ARG VITE_SUPABASE_URL="https://oyispskpeugnovyfavus.supabase.co"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

# Build production assets to /app/dist
RUN npm run build

# Stage 2: Serve static files with production-tuned Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving content
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/ > /dev/null || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

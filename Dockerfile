# =============================================================================
# UNIFIED DOCKERFILE - Frontend (React) + Backend (Express API) in ONE container
# =============================================================================
# This Dockerfile creates a single container that serves:
#   - React SPA on port 80 (nginx)
#   - Express API on port 3001 (node) - handles DynamoDB CRUD
# 
# The container connects to:
#   - AWS DynamoDB (real tables or DynamoDB Local)
#   - OpenAI via Lambda (AI suggestions)
#   - Cognito for auth (JWT validation in frontend)
#
# Usage:
#   docker build -f Dockerfile.unified -t financeflow-unified:latest .
#   docker run -p 80:80 -e AWS_REGION=eu-central-1 financeflow-unified:latest
# =============================================================================

# ============================================
# Stage 1: Build React frontend
# ============================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy frontend source
COPY . .

# Build-time environment variables for Vite
# New unified environment selector
ARG VITE_APP_ENV=local
ARG VITE_ENVIRONMENT=production
ARG VITE_AWS_REGION=eu-central-1
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_URL
ARG VITE_AWS_COGNITO_USER_POOL_ID
ARG VITE_AWS_COGNITO_CLIENT_ID
ARG VITE_AI_API_URL
# Legacy variables (for backwards compatibility)
ARG VITE_DEV_ONLY_AUTH=true
ARG VITE_USE_DYNAMODB=false
ARG VITE_RUNTIME=local

# Set as environment for build
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_AWS_COGNITO_USER_POOL_ID=$VITE_AWS_COGNITO_USER_POOL_ID
ENV VITE_AWS_COGNITO_CLIENT_ID=$VITE_AWS_COGNITO_CLIENT_ID
ENV VITE_AI_API_URL=$VITE_AI_API_URL
# Legacy (backwards compatibility)
ENV VITE_DEV_ONLY_AUTH=$VITE_DEV_ONLY_AUTH
ENV VITE_USE_DYNAMODB=$VITE_USE_DYNAMODB
ENV VITE_RUNTIME=$VITE_RUNTIME

# Build the React app
RUN npm run build

# ============================================
# Stage 2: Build backend dependencies
# ============================================
FROM node:20-slim AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY dev-server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# ============================================
# Stage 3: Runtime with nginx + node
# ============================================
FROM node:20-slim AS runtime

# Install nginx and supervisor
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built frontend to nginx
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy backend
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY dev-server/*.js /app/backend/
COPY dev-server/package.json /app/backend/

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create log directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /var/log/express

# Setup nginx
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Expose ports
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start supervisor (which starts nginx + express)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

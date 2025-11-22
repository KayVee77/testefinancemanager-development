# Multi-stage Dockerfile for FinanceFlow React app
# Build: docker build -t financeflow:latest .
# Dev: docker-compose up (uses dev target)

# ============================================
# Base stage - shared dependencies
# ============================================
FROM node:20.18-slim AS base

WORKDIR /app

# Install wget for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ============================================
# Dependencies stage - install packages
# ============================================
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# ============================================
# Development stage - for docker-compose HMR
# ============================================
FROM base AS dev

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json for npm scripts
COPY package*.json ./

# Source code mounted as volume in docker-compose
# No COPY of src/ here - bind mount handles it

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ============================================
# Builder stage - build production assets
# ============================================
FROM deps AS builder

WORKDIR /app

# Copy source code
COPY . .

# Build-time environment variables (passed via --build-arg)
ARG VITE_DEV_ONLY_AUTH=false
ARG VITE_ENVIRONMENT=production
ARG VITE_AWS_REGION=eu-north-1
ARG VITE_API_GATEWAY_URL
ARG VITE_AWS_COGNITO_USER_POOL_ID
ARG VITE_AWS_COGNITO_CLIENT_ID

# Make available to Vite build
ENV VITE_DEV_ONLY_AUTH=$VITE_DEV_ONLY_AUTH
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_AWS_COGNITO_USER_POOL_ID=$VITE_AWS_COGNITO_USER_POOL_ID
ENV VITE_AWS_COGNITO_CLIENT_ID=$VITE_AWS_COGNITO_CLIENT_ID

# Build the app
RUN npm run build

# ============================================
# Runtime stage - serve production build
# ============================================
FROM node:20.18-slim AS runtime

WORKDIR /app

# Install wget for healthcheck and production dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Use Vite preview to serve built files (handles SPA routing)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8080"]

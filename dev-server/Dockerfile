# Dockerfile for Express dev server (OpenAI API)
FROM node:20.18-slim

WORKDIR /app

# Install wget for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy server code
COPY . .

# Create non-root user
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser && \
    chown -R nodeuser:nodeuser /app

USER nodeuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["npm", "start"]

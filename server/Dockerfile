FROM node:20-alpine

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Health check using the /health endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the Node.js Express server
CMD ["node", "src/server.js"]

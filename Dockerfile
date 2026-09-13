# =================================================================
# Stage 1: Build Frontend SPA (React 19 + Vite + Tailwind CSS)
# =================================================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Cache frontend dependencies
COPY client/package*.json ./
RUN npm install

# Build frontend production bundle into /app/client/dist
COPY client/ ./
RUN npm run build

# =================================================================
# Stage 2: Production Server & Unified Runtime
# =================================================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Cache backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy backend source code
COPY server/ ./server/

# Copy built frontend assets from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Expose server port
EXPOSE 5000

# Health check using the backend /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the Node.js server
WORKDIR /app/server
CMD ["node", "src/server.js"]

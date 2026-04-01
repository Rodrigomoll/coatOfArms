# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — Two-stage build
#
# STAGE 1 (builder): Install dependencies and build the React frontend.
#   Output: /app/client/dist  — static HTML/CSS/JS files
#
# STAGE 2 (runner): Copy only what's needed to run the app.
#   - The built frontend files
#   - The Express server
#   - Production node_modules (no dev tools)
#
# Why two stages? The final image is much smaller because build tools
# (Vite, TypeScript, etc.) are not included — only the runtime code.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy client package files first (Docker caches this layer if unchanged)
COPY client/package*.json ./client/
RUN cd client && npm install

# Copy client source and build
COPY client/ ./client/
RUN cd client && npm run build
# Result is in /app/client/dist

# ── Stage 2: Run the Express server ──────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy server package files and install production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server source
COPY server/ ./server/

# Copy the built React frontend from Stage 1
COPY --from=builder /app/client/dist ./client/dist

# Azure Container Apps sets PORT automatically
ENV PORT=3001
EXPOSE 3001

# Start the Express server
CMD ["node", "server/index.js"]

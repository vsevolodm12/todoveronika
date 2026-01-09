# Build stage for frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci

# Copy frontend source
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public

# Build frontend with production API URL
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-""}

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy server package files and install
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/*.js ./server/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

WORKDIR /app/server

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV SQLITE_PATH=/app/data/todo-veronika.db

EXPOSE 3001

CMD ["node", "index.js"]


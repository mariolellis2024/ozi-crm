# Build stage - Frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy frontend source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy database init script
COPY db/ ./db/

# Copy built frontend from build stage
COPY --from=frontend-build /app/dist ./dist

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the server
CMD ["node", "server/index.js"]

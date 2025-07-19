# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S okuz -u 1001

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create logs directory
RUN mkdir -p logs && chown -R okuz:nodejs logs

# Remove source files and dev dependencies to reduce image size
RUN rm -rf src node_modules
RUN npm ci --only=production

# Switch to non-root user
USER okuz

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"] 
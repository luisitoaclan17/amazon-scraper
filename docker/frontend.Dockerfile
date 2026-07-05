# Use lightweight Node image
FROM node:20-alpine

# Set work directory
WORKDIR /app

# Install dependencies first for better layer caching
COPY frontend/package.json ./
# If package-lock.json exists, copy it (optional for dev)
COPY frontend/package-lock.json* ./

# Use --legacy-peer-deps to resolve React 19 peer dependency conflicts
# (recharts@2.x and some other libs declare react@^18 as peer dep)
RUN npm install --legacy-peer-deps

# Copy source code (will be overridden by bind mount in dev)
COPY frontend ./

# Expose Next.js port
EXPOSE 3000

# Set environment
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default to dev command for development hot-reloading
CMD ["npm", "run", "dev"]

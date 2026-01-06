# Stage 1: build/install
FROM node:20-alpine AS builder

# Install build tools
RUN apk add --no-cache python3 make g++

# Install helios2mqtt globally
RUN npm install -g helios2mqtt --production

# Stage 2: runtime
FROM node:20-alpine

# Copy global modules from builder
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin /usr/local/bin

# Ensure binaries are in PATH
ENV PATH=/usr/local/bin:$PATH

# Working directory
WORKDIR /app

# Run helios2mqtt
CMD ["helios2mqtt", "start"]

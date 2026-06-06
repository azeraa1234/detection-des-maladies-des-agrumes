# Stage 1: Build the TanStack Start (Cloudflare Workers) app
FROM node:22-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy the rest of the application source
COPY . .

# Build the application (outputs to dist/client + dist/server)
RUN npm run build

# Stage 2: Serve the app with Wrangler (Cloudflare Workers local runtime)
# Must use Debian-based image (glibc) — workerd binary is NOT compatible with Alpine's musl libc
FROM node:22-slim

WORKDIR /app

# Copy built output and package files needed by wrangler
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install wrangler to serve the Cloudflare Worker locally
RUN npm install wrangler --save-dev

EXPOSE 80

# Run wrangler dev which simulates the Cloudflare Workers runtime
# --no-live-reload: stable server mode (no HMR)
# --port 80 and --ip 0.0.0.0 so Docker proxy can reach it
CMD ["npx", "wrangler", "dev", "dist/server/index.js", "--port", "80", "--ip", "0.0.0.0", "--no-live-reload", "--local"]

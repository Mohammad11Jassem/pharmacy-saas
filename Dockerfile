# # syntax=docker/dockerfile:1

# # ---------------------------------------------------------
# # Stage 1: Install all dependencies used for build/migration
# # ---------------------------------------------------------
# FROM node:22-bookworm-slim AS dependencies

# WORKDIR /app

# # Runtime requirements for Prisma, plus build tools for native packages
# RUN apt-get update \
#     && apt-get install -y --no-install-recommends \
#        openssl \
#        ca-certificates \
#        python3 \
#        make \
#        g++ \
#     && rm -rf /var/lib/apt/lists/*

# # Use the same npm version for deterministic installs
# RUN npm install -g npm@11.18.0
# # Copy dependency definitions first to benefit from Docker cache
# COPY package.json package-lock.json ./

# # # Install the exact versions recorded in package-lock.json
# # RUN npm ci

# # Install dependencies with persistent npm cache and network retries
# RUN --mount=type=cache,target=/root/.npm \
#     npm config set fetch-retries 10 \
#     && npm config set fetch-retry-mintimeout 20000 \
#     && npm config set fetch-retry-maxtimeout 120000 \
#     && npm config set fetch-timeout 600000 \
#     && npm ci --prefer-offline --no-audit --no-fund


# # ---------------------------------------------------------
# # Stage 2: Generate Prisma Client and build NestJS
# # ---------------------------------------------------------
# FROM dependencies AS builder

# WORKDIR /app

# COPY . .

# RUN npx prisma generate

# RUN npm run build


# # ---------------------------------------------------------
# # Stage 3: One-time Prisma migration image
# # ---------------------------------------------------------
# FROM dependencies AS migration

# WORKDIR /app

# COPY prisma ./prisma
# COPY prisma.config.ts ./prisma.config.ts

# CMD ["npx", "prisma", "migrate", "deploy"]


# # ---------------------------------------------------------
# # Stage 4: Production runtime image
# # ---------------------------------------------------------
# FROM node:22-bookworm-slim AS production

# WORKDIR /app

# ENV NODE_ENV=production

# # Prisma requires OpenSSL certificates at runtime
# RUN apt-get update \
#     && apt-get install -y --no-install-recommends \
#        openssl \
#        ca-certificates \
#     && rm -rf /var/lib/apt/lists/*

# # Use the same npm version for deterministic installs
# RUN npm install -g npm@11.18.0

# COPY package.json package-lock.json ./

# # # Install production dependencies only, using package-lock.json
# # RUN npm ci --omit=dev \
# #     && npm cache clean --force

# RUN --mount=type=cache,target=/root/.npm \
#     npm config set fetch-retries 10 \
#     && npm config set fetch-retry-mintimeout 20000 \
#     && npm config set fetch-retry-maxtimeout 120000 \
#     && npm config set fetch-timeout 600000 \
#     && npm ci --omit=dev --prefer-offline --no-audit --no-fund

# # Copy only the compiled application from the builder stage
# COPY --from=builder --chown=node:node /app/dist ./dist

# # Do not run the application as root
# USER node

# EXPOSE 3000

# CMD ["npm", "run", "start:prod"]





# syntax=docker/dockerfile:1

# ---------------------------------------------------------
# Stage 1: Install all dependencies only once
# ---------------------------------------------------------
FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Use the npm version used to prepare the lock file
RUN npm install -g npm@11.18.0

COPY package.json package-lock.json ./

# Download dependencies once.
# Cache downloaded npm packages between Docker builds.
RUN --mount=type=cache,id=medixa-npm-cache,target=/root/.npm,sharing=locked \
    npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retries 10 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && npm ci --prefer-offline --no-audit --no-fund


# ---------------------------------------------------------
# Stage 2: Generate Prisma Client and build NestJS
# ---------------------------------------------------------
FROM dependencies AS builder

WORKDIR /app

# COPY . .

# RUN npx prisma generate

# RUN npm run build

COPY . .

# Prisma generate does not connect to the database,
# but prisma.config.ts requires DATABASE_URL while loading.
RUN DATABASE_URL="postgresql://build_user:build_password@127.0.0.1:5432/build_db?schema=public" \
    npx prisma generate

RUN npm run build


# ---------------------------------------------------------
# Stage 3: Image used only for Prisma migrations
# ---------------------------------------------------------
FROM dependencies AS migration

WORKDIR /app

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

CMD ["npx", "prisma", "migrate", "deploy"]


# ---------------------------------------------------------
# Stage 4: Remove development dependencies
# No second npm download occurs here
# ---------------------------------------------------------
FROM dependencies AS production-dependencies

WORKDIR /app

RUN npm prune --omit=dev --no-audit --no-fund


# ---------------------------------------------------------
# Stage 5: Final production runtime
# ---------------------------------------------------------
FROM node:22-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy already-installed production dependencies
COPY --from=production-dependencies \
    --chown=node:node \
    /app/node_modules \
    ./node_modules

# Copy compiled NestJS application
COPY --from=builder \
    --chown=node:node \
    /app/dist \
    ./dist

COPY --chown=node:node package.json ./package.json

USER node

EXPOSE 3000

# CMD ["node", "dist/src/main.js"]
CMD ["node", "dist/main.js"]
# ---- Base Node image ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies Layer ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --production=false

# ---- Development Image ----
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
# Expose port used by Express app
EXPOSE 4000
CMD ["npm","run","start"]

# ---- Production Build ----
FROM base AS prod
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --production --ignore-scripts && npm cache clean --force
COPY . ./
RUN npx tsc --build
EXPOSE 4000
CMD ["node","dist/index.js"]

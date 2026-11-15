# Unified application image for Cloud Run: Express API + React SPA.
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:24-alpine AS server-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY server/src ./server/src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
ENV SESSION_COOKIE_SECURE=true

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=server-build /app/dist ./dist
COPY --from=client-build /app/client/dist ./client/dist
RUN chown -R node:node /app

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

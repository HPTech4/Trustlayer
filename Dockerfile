# Stage 1: Build
FROM node:21-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:21-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
EXPOSE 4000
CMD ["node", "server.mjs"]

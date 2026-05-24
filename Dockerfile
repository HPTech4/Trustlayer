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
COPY package*.json ./
RUN npm ci --legacy-peer-deps --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["npm", "run", "preview"]

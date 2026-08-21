# Optional container build for the backend (see docker-compose "full" profile)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD npx prisma migrate deploy && npx prisma db seed && node dist/main.js

# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Accept API URL at build time (Vite bakes it into the JS bundle)
ARG VITE_API_URL=http://43.205.135.95:3000
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
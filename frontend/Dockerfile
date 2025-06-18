# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . ./
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine
# Copy build output to Nginx html directory
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom Nginx config to route API requests to backend if needed
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx","-g","daemon off;"]

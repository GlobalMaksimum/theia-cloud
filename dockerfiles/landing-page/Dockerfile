# This docker file build uses the local common package

# build stage
FROM node:20-alpine as build-stage
WORKDIR /app
COPY node/common/src ./common/src
COPY node/common/package.json node/common/tsconfig*.json ./common/
COPY node/configs ./configs/
COPY node/tsconfig.json node/package*.json ./
COPY node/landing-page/. ./landing-page/

RUN npm ci && \
  npm run build -w common && \
  npm run build -w landing-page && \
  chmod 644 /app/landing-page/dist/favicon.ico

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/landing-page/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

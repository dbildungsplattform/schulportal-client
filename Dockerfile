ARG BASE_IMAGE_BUILDER=node:24.22.1-alpine3.24
ARG BASE_IMAGE=nginx/nginx-unprivileged:1.31.8-alpine3.24

# Build Stage
FROM $BASE_IMAGE_BUILDER AS build

WORKDIR /app
COPY tsconfig*.json ./
COPY package*.json ./
COPY vite*.ts ./
COPY index.html ./
COPY env*.ts ./
COPY src/ src/
COPY test/ test/
COPY public/ public/

RUN npm ci --ignore-scripts
RUN npm run build

# Deployment Stage
FROM $BASE_IMAGE AS deployment

COPY --from=build /app/dist/ /usr/share/nginx/html/

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-vue.conf /etc/nginx/conf.d/

# Pull in all available Alpine security fixes (e.g. curl/libcurl, brotli-libs, c-ares)
USER root
RUN apk upgrade --no-cache

EXPOSE 8080
USER 101
CMD ["nginx", "-g", "daemon off;"]

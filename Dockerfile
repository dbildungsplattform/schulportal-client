ARG BASE_IMAGE_BUILDER=node:24.22.1-alpine3.24
ARG BASE_IMAGE=nginx:1.31.8-alpine3.24

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

RUN npm ci
RUN npm run build

# Deployment Stage
FROM $BASE_IMAGE AS deployment

# Pull in all available Alpine security fixes (e.g. curl/libcurl, brotli-libs, c-ares)
RUN apk upgrade --no-cache

COPY --from=build /app/dist/ /usr/share/nginx/html/

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-vue.conf /etc/nginx/conf.d/

RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chmod -R 644 /etc/nginx/conf.d/*

RUN touch /run/nginx.pid \
    && chown -R nginx:nginx /run/nginx.pid /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
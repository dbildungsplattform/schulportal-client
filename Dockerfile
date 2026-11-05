ARG BASE_IMAGE_BUILDER=node:22.22.0-alpine3.23
ARG BASE_IMAGE=nginx/nginx-unprivileged:1.30.6-alpine3.24

# Build Stage
FROM $BASE_IMAGE_BUILDER AS build

RUN apk add openjdk17-jre>=17.0.10_p7-r0

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

COPY --from=build /app/dist/ /usr/share/nginx/html/

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-vue.conf /etc/nginx/conf.d/

EXPOSE 8080
USER 101
CMD ["nginx", "-g", "daemon off;"]

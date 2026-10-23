# syntax=docker/dockerfile:1

# Build stage: install exact dependencies and build static files.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# VITE_DEMO=false hides the demo accounts on the sign-in page.
ARG VITE_DEMO=true
ENV VITE_DEMO=${VITE_DEMO}
RUN npm run build

# Runtime stage: nginx serves the files and proxies /api to the backend.
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Where the API lives, seen from this container (compose service name by default).
ENV API_UPSTREAM=http://api:8080
EXPOSE 80

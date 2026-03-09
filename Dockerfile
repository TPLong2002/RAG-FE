FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Empty by default → browser uses relative /api/... paths → nginx proxy
ARG VITE_BE_API_URL=
ENV VITE_BE_API_URL=$VITE_BE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]

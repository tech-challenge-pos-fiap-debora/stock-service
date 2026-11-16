# =========================
# Development
# =========================
FROM node:22.17.1-bookworm AS development

WORKDIR /stock

ENV NODE_ENV=development

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["yarn", "start:dev"]


# =========================
# Build
# =========================
FROM node:22.17.1-bookworm AS build

WORKDIR /usr/src/stock

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build


# =========================
# Production dependencies
# =========================
FROM build AS prod-deps

ENV NODE_ENV=production

RUN yarn install --frozen-lockfile --production


# =========================
# Migrations (K8s Job)
# =========================
FROM build AS migrations

WORKDIR /usr/src/stock

CMD ["node", "scripts/run-migrations.mjs"]


# =========================
# Production
# =========================
FROM node:22.17.1-bookworm-slim AS production

WORKDIR /usr/src/stock

ENV NODE_ENV=production

COPY --chown=node:node package.json yarn.lock newrelic.js ./

COPY --chown=node:node --from=prod-deps /usr/src/stock/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/stock/dist ./dist

USER node

EXPOSE 3000

# O agente precisa ser carregado antes da aplicação para instrumentar http e pg.
CMD ["node", "-r", "newrelic", "dist/main.js"]

FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY cloud-run ./cloud-run
COPY web ./web

RUN npm ci --include-workspace-root
ARG VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID
ENV VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID=${VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID}
RUN npm run build --workspace @trading-cockpit/web
RUN npm run build --workspace @trading-cockpit/cloud-run
RUN npm prune --omit=dev

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/cloud-run/package.json ./cloud-run/package.json
COPY --from=build /app/cloud-run/dist ./cloud-run/dist
COPY --from=build /app/web/dist ./web/dist

CMD ["npm", "run", "start", "--workspace", "@trading-cockpit/cloud-run"]

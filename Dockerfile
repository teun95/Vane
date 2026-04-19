# Stage 1: Playwright dependencies (changes rarely)
FROM node:20-slim AS playwright-deps

RUN apt-get update && apt-get install -y \
    python3-dev python3-babel python3-venv python-is-python3 \
    libxslt-dev zlib1g-dev libffi-dev libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install playwright --no-save \
    && npx playwright install --with-deps chromium

# Stage 2: Builder (your app code)
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 python3-pip sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /home/vane

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY tsconfig.json next.config.mjs next-env.d.ts postcss.config.js drizzle.config.ts tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY drizzle ./drizzle

RUN mkdir -p /home/vane/data
RUN yarn build

# Stage 3: Final runtime image
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3-dev python3-babel python3-venv python-is-python3 \
    uwsgi uwsgi-plugin-python3 \
    libxslt-dev zlib1g-dev libffi-dev libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/vane

# Copy built app from builder
COPY --from=builder /home/vane/public ./public
COPY --from=builder /home/vane/.next/static ./public/_next/static
COPY --from=builder /home/vane/.next/standalone ./
COPY --from=builder /home/vane/data ./data
COPY drizzle ./drizzle

RUN mkdir /home/vane/uploads

# Copy pre-installed Playwright from dedicated stage
COPY --from=playwright-deps /root/.cache/ms-playwright /root/.cache/ms-playwright
COPY --from=playwright-deps /usr/local/lib/node_modules/playwright /usr/local/lib/node_modules/playwright

EXPOSE 3000

CMD ["node", "server.js"]

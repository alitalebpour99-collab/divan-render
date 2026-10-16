# Divan's video worker: Remotion and a headless Chrome, one Reel at a time.
# It runs on Ahura's server as the app «divan-video» (base directory /video),
# asks the site for work every two minutes and hands the files back.
FROM node:22-bookworm-slim
ARG SOURCE_COMMIT=unknown

# The shared libraries Chrome Headless Shell needs (Remotion's documented Debian set).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The browser is downloaded and the compositions are bundled once, at build time:
# a render then starts at once and needs no network but for the fonts.
RUN node -e "import('@remotion/renderer').then((m) => m.ensureBrowser())" && node build.mjs

ENV NODE_ENV=production PORT=3000 RENDER_GL=swangle SOURCE_COMMIT=$SOURCE_COMMIT
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "worker.mjs", "--loop"]

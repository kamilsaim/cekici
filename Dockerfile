FROM node:20-slim

# libcairo2 ve arkadaslari bgutil provider'in "canvas" native bagimliligi icin.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip ffmpeg curl unzip git \
      libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 && \
    pip install --break-system-packages --no-cache-dir yt-dlp && \
    curl -fsSL https://deno.land/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

# bgutil PO token provider: YouTube'un "Sign in to confirm you're not a bot"
# kontrolunu cookies'e bagimli olmadan asar. Eklenti (pip) ile sunucu (node)
# ayni surumde olmali, bu yuzden ikisi de tek ARG'dan besleniyor.
ARG BGUTIL_VERSION=1.3.2
RUN pip install --break-system-packages --no-cache-dir \
      "bgutil-ytdlp-pot-provider==${BGUTIL_VERSION}" && \
    git clone --depth 1 --branch "${BGUTIL_VERSION}" \
      https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil && \
    cd /opt/bgutil/server && \
    npm ci && npx tsc && \
    npm prune --omit=dev && \
    rm -rf /opt/bgutil/.git /root/.npm

ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server/index.js"]

FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip ffmpeg curl unzip && \
    pip install --break-system-packages --no-cache-dir yt-dlp && \
    curl -fsSL https://deno.land/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server/index.js"]

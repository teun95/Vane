# Docker Image Build, Push, and Deployment Guide

## Registry Configuration

- **Registry Address**: `registry.jthuis.de`
- **Image Name**: `vane`
- **Tag**: `latest`
- **Full Image Name**: `registry.jthuis.de/vane:latest`

---

## Prerequisites

You do **not** need to configure this registry as insecure. Since it supports SSL, normal Docker registry authentication and secure HTTPS connections will be used automatically.

---

## Image Build and Push

### Standard Build and Push

```bash
docker build -t registry.jthuis.de/vane:latest .
docker push registry.jthuis.de/vane:latest
```

### Combined Command

```bash
docker build -t registry.jthuis.de/vane:latest . && docker push registry.jthuis.de/vane:latest
```

### Optional: Build with BuildKit

```bash
DOCKER_BUILDKIT=1 docker build -t registry.jthuis.de/vane:latest .
docker push registry.jthuis.de/vane:latest
```

---

## Deployment

### Run the Container

```bash
docker run -d -p 3000:3000 -v vane-data:/home/vane/data --name vane registry.jthuis.de/vane:latest
```

This will start the Vane container with the bundled SearxNG search engine. Once running, open your browser and navigate to http://localhost:3000.

### Using a Custom SearxNG Instance

If you already have SearxNG running, you can use the slim version or set the `SEARXNG_API_URL` environment variable:

```bash
docker run -d -p 3000:3000 -e SEARXNG_API_URL=http://your-searxng-url:8080 -v vane-data:/home/vane/data --name vane registry.jthuis.de/vane:latest
```

**Important**: Make sure your SearxNG instance has:

- JSON format enabled in the settings
- Wolfram Alpha search engine enabled

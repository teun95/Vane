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

### Build with Cache (Recommended)

Uses BuildKit inline cache for faster subsequent builds by reusing layers from the registry:

```bash
docker build -f Dockerfile.slim -t registry.jthuis.de/vane:latest --cache-from registry.jthuis.de/vane:latest .
docker push registry.jthuis.de/vane:latest
```

**Note**: Requires BuildKit enabled in Docker (`"buildkit": "true"` in Docker config features). Once enabled in your Docker configuration, you can use the shorter `--cache-from` command above without additional flags.

---

## Deployment

### Run the Container

```bash
docker run -d -p 3000:3000 -e SEARXNG_API_URL=http://localhost:8080 -v vane-data:/home/vane/data --name vane registry.jthuis.de/vane:latest
```

This will start the Vane container. **Note**: A separate SearxNG instance is required and must be available at the `SEARXNG_API_URL` address. See below for configuration.

### Using a Custom SearxNG Instance

If you already have SearxNG running (which is now the required configuration), set the `SEARXNG_API_URL` environment variable:

```bash
docker run -d -p 3000:3000 -e SEARXNG_API_URL=http://your-searxng-url:8080 -v vane-data:/home/vane/data --name vane registry.jthuis.de/vane:latest
```

**Important**: Make sure your SearxNG instance has:

- JSON format enabled in the settings
- Wolfram Alpha search engine enabled

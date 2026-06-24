# Story 1.5: Deployment Pipeline Setup

Status: drafted

## Story

As a **DevOps Engineer**,
I want Docker and Dokploy configured,
so that we can deploy to production.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-1.5.1 | Dockerfile | Build image | Size < 500MB | `docker images` shows size |
| AC-1.5.2 | Dokploy config | Deploy | App accessible via domain | HTTPS endpoint responds |
| AC-1.5.3 | Environment secrets | Deploy | Secrets not in logs | Container logs clean |
| AC-1.5.4 | Nginx config | Deploy | HTTPS works | Valid SSL certificate |

---

## Infrastructure Tasks

### INFRA-1: Verify Dockerfile (AC: 1)

Twenty CRM includes a Dockerfile. Verify and optimize if needed:

```bash
# Check existing Dockerfile
cat Dockerfile

# Build image
docker build -t twenty-real-estate:latest .

# Check image size
docker images twenty-real-estate:latest
# Expected: < 500MB

# If too large, check for:
# - Multi-stage build
# - .dockerignore file
# - Unnecessary dependencies
```

**Dockerfile Best Practices**:
```dockerfile
# Multi-stage build example
FROM node:20.18.0-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20.18.0-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Subtasks**:
- [ ] Review existing Dockerfile
- [ ] Verify multi-stage build
- [ ] Build image locally
- [ ] Verify size < 500MB
- [ ] Create .dockerignore if missing

### INFRA-2: Create Docker Compose for Production (AC: 1, 2)

**File**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  twenty-server:
    build:
      context: .
      dockerfile: Dockerfile
      target: twenty-server
    container_name: twenty-server
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PG_DATABASE_URL=${PG_DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SERVER_URL=${SERVER_URL}
      - FRONT_BASE_URL=${FRONT_BASE_URL}
      - ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}
      - LOGIN_TOKEN_SECRET=${LOGIN_TOKEN_SECRET}
      - REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
      - FILE_TOKEN_SECRET=${FILE_TOKEN_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - twenty-network
    volumes:
      - twenty-storage:/app/.local-storage

  twenty-front:
    build:
      context: .
      dockerfile: Dockerfile
      target: twenty-front
    container_name: twenty-front
    restart: unless-stopped
    environment:
      - REACT_APP_SERVER_BASE_URL=${SERVER_URL}
    ports:
      - "3001:3001"
    networks:
      - twenty-network

  postgres:
    image: postgres:16.4-alpine
    container_name: twenty-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB:-twenty_production}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - twenty-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4.1-alpine
    container_name: twenty-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - twenty-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: twenty-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot-webroot:/var/www/certbot:ro
    depends_on:
      - twenty-server
      - twenty-front
    networks:
      - twenty-network

networks:
  twenty-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  twenty-storage:
  certbot-webroot:
```

**Subtasks**:
- [ ] Create docker-compose.prod.yml
- [ ] Configure all services
- [ ] Set up networks and volumes
- [ ] Test locally with `docker compose -f docker-compose.prod.yml up`

### INFRA-3: Create Nginx Configuration (AC: 4)

**File**: `nginx/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Upstream servers
    upstream twenty-server {
        server twenty-server:3000;
    }

    upstream twenty-front {
        server twenty-front:3001;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name crm.company.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name crm.company.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location /api {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://twenty-server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # GraphQL endpoint
        location /graphql {
            limit_req zone=api burst=50 nodelay;

            proxy_pass http://twenty-server/graphql;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://twenty-front;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

**Subtasks**:
- [ ] Create nginx directory
- [ ] Create nginx.conf
- [ ] Configure SSL settings
- [ ] Configure reverse proxy
- [ ] Add security headers

---

## Dokploy Tasks

### DOKPLOY-1: Create Dokploy Project (AC: 2)

```bash
# 1. Access Dokploy dashboard
# https://dokploy.your-server.com

# 2. Create new project
# - Name: twenty-real-estate
# - Type: Docker Compose

# 3. Connect Git repository
# - Repository: https://github.com/your-org/twenty.git
# - Branch: main

# 4. Configure build settings
# - Dockerfile path: Dockerfile
# - Docker Compose: docker-compose.prod.yml
```

**Subtasks**:
- [ ] Access Dokploy dashboard
- [ ] Create new project
- [ ] Connect Git repository
- [ ] Configure build settings

### DOKPLOY-2: Configure Environment Secrets (AC: 3)

```bash
# In Dokploy dashboard, add these secrets:

# Database
POSTGRES_PASSWORD=<secure-random-password>
PG_DATABASE_URL=postgres://postgres:<password>@postgres:5432/twenty_production

# Redis
REDIS_URL=redis://redis:6379

# Server URLs
SERVER_URL=https://crm.company.com/api
FRONT_BASE_URL=https://crm.company.com

# JWT Secrets (generate with: openssl rand -base64 32)
ACCESS_TOKEN_SECRET=<32-char-random>
LOGIN_TOKEN_SECRET=<32-char-random>
REFRESH_TOKEN_SECRET=<32-char-random>
FILE_TOKEN_SECRET=<32-char-random>

# App Secret
APP_SECRET=<32-char-random>
```

**Subtasks**:
- [ ] Generate secure passwords
- [ ] Add all secrets to Dokploy
- [ ] Verify secrets not visible in build logs
- [ ] Test deployment with secrets

### DOKPLOY-3: Configure Domain and SSL (AC: 4)

```bash
# 1. In Dokploy, configure domain
# - Domain: crm.company.com
# - Enable HTTPS
# - Use Let's Encrypt for SSL

# 2. DNS Configuration
# Add A record: crm.company.com -> <server-ip>

# 3. Verify SSL
curl -I https://crm.company.com
# Should show: HTTP/2 200
# Should show: strict-transport-security header
```

**Subtasks**:
- [ ] Configure domain in Dokploy
- [ ] Enable Let's Encrypt SSL
- [ ] Add DNS A record
- [ ] Verify HTTPS works
- [ ] Verify SSL certificate valid

---

## Verification Tasks

### VERIFY-1: Image Size Check (AC: 1)

```bash
# Build and check size
docker build -t twenty-real-estate:latest .
docker images twenty-real-estate:latest --format "{{.Size}}"
# Expected: < 500MB

# If too large, analyze layers
docker history twenty-real-estate:latest
```

**Subtasks**:
- [ ] Build image
- [ ] Verify size < 500MB
- [ ] Optimize if needed

### VERIFY-2: Secrets Not Exposed (AC: 3)

```bash
# Check container logs for secrets
docker logs twenty-server 2>&1 | grep -i "password\|secret\|token"
# Expected: No matches

# Check build logs
# In Dokploy, review build logs for any exposed secrets
```

**Subtasks**:
- [ ] Check container logs
- [ ] Check build logs
- [ ] Verify no secrets exposed

### VERIFY-3: HTTPS and SSL (AC: 4)

```bash
# Test HTTPS
curl -I https://crm.company.com
# Expected: HTTP/2 200

# Check SSL certificate
echo | openssl s_client -servername crm.company.com -connect crm.company.com:443 2>/dev/null | openssl x509 -noout -dates
# Expected: Valid dates

# Check security headers
curl -I https://crm.company.com | grep -i "strict-transport\|x-frame\|x-content"
# Expected: Security headers present
```

**Subtasks**:
- [ ] Test HTTPS endpoint
- [ ] Verify SSL certificate
- [ ] Verify security headers

### VERIFY-4: Full Deployment Test (AC: 2)

```bash
# 1. Trigger deployment in Dokploy

# 2. Wait for build and deploy

# 3. Test endpoints
curl https://crm.company.com/api/health
# Expected: {"status":"ok"}

curl https://crm.company.com
# Expected: HTML page (React app)

# 4. Test login
curl -X POST https://crm.company.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(email: \"admin@test.com\", password: \"password\") { accessToken } }"}'
# Expected: Access token returned
```

**Subtasks**:
- [ ] Trigger deployment
- [ ] Verify build succeeds
- [ ] Test health endpoint
- [ ] Test frontend
- [ ] Test authentication

---

## Definition of Done

- [ ] Dockerfile verified/optimized
- [ ] Image size < 500MB
- [ ] docker-compose.prod.yml created
- [ ] Nginx configuration created
- [ ] Dokploy project configured
- [ ] Environment secrets configured
- [ ] Domain and SSL configured
- [ ] Secrets not exposed in logs
- [ ] HTTPS works with valid certificate
- [ ] Full deployment test passes

---

## Dev Notes

### Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────┐
│           Nginx (443)               │
│  - SSL termination                  │
│  - Rate limiting                    │
│  - Security headers                 │
└─────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌─────────────┐    ┌─────────────┐
│ twenty-front│    │twenty-server│
│   :3001     │    │   :3000     │
└─────────────┘    └─────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │PostgreSQL│    │  Redis  │    │ Storage │
    │  :5432  │    │  :6379  │    │ Volume  │
    └─────────┘    └─────────┘    └─────────┘
```

### Port Mapping (Production)

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Nginx | 80, 443 | 80, 443 |
| twenty-server | 3000 | - (internal) |
| twenty-front | 3001 | - (internal) |
| PostgreSQL | 5432 | - (internal) |
| Redis | 6379 | - (internal) |

### References
- [Source: architecture.md#Deployment-Architecture lines 697-726]
- [Source: architecture.md#Environment-Configuration lines 730-752]
- [Source: tech-spec-epic-1.md#Story-1.5]

---

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- Dockerfile (verify/modify)
- docker-compose.prod.yml (create)
- nginx/nginx.conf (create)
- .dockerignore (create if missing)

#!/bin/bash
# User-data script — runs once on first boot
# Installs Docker, pulls images, and starts the application

set -e
exec > >(tee /var/log/user-data.log | logger -t user-data) 2>&1

echo "=== Starting user-data script ==="
echo "Environment : ${environment}"
echo "App Version : ${app_version}"

# ── Install Docker ────────────────────────────────────────────────────────────
yum update -y
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# ── Install Docker Compose ────────────────────────────────────────────────────
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# ── Write docker-compose file ─────────────────────────────────────────────────
mkdir -p /opt/app
cat > /opt/app/docker-compose.yml <<COMPOSE
version: '3.9'
services:
  backend:
    image: ${dockerhub_username}/blue-green-backend:${app_version}
    container_name: backend
    ports:
      - "5000:5000"
    environment:
      APP_VERSION: "${app_version}"
      ENVIRONMENT: "${environment}"
    restart: unless-stopped

  frontend:
    image: ${dockerhub_username}/blue-green-frontend:${app_version}
    container_name: frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
COMPOSE

# ── Start application ─────────────────────────────────────────────────────────
cd /opt/app
/usr/local/bin/docker-compose pull
/usr/local/bin/docker-compose up -d

echo "=== Application started on ${environment} (${app_version}) ==="

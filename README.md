# Blue-Green Deployment — Terraform + Jenkins + Docker + AWS

Zero-downtime CI/CD pipeline using the Blue-Green deployment strategy.

---

## Architecture Overview

```
GitHub → Jenkins → DockerHub → EC2 (Blue/Green) ← ALB ← Users
```

- Two identical EC2 instances run at all times (Blue = stable, Green = new)
- Jenkins builds, pushes, and deploys Docker images
- ALB routes 100% of traffic to the active environment
- Traffic switches only after a successful health check
- Blue stays live as an instant rollback target

---

## Project Structure

```
.
├── backend/              Node.js/Express API
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/             Static HTML/CSS/JS served by Nginx
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── nginx.conf
│   └── Dockerfile
├── terraform/            AWS infrastructure (VPC, EC2, ALB)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── networking/   VPC, subnets, security groups
│       ├── ec2/          Blue + Green instances
│       └── alb/          Application Load Balancer
├── jenkins/              Jenkins controller Docker setup
├── scripts/              Helper scripts (health-check, switch, rollback)
├── docker-compose.yml    Local development
└── Jenkinsfile           CI/CD pipeline definition
```

---

## Quick Start — Run Locally

### Prerequisites
- Docker Desktop installed and running
- Ports 80 and 5000 available

```bash
# Clone the repo
git clone https://github.com/your-org/blue-green-demo.git
cd blue-green-demo

# Start both services
docker-compose up --build

# Open in browser
open http://localhost
```

The frontend proxies `/api` and `/health` to the backend automatically via Nginx.

---

## AWS Deployment

### 1. Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform >= 1.5 installed
- An EC2 key pair created in your target region
- DockerHub account

### 2. Provision Infrastructure

```bash
cd terraform

# Copy and fill in your values
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars

terraform init
terraform plan
terraform apply
```

Outputs will show:
- `alb_dns_name` — your public URL
- `blue_instance_public_ip`
- `green_instance_public_ip`

### 3. Set Up Jenkins

```bash
cd jenkins
docker-compose up -d

# Open Jenkins at http://localhost:8080
```

Add these credentials in Jenkins (Manage Jenkins → Credentials):

| ID | Type | Value |
|----|------|-------|
| `DOCKERHUB_USER` | Secret text | Your DockerHub username |
| `DOCKERHUB_PASS` | Secret text | Your DockerHub password |
| `EC2_SSH_KEY` | SSH private key | Your EC2 .pem key |
| `EC2_BLUE_HOST` | Secret text | Blue instance public IP |
| `EC2_GREEN_HOST` | Secret text | Green instance public IP |

### 4. Create Jenkins Pipeline

1. New Item → Pipeline
2. Pipeline → Definition: "Pipeline script from SCM"
3. SCM: Git → your repo URL
4. Script Path: `Jenkinsfile`
5. Save and Build

---

## Deployment Flow

### Deploying a New Version (v1 → v2)

```
Current state: Blue (v1) is live, Green is idle

1. Jenkins builds v2 Docker images
2. Jenkins pushes v2 to DockerHub
3. Jenkins deploys v2 to Green instance
4. Health check polls GET /health on Green until HTTP 200
5. Terraform updates ALB listener → forwards traffic to Green
6. Green (v2) is now live
7. Blue (v1) stays running as rollback target
```

### Manual Traffic Switch

```bash
# Switch to green
./scripts/switch-traffic.sh green

# Switch back to blue (rollback)
./scripts/switch-traffic.sh blue
```

### Rollback

```bash
# If green is active and something goes wrong
./scripts/rollback.sh green
# → switches traffic back to blue instantly
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/message` | Returns version + environment info |
| GET | `/health` | Health check (used by ALB + Jenkins) |

### Example Responses

```json
// GET /api/message
{
  "message": "Hello from Backend v1",
  "version": "v1",
  "environment": "blue",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// GET /health
{
  "status": "healthy",
  "version": "v1",
  "environment": "blue",
  "uptime": 3600.5
}
```

---

## Versioning

Docker images are tagged with the Jenkins build number:

```
your-user/blue-green-backend:v42
your-user/blue-green-frontend:v42
```

To deploy v2 of the backend, update `APP_VERSION` env var and rebuild:

```bash
# server.js already reads from APP_VERSION env var
docker build --build-arg APP_VERSION=v2 -t your-user/blue-green-backend:v2 ./backend
```

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `APP_VERSION` | `v1` | Version string returned in API |
| `ENVIRONMENT` | `blue` | Deployment environment label |

---

## Switching Traffic Without Jenkins (Terraform only)

```bash
cd terraform

# Send traffic to green
terraform apply -var="active_environment=green" -auto-approve

# Roll back to blue
terraform apply -var="active_environment=blue" -auto-approve
```

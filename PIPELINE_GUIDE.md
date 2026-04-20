# Pipeline Internals — What Happens at Each Stage

```
GitHub Push
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     JENKINS PIPELINE                            │
│                                                                 │
│  Stage 1: Checkout                                              │
│  ─────────────────                                              │
│  • Pulls latest code from GitHub via SCM                        │
│  • Captures short git commit hash for traceability              │
│  • Prints: commit hash + image tag (v<BUILD_NUMBER>)            │
│                                                                 │
│  Stage 2: Build Docker Images  (runs in PARALLEL)               │
│  ─────────────────────────────                                  │
│  • Backend:  docker build --build-arg APP_VERSION=vN ./backend  │
│    → Produces: youruser/blue-green-backend:vN                   │
│    → Also tags: youruser/blue-green-backend:latest              │
│  • Frontend: docker build ./frontend                            │
│    → Produces: youruser/blue-green-frontend:vN                  │
│    → Also tags: youruser/blue-green-frontend:latest             │
│                                                                 │
│  Stage 3: Push to DockerHub                                     │
│  ──────────────────────────                                     │
│  • Logs in using DOCKERHUB_USER / DOCKERHUB_PASS credentials    │
│  • Pushes both versioned (:vN) and :latest tags                 │
│  • Logs out immediately after                                   │
│                                                                 │
│  Stage 4: Deploy to Target (blue or green)                      │
│  ─────────────────────────────────────────                      │
│  • SSH into target EC2 instance (Blue or Green)                 │
│  • docker pull both images                                      │
│  • Stop + remove old containers (graceful, no downtime on       │
│    the OTHER environment which is still live)                   │
│  • Create shared Docker network "app-network"                   │
│  • Start backend container on port 5000                         │
│  • Start frontend container on port 80                          │
│    (both on same network so nginx resolves "backend")           │
│  • Print running container table                                │
│                                                                 │
│  Stage 5: Health Check                                          │
│  ──────────────────────                                         │
│  • SSH into same target instance                                │
│  • Polls GET http://localhost:5000/health every 15s             │
│  • Up to 10 retries (150s total wait)                           │
│  • HTTP 200 → PASS → proceed to Stage 6                         │
│  • Any other status → FAIL → pipeline stops, prints logs        │
│  • On failure: previous environment stays live (safe rollback)  │
│                                                                 │
│  Stage 6: Switch Traffic  (only if SWITCH_TRAFFIC=true)         │
│  ────────────────────────                                       │
│  • Runs terraform apply -var="active_environment=<target>"      │
│  • Updates ALB listener to forward to new target group          │
│  • Blue or Green target group now receives 100% of traffic      │
│  • Old environment stays running → instant rollback available   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AWS INFRASTRUCTURE                            │
│                                                                 │
│   Internet → ALB (port 80)                                      │
│                │                                                │
│         ┌──────┴──────┐                                         │
│         ▼             ▼                                         │
│   [Blue EC2]     [Green EC2]   ← only ONE receives traffic      │
│   frontend:80    frontend:80     at a time via ALB              │
│   backend:5000   backend:5000                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Blue-Green Switch Flow

```
Initial state:   ALB → Blue (v1)   Green = idle

Deploy v2:
  1. Jenkins deploys v2 containers to Green
  2. Health check passes on Green
  3. Terraform flips ALB → Green (v2)
  4. Blue (v1) stays running

After switch:    ALB → Green (v2)  Blue = standby (rollback)

Rollback:
  terraform apply -var="active_environment=blue"
  → ALB → Blue (v1) instantly, zero downtime
```

## Bugs Fixed in This Version

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `Jenkinsfile` | `--link` deprecated, containers couldn't communicate | Replaced with `--network app-network` |
| 2 | `Jenkinsfile` | Terraform had no AWS credentials | Added `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars |
| 3 | `Jenkinsfile` | SSH heredoc variable expansion was unreliable | Switched to `bash -s << 'ENDSSH'` with explicit variable assignment inside |
| 4 | `Jenkinsfile` | No `TF_IN_AUTOMATION` set | Added to suppress interactive prompts |
| 5 | `backend/Dockerfile` | `ARG APP_VERSION` not declared, `--build-arg` was silently ignored | Added `ARG APP_VERSION=v1` in both stages |
| 6 | `terraform/modules/ec2/main.tf` | Dead `locals { user_data }` block never used | Removed |
| 7 | `terraform/modules/networking/main.tf` | Used `var.aws_region` in subnet AZ but variable not passed from root | Added `aws_region` to root module call |
| 8 | `jenkins/Dockerfile` | `unzip` not installed before Terraform zip extraction | Added `unzip` to apt-get install |
| 9 | `docker-compose.yml` | No explicit network, frontend couldn't resolve `backend` hostname | Added `app-network` bridge network |

## Jenkins Credentials Setup

Go to: Manage Jenkins → Credentials → System → Global → Add Credential

| Credential ID          | Kind         | Value                        |
|------------------------|--------------|------------------------------|
| `DOCKERHUB_USER`       | Secret text  | your DockerHub username      |
| `DOCKERHUB_PASS`       | Secret text  | your DockerHub access token  |
| `EC2_SSH_KEY`          | SSH Username with private key | paste .pem contents |
| `EC2_BLUE_HOST`        | Secret text  | Blue EC2 public IP           |
| `EC2_GREEN_HOST`       | Secret text  | Green EC2 public IP          |
| `AWS_ACCESS_KEY_ID`    | Secret text  | AWS access key               |
| `AWS_SECRET_KEY`       | Secret text  | AWS secret access key        |

// ── Blue-Green CI/CD Pipeline ────────────────────────────────────────────────
//
// Jenkins Credentials required (Manage Jenkins → Credentials):
//
//   ID                  Type              Value
//   ─────────────────── ───────────────── ──────────────────────────────────
//   DOCKERHUB_USER      Secret text       Your DockerHub username
//   DOCKERHUB_PASS      Secret text       Your DockerHub password / token
//   EC2_SSH_KEY         SSH private key   Your EC2 .pem key (private key body)
//   EC2_BLUE_HOST       Secret text       Public IP of Blue EC2 instance
//   EC2_GREEN_HOST      Secret text       Public IP of Green EC2 instance
//   AWS_ACCESS_KEY_ID   Secret text       AWS access key (for Terraform)
//   AWS_SECRET_KEY      Secret text       AWS secret key (for Terraform)
//
// Pipeline parameters (shown in Jenkins UI on each run):
//   DEPLOY_TARGET  — which env to deploy to  (green | blue)
//   SWITCH_TRAFFIC — flip ALB after health check passes (true | false)

pipeline {
    agent any

    environment {
        // ── Resolved from Jenkins credential store ────────────────────────
        DOCKERHUB_USER = credentials('DOCKERHUB_USER')
        DOCKERHUB_PASS = credentials('DOCKERHUB_PASS')
        EC2_BLUE_HOST  = credentials('EC2_BLUE_HOST')
        EC2_GREEN_HOST = credentials('EC2_GREEN_HOST')
        AWS_ACCESS_KEY_ID     = credentials('AWS_ACCESS_KEY_ID')
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_KEY')

        // ── Derived values ────────────────────────────────────────────────
        IMAGE_TAG      = "v${BUILD_NUMBER}"   // e.g. v12
        SSH_USER       = "ec2-user"
        HEALTH_RETRIES = "10"
        HEALTH_INTERVAL = "15"               // seconds between retries
    }

    parameters {
        choice(
            name: 'DEPLOY_TARGET',
            choices: ['green', 'blue'],
            description: 'Deploy new version to this environment'
        )
        booleanParam(
            name: 'SWITCH_TRAFFIC',
            defaultValue: true,
            description: 'Switch ALB traffic to new environment after health check passes'
        )
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo "=== STAGE 1: Checkout ==="
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "Git commit : ${env.GIT_COMMIT_SHORT}"
                    echo "Image tag  : ${env.IMAGE_TAG}"
                    echo "Target env : ${params.DEPLOY_TARGET}"
                }
            }
        }

        // ── Stage 2: Build Docker Images (parallel) ───────────────────────
        stage('Build Docker Images') {
            parallel {

                stage('Build Backend') {
                    steps {
                        echo "=== Building backend image ==="
                        sh """
                            docker build \\
                              --build-arg APP_VERSION=${IMAGE_TAG} \\
                              -t ${DOCKERHUB_USER}/blue-green-backend:${IMAGE_TAG} \\
                              -t ${DOCKERHUB_USER}/blue-green-backend:latest \\
                              ./backend

                            echo "Backend image built: ${DOCKERHUB_USER}/blue-green-backend:${IMAGE_TAG}"
                        """
                    }
                }

                stage('Build Frontend') {
                    steps {
                        echo "=== Building frontend image ==="
                        sh """
                            docker build \\
                              -t ${DOCKERHUB_USER}/blue-green-frontend:${IMAGE_TAG} \\
                              -t ${DOCKERHUB_USER}/blue-green-frontend:latest \\
                              ./frontend

                            echo "Frontend image built: ${DOCKERHUB_USER}/blue-green-frontend:${IMAGE_TAG}"
                        """
                    }
                }
            }
        }

        // ── Stage 3: Push to DockerHub ────────────────────────────────────
        stage('Push to DockerHub') {
            steps {
                echo "=== STAGE 3: Push to DockerHub ==="
                sh """
                    echo "Logging in to DockerHub..."
                    echo "${DOCKERHUB_PASS}" | docker login -u "${DOCKERHUB_USER}" --password-stdin

                    echo "Pushing backend images..."
                    docker push ${DOCKERHUB_USER}/blue-green-backend:${IMAGE_TAG}
                    docker push ${DOCKERHUB_USER}/blue-green-backend:latest

                    echo "Pushing frontend images..."
                    docker push ${DOCKERHUB_USER}/blue-green-frontend:${IMAGE_TAG}
                    docker push ${DOCKERHUB_USER}/blue-green-frontend:latest

                    docker logout
                    echo "Push complete."
                """
            }
        }

        // ── Stage 4: Deploy to Target Environment ─────────────────────────
        stage('Deploy to Target') {
            steps {
                echo "=== STAGE 4: Deploy to ${params.DEPLOY_TARGET} ==="
                script {
                    def targetHost = params.DEPLOY_TARGET == 'green'
                        ? env.EC2_GREEN_HOST
                        : env.EC2_BLUE_HOST

                    echo "Target host : ${targetHost}"
                    echo "Image tag   : ${env.IMAGE_TAG}"

                    sshagent(['EC2_SSH_KEY']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no \\
                                -o ConnectTimeout=30 \\
                                ${SSH_USER}@${targetHost} bash -s << 'ENDSSH'

                            set -e
                            echo "--- Connected to ${params.DEPLOY_TARGET} instance ---"

                            BACKEND_IMAGE="${DOCKERHUB_USER}/blue-green-backend:${IMAGE_TAG}"
                            FRONTEND_IMAGE="${DOCKERHUB_USER}/blue-green-frontend:${IMAGE_TAG}"
                            ENVIRONMENT="${params.DEPLOY_TARGET}"
                            APP_VERSION="${IMAGE_TAG}"

                            echo "Pulling images..."
                            docker pull \$BACKEND_IMAGE
                            docker pull \$FRONTEND_IMAGE

                            echo "Stopping existing containers..."
                            docker stop backend  2>/dev/null || true
                            docker stop frontend 2>/dev/null || true
                            docker rm   backend  2>/dev/null || true
                            docker rm   frontend 2>/dev/null || true

                            echo "Creating app network (if not exists)..."
                            docker network create app-network 2>/dev/null || true

                            echo "Starting backend container..."
                            docker run -d \\
                              --name backend \\
                              --network app-network \\
                              --restart unless-stopped \\
                              -p 5000:5000 \\
                              -e APP_VERSION=\$APP_VERSION \\
                              -e ENVIRONMENT=\$ENVIRONMENT \\
                              \$BACKEND_IMAGE

                            echo "Starting frontend container..."
                            docker run -d \\
                              --name frontend \\
                              --network app-network \\
                              --restart unless-stopped \\
                              -p 80:80 \\
                              \$FRONTEND_IMAGE

                            echo "--- Containers running on \$ENVIRONMENT ---"
                            docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"

ENDSSH
                        """
                    }
                }
            }
        }

        // ── Stage 5: Health Check ─────────────────────────────────────────
        stage('Health Check') {
            steps {
                echo "=== STAGE 5: Health Check ==="
                script {
                    def targetHost = params.DEPLOY_TARGET == 'green'
                        ? env.EC2_GREEN_HOST
                        : env.EC2_BLUE_HOST

                    echo "Polling http://${targetHost}:5000/health ..."

                    sshagent(['EC2_SSH_KEY']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no \\
                                -o ConnectTimeout=30 \\
                                ${SSH_USER}@${targetHost} bash -s << 'ENDSSH'

                            set -e
                            RETRIES=${HEALTH_RETRIES}
                            INTERVAL=${HEALTH_INTERVAL}

                            for i in \$(seq 1 \$RETRIES); do
                                echo "[Attempt \$i/\$RETRIES] Checking health..."
                                HTTP=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")

                                if [ "\$HTTP" = "200" ]; then
                                    BODY=\$(curl -s http://localhost:5000/health)
                                    echo "✅ Health check PASSED (HTTP \$HTTP)"
                                    echo "Response: \$BODY"
                                    exit 0
                                fi

                                echo "   Not ready yet (HTTP \$HTTP). Waiting \${INTERVAL}s..."
                                sleep \$INTERVAL
                            done

                            echo "❌ Health check FAILED after \$RETRIES attempts"
                            docker logs backend  --tail 30 || true
                            docker logs frontend --tail 30 || true
                            exit 1

ENDSSH
                        """
                    }
                }
            }
        }

        // ── Stage 6: Switch Traffic via Terraform ─────────────────────────
        stage('Switch Traffic') {
            when {
                expression { return params.SWITCH_TRAFFIC == true }
            }
            steps {
                echo "=== STAGE 6: Switch ALB traffic to ${params.DEPLOY_TARGET} ==="
                dir('terraform') {
                    sh """
                        export TF_IN_AUTOMATION=true
                        export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
                        export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

                        echo "Initializing Terraform..."
                        terraform init -input=false

                        echo "Switching active_environment to ${params.DEPLOY_TARGET}..."
                        terraform apply -auto-approve \\
                          -var="active_environment=${params.DEPLOY_TARGET}"

                        echo "Current ALB target:"
                        terraform output active_environment
                    """
                }
            }
        }

    } // end stages

    // ── Post actions ──────────────────────────────────────────────────────────
    post {
        success {
            echo """
╔══════════════════════════════════════════╗
║        ✅  DEPLOYMENT SUCCESSFUL         ║
╠══════════════════════════════════════════╣
║  Version     : ${IMAGE_TAG}
║  Environment : ${params.DEPLOY_TARGET}
║  Traffic     : ${params.SWITCH_TRAFFIC ? 'Switched to ' + params.DEPLOY_TARGET : 'Not switched (manual)'}
║  Commit      : ${env.GIT_COMMIT_SHORT}
╚══════════════════════════════════════════╝
            """
        }
        failure {
            echo """
╔══════════════════════════════════════════╗
║        ❌  DEPLOYMENT FAILED             ║
╠══════════════════════════════════════════╣
║  Environment : ${params.DEPLOY_TARGET}
║  Previous environment remains ACTIVE
║  → Check stage logs above for details
╚══════════════════════════════════════════╝
            """
        }
        always {
            echo "Cleaning up dangling Docker images on Jenkins agent..."
            sh "docker image prune -f || true"
        }
    }
}

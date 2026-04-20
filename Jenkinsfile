// ── Blue-Green CI/CD Pipeline ────────────────────────────────────────────────
// Prerequisites (Jenkins credentials store):
//   DOCKERHUB_CREDENTIALS  — Username/Password credential
//   EC2_SSH_KEY            — SSH private key credential
//   EC2_BLUE_HOST          — Secret text: public IP of Blue instance
//   EC2_GREEN_HOST         — Secret text: public IP of Green instance

pipeline {
    agent any

    // ── Pipeline-level environment variables ──────────────────────────────────
    environment {
        DOCKERHUB_USER    = credentials('DOCKERHUB_USER')       // DockerHub username (secret text)
        DOCKERHUB_PASS    = credentials('DOCKERHUB_PASS')       // DockerHub password (secret text)
        EC2_BLUE_HOST     = credentials('EC2_BLUE_HOST')
        EC2_GREEN_HOST    = credentials('EC2_GREEN_HOST')
        IMAGE_TAG         = "v${BUILD_NUMBER}"                  // e.g. v42
        BACKEND_IMAGE     = "${DOCKERHUB_USER}/blue-green-backend"
        FRONTEND_IMAGE    = "${DOCKERHUB_USER}/blue-green-frontend"
        SSH_USER          = "ec2-user"
        HEALTH_RETRIES    = "10"
        HEALTH_INTERVAL   = "15"                                // seconds between retries
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
            description: 'Switch ALB traffic to new environment after health check'
        )
    }

    stages {

        // ── 1. Checkout ───────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo "Checking out source code..."
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    echo "Commit: ${env.GIT_COMMIT_SHORT} | Tag: ${IMAGE_TAG}"
                }
            }
        }

        // ── 2. Build Docker Images ────────────────────────────────────────────
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        echo "Building backend image: ${BACKEND_IMAGE}:${IMAGE_TAG}"
                        sh """
                            docker build \
                              --build-arg APP_VERSION=${IMAGE_TAG} \
                              -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                              -t ${BACKEND_IMAGE}:latest \
                              ./backend
                        """
                    }
                }
                stage('Build Frontend') {
                    steps {
                        echo "Building frontend image: ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                        sh """
                            docker build \
                              -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                              -t ${FRONTEND_IMAGE}:latest \
                              ./frontend
                        """
                    }
                }
            }
        }

        // ── 3. Push to DockerHub ──────────────────────────────────────────────
        stage('Push to DockerHub') {
            steps {
                echo "Pushing images to DockerHub..."
                sh """
                    echo "${DOCKERHUB_PASS}" | docker login -u "${DOCKERHUB_USER}" --password-stdin

                    docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                    docker push ${BACKEND_IMAGE}:latest

                    docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                    docker push ${FRONTEND_IMAGE}:latest

                    docker logout
                """
            }
        }

        // ── 4. Deploy to Target Environment ──────────────────────────────────
        stage('Deploy to Target') {
            steps {
                script {
                    def targetHost = params.DEPLOY_TARGET == 'green' ? env.EC2_GREEN_HOST : env.EC2_BLUE_HOST
                    echo "Deploying ${IMAGE_TAG} to ${params.DEPLOY_TARGET} (${targetHost})"

                    sshagent(['EC2_SSH_KEY']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${SSH_USER}@${targetHost} '
                                set -e

                                # Pull latest images
                                docker pull ${BACKEND_IMAGE}:${IMAGE_TAG}
                                docker pull ${FRONTEND_IMAGE}:${IMAGE_TAG}

                                # Stop existing containers gracefully
                                docker stop backend frontend 2>/dev/null || true
                                docker rm   backend frontend 2>/dev/null || true

                                # Start backend
                                docker run -d \
                                  --name backend \
                                  --restart unless-stopped \
                                  -p 5000:5000 \
                                  -e APP_VERSION=${IMAGE_TAG} \
                                  -e ENVIRONMENT=${params.DEPLOY_TARGET} \
                                  ${BACKEND_IMAGE}:${IMAGE_TAG}

                                # Start frontend
                                docker run -d \
                                  --name frontend \
                                  --restart unless-stopped \
                                  -p 80:80 \
                                  --link backend:backend \
                                  ${FRONTEND_IMAGE}:${IMAGE_TAG}

                                echo "Containers started on ${params.DEPLOY_TARGET}"
                            '
                        """
                    }
                }
            }
        }

        // ── 5. Health Check ───────────────────────────────────────────────────
        stage('Health Check') {
            steps {
                script {
                    def targetHost = params.DEPLOY_TARGET == 'green' ? env.EC2_GREEN_HOST : env.EC2_BLUE_HOST
                    echo "Running health checks against ${params.DEPLOY_TARGET} (${targetHost})..."

                    sshagent(['EC2_SSH_KEY']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${SSH_USER}@${targetHost} '
                                retries=${HEALTH_RETRIES}
                                interval=${HEALTH_INTERVAL}
                                for i in \$(seq 1 \$retries); do
                                    echo "Health check attempt \$i / \$retries..."
                                    status=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
                                    if [ "\$status" = "200" ]; then
                                        echo "Health check PASSED (HTTP \$status)"
                                        exit 0
                                    fi
                                    echo "Not ready yet (HTTP \$status), waiting \${interval}s..."
                                    sleep \$interval
                                done
                                echo "Health check FAILED after \$retries attempts"
                                exit 1
                            '
                        """
                    }
                }
            }
        }

        // ── 6. Switch Traffic (ALB) ───────────────────────────────────────────
        stage('Switch Traffic') {
            when {
                expression { params.SWITCH_TRAFFIC == true }
            }
            steps {
                echo "Switching ALB traffic to ${params.DEPLOY_TARGET}..."
                sh """
                    cd terraform
                    terraform init -input=false
                    terraform apply -auto-approve \
                      -var="active_environment=${params.DEPLOY_TARGET}"
                """
                echo "Traffic switched to ${params.DEPLOY_TARGET} successfully."
            }
        }

    } // end stages

    // ── Post-pipeline actions ─────────────────────────────────────────────────
    post {
        success {
            echo """
            ✅ Deployment successful!
               Version    : ${IMAGE_TAG}
               Environment: ${params.DEPLOY_TARGET}
               Traffic    : ${params.SWITCH_TRAFFIC ? 'Switched' : 'Not switched (manual)'}
            """
        }
        failure {
            echo """
            ❌ Deployment FAILED — ${params.DEPLOY_TARGET} environment.
               Previous environment remains active (automatic rollback).
               Check logs above for details.
            """
        }
        always {
            // Clean up local Docker images to save disk space
            sh "docker image prune -f || true"
        }
    }
}

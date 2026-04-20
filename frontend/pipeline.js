// ── CI/CD Pipeline Visualiser ─────────────────────────────────────────────────
// Simulates every stage of the Blue-Green Jenkins pipeline with
// animated logs, stage state transitions, and environment switching.

const STAGES = [
  {
    id: 'checkout',
    icon: '📥',
    name: 'Stage 1 — Checkout',
    archNode: 'arch-github',
    arrow: 'arr-1',
    logs: [
      '$ git checkout main',
      'Already on \'main\'',
      'Your branch is up to date with \'origin/main\'.',
      '$ git rev-parse --short HEAD',
      'a3f9c12',
      '[Checkout] Git commit : a3f9c12',
      '[Checkout] Image tag  : v42',
      '[Checkout] Target env : green',
      '✔ Checkout complete',
    ],
    duration: 2200,
  },
  {
    id: 'build',
    icon: '🔨',
    name: 'Stage 2 — Build Docker Images',
    archNode: 'arch-jenkins',
    arrow: 'arr-1',
    logs: [
      '=== Building backend image ===',
      '$ docker build --build-arg APP_VERSION=v42 -t user/blue-green-backend:v42 ./backend',
      'Step 1/10 : FROM node:20-alpine AS deps',
      'Step 2/10 : ARG APP_VERSION=v1',
      'Step 3/10 : WORKDIR /app',
      'Step 4/10 : COPY package*.json ./',
      'Step 5/10 : RUN npm ci --only=production',
      'added 103 packages in 8.2s',
      'Step 6/10 : FROM node:20-alpine',
      'Step 7/10 : ARG APP_VERSION=v42',
      'Step 8/10 : COPY --from=deps /app/node_modules ./node_modules',
      'Step 9/10 : COPY . .',
      'Step 10/10 : ENV PORT=5000 APP_VERSION=v42 ENVIRONMENT=blue',
      'Successfully built 3a8f1c2d4e5b',
      'Successfully tagged user/blue-green-backend:v42',
      '=== Building frontend image ===',
      '$ docker build -t user/blue-green-frontend:v42 ./frontend',
      'Step 1/5 : FROM nginx:1.25-alpine',
      'Step 2/5 : RUN rm /etc/nginx/conf.d/default.conf',
      'Step 3/5 : COPY nginx.conf /etc/nginx/conf.d/default.conf',
      'Step 4/5 : COPY index.html style.css app.js pipeline.js /usr/share/nginx/html/',
      'Step 5/5 : EXPOSE 80',
      'Successfully built 9b2e4f6a1c3d',
      'Successfully tagged user/blue-green-frontend:v42',
      '✔ Both images built successfully',
    ],
    duration: 3500,
  },
  {
    id: 'push',
    icon: '📤',
    name: 'Stage 3 — Push to DockerHub',
    archNode: 'arch-docker',
    arrow: 'arr-2',
    logs: [
      '$ echo "***" | docker login -u user --password-stdin',
      'Login Succeeded',
      '$ docker push user/blue-green-backend:v42',
      'v42: digest: sha256:3a8f1c2d... size: 1847',
      '$ docker push user/blue-green-backend:latest',
      'latest: digest: sha256:3a8f1c2d... size: 1847',
      '$ docker push user/blue-green-frontend:v42',
      'v42: digest: sha256:9b2e4f6a... size: 632',
      '$ docker push user/blue-green-frontend:latest',
      'latest: digest: sha256:9b2e4f6a... size: 632',
      '$ docker logout',
      'Removing login credentials for https://index.docker.io/v1/',
      '✔ Push complete',
    ],
    duration: 2800,
  },
  {
    id: 'deploy',
    icon: '🚀',
    name: 'Stage 4 — Deploy to Green',
    archNode: 'arch-ec2',
    arrow: 'arr-3',
    logs: [
      '$ ssh -o StrictHostKeyChecking=no ec2-user@54.123.45.67',
      '--- Connected to green instance ---',
      '$ docker pull user/blue-green-backend:v42',
      'v42: Pulling from user/blue-green-backend',
      'Status: Downloaded newer image',
      '$ docker pull user/blue-green-frontend:v42',
      'v42: Pulling from user/blue-green-frontend',
      'Status: Downloaded newer image',
      '$ docker stop backend  → stopped',
      '$ docker stop frontend → stopped',
      '$ docker rm backend frontend',
      '$ docker network create app-network',
      'Network app-network created',
      '$ docker run -d --name backend --network app-network -p 5000:5000 \\',
      '    -e APP_VERSION=v42 -e ENVIRONMENT=green \\',
      '    user/blue-green-backend:v42',
      'Container backend started → 8f3a1c2d4e5b',
      '$ docker run -d --name frontend --network app-network -p 80:80 \\',
      '    user/blue-green-frontend:v42',
      'Container frontend started → 2b9e4f6a1c3d',
      '',
      'NAMES      STATUS          PORTS',
      'backend    Up 3 seconds    0.0.0.0:5000->5000/tcp',
      'frontend   Up 2 seconds    0.0.0.0:80->80/tcp',
      '✔ Containers running on green',
    ],
    duration: 4000,
  },
  {
    id: 'health',
    icon: '❤️',
    name: 'Stage 5 — Health Check',
    archNode: 'arch-ec2',
    arrow: 'arr-3',
    logs: [
      'Polling http://localhost:5000/health ...',
      '[Attempt 1/10] Checking health...',
      '   Not ready yet (HTTP 000). Waiting 15s...',
      '[Attempt 2/10] Checking health...',
      '   Not ready yet (HTTP 000). Waiting 15s...',
      '[Attempt 3/10] Checking health...',
      '✅ Health check PASSED (HTTP 200)',
      'Response: {"status":"healthy","version":"v42","environment":"green","uptime":4.2}',
      '✔ Green environment is healthy',
    ],
    duration: 3000,
  },
  {
    id: 'switch',
    icon: '⚖️',
    name: 'Stage 6 — Switch ALB Traffic',
    archNode: 'arch-alb',
    arrow: 'arr-4',
    logs: [
      '$ export TF_IN_AUTOMATION=true',
      '$ terraform init -input=false',
      'Initializing modules...',
      'Initializing provider plugins...',
      '- Finding hashicorp/aws versions matching "~> 5.0"...',
      '- Installed hashicorp/aws v5.31.0',
      'Terraform has been successfully initialized!',
      '',
      '$ terraform apply -auto-approve -var="active_environment=green"',
      'module.alb.aws_lb_listener.http: Modifying... [id=arn:aws:elasticloadbalancing:...]',
      '  ~ default_action {',
      '      ~ target_group_arn = "arn:.../tg-blue" → "arn:.../tg-green"',
      '    }',
      'module.alb.aws_lb_listener.http: Modifications complete after 2s',
      '',
      'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.',
      '',
      '$ terraform output active_environment',
      '"green"',
      '',
      '✔ ALB now routing 100% traffic → GREEN (v42)',
      '✔ Blue (v1) remains running as rollback target',
    ],
    duration: 4500,
  },
];

// ── State ─────────────────────────────────────────────────────────────────────
let running = false;
let aborted = false;
let logInterval = null;

// ── Entry point ───────────────────────────────────────────────────────────────
function runPipeline() {
  if (running) return;

  const panel = document.getElementById('pipeline-panel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  resetPipeline();
  startPipeline();
}

function closePipeline() {
  aborted = true;
  running = false;
  clearInterval(logInterval);
  document.getElementById('pipeline-panel').classList.add('hidden');
}

// ── Reset all UI state ────────────────────────────────────────────────────────
function resetPipeline() {
  aborted = false;

  // Clear log
  document.getElementById('log-body').innerHTML = '';
  document.getElementById('pipeline-status-text').textContent = 'Starting pipeline…';

  // Reset arch nodes
  ['arch-github','arch-jenkins','arch-docker','arch-ec2','arch-alb'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
  });
  ['arr-1','arr-2','arr-3','arr-4'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });

  // Reset env boxes
  document.getElementById('env-blue').className  = 'env-box blue-live';
  document.getElementById('env-green').className = 'env-box green-standby';
  document.getElementById('blue-tag').textContent  = 'LIVE';
  document.getElementById('green-tag').textContent = 'STANDBY';
  document.getElementById('switch-arrow').textContent = '⚖️ ALB';

  // Build stage rows
  const list = document.getElementById('stages-list');
  list.innerHTML = '';
  STAGES.forEach(s => {
    const row = document.createElement('div');
    row.className = 'stage-row';
    row.id = `stage-${s.id}`;
    row.innerHTML = `
      <span class="stage-icon">${s.icon}</span>
      <span class="stage-name">${s.name}</span>
      <span class="stage-state" id="state-${s.id}">pending</span>
      <span class="stage-spinner hidden" id="spin-${s.id}">⟳</span>
    `;
    list.appendChild(row);
  });
}

// ── Main pipeline runner ──────────────────────────────────────────────────────
async function startPipeline() {
  running = true;
  appendLog('='.repeat(52));
  appendLog('  Jenkins Blue-Green Pipeline  #42');
  appendLog('='.repeat(52));

  for (let i = 0; i < STAGES.length; i++) {
    if (aborted) break;
    await runStage(STAGES[i], i);
    if (aborted) break;
  }

  if (!aborted) {
    finishPipeline();
  }
  running = false;
}

async function runStage(stage, index) {
  // Mark running
  setStageState(stage.id, 'running');
  highlightArch(stage.archNode, stage.arrow);
  document.getElementById('pipeline-status-text').textContent = stage.name;

  appendLog('');
  appendLog(`${'─'.repeat(52)}`);
  appendLog(`  ${stage.icon}  ${stage.name}`);
  appendLog(`${'─'.repeat(52)}`);

  // Stream logs with delay
  await streamLogs(stage.logs, stage.duration);
  if (aborted) return;

  // Mark done
  setStageState(stage.id, 'done');
  markArchDone(stage.archNode);

  // After switch stage — flip the env boxes
  if (stage.id === 'switch') {
    flipEnvironments();
  }

  await sleep(300);
}

// ── Stream log lines one by one ───────────────────────────────────────────────
function streamLogs(lines, totalDuration) {
  return new Promise(resolve => {
    const delay = Math.max(60, Math.floor(totalDuration / lines.length));
    let i = 0;
    logInterval = setInterval(() => {
      if (aborted || i >= lines.length) {
        clearInterval(logInterval);
        resolve();
        return;
      }
      appendLog(lines[i]);
      i++;
    }, delay);
  });
}

// ── Append a line to the log terminal ────────────────────────────────────────
function appendLog(text) {
  const body = document.getElementById('log-body');
  const line = document.createElement('div');
  line.className = 'log-line';

  // Colour coding
  if (text.startsWith('✔') || text.startsWith('✅'))  line.classList.add('log-success');
  else if (text.startsWith('❌'))                      line.classList.add('log-error');
  else if (text.startsWith('$'))                       line.classList.add('log-cmd');
  else if (text.startsWith('=') || text.startsWith('─')) line.classList.add('log-divider');
  else if (text.includes('ERROR') || text.includes('FAILED')) line.classList.add('log-error');
  else if (text.includes('Successfully') || text.includes('complete') || text.includes('Succeeded'))
    line.classList.add('log-success');

  line.textContent = text || '\u00A0'; // non-breaking space for empty lines
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

// ── Stage state helpers ───────────────────────────────────────────────────────
function setStageState(id, state) {
  const row   = document.getElementById(`stage-${id}`);
  const label = document.getElementById(`state-${id}`);
  const spin  = document.getElementById(`spin-${id}`);

  row.className = `stage-row stage-${state}`;
  if (state === 'running') {
    label.textContent = 'running';
    spin.classList.remove('hidden');
  } else if (state === 'done') {
    label.textContent = '✔ done';
    spin.classList.add('hidden');
  } else {
    label.textContent = 'pending';
    spin.classList.add('hidden');
  }
}

// ── Architecture diagram helpers ──────────────────────────────────────────────
function highlightArch(nodeId, arrowId) {
  document.getElementById(nodeId).classList.add('active');
  if (arrowId) document.getElementById(arrowId).classList.add('active');
}

function markArchDone(nodeId) {
  const el = document.getElementById(nodeId);
  el.classList.remove('active');
  el.classList.add('done');
}

// ── Flip Blue ↔ Green after traffic switch ────────────────────────────────────
function flipEnvironments() {
  const blueBox  = document.getElementById('env-blue');
  const greenBox = document.getElementById('env-green');
  const blueTag  = document.getElementById('blue-tag');
  const greenTag = document.getElementById('green-tag');
  const arrow    = document.getElementById('switch-arrow');

  blueBox.className  = 'env-box blue-standby';
  greenBox.className = 'env-box green-live';
  blueTag.textContent  = 'STANDBY';
  greenTag.textContent = 'LIVE ✔';
  arrow.textContent    = '⚖️ ALB → GREEN';
  arrow.classList.add('switched');
}

// ── Final success banner ──────────────────────────────────────────────────────
function finishPipeline() {
  document.getElementById('pipeline-status-text').textContent = '✅ Pipeline SUCCESS';
  appendLog('');
  appendLog('='.repeat(52));
  appendLog('  ✅  DEPLOYMENT SUCCESSFUL');
  appendLog('  Version     : v42');
  appendLog('  Environment : green');
  appendLog('  Traffic     : Switched → GREEN');
  appendLog('  Blue (v1)   : Standby (rollback ready)');
  appendLog('='.repeat(52));

  document.getElementById('pipeline-btn').textContent = '↺  Run Again';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

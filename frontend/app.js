// Backend URL — in production this is set via Nginx proxy (/api → backend)
// In local dev, point directly to the backend container
const API_BASE = window.BACKEND_URL || '';

function setStatus(state) {
  const badge = document.getElementById('status-badge');
  badge.className = `badge ${state}`;
  const labels = { idle: 'Idle', loading: 'Loading…', success: 'Success', error: 'Error' };
  badge.textContent = labels[state] || state;
}

async function fetchMessage() {
  const btn = document.getElementById('fetch-btn');
  const responseBox = document.getElementById('response-box');
  const responseContent = document.getElementById('response-content');
  const errorBox = document.getElementById('error-box');
  const errorContent = document.getElementById('error-content');

  // Reset UI
  btn.disabled = true;
  setStatus('loading');
  responseBox.classList.add('hidden');
  errorBox.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/message`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    responseContent.textContent = JSON.stringify(data, null, 2);
    responseBox.classList.remove('hidden');
    setStatus('success');
  } catch (err) {
    errorContent.textContent = `Failed to reach backend: ${err.message}`;
    errorBox.classList.remove('hidden');
    setStatus('error');
    console.error('[fetchMessage]', err);
  } finally {
    btn.disabled = false;
  }
}

async function checkHealth() {
  const btn = document.getElementById('health-btn');
  const healthBox = document.getElementById('health-box');
  const healthContent = document.getElementById('health-content');

  btn.disabled = true;
  healthBox.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    healthContent.textContent = JSON.stringify(data, null, 2);
    healthBox.classList.remove('hidden');
  } catch (err) {
    healthContent.textContent = `Health check failed: ${err.message}`;
    healthBox.classList.remove('hidden');
    console.error('[checkHealth]', err);
  } finally {
    btn.disabled = false;
  }
}

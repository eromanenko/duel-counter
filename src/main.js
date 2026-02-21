import './style.css';

const app = document.querySelector('#app');

// State
let defaultHp = 50;
let hp = [50, 50]; // [Player 1, Player 2]
let playerNames = ['Player 1', 'Player 2'];
let wakeLock = null;
let deferredPrompt = null;
let gameInProgress = false;

// Audio context for haptic-like sound feedback (optional, but let's stick to visual feedback and navigator.vibrate)
const vibrate = (pattern) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

const renderLayout = () => {
  app.innerHTML = `
    <!-- Setup Screen -->
    <div id="setup-screen" class="screen">
      <div class="setup-card">
        <h1>DUEL COUNTER</h1>
        <p>Set Starting Life</p>
        
        <div class="input-group">
          <div class="hp-presets">
            <button class="preset-btn" data-val="20">20</button>
            <button class="preset-btn" data-val="40">40</button>
            <button class="preset-btn active" data-val="50">50</button>
          </div>
          <input type="number" id="custom-hp" class="custom-hp" value="50" min="1" max="999">
        </div>

        <button id="edit-names-btn" class="start-btn" style="background: rgba(255,255,255,0.1); box-shadow: none; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.2);">CHANGE NAMES</button>
        <button id="resume-btn" class="start-btn hidden" style="margin-bottom: 15px; background: linear-gradient(135deg, #3a7bd5 0%, #00d2ff 100%);">RESUME DUEL</button>
        <button id="start-btn" class="start-btn">BEGIN DUEL</button>
        <button id="install-btn" class="start-btn hidden" style="margin-top: 15px; background: #2a2d36;">INSTALL APP</button>
      </div>
    </div>

    <!-- Game Screen -->
    <div id="game-screen" class="screen hidden">
      <!-- Player 2 (Top) -->
      <div class="player-panel" data-player="2" id="panel-p2">
        <div class="panel-bg"></div>
        <div class="score-container">
          <div class="player-name" id="name-2">${playerNames[1]}</div>
          <div class="score-value" id="score-2">${hp[1]}</div>
        </div>
        <div class="controls-overlay">
          <div class="tap-zone minus" data-player="2" data-dir="-1"></div>
          <div class="tap-zone plus" data-player="2" data-dir="1"></div>
        </div>
        <div class="mini-btn-container">
          <button class="mini-btn" data-player="2" data-val="-5">-5</button>
          <button class="mini-btn" data-player="2" data-val="5">+5</button>
        </div>
      </div>

      <!-- Settings Middle Button -->
      <div id="settings-btn" class="settings-btn">
        <svg viewBox="0 0 24 24">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      </div>

      <!-- Player 1 (Bottom) -->
      <div class="player-panel" data-player="1" id="panel-p1">
        <div class="panel-bg"></div>
        <div class="score-container">
          <div class="player-name" id="name-1">${playerNames[0]}</div>
          <div class="score-value" id="score-1">${hp[0]}</div>
        </div>
        <div class="controls-overlay">
          <div class="tap-zone minus" data-player="1" data-dir="-1"></div>
          <div class="tap-zone plus" data-player="1" data-dir="1"></div>
        </div>
        <div class="mini-btn-container">
          <button class="mini-btn" data-player="1" data-val="-5">-5</button>
          <button class="mini-btn" data-player="1" data-val="5">+5</button>
        </div>
      </div>
    </div>
  `;

  attachEventListeners();
};

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {
    console.log(`${err.name}, ${err.message}`);
  }
};

const attachEventListeners = () => {
  // Setup controls
  const customInput = document.getElementById('custom-hp');
  const presetBtns = document.querySelectorAll('.preset-btn');
  
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      presetBtns.forEach(b => b.classList.remove('active'));
      const val = e.target.getAttribute('data-val');
      customInput.value = val;
      e.target.classList.add('active');
      defaultHp = parseInt(val, 10);
      vibrate(20);
    });
  });

  customInput.addEventListener('input', (e) => {
    presetBtns.forEach(b => b.classList.remove('active'));
    defaultHp = parseInt(e.target.value, 10) || 50;
  });

  document.getElementById('edit-names-btn').addEventListener('click', () => {
    const p1 = prompt("Enter Player 1 Name:", playerNames[0]);
    if (p1 !== null && p1.trim() !== '') {
      playerNames[0] = p1.trim();
      const el1 = document.getElementById('name-1');
      if (el1) el1.innerText = playerNames[0];
    }
    const p2 = prompt("Enter Player 2 Name:", playerNames[1]);
    if (p2 !== null && p2.trim() !== '') {
      playerNames[1] = p2.trim();
      const el2 = document.getElementById('name-2');
      if (el2) el2.innerText = playerNames[1];
    }
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    hp = [defaultHp, defaultHp];
    updateDisplay();
    gameInProgress = true;
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('resume-btn').classList.remove('hidden');
    document.getElementById('start-btn').innerText = 'NEW DUEL';
    requestWakeLock();
    vibrate([30, 50, 30]);
  });

  document.getElementById('resume-btn').addEventListener('click', () => {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    requestWakeLock();
    vibrate(20);
  });

  const installBtn = document.getElementById('install-btn');
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    }
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    
    if (gameInProgress) {
      document.getElementById('resume-btn').classList.remove('hidden');
      document.getElementById('start-btn').innerText = 'NEW DUEL';
    } else {
      document.getElementById('resume-btn').classList.add('hidden');
      document.getElementById('start-btn').innerText = 'BEGIN DUEL';
    }

    vibrate(20);
    if(wakeLock !== null) {
      wakeLock.release()
      .then(() => { wakeLock = null; });
    }
  });

  // Game tracking controls
  const updateHp = (playerIdx, change, x, y) => {
    hp[playerIdx] += change;
    updateDisplay();
    spawnFloatingNumber(playerIdx, change, x, y);
    vibrate(change > 0 ? 10 : 30);
  };

  document.querySelectorAll('.tap-zone').forEach(zone => {
    zone.addEventListener('pointerdown', (e) => {
      const isPlayer1 = zone.getAttribute('data-player') === '1';
      const dir = parseInt(zone.getAttribute('data-dir'), 10);
      const playerIdx = isPlayer1 ? 0 : 1;
      
      const panel = document.querySelector(`.player-panel[data-player="${isPlayer1 ? '1' : '2'}"]`);
      const rect = panel.getBoundingClientRect();
      const localX = isPlayer1 ? e.clientX - rect.left : rect.right - e.clientX;
      const localY = isPlayer1 ? e.clientY - rect.top : rect.bottom - e.clientY;

      updateHp(playerIdx, dir, localX, localY);
    });
  });

  document.querySelectorAll('.mini-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isPlayer1 = btn.getAttribute('data-player') === '1';
      const val = parseInt(btn.getAttribute('data-val'), 10);
      const playerIdx = isPlayer1 ? 0 : 1;
      
      const panel = document.querySelector(`.player-panel[data-player="${isPlayer1 ? '1' : '2'}"]`);
      const pRect = panel.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      
      // Calculate center of button
      const btnCenterX = bRect.left + bRect.width / 2;
      const btnCenterY = bRect.top + bRect.height / 2;
      
      const localX = isPlayer1 ? btnCenterX - pRect.left : pRect.right - btnCenterX;
      const localY = isPlayer1 ? btnCenterY - pRect.top : pRect.bottom - btnCenterY;

      updateHp(playerIdx, val, localX, localY);
    });
  });
};

const spawnFloatingNumber = (playerIdx, change, x, y) => {
  const panel = document.querySelector(`.player-panel[data-player="${playerIdx === 0 ? '1' : '2'}"]`);
  const floater = document.createElement('div');
  floater.className = `floater ${change > 0 ? 'positive' : 'negative'}`;
  floater.textContent = change > 0 ? `+${change}` : change;
  
  floater.style.left = `${x}px`;
  floater.style.top = `${y}px`;
  
  panel.appendChild(floater);
  
  // Clean up
  setTimeout(() => {
    if(panel.contains(floater)) {
      panel.removeChild(floater);
    }
  }, 800);
};

const updateDisplay = () => {
  const score1 = document.getElementById('score-1');
  const score2 = document.getElementById('score-2');
  
  if (score1.innerText != hp[0]) {
    score1.innerText = hp[0];
    bounce(score1);
  }
  if (score2.innerText != hp[1]) {
    score2.innerText = hp[1];
    bounce(score2);
  }
};

const bounce = (el) => {
  el.classList.remove('bump');
  void el.offsetWidth; // Trigger reflow
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 100);
};

// Handle visibility change to restore wake lock
document.addEventListener('visibilitychange', () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  console.log('App installed');
  deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.classList.add('hidden');
});

// Initialize
renderLayout();

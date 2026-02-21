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
  // Elements are largely already in HTML, we just need to set initial dynamic values
  document.getElementById('score-1').innerText = hp[0];
  document.getElementById('score-2').innerText = hp[1];
  document.getElementById('name-1').innerText = playerNames[0];
  document.getElementById('name-2').innerText = playerNames[1];

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
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  if (isStandalone) return;
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

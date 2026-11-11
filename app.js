/**
 * Spin Wheel 3D - Application Controller & State Management
 * Connects 3D Wheel, Volumetric Smoke, Audio Synthesizer, Confetti, and LocalStorage
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Subsystems
  const smoke = new SmokeBackground('smoke-canvas');
  const confetti = new ConfettiCannon('confetti-canvas');

  // 2. Default Initial State: Start clean with no pre-filled names
  const legacyDefaultNames = new Set([
    'Alex Rivers',
    'Jordan Smith',
    'Taylor Swift',
    'Morgan Reed',
    'Sam Wilson',
    'Casey Becker',
    'Riley Vance',
    'Jamie Fox'
  ]);

  // Load persisted state (auto-clean legacy pre-names)
  let names = [];
  try {
    const saved = localStorage.getItem('spin_wheel_names');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Remove legacy sample names
        names = parsed.filter(item => !legacyDefaultNames.has(item.text));
      }
    }
  } catch (e) {
    console.warn('Could not load saved names:', e);
  }

  // Save the cleaned empty list so localStorage is updated
  localStorage.setItem('spin_wheel_names', JSON.stringify(names));

  let history = [];
  try {
    const savedHist = localStorage.getItem('spin_wheel_history');
    if (savedHist) history = JSON.parse(savedHist);
  } catch (e) {
    console.warn('Could not load history:', e);
  }

  // DOM Elements
  const wheelCanvas = document.getElementById('wheel-canvas');
  const wheelStage = document.getElementById('wheel-perspective-stage');
  const btnSpin = document.getElementById('btn-spin-wheel');
  const formAdd = document.getElementById('form-add-name');
  const inputNewName = document.getElementById('input-new-name');
  const namesList = document.getElementById('names-list');
  const namesCountBadge = document.getElementById('names-count-badge');
  const btnShuffle = document.getElementById('btn-shuffle-names');
  const btnSort = document.getElementById('btn-sort-names');
  const btnClearAll = document.getElementById('btn-clear-all');

  // Bulk modal
  const btnOpenBulk = document.getElementById('btn-open-bulk');
  const modalBulk = document.getElementById('modal-bulk');
  const btnCloseBulk = document.getElementById('btn-close-bulk');
  const btnCancelBulk = document.getElementById('btn-cancel-bulk');
  const btnSubmitBulk = document.getElementById('btn-submit-bulk');
  const textareaBulk = document.getElementById('textarea-bulk-names');

  // Winner modal
  const modalWinner = document.getElementById('modal-winner');
  const winnerNameText = document.getElementById('winner-name-text');
  const btnEliminateWinner = document.getElementById('btn-eliminate-winner');
  const btnKeepWinner = document.getElementById('btn-keep-winner');
  const btnCloseWinner = document.getElementById('btn-close-winner');

  // History & Presets & Settings
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const themeCards = document.querySelectorAll('.theme-card');
  const durationPills = document.querySelectorAll('.duration-pill');
  const presetChips = document.querySelectorAll('.preset-chip');

  // Sound & Fullscreen
  const btnSound = document.getElementById('btn-sound');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  let currentWinner = null;

  // 3. Initialize 3D Spin Wheel Engine
  let currentDuration = parseInt(localStorage.getItem('spin_wheel_duration') || '5500', 10);

  const wheel = new SpinWheel('wheel-canvas', {
    spinDuration: currentDuration,
    onTick: (pitchRatio) => {
      soundEngine.playTick(pitchRatio);
    },
    onSpinStart: () => {
      btnSpin.disabled = true;
      btnSpin.style.opacity = '0.6';
    },
    onSpinEnd: (winner) => {
      btnSpin.disabled = false;
      btnSpin.style.opacity = '1';
      currentWinner = winner;

      // Celebrate!
      soundEngine.playWinFanfare();

      // Confetti burst from wheel center
      const rect = wheelCanvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      confetti.burst(cx, cy, 220);

      // Add to history
      addHistoryRecord(winner.text);

      // Open celebration modal with slight delay for dramatic effect
      setTimeout(() => {
        winnerNameText.textContent = winner.text;
        modalWinner.classList.add('open');
      }, 500);
    }
  });

  // Supply wheel with initial names
  wheel.setItems(names);

  // 4. Persistence & State Sync
  function saveNames() {
    localStorage.setItem('spin_wheel_names', JSON.stringify(names));
    wheel.setItems(names);
    renderNamesList();
  }

  function saveHistory() {
    localStorage.setItem('spin_wheel_history', JSON.stringify(history));
    renderHistory();
  }

  function addHistoryRecord(nameText) {
    const record = {
      name: nameText,
      timestamp: Date.now()
    };
    history.unshift(record);
    if (history.length > 50) history.pop();
    saveHistory();
  }

  // 5. Render Names List
  function renderNamesList() {
    namesList.innerHTML = '';
    const activeCount = names.filter(n => n.active !== false).length;
    namesCountBadge.textContent = `${activeCount} / ${names.length}`;

    if (names.length === 0) {
      namesList.innerHTML = `<div class="empty-state">No names added yet.<br>Type a name above or choose a preset!</div>`;
      btnSpin.disabled = true;
      return;
    }

    btnSpin.disabled = activeCount < 2;

    names.forEach((item, index) => {
      const colorScheme = wheel.palette[index % wheel.palette.length];
      const card = document.createElement('div');
      card.className = `name-item ${item.active === false ? 'inactive' : ''}`;
      card.dataset.id = item.id;

      card.innerHTML = `
        <div class="name-item-left">
          <div class="custom-checkbox ${item.active !== false ? 'checked' : ''}" title="${item.active !== false ? 'Exclude from spin' : 'Include in spin'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="color-dot" style="background: ${colorScheme.start}; color: ${colorScheme.start};"></span>
          <span class="name-item-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
        </div>
        <div class="name-item-actions">
          <button type="button" class="btn-item-action delete" title="Delete name">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Checkbox toggle
      const checkbox = card.querySelector('.custom-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEngine.playButton();
        item.active = item.active === false ? true : false;
        saveNames();
      });

      // Delete action
      const btnDelete = card.querySelector('.btn-item-action.delete');
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEngine.playButton();
        names = names.filter(n => n.id !== item.id);
        saveNames();
      });

      namesList.appendChild(card);
    });
  }

  // 6. Render History List
  function renderHistory() {
    historyList.innerHTML = '';
    if (history.length === 0) {
      historyList.innerHTML = `<div class="empty-state">No spins yet. Spin the wheel to pick your first lucky winner!</div>`;
      return;
    }

    history.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const timeStr = new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      item.innerHTML = `
        <div class="history-item-left">
          <span class="history-name">${escapeHtml(rec.name)}</span>
          <span class="history-time">${timeStr}</span>
        </div>
        <span class="history-rank">#${history.length - idx}</span>
      `;
      historyList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 7. Add Name Handlers
  formAdd.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = inputNewName.value.trim();
    if (!val) return;

    soundEngine.playButton();
    names.push({
      id: 'name_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      text: val,
      active: true
    });

    inputNewName.value = '';
    saveNames();

    // Scroll to bottom of names list
    setTimeout(() => {
      namesList.scrollTop = namesList.scrollHeight;
    }, 50);
  });

  // Quick Action Buttons
  btnShuffle.addEventListener('click', () => {
    if (names.length < 2) return;
    soundEngine.playButton();
    // Fisher-Yates shuffle with cryptographic random
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    saveNames();
  });

  btnSort.addEventListener('click', () => {
    if (names.length < 2) return;
    soundEngine.playButton();
    names.sort((a, b) => a.text.localeCompare(b.text, undefined, { numeric: true, sensitivity: 'base' }));
    saveNames();
  });

  btnClearAll.addEventListener('click', () => {
    if (names.length === 0) return;
    if (confirm('Are you sure you want to clear all names?')) {
      soundEngine.playButton();
      names = [];
      saveNames();
    }
  });

  // 8. Bulk Add Modal
  btnOpenBulk.addEventListener('click', () => {
    soundEngine.playButton();
    textareaBulk.value = names.map(n => n.text).join('\n');
    modalBulk.classList.add('open');
    textareaBulk.focus();
  });

  function closeBulkModal() {
    modalBulk.classList.remove('open');
  }

  btnCloseBulk.addEventListener('click', closeBulkModal);
  btnCancelBulk.addEventListener('click', closeBulkModal);

  btnSubmitBulk.addEventListener('click', () => {
    soundEngine.playButton();
    const raw = textareaBulk.value;
    // Split by newlines, commas, or semicolons
    const lines = raw.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);

    if (lines.length > 0) {
      names = lines.map((text, i) => ({
        id: 'name_' + Date.now() + '_' + i,
        text: text,
        active: true
      }));
      saveNames();
    }
    closeBulkModal();
  });

  // 9. Winner Modal Handlers
  function closeWinnerModal() {
    modalWinner.classList.remove('open');
  }

  btnCloseWinner.addEventListener('click', closeWinnerModal);

  btnEliminateWinner.addEventListener('click', () => {
    soundEngine.playButton();
    if (currentWinner) {
      names = names.filter(n => n.id !== currentWinner.id);
      saveNames();
    }
    closeWinnerModal();
  });

  btnKeepWinner.addEventListener('click', () => {
    soundEngine.playButton();
    closeWinnerModal();
    // Prompt ready to spin again
    setTimeout(() => {
      triggerSpin();
    }, 400);
  });

  // 10. Spin Execution Trigger
  function triggerSpin() {
    if (wheel.isSpinning) return;
    soundEngine.playWhoosh();
    const result = wheel.spin();
    if (result && result.error) {
      alert(result.error);
    }
  }

  btnSpin.addEventListener('click', triggerSpin);
  wheelCanvas.addEventListener('click', triggerSpin);

  // Keyboard shortcut: Spacebar triggers spin
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      triggerSpin();
    }
  });

  // 11. Interactive 3D Perspective Tilt on Wheel
  if (wheelStage) {
    let targetTiltX = 8;
    let targetTiltY = 0;
    let curTiltX = 8;
    let curTiltY = 0;

    window.addEventListener('mousemove', (e) => {
      const rect = wheelStage.getBoundingClientRect();
      const stageCenterX = rect.left + rect.width / 2;
      const stageCenterY = rect.top + rect.height / 2;

      const normX = (e.clientX - stageCenterX) / (window.innerWidth / 2);
      const normY = (e.clientY - stageCenterY) / (window.innerHeight / 2);

      // Subtle natural 3D tilt
      targetTiltY = Math.max(-12, Math.min(12, normX * 14));
      targetTiltX = Math.max(-4, Math.min(18, 8 - normY * 12));
    }, { passive: true });

    function updateTilt() {
      curTiltX += (targetTiltX - curTiltX) * 0.08;
      curTiltY += (targetTiltY - curTiltY) * 0.08;
      wheelStage.style.transform = `perspective(1000px) rotateX(${curTiltX}deg) rotateY(${curTiltY}deg)`;
      requestAnimationFrame(updateTilt);
    }
    requestAnimationFrame(updateTilt);
  }

  // 12. Tab Switcher
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundEngine.playButton();
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // 13. Preset Lists Loader
  const presetData = {
    numbers: Array.from({ length: 20 }, (_, i) => `Number ${i + 1}`),
    team: ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Casey', 'Riley', 'Jamie'],
    food: ['Pizza 🍕', 'Sushi 🍣', 'Burgers 🍔', 'Tacos 🌮', 'Italian Pasta 🍝', 'Fresh Salad 🥗', 'Thai Curry 🍛', 'Ramen 🍜'],
    decisions: ['Yes, definitely!', 'No, not now', 'Maybe later', 'Ask a friend', 'Go for it!', 'Try again tomorrow'],
    giveaway: ['Grand Prize 🏆', '$50 Gift Card 💳', 'Exclusive Hoodie 👕', 'Tech Gadget 🎧', 'Coffee Mug ☕', 'Bonus Entry ⭐']
  };

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.preset;
      if (presetData[type]) {
        soundEngine.playButton();
        names = presetData[type].map((text, i) => ({
          id: 'name_' + Date.now() + '_' + i,
          text: text,
          active: true
        }));
        saveNames();
      }
    });
  });

  // 14. Theme / Smoke Background Selector
  const savedTheme = localStorage.getItem('spin_wheel_theme') || 'violet';
  smoke.setTheme(savedTheme);

  themeCards.forEach(card => {
    if (card.dataset.theme === savedTheme) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }

    card.addEventListener('click', () => {
      soundEngine.playButton();
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const theme = card.dataset.theme;
      smoke.setTheme(theme);
      localStorage.setItem('spin_wheel_theme', theme);
    });
  });

  // 15. Spin Duration Pills
  durationPills.forEach(pill => {
    const dur = parseInt(pill.dataset.duration, 10);
    if (dur === currentDuration) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }

    pill.addEventListener('click', () => {
      soundEngine.playButton();
      durationPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentDuration = dur;
      wheel.setDuration(currentDuration);
      localStorage.setItem('spin_wheel_duration', currentDuration.toString());
    });
  });

  // 16. Sound Toggle
  function updateSoundUI() {
    if (soundEngine.muted) {
      iconSoundOn.style.display = 'none';
      iconSoundOff.style.display = 'block';
    } else {
      iconSoundOn.style.display = 'block';
      iconSoundOff.style.display = 'none';
    }
  }
  updateSoundUI();

  btnSound.addEventListener('click', () => {
    soundEngine.toggleMute();
    updateSoundUI();
    if (!soundEngine.muted) {
      soundEngine.playButton();
    }
  });

  // 17. Fullscreen Toggle
  btnFullscreen.addEventListener('click', () => {
    soundEngine.playButton();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  // 18. Clear History
  btnClearHistory.addEventListener('click', () => {
    if (history.length === 0) return;
    if (confirm('Clear winner history?')) {
      soundEngine.playButton();
      history = [];
      saveHistory();
    }
  });

  // Initial Renders
  renderNamesList();
  renderHistory();
});

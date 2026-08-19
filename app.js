// State Management for Predictive Maintenance Dashboard
const state = {
  // Configured baselines
  refCurrent: 10.0,
  refSpeed: 1500,
  refTemp: 45.0,
  refVibration: 0.50,
  tolerance: 5, // +/- 5% for load
  
  // Current values
  currentVal: 10.0,
  speedVal: 1500,
  tempVal: 45.0,
  vibrationVal: 0.50,
  anomalyScore: 0.12,
  classification: 'Healthy',
  recommendation: 'No Action required. Continual monitoring.',
  
  // Feature extraction details (mocked from Pi 4)
  crestFactor: 3.1,
  kurtosis: 3.0,
  tempGradient: 0.0,
  
  // Simulator State
  isPlaying: true,
  currentScenario: 'normal', // 'normal', 'overload', 'underload', 'bearing', 'misalignment', 'overheating'
  timeIndex: 0,
  
  // History arrays for charts
  historyLimit: 25,
  history: {
    labels: [],
    temperature: [],
    vibration: [],
    current: [],
    speed: [],
    anomalyScore: []
  },
  
  // Logger
  logs: []
};

// UI Elements
const els = {
  refCurrentInput: document.getElementById('input-ref-current'),
  refSpeedInput: document.getElementById('input-ref-speed'),
  refTempInput: document.getElementById('input-ref-temp'),
  refVibrationInput: document.getElementById('input-ref-vibration'),
  toleranceInput: document.getElementById('input-tolerance'),
  
  labelRefCurrent: document.getElementById('label-ref-current'),
  labelRefSpeed: document.getElementById('label-ref-speed'),
  labelRefTemp: document.getElementById('label-ref-temp'),
  labelRefVibration: document.getElementById('label-ref-vibration'),
  labelTolerance: document.getElementById('label-tolerance'),
  
  valCurrent: document.getElementById('val-current'),
  valTemp: document.getElementById('val-temp'),
  valVibration: document.getElementById('val-vibration'),
  valSpeed: document.getElementById('val-speed'),
  valAnomalyScore: document.getElementById('val-anomaly-score'),
  valRecommendation: document.getElementById('val-recommendation'),
  classificationBadge: document.getElementById('classification-badge'),
  
  cardCurrent: document.getElementById('card-current'),
  cardTemp: document.getElementById('card-temp'),
  cardVibration: document.getElementById('card-vibration'),
  cardSpeed: document.getElementById('card-speed'),
  cardAnomalyScore: document.getElementById('card-anomaly-score'),
  
  statusCurrent: document.getElementById('status-current'),
  statusTemp: document.getElementById('status-temp'),
  statusVibration: document.getElementById('status-vibration'),
  statusSpeed: document.getElementById('status-speed'),
  
  piCpuTemp: document.getElementById('pi-cpu-temp'),
  piRam: document.getElementById('pi-ram'),
  piLoad: document.getElementById('pi-load'),
  edgePulseDot: document.getElementById('edge-pulse-dot'),
  
  btnNormal: document.getElementById('btn-normal'),
  btnOverload: document.getElementById('btn-overload'),
  btnUnderload: document.getElementById('btn-underload'),
  btnBearing: document.getElementById('btn-bearing'),
  btnMisalignment: document.getElementById('btn-misalignment'),
  btnOverheating: document.getElementById('btn-overheating'),
  
  btnSimPlay: document.getElementById('btn-sim-play'),
  btnSimReset: document.getElementById('btn-sim-reset'),
  simPlayIcon: document.getElementById('sim-play-icon'),
  simPlayText: document.getElementById('sim-play-text'),
  
  relayUnderload: document.getElementById('relay-underload'),
  relayOverload: document.getElementById('relay-overload'),
  relayTemp: document.getElementById('relay-temp'),
  relayEstop: document.getElementById('relay-estop'),
  
  troubleCard: document.getElementById('trouble-card'),
  troubleTitle: document.getElementById('trouble-title'),
  troubleDesc: document.getElementById('trouble-desc'),
  troubleSteps: document.getElementById('trouble-steps'),
  
  logTbody: document.getElementById('log-tbody')
};

// Diagnostic & Troubleshooting database
const diagnosticsDB = {
  normal: {
    title: '🟢 Normal Operating Health',
    desc: 'All industrial rotating machinery metrics match the configured baselines within acceptable safety margins. Edge computing device confirms stable state estimation.',
    steps: [
      'Perform normal shift verification checks.',
      'Check external pump/shaft coupling visually for grease leaks.',
      'No corrective action required. Unsupervised Isolation Forest model score remains low.'
    ]
  },
  overload: {
    title: '🔴 Motor Overloaded (Current Drift)',
    desc: 'Motor draw current has exceeded the user-configured baseline +5% tolerance limit. This represents an high load friction or process lockup.',
    steps: [
      'Check pump impeller / motor load for material binding or solid build-up.',
      'Verify that supply line voltages are balanced and correct.',
      'Check motor cooling fins for blockages causing high coil resistance.',
      'Reduce process flow rate or mechanical load to relieve motor strain.'
    ]
  },
  underload: {
    title: '🟡 Motor Underloaded (Loss of Process)',
    desc: 'Motor current draw is significantly below the baseline tolerance limit. This usually implies coupling breakage, fluid loss, belt slippage, or dry running.',
    steps: [
      'Inspect shaft coupling. Verify if motor is still physically connected to pump/gearbox.',
      'For pump systems: Check for dry running, supply valve closure, or pump cavitation.',
      'For belt-driven systems: Verify belt tension and look for broken drive belts.',
      'Confirm process feed sensors are healthy.'
    ]
  },
  bearing: {
    title: '🔴 Bearing Wear (High Acoustic/Vibration)',
    desc: 'High RMS vibration levels detected with anomalous Crest Factor (CF > 4.5) and Kurtosis. This indicates local degradation of inner/outer bearing raceways.',
    steps: [
      'Lubricate bearings according to manufacturer specifications immediately.',
      'Plan scheduled bearing replacement during next maintenance cycle.',
      'Conduct ultrasonic acoustic analysis to localize mechanical friction points.',
      'Check for grease degradation or metallic shavings in oil samples.'
    ]
  },
  misalignment: {
    title: '🔴 Mechanical Misalignment (High Vibration)',
    desc: 'Excessive overall vibration RMS. Unsupervised Isolation Forest flags structural abnormality. Indicates angular or parallel shaft offset between motor and load.',
    steps: [
      'Perform laser or dial indicator alignment on the motor shaft.',
      'Check for loose hold-down bolts (soft foot) on motor foundation frame.',
      'Inspect flexible coupling inserts for wear, cracking, or deterioration.',
      'Verify that foundation baseplate has not settled or cracked.'
    ]
  },
  overheating: {
    title: '🔥 Motor Overheating (Thermal Runaway)',
    desc: 'Motor winding and housing temperature has crossed critical threshold bounds. Thermal gradient represents rapid heat accumulation.',
    steps: [
      'Activate additional external cooling fans / blowers.',
      'Inspect motor cooling fan impeller on the non-drive end for damage.',
      'Check motor windings resistance and insulation integrity (Megger test).',
      'Verify load current is not contributing to excessive copper losses.'
    ]
  }
};

// Global chart objects
let charts = {};

// Initialise Chart.js Charts
function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#475569', font: { family: 'Outfit', size: 10 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#3b82f6',
        bodyColor: '#f3f4f6',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(15, 23, 42, 0.06)' },
        ticks: { color: '#475569', font: { family: 'Outfit', size: 9 } }
      },
      y: {
        grid: { color: 'rgba(15, 23, 42, 0.06)' },
        ticks: { color: '#475569', font: { family: 'Outfit', size: 9 } }
      }
    },
    interaction: {
      intersect: false,
    },
    elements: {
      point: { radius: 0, hoverRadius: 4 },
      line: { tension: 0.3 }
    }
  };

  // 1. Temperature Chart
  const ctxTemp = document.getElementById('chart-temperature').getContext('2d');
  charts.temp = new Chart(ctxTemp, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Measured Temp (°C)',
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 2,
          data: [],
          fill: true
        },
        {
          label: 'Warning Limit (70°C)',
          borderColor: 'rgba(217, 119, 6, 0.7)',
          borderDash: [5, 5],
          borderWidth: 1,
          pointStyle: 'none',
          data: []
        },
        {
          label: 'Critical Limit (80°C)',
          borderColor: 'rgba(220, 38, 38, 0.8)',
          borderDash: [2, 2],
          borderWidth: 1.5,
          pointStyle: 'none',
          data: []
        }
      ]
    },
    options: chartOptions
  });

  // 2. Vibration Chart
  const ctxVib = document.getElementById('chart-vibration').getContext('2d');
  charts.vibration = new Chart(ctxVib, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Vibration RMS (g)',
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.08)',
          borderWidth: 2,
          data: [],
          fill: true
        },
        {
          label: 'Warning (1.2g)',
          borderColor: 'rgba(217, 119, 6, 0.7)',
          borderDash: [5, 5],
          borderWidth: 1,
          data: []
        },
        {
          label: 'Alarm (1.8g)',
          borderColor: 'rgba(220, 38, 38, 0.8)',
          borderDash: [2, 2],
          borderWidth: 1.5,
          data: []
        }
      ]
    },
    options: chartOptions
  });

  // 3. Current & Speed Chart (Multi-axis)
  const ctxCurrSpeed = document.getElementById('chart-current-speed').getContext('2d');
  
  // Custom options for multi-axis
  const currSpeedOptions = JSON.parse(JSON.stringify(chartOptions));
  currSpeedOptions.scales.y = {
    type: 'linear',
    display: true,
    position: 'left',
    title: { display: true, text: 'Current (A)', color: '#4f46e5' },
    grid: { color: 'rgba(15, 23, 42, 0.06)' },
    ticks: { color: '#475569' }
  };
  currSpeedOptions.scales.ySpeed = {
    type: 'linear',
    display: true,
    position: 'right',
    title: { display: true, text: 'Speed (RPM)', color: '#0d9488' },
    grid: { drawOnChartArea: false }, // Avoid grid overlay
    ticks: { color: '#475569' }
  };

  charts.currentSpeed = new Chart(ctxCurrSpeed, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Current (A)',
          borderColor: '#4f46e5',
          borderWidth: 2,
          data: [],
          yAxisID: 'y'
        },
        {
          label: 'Lower Limit (-5%)',
          borderColor: 'rgba(79, 70, 229, 0.3)',
          borderDash: [4, 4],
          borderWidth: 1,
          data: [],
          yAxisID: 'y',
          pointStyle: 'none'
        },
        {
          label: 'Upper Limit (+5%)',
          borderColor: 'rgba(79, 70, 229, 0.3)',
          borderDash: [4, 4],
          borderWidth: 1,
          data: [],
          yAxisID: 'y',
          pointStyle: 'none'
        },
        {
          label: 'Speed (RPM)',
          borderColor: '#0d9488',
          borderWidth: 1.5,
          data: [],
          yAxisID: 'ySpeed'
        }
      ]
    },
    options: currSpeedOptions
  });

  // 4. Anomaly Trend Chart
  const ctxTrend = document.getElementById('chart-anomaly-trend').getContext('2d');
  charts.trend = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Isolation Forest Anomaly Risk',
          borderColor: '#9d4edd',
          backgroundColor: 'rgba(157, 78, 221, 0.15)',
          borderWidth: 2,
          data: [],
          fill: true
        }
      ]
    },
    options: {
      ...chartOptions,
      scales: {
        x: chartOptions.scales.x,
        y: {
          min: 0,
          max: 1.0,
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#9ca3af' }
        }
      }
    }
  });
}

// Log System Events
function addLog(signal, level, text) {
  const timestamp = new Date().toTimeString().split(' ')[0];
  state.logs.unshift({ timestamp, signal, level, text });
  
  if (state.logs.length > 30) {
    state.logs.pop();
  }
  
  // Re-render log table
  let html = '';
  state.logs.forEach(log => {
    let lvlClass = 'lvl-info';
    if (log.level === 'WARNING') lvlClass = 'lvl-warn';
    if (log.level === 'CRITICAL') lvlClass = 'lvl-error';
    
    html += `
      <tr>
        <td>${log.timestamp}</td>
        <td>${log.signal}</td>
        <td><span class="log-level ${lvlClass}">${log.level}</span></td>
        <td>${log.text}</td>
      </tr>
    `;
  });
  
  els.logTbody.innerHTML = html;
}

// Update Radial Anomaly Gauge UI
function updateAnomalyGauge(score) {
  const circumference = 283; // 2 * pi * 45
  const offset = circumference - (score * circumference);
  
  // Custom dynamic selection to handle dash/hyphen ID in JS
  const gaugeFill = document.getElementById('anomaly-gauge-fill');
  gaugeFill.style.strokeDashoffset = offset;
  
  // Change color based on score
  if (score < 0.25) {
    gaugeFill.style.stroke = 'var(--color-success)';
  } else if (score < 0.60) {
    gaugeFill.style.stroke = 'var(--color-warning)';
  } else {
    gaugeFill.style.stroke = 'var(--color-danger)';
  }
  
  els.valAnomalyScore.innerText = score.toFixed(2);
}

// Fetch input values into state
function loadInputsFromUI() {
  state.refCurrent = parseFloat(els.refCurrentInput.value) || 10.0;
  state.refSpeed = parseFloat(els.refSpeedInput.value) || 1500;
  state.refTemp = parseFloat(els.refTempInput.value) || 45.0;
  state.refVibration = parseFloat(els.refVibrationInput.value) || 0.50;
  state.tolerance = parseInt(els.toleranceInput.value) || 5;
  
  // Update labels
  els.labelRefCurrent.innerText = `${state.refCurrent.toFixed(1)} A`;
  els.labelRefSpeed.innerText = `${state.refSpeed} RPM`;
  els.labelRefTemp.innerText = `${state.refTemp.toFixed(1)} °C`;
  els.labelRefVibration.innerText = `${state.refVibration.toFixed(2)} g`;
  els.labelTolerance.innerText = `±${state.tolerance}%`;
}

// Setup Event Listeners
function setupEvents() {
  // Config UI listeners
  const inputs = [els.refCurrentInput, els.refSpeedInput, els.refTempInput, els.refVibrationInput, els.toleranceInput];
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      loadInputsFromUI();
      addLog('CONFIG', 'INFO', `Reference values updated in dashboard.`);
    });
  });

  // Scenario Buttons
  const scenarios = [
    { btn: els.btnNormal, type: 'normal', name: 'Normal operating load profile loaded.' },
    { btn: els.btnOverload, type: 'overload', name: 'Fault Injected: Mechanical Overload condition.' },
    { btn: els.btnUnderload, type: 'underload', name: 'Fault Injected: Motor Underload (loss of feed).' },
    { btn: els.btnBearing, type: 'bearing', name: 'Fault Injected: Outer-race Bearing Wear defect.' },
    { btn: els.btnMisalignment, type: 'misalignment', name: 'Fault Injected: Parallel Rotor Shaft Misalignment.' },
    { btn: els.btnOverheating, type: 'overheating', name: 'Fault Injected: Internal winding thermal breakdown.' }
  ];

  scenarios.forEach(sc => {
    sc.btn.addEventListener('click', () => {
      // Toggle active classes
      scenarios.forEach(s => s.btn.classList.remove('active'));
      sc.btn.classList.add('active');
      
      // Update state
      state.currentScenario = sc.type;
      addLog('SIMULATOR', 'WARNING', sc.name);
    });
  });

  // Play Pause Controls
  els.btnSimPlay.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      els.simPlayIcon.innerText = '⏸️';
      els.simPlayText.innerText = 'Pause Sim';
      els.edgePulseDot.classList.add('pulsing');
      addLog('SIMULATOR', 'INFO', 'Simulation process resumed.');
    } else {
      els.simPlayIcon.innerText = '▶️';
      els.simPlayText.innerText = 'Resume Sim';
      els.edgePulseDot.classList.remove('pulsing');
      addLog('SIMULATOR', 'INFO', 'Simulation paused.');
    }
  });

  // Reset Controls
  els.btnSimReset.addEventListener('click', () => {
    state.history.labels = [];
    state.history.temperature = [];
    state.history.vibration = [];
    state.history.current = [];
    state.history.speed = [];
    state.history.anomalyScore = [];
    state.timeIndex = 0;
    
    // Clear graphs
    Object.values(charts).forEach(chart => {
      chart.data.labels = [];
      chart.data.datasets.forEach(dataset => dataset.data = []);
      chart.update();
    });
    
    addLog('SYSTEM', 'INFO', 'Dashboard time-series buffers cleared.');
  });
}

// Compute Anomaly Score and Classification (Mock ML Isolation Forest)
function processAnomalyEngine() {
  const currentDev = (state.currentVal - state.refCurrent) / state.refCurrent;
  const speedDev = (state.speedVal - state.refSpeed) / state.refSpeed;
  const tempDiff = state.tempVal - state.refTemp;
  const vibRatio = state.vibrationVal / state.refVibration;
  
  // Tolerance limits
  const tolFraction = state.tolerance / 100.0;
  
  // Scoring parameters (contributions to overall anomaly score)
  let loadScore = 0.0;
  if (currentDev > tolFraction) {
    loadScore = Math.min((currentDev - tolFraction) * 5, 0.9); // Overload
  } else if (currentDev < -tolFraction) {
    loadScore = Math.min((Math.abs(currentDev) - tolFraction) * 4, 0.85); // Underload
  }
  
  let speedScore = Math.min(Math.abs(speedDev) * 8, 0.8);
  
  let tempScore = 0.0;
  if (tempDiff > 0) {
    // Under 15 deg drift is minor, above 15 warning, above 30 critical
    tempScore = Math.min(tempDiff / 30.0, 0.95);
  }
  
  let vibScore = 0.0;
  if (vibRatio > 1.2) {
    vibScore = Math.min((vibRatio - 1.2) / 3.0, 0.95);
  }
  
  // Overall ensemble score (similar to Isolation Forest average path depth normalization)
  let ensembleScore = Math.max(loadScore, speedScore, tempScore, vibScore);
  
  // Add micro noise to the score for healthy states
  if (ensembleScore < 0.15) {
    ensembleScore = 0.08 + Math.random() * 0.06;
  }
  
  // Cap at 1.0
  state.anomalyScore = Math.min(ensembleScore, 1.0);
  
  // Update Health Classification & Badge UI
  if (state.anomalyScore < 0.25) {
    state.classification = 'Healthy';
    state.recommendation = 'No Action required. Normal operations.';
    els.classificationBadge.className = 'classification-badge healthy';
    els.classificationBadge.innerText = 'Healthy';
    
    els.cardAnomalyScore.className = 'panel score-gauge-card success';
  } else if (state.anomalyScore < 0.60) {
    state.classification = 'Monitor';
    state.recommendation = 'Inspect parameters. Warning levels exceeded.';
    els.classificationBadge.className = 'classification-badge monitor';
    els.classificationBadge.innerText = 'Monitor';
    
    els.cardAnomalyScore.className = 'panel score-gauge-card warning';
  } else {
    state.classification = 'Anomaly';
    state.recommendation = getDynamicRecommendationText();
    els.classificationBadge.className = 'classification-badge anomaly';
    els.classificationBadge.innerText = 'Anomaly';
    
    els.cardAnomalyScore.className = 'panel score-gauge-card danger';
  }
  
  updateAnomalyGauge(state.anomalyScore);
  els.valRecommendation.innerText = state.recommendation;
}

// Get Recommendation subtitle for AI badge
function getDynamicRecommendationText() {
  switch (state.currentScenario) {
    case 'overload': return '🚨 Overload detected. Inspect load alignment & rotor binding.';
    case 'underload': return '⚠️ Underload warning. Verify coupling status & fluids.';
    case 'bearing': return '🛠️ Bearing Wear. Schedule lubrication / bearing replacement.';
    case 'misalignment': return '🔧 Misalignment detected. Perform shaft laser realignment.';
    case 'overheating': return '🔥 Winding Overheating. Check ventilation & cool-down cycle.';
    default: return '🚨 Anomaly detected. Investigate physical assets.';
  }
}

// Visual Signal Relays Driver
function driveExternalSignals() {
  const tolFraction = state.tolerance / 100.0;
  
  // 1. Underload Relay (Active if Current falls below negative tolerance limit)
  const isUnderloaded = state.currentVal < (state.refCurrent * (1.0 - tolFraction));
  if (isUnderloaded && state.currentScenario !== 'normal') {
    if (!els.relayUnderload.classList.contains('active-relay')) {
      els.relayUnderload.classList.add('active-relay');
      addLog('RELAY_DO_1', 'WARNING', 'Underload alarm signal: CLOSED [ACTIVE]');
    }
  } else {
    if (els.relayUnderload.classList.contains('active-relay')) {
      els.relayUnderload.classList.remove('active-relay');
      addLog('RELAY_DO_1', 'INFO', 'Underload alarm signal: OPEN [DEACTIVATED]');
    }
  }

  // 2. Overload Relay (Active if Current exceeds positive tolerance limit)
  const isOverloaded = state.currentVal > (state.refCurrent * (1.0 + tolFraction));
  if (isOverloaded && state.currentScenario !== 'normal') {
    if (!els.relayOverload.classList.contains('active-relay')) {
      els.relayOverload.classList.add('active-relay');
      addLog('RELAY_DO_2', 'CRITICAL', 'Overload Trip signal: CLOSED [TRIPPED]');
    }
  } else {
    if (els.relayOverload.classList.contains('active-relay')) {
      els.relayOverload.classList.remove('active-relay');
      addLog('RELAY_DO_2', 'INFO', 'Overload Trip signal: OPEN [RESET]');
    }
  }

  // 3. Thermal Relay (Active if winding temp spikes beyond warning levels)
  const isOverheating = state.tempVal > 70.0;
  if (isOverheating) {
    if (!els.relayTemp.classList.contains('active-relay')) {
      els.relayTemp.classList.add('active-relay');
      addLog('RELAY_DO_3', 'CRITICAL', 'Thermal warning relay: CLOSED [ACTIVE SIREN]');
    }
  } else {
    if (els.relayTemp.classList.contains('active-relay')) {
      els.relayTemp.classList.remove('active-relay');
      addLog('RELAY_DO_3', 'INFO', 'Thermal warning relay: OPEN [RESET]');
    }
  }

  // 4. E-Stop Interlock (Active if overall AI Anomaly Score is dangerously high)
  const isEmergencyStop = state.anomalyScore >= 0.65;
  if (isEmergencyStop) {
    if (!els.relayEstop.classList.contains('active-relay')) {
      els.relayEstop.classList.add('active-relay');
      addLog('RELAY_DO_4', 'CRITICAL', 'E-STOP Safety Interlock: OPEN [SYSTEM SHUTDOWN EMITTED]');
    }
  } else {
    if (els.relayEstop.classList.contains('active-relay')) {
      els.relayEstop.classList.remove('active-relay');
      addLog('RELAY_DO_4', 'INFO', 'E-STOP Safety Interlock: CLOSED [INTERLOCK CLEAR]');
    }
  }
}

// Update Troubleshooting details based on active scenario/anomaly
function updateTroubleshootingUI() {
  let diag = diagnosticsDB.normal;
  
  if (state.anomalyScore >= 0.25) {
    diag = diagnosticsDB[state.currentScenario] || diagnosticsDB.normal;
  }
  
  els.troubleTitle.innerHTML = diag.title;
  els.troubleDesc.innerText = diag.desc;
  
  let stepsHtml = '';
  diag.steps.forEach(step => {
    stepsHtml += `<li>${step}</li>`;
  });
  els.troubleSteps.innerHTML = stepsHtml;
}

// Generate next frame of physics simulation
function updateSimulation() {
  if (!state.isPlaying) return;
  
  state.timeIndex++;
  const t = state.timeIndex;
  
  // Base noise
  const noise = (min, max) => min + Math.random() * (max - min);
  
  // Baseline adjustments depending on loaded scenario
  switch (state.currentScenario) {
    case 'normal':
      // Normal operating condition
      state.currentVal = state.refCurrent + Math.sin(t * 0.1) * 0.15 + noise(-0.1, 0.1);
      state.speedVal = state.refSpeed + Math.round(noise(-8, 8));
      state.tempVal = state.refTemp + Math.sin(t * 0.05) * 0.4 + noise(-0.1, 0.1);
      state.vibrationVal = state.refVibration + noise(-0.03, 0.03);
      
      state.crestFactor = 3.1 + noise(-0.1, 0.1);
      state.kurtosis = 3.0 + noise(-0.1, 0.1);
      break;
      
    case 'overload':
      // Current rises beyond 5% tolerance
      // e.g. ref = 10, current -> 11.8 A (+18%)
      const targetOverloadCurrent = state.refCurrent * 1.18;
      state.currentVal = state.currentVal * 0.9 + targetOverloadCurrent * 0.1 + noise(-0.15, 0.15);
      
      // Speed drops slightly under load
      const targetOverloadSpeed = state.refSpeed * 0.96;
      state.speedVal = Math.round(state.speedVal * 0.92 + targetOverloadSpeed * 0.08 + noise(-5, 5));
      
      // Temperature slowly heats up due to excess power dissipation (I^2 * R heating)
      state.tempVal = Math.min(state.tempVal + 0.12 + noise(-0.02, 0.05), state.refTemp + 28);
      
      state.vibrationVal = state.refVibration * 1.25 + noise(-0.05, 0.05);
      state.crestFactor = 3.3 + noise(-0.1, 0.2);
      state.kurtosis = 3.2 + noise(-0.1, 0.2);
      break;
      
    case 'underload':
      // Current drops significantly below 5% tolerance
      // e.g. ref = 10, current -> 6.8 A (-32%)
      const targetUnderloadCurrent = state.refCurrent * 0.68;
      state.currentVal = state.currentVal * 0.85 + targetUnderloadCurrent * 0.15 + noise(-0.08, 0.08);
      
      // Speed rises slightly with load release
      const targetUnderloadSpeed = state.refSpeed * 1.02;
      state.speedVal = Math.round(state.speedVal * 0.9 + targetUnderloadSpeed * 0.1 + noise(-3, 3));
      
      // Temperature drops slightly
      state.tempVal = Math.max(state.tempVal - 0.15 + noise(-0.05, 0.05), state.refTemp - 6.0);
      
      state.vibrationVal = state.refVibration * 0.6 + noise(-0.02, 0.02);
      state.crestFactor = 2.8 + noise(-0.1, 0.1);
      state.kurtosis = 2.7 + noise(-0.1, 0.1);
      break;
      
    case 'bearing':
      // Extreme vibration spikes (RMS goes to 3.5x ref)
      const targetVibRMS = state.refVibration * 3.8;
      state.vibrationVal = state.vibrationVal * 0.8 + targetVibRMS * 0.2 + noise(-0.08, 0.08);
      
      // Crest factor and Kurtosis spike due to bearing crack shocks
      state.crestFactor = state.crestFactor * 0.9 + 5.2 * 0.1 + noise(-0.2, 0.2);
      state.kurtosis = state.kurtosis * 0.9 + 6.4 * 0.1 + noise(-0.3, 0.3);
      
      // Heating due to mechanical grinding friction
      state.tempVal = Math.min(state.tempVal + 0.18 + noise(-0.03, 0.07), state.refTemp + 22.0);
      
      state.currentVal = state.refCurrent * 1.03 + noise(-0.2, 0.2); // Current fluctuates slightly
      state.speedVal = state.refSpeed + Math.round(noise(-12, 12));
      break;
      
    case 'misalignment':
      // Vibration rises to 2.8x baseline
      const targetMisVib = state.refVibration * 2.8;
      state.vibrationVal = state.vibrationVal * 0.85 + targetMisVib * 0.15 + noise(-0.04, 0.04);
      
      // Periodic vibration, crest factor remains normal/moderate
      state.crestFactor = state.crestFactor * 0.92 + 3.5 * 0.08 + noise(-0.1, 0.1);
      state.kurtosis = state.kurtosis * 0.92 + 3.1 * 0.08 + noise(-0.1, 0.1);
      
      state.tempVal = Math.min(state.tempVal + 0.08 + noise(-0.02, 0.04), state.refTemp + 8.5);
      state.currentVal = state.refCurrent * 1.05 + noise(-0.15, 0.15); // Constant slight load
      state.speedVal = state.refSpeed + Math.round(noise(-6, 6));
      break;
      
    case 'overheating':
      // Temperature spikes very fast (up to 88°C)
      state.tempVal = Math.min(state.tempVal + 0.45 + noise(-0.05, 0.1), state.refTemp + 43.0);
      
      state.currentVal = state.refCurrent + noise(-0.1, 0.1);
      state.speedVal = state.refSpeed + Math.round(noise(-4, 4));
      state.vibrationVal = state.refVibration + noise(-0.02, 0.02);
      state.crestFactor = 3.0 + noise(-0.1, 0.1);
      state.kurtosis = 3.0 + noise(-0.1, 0.1);
      break;
  }
  
  // Calculate temperature gradient (simple difference from last timestep)
  const prevTemp = state.history.temperature.length > 0 ? state.history.temperature[state.history.temperature.length - 1] : state.tempVal;
  state.tempGradient = state.tempVal - prevTemp;
  
  // Process through Anomaly Engine and Output Relays
  processAnomalyEngine();
  driveExternalSignals();
  updateTroubleshootingUI();
  
  // Telemetry updates for Raspberry Pi 4 Model B
  let piTempTarget = 40.0 + (state.anomalyScore * 12.0) + (state.tempVal * 0.08);
  els.piCpuTemp.innerText = (piTempTarget + noise(-0.3, 0.3)).toFixed(1);
  els.piRam.innerText = (22.5 + (state.anomalyScore * 6.0) + noise(-0.1, 0.1)).toFixed(1);
  els.piLoad.innerText = (10.0 + (state.anomalyScore * 42.0) + noise(-0.8, 0.8)).toFixed(1);
  
  // Update Real-Time Metric UI Cards
  updateMetricsCards();
  
  // Push to history buffer
  const labelTime = new Date().toTimeString().split(' ')[0];
  state.history.labels.push(labelTime);
  state.history.temperature.push(state.tempVal);
  state.history.vibration.push(state.vibrationVal);
  state.history.current.push(state.currentVal);
  state.history.speed.push(state.speedVal);
  state.history.anomalyScore.push(state.anomalyScore);
  
  // Shift window
  if (state.history.labels.length > state.historyLimit) {
    state.history.labels.shift();
    state.history.temperature.shift();
    state.history.vibration.shift();
    state.history.current.shift();
    state.history.speed.shift();
    state.history.anomalyScore.shift();
  }
  
  // Update Chart.js datasets
  updateChartsUI();
}

// Update card color formatting and visual outputs
function updateMetricsCards() {
  // Current Card
  els.valCurrent.innerText = state.currentVal.toFixed(2);
  const tolFraction = state.tolerance / 100.0;
  const upperCurrentLimit = state.refCurrent * (1.0 + tolFraction);
  const lowerCurrentLimit = state.refCurrent * (1.0 - tolFraction);
  
  if (state.currentVal > upperCurrentLimit && state.currentScenario !== 'normal') {
    els.cardCurrent.className = 'panel metric-card danger';
    els.statusCurrent.innerHTML = `🔴 Overload: Max ${upperCurrentLimit.toFixed(1)}A Exceeded`;
  } else if (state.currentVal < lowerCurrentLimit && state.currentScenario !== 'normal') {
    els.cardCurrent.className = 'panel metric-card warning';
    els.statusCurrent.innerHTML = `🟡 Underload: Below ${lowerCurrentLimit.toFixed(1)}A`;
  } else {
    els.cardCurrent.className = 'panel metric-card success';
    els.statusCurrent.innerHTML = `🟢 Load Normal (±${state.tolerance}%)`;
  }
  
  // Temperature Card
  els.valTemp.innerText = state.tempVal.toFixed(1);
  if (state.tempVal >= 80.0) {
    els.cardTemp.className = 'panel metric-card danger';
    els.statusTemp.innerHTML = `🔴 CRITICAL: Temp ≥ 80°C`;
  } else if (state.tempVal >= 70.0) {
    els.cardTemp.className = 'panel metric-card warning';
    els.statusTemp.innerHTML = `🟡 WARNING: Winding Hot`;
  } else {
    els.cardTemp.className = 'panel metric-card success';
    els.statusTemp.innerHTML = `🟢 Within Expected Limits`;
  }
  
  // Vibration Card
  els.valVibration.innerText = state.vibrationVal.toFixed(2);
  if (state.vibrationVal >= 1.8) {
    els.cardVibration.className = 'panel metric-card danger';
    els.statusVibration.innerHTML = `🔴 ALARM: Severe Vib ≥ 1.8g`;
  } else if (state.vibrationVal >= 1.2) {
    els.cardVibration.className = 'panel metric-card warning';
    els.statusVibration.innerHTML = `🟡 Warning: Bearing Wear`;
  } else {
    els.cardVibration.className = 'panel metric-card success';
    els.statusVibration.innerHTML = `🟢 Vibration Nominal`;
  }
  
  // Speed Card
  els.valSpeed.innerText = Math.round(state.speedVal);
  const speedDiff = Math.abs(state.speedVal - state.refSpeed) / state.refSpeed;
  if (speedDiff > 0.05 && state.currentScenario !== 'normal') {
    els.cardSpeed.className = 'panel metric-card warning';
    els.statusSpeed.innerHTML = `🟡 Speed Shift: Dev > 5%`;
  } else {
    els.cardSpeed.className = 'panel metric-card success';
    els.statusSpeed.innerHTML = `🟢 Synchronous Speed`;
  }
}

// Update Charts UI datasets
function updateChartsUI() {
  const tolFraction = state.tolerance / 100.0;
  const upperCurrentLimit = state.refCurrent * (1.0 + tolFraction);
  const lowerCurrentLimit = state.refCurrent * (1.0 - tolFraction);

  // 1. Temperature Chart
  charts.temp.data.labels = state.history.labels;
  charts.temp.data.datasets[0].data = state.history.temperature;
  // Fill limit bands dynamically
  charts.temp.data.datasets[1].data = Array(state.history.labels.length).fill(70.0);
  charts.temp.data.datasets[2].data = Array(state.history.labels.length).fill(80.0);
  charts.temp.update('none'); // Update without animation for performance

  // 2. Vibration Chart
  charts.vibration.data.labels = state.history.labels;
  charts.vibration.data.datasets[0].data = state.history.vibration;
  charts.vibration.data.datasets[1].data = Array(state.history.labels.length).fill(1.2);
  charts.vibration.data.datasets[2].data = Array(state.history.labels.length).fill(1.8);
  charts.vibration.update('none');

  // 3. Current & Speed Chart
  charts.currentSpeed.data.labels = state.history.labels;
  charts.currentSpeed.data.datasets[0].data = state.history.current;
  charts.currentSpeed.data.datasets[1].data = Array(state.history.labels.length).fill(lowerCurrentLimit);
  charts.currentSpeed.data.datasets[2].data = Array(state.history.labels.length).fill(upperCurrentLimit);
  charts.currentSpeed.data.datasets[3].data = state.history.speed;
  charts.currentSpeed.update('none');

  // 4. Anomaly Trend Chart
  charts.trend.data.labels = state.history.labels;
  charts.trend.data.datasets[0].data = state.history.anomalyScore;
  charts.trend.update('none');
}

// Initialise Dashboard
function init() {
  loadInputsFromUI();
  initCharts();
  setupEvents();
  
  // Set up simulator loop (every 1 second)
  setInterval(updateSimulation, 1000);
  
  // Add initial logs
  addLog('SYSTEM', 'INFO', 'Edge Predictive Maintenance Node Online.');
  addLog('ALGORITHM', 'INFO', 'Unsupervised Isolation Forest model weights initialized.');
  addLog('HARDWARE', 'INFO', 'Acoustic & current sensors calibrating.');
}

// Start dashboard on page load
window.addEventListener('DOMContentLoaded', init);

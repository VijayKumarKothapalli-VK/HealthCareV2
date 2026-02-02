const state = {
    bpm: 65,
    targetBpm: 65, // For smooth transitions
    displayBpm: 65, // For fluctuating display
    spo2: 98,
    temperature: 36.8, // Body temperature in Celsius
    bloodPressureSys: 120, // Systolic
    bloodPressureDia: 80, // Diastolic
    respiratoryRate: 16, // Breaths per minute
    lat: null,
    lon: null,
    hospitals: [], // Store top 3 hospitals
    isEmergency: false,
    lastAlertTime: 0,
    simulateStress: false,
    stressInterval: null,
    pulseOffset: 0, // For wave animation
    alertThreshold: 140,
    activityState: "RESTING", // RESTING, WALKING, RUNNING, SLEEPING
    activityMode: null, // User selected mode
    activityTargetRange: null, // [min, max]
    rampSpeed: 0.2 // Speed for BPM ramping
};

const UI = {
    bpmDisplay: document.getElementById('bpm-display'),
    spo2Display: document.getElementById('spo2-display'),
    bpmSlider: document.getElementById('bpm-slider'),
    spo2Slider: document.getElementById('spo2-slider'),
    statusDot: document.getElementById('status-dot'),
    systemStatus: document.getElementById('system-status'),
    coords: document.getElementById('coords'),
    hospitalName: document.getElementById('hospital-name'),
    hospitalDist: document.getElementById('hospital-dist'),
    consoleLog: document.getElementById('console-log'),
    triggerBtn: document.getElementById('trigger-btn'), // Legacy, might remove or keep as backup
    stressBtn: document.getElementById('stress-btn'),   // Legacy
    monitorBtn: document.getElementById('monitor-btn'),
    hazardBtn: document.getElementById('hazard-btn'),

    // Watch specific
    watchBpm: document.getElementById('watch-bpm'),
    watchBody: document.querySelector('.watch-body'),
    watchStatusText: document.getElementById('watch-status-text'),
    pulseCanvas: document.getElementById('pulse-canvas'),
    hospitalsContainer: document.getElementById('hospitals-container'),
};

let ctx = null;

// Realistic BPM Fluctuation (every 0.5 seconds)
function fluctuateBPM() {
    // Add small random variation to make it realistic (±1-2 BPM)
    const variation = (Math.random() - 0.5) * 3; // -1.5 to +1.5
    state.displayBpm = state.bpm + variation;

    // Update watch display with fluctuating value
    if (UI.watchBpm) {
        UI.watchBpm.textContent = Math.round(state.displayBpm);
    }
}

// Update other vital signs realistically
function updateVitalSigns() {
    // Temperature: slight variation (±0.1°C)
    state.temperature += (Math.random() - 0.5) * 0.2;
    state.temperature = Math.max(36.0, Math.min(37.5, state.temperature));

    // Blood Pressure: slight variation
    state.bloodPressureSys += Math.floor((Math.random() - 0.5) * 4);
    state.bloodPressureSys = Math.max(110, Math.min(130, state.bloodPressureSys));

    state.bloodPressureDia += Math.floor((Math.random() - 0.5) * 3);
    state.bloodPressureDia = Math.max(70, Math.min(85, state.bloodPressureDia));

    // Respiratory Rate: slight variation
    state.respiratoryRate += Math.floor((Math.random() - 0.5) * 2);
    state.respiratoryRate = Math.max(14, Math.min(18, state.respiratoryRate));

    // Update displays
    const tempDisplay = document.getElementById('temp-display');
    const bpDisplay = document.getElementById('bp-display');
    const respDisplay = document.getElementById('resp-display');

    if (tempDisplay) tempDisplay.textContent = state.temperature.toFixed(1);
    if (bpDisplay) bpDisplay.textContent = `${state.bloodPressureSys}/${state.bloodPressureDia}`;
    if (respDisplay) respDisplay.textContent = state.respiratoryRate;
}

// Update vitals based on BPM stress level (for Monitor/Hazard events)
function updateVitalsBasedOnBPM(targetBpm) {
    // Calculate stress level based on BPM
    const stressLevel = (targetBpm - 65) / 130; // 0 = resting, 1 = max stress

    // Temperature increases with stress (36.5°C to 37.5°C)
    state.temperature = 36.5 + (stressLevel * 1.0);
    state.temperature = Math.max(36.0, Math.min(38.0, state.temperature));

    // Blood Pressure increases with stress
    // Systolic: 120 baseline, can go up to 160
    state.bloodPressureSys = 120 + Math.floor(stressLevel * 40);
    state.bloodPressureSys = Math.max(110, Math.min(170, state.bloodPressureSys));

    // Diastolic: 80 baseline, can go up to 100
    state.bloodPressureDia = 80 + Math.floor(stressLevel * 20);
    state.bloodPressureDia = Math.max(70, Math.min(105, state.bloodPressureDia));

    // Respiratory Rate increases with stress (16 to 24 bpm)
    state.respiratoryRate = 16 + Math.floor(stressLevel * 8);
    state.respiratoryRate = Math.max(14, Math.min(26, state.respiratoryRate));

    // SpO2 might decrease slightly under extreme stress
    if (targetBpm > 160) {
        state.spo2 = Math.max(92, 98 - Math.floor((targetBpm - 160) / 10));
    } else {
        state.spo2 = 98;
    }

    // Update displays
    const tempDisplay = document.getElementById('temp-display');
    const bpDisplay = document.getElementById('bp-display');
    const respDisplay = document.getElementById('resp-display');
    const spo2Display = document.getElementById('spo2-display');

    if (tempDisplay) tempDisplay.textContent = state.temperature.toFixed(1);
    if (bpDisplay) bpDisplay.textContent = `${state.bloodPressureSys}/${state.bloodPressureDia}`;
    if (respDisplay) respDisplay.textContent = state.respiratoryRate;
    if (spo2Display) spo2Display.textContent = state.spo2;
}

// Initialize
function init() {
    log('System', 'Starting geolocation service...');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(successLoc, errorLoc);
    }

    if (UI.pulseCanvas) {
        ctx = UI.pulseCanvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    // Event Listeners
    UI.bpmSlider.addEventListener('input', (e) => {
        state.targetBpm = parseInt(e.target.value);
    });

    UI.spo2Slider.addEventListener('input', (e) => {
        state.spo2 = parseInt(e.target.value);
        syncUI();
    });

    if (UI.monitorBtn) {
        UI.monitorBtn.addEventListener('click', () => {
            // "Active Monitoring" button now acts as Manual Trigger
            toggleMonitoringMode();
        });
    }

    if (UI.hazardBtn) {
        UI.hazardBtn.addEventListener('click', () => {
            toggleHazardMode();
        });
    }

    // Start Loops
    requestAnimationFrame(updateFrame);
    setInterval(updateClock, 1000);
    setInterval(livingVitals, 3000);
    setInterval(fluctuateBPM, 500); // BPM fluctuation every 0.5 seconds
    setInterval(updateVitalSigns, 2000); // Update other vitals every 2 seconds
}

function resizeCanvas() {
    if (UI.pulseCanvas) {
        UI.pulseCanvas.width = UI.pulseCanvas.offsetWidth;
        UI.pulseCanvas.height = UI.pulseCanvas.offsetHeight;
    }
}


function successLoc(pos) {
    state.lat = pos.coords.latitude;
    state.lon = pos.coords.longitude;

    log('System', `Location Found: ${state.lat.toFixed(4)}, ${state.lon.toFixed(4)}`);
    UI.coords.textContent = `${state.lat.toFixed(4)}, ${state.lon.toFixed(4)}`;
    UI.coords.classList.remove('loading');

    findNearestHospital(state.lat, state.lon);
}

function errorLoc(err) {
    log('Error', `Location check failed: ${err.message}`);
    UI.coords.textContent = "Unavailable";
    state.hospital = { name: 'City General Hospital (Mock)', address: '123 Main St, Tech City' };
    updateHospitalUI();
}

async function findNearestHospital(lat, lon) {
    log('System', 'Querying Overpass API for nearest 3 hospitals...');

    const query = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:10000,${lat},${lon});
      way["amenity"="hospital"](around:10000,${lat},${lon});
      relation["amenity"="hospital"](around:10000,${lat},${lon});
    );
    out center;
  `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });

        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
            // Calculate distances and sort
            const hospitals = data.elements.map(el => {
                const hLat = el.lat || el.center.lat;
                const hLon = el.lon || el.center.lon;
                const dist = getDistanceFromLatLonInKm(lat, lon, hLat, hLon);
                return {
                    name: el.tags.name || "Unnamed Medical Center",
                    city: el.tags["addr:city"] || el.tags["addr:town"] || el.tags["addr:village"] || "Unknown City",
                    village: el.tags["addr:village"] || el.tags["addr:hamlet"] || "",
                    address: el.tags["addr:street"]
                        ? `${el.tags["addr:street"]}, ${el.tags["addr:city"] || "Unknown"}`
                        : (el.tags["addr:full"] || "Location details unavailable"),
                    distance: dist,
                    lat: hLat,
                    lon: hLon,
                    extended_address: {
                        city: el.tags["addr:city"] || "Unknown",
                        suburb: el.tags["addr:suburb"] || el.tags["addr:district"] || "",
                        postcode: el.tags["addr:postcode"] || "",
                        state: el.tags["addr:state"] || ""
                    }
                };
            });

            // Sort by distance and take top 3
            state.hospitals = hospitals.sort((a, b) => a.distance - b.distance).slice(0, 3);
            log('System', `Found ${state.hospitals.length} hospitals nearby.`);
        } else {
            throw new Error("No hospitals found within 10km.");
        }
    } catch (err) {
        log('Warn', `Hospital search failed: ${err.message}. Using MOCK data.`);
        state.hospitals = [
            { name: 'City General Hospital (Mock)', address: '123 Main St, Tech City', distance: 1.2 },
            { name: 'St. Mary’s Emergency (Mock)', address: '456 Oak Rd, Metro Area', distance: 2.5 },
            { name: 'Advanced Care Clinic (Mock)', address: '789 Pine Ave, Suburbia', distance: 4.1 }
        ];
    }
    updateHospitalUI();
}

function updateHospitalUI() {
    if (!UI.hospitalsContainer) return;
    UI.hospitalsContainer.innerHTML = '';
    UI.hospitalsContainer.classList.remove('loading');

    state.hospitals.forEach(h => {
        const card = document.createElement('div');
        card.className = 'hospital-card';
        card.innerHTML = `
            <span class="hospital-name">${h.name}</span>
            <span class="hospital-dist">${h.city} ${h.village ? `(${h.village})` : ''} • ${h.distance.toFixed(2)} km</span>
        `;
        UI.hospitalsContainer.appendChild(card);
    });
}

function getHeartRateStatus(bpm) {
    // Simplified Status Logic as per user requirements:
    // IF heart_rate < 40 OR heart_rate > 150: CRITICAL / HIGH
    // ELSE IF heart_rate BETWEEN 121 AND 150: ALERT / MEDIUM
    // ELSE IF heart_rate BETWEEN 50 AND 120: NORMAL / LOW

    if (bpm < 40 || bpm > 150) {
        return {
            status: "CRITICAL",
            severity: "HIGH",
            label: bpm < 40 ? "BRADYCARDIA" : "TACHYCARDIA"
        };
    } else if (bpm >= 121 && bpm <= 150) {
        return {
            status: "ALERT",
            severity: "MEDIUM",
            label: "ELEVATED HR"
        };
    } else if (bpm >= 50 && bpm <= 120) {
        return {
            status: "NORMAL",
            severity: "LOW",
            label: "NORMAL"
        };
    } else {
        // Edge case: 40-49 (between critical low and normal)
        return {
            status: "ALERT",
            severity: "MEDIUM",
            label: "LOW HR"
        };
    }
}

function getOxygenStatus(spo2) {
    if (spo2 < 90) return { status: "CRITICAL" };
    if (spo2 >= 90 && spo2 <= 94) return { status: "ALERT" };
    return { status: "NORMAL" };
}

function checkVitals() {
    const hr = getHeartRateStatus(state.bpm);
    const ox = getOxygenStatus(state.spo2);

    // Visual styles based on criticality
    const isCritical = hr.status === "CRITICAL" || ox.status === "CRITICAL";
    const isAlert = hr.status === "ALERT" || ox.status === "ALERT" || hr.status === "WARNING";

    if (isCritical) {
        UI.bpmDisplay.classList.add('danger');
        if (UI.watchBody) UI.watchBody.classList.add('critical');
    } else {
        UI.bpmDisplay.classList.remove('danger');
        if (UI.watchBody) UI.watchBody.classList.remove('critical');
    }

    // Update Status Text on Watch
    if (UI.watchStatusText) {
        if (isCritical) UI.watchStatusText.textContent = `CRITICAL: ${hr.status === 'CRITICAL' ? hr.label : 'OXYGEN'}`;
        else if (isAlert) UI.watchStatusText.textContent = `${hr.status}: ${hr.label}`;
        else UI.watchStatusText.textContent = `${hr.label} • SECURE`;
    }

    // Update Watch Display
    if (UI.watchBpm) UI.watchBpm.textContent = Math.round(state.bpm);

    // Trigger Logic: Trigger API if heart rate >= threshold
    // valid only if NOT simulating, because simulation handles its own triggers
    // IMPROVED: Only trigger if Critical AND severity is HIGH (ignore WARNING like running)
    const isRealEmergency = hr.severity === "HIGH" || ox.status === "CRITICAL";

    if (!state.simulateStress && isRealEmergency) {
        const now = Date.now();
        if (!state.isEmergency && (now - state.lastAlertTime > 20000)) {
            log('System', `Vitals Critical: ${hr.label} (${Math.round(state.bpm)} BPM)!`);
            sendEmergencyAlert();
        }
    } else {
        // Reset if safe
        if (state.isEmergency && !isRealEmergency) {
            state.isEmergency = false;
            if (UI.statusDot) UI.statusDot.classList.remove('emergency');
            if (UI.systemStatus) {
                UI.systemStatus.textContent = "Monitoring";
                UI.systemStatus.style.color = "var(--accent-green)";
            }
            const container = document.querySelector('.container');
            if (container) container.style.boxShadow = "none";
        }
    }
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    // Note: UI.watchTime element was not in the original list but referenced in code. 
    // If it exists in DOM we update it, if not we ignore.
    const watchTime = document.querySelector('.watch-time'); // defensive query
    if (watchTime) watchTime.textContent = `${hours}:${minutes}`;
}

function updateFrame() {
    // 1. Smooth BPM Transition with Dynamic Speed
    // We calculate speed based on target distance to reach in ~5 seconds if running simulation
    // But simplistic approach: just use a variable speed
    let speed = 0.2;

    // logic specific for simulation to ensure 5 second timing
    if (state.simulateStress && state.rampSpeed) {
        speed = state.rampSpeed;
    } else if (state.simulateStress) {
        // Fallback default
        speed = 0.15;
    }

    if (state.bpm < state.targetBpm) {
        state.bpm += speed;
        if (state.bpm > state.targetBpm) state.bpm = state.targetBpm;
        syncUI(false);
    } else if (state.bpm > state.targetBpm) {
        state.bpm -= speed;
        if (state.bpm < state.targetBpm) state.bpm = state.targetBpm;
        syncUI(false);
    }

    // 2. Draw ECG Wave
    drawECGWave();

    requestAnimationFrame(updateFrame);
}

function drawECGWave() {
    if (!ctx || !UI.pulseCanvas) return;

    const width = UI.pulseCanvas.width;
    const height = UI.pulseCanvas.height;

    // Clear and fade effect
    // ctx.clearRect(0, 0, width, height); // Hard clear
    // Trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    const baseLine = height / 2;
    const beatDuration = 60 / Math.max(20, state.bpm); // seconds per beat
    // Speed of wave should match BPM. 
    // We want ~2 beats visible on screen?
    // Let's say screen width represents 2 seconds.
    const secondsOnScreen = 2.0;
    const pixelsPerSecond = width / secondsOnScreen;

    // Advance phase
    // 60FPS assumed
    state.pulseOffset -= (width / (secondsOnScreen * 60));
    if (state.pulseOffset <= -width) state.pulseOffset += width;

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;

    // Color dynamic
    const hrStatus = getHeartRateStatus(state.bpm);
    const color = hrStatus.severity === 'HIGH' ? '#ff4757' : (hrStatus.status === 'WARNING' ? '#ffa502' : '#2ed573');
    ctx.strokeStyle = color;
    ctx.shadowColor = color;


    for (let x = 0; x < width; x++) {
        // Calculate time 't' for this x pixel relative to scrolling offset
        // x = 0 is now + offset
        // We backtrack: t (seconds) = (x - offset) / pixelsPerSecond
        const t = (x - state.pulseOffset) / pixelsPerSecond;

        // Map t to beat cycle [0, 1]
        const cycle = (t % beatDuration) / beatDuration;

        let y = 0;

        // PQRST Complex Approximation
        // P Wave (0.1 - 0.2)
        if (cycle > 0.1 && cycle < 0.2) {
            y -= Math.sin((cycle - 0.1) * Math.PI * 10) * 10;
        }
        // QRS Complex (0.35 - 0.45)
        else if (cycle > 0.35 && cycle < 0.38) { // Q (dip)
            y += Math.sin((cycle - 0.35) * Math.PI * 33) * 10;
        }
        else if (cycle >= 0.38 && cycle < 0.42) { // R (spike)
            y -= Math.sin((cycle - 0.38) * Math.PI * 25) * 50;
        }
        else if (cycle >= 0.42 && cycle < 0.45) { // S (dip)
            y += Math.sin((cycle - 0.42) * Math.PI * 33) * 15;
        }
        // T Wave (0.6 - 0.75)
        else if (cycle > 0.6 && cycle < 0.75) {
            y -= Math.sin((cycle - 0.6) * Math.PI * 6.6) * 15;
        }

        // Add minimal noise
        y += (Math.random() - 0.5) * 2;

        if (x === 0) ctx.moveTo(x, baseLine + y);
        else ctx.lineTo(x, baseLine + y);
    }

    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
}

function livingVitals() {
    // Disabled: BPM will stay at simulated value until page refresh
    // No auto-return to resting state
    return;
}

function toggleMonitoringMode() {
    if (state.simulateStress) {
        stopSimulation();
        return;
    }

    // Random ALERT BPM value (121-150 range for ALERT/MEDIUM status)
    const targetBpm = Math.floor(Math.random() * (150 - 121 + 1)) + 121;

    // Calculate ramp speed to reach target in ~5 seconds
    // Assuming 60 FPS, 5 seconds = 300 frames
    const bpmDifference = Math.abs(targetBpm - state.bpm);
    state.rampSpeed = bpmDifference / 300;

    state.simulateStress = true;
    state.simulationType = 'MONITOR';
    state.targetBpm = targetBpm;

    UI.monitorBtn.classList.add('active');
    log('System', `Initiating Monitor Sequence. Ramping to ${targetBpm} BPM in 5 seconds...`);

    // Monitor for when target is reached
    const checkInterval = setInterval(() => {
        if (!state.simulateStress) {
            clearInterval(checkInterval);
            return;
        }

        // Check if reached target (within small margin)
        if (Math.abs(state.bpm - targetBpm) < 1) {
            clearInterval(checkInterval);
            state.bpm = targetBpm; // Snap to exact value

            // Update all vitals based on new BPM
            updateVitalsBasedOnBPM(targetBpm);

            syncUI(false);

            log('System', `Target BPM Reached (${targetBpm}). Capturing vitals & sending to API...`);

            // Send API immediately - status will be ALERT/MEDIUM based on BPM
            sendEmergencyAlert(true, null, null, `Monitor Event: BPM ${targetBpm}`);

            // Auto-stop after sending
            setTimeout(() => {
                if (state.simulateStress) stopSimulation();
            }, 2000);
        }
    }, 100);
}

function toggleHazardMode() {
    if (state.simulateStress) {
        stopSimulation();
        if (UI.hazardBtn.classList.contains('active')) return;
    }

    // Random Critical BPM Value (151-195 for guaranteed CRITICAL status)
    const targetBpm = Math.floor(Math.random() * (195 - 151 + 1)) + 151;

    // Calculate ramp speed for gradual increase (~7-10 seconds for dramatic effect)
    // Assuming 60 FPS, 8 seconds = 480 frames
    const bpmDifference = Math.abs(targetBpm - state.bpm);
    state.rampSpeed = bpmDifference / 480;

    state.simulateStress = true;
    state.simulationType = 'HAZARD'; // Cardiac Event
    state.targetBpm = targetBpm;

    UI.hazardBtn.classList.add('active');
    log('System', '⚠️ INITIATING BIO-HAZARD PROTOCOL ⚠️');
    log('System', `CRITICAL SURGE DETECTED. Ramping to ${targetBpm} BPM...`);

    const checkInterval = setInterval(() => {
        if (!state.simulateStress) {
            clearInterval(checkInterval);
            return;
        }

        // Check if reached critical threshold
        if (Math.abs(state.bpm - targetBpm) < 1) {
            clearInterval(checkInterval);
            state.bpm = targetBpm; // Snap to target

            // Update all vitals based on critical BPM
            updateVitalsBasedOnBPM(targetBpm);

            syncUI(false);

            log('System', `CRITICAL THRESHOLD BREACHED (${targetBpm} BPM). Alerting emergency services...`);

            // Send API - status will be CRITICAL/HIGH based on BPM
            sendEmergencyAlert(true, null, null, `Hazard Event: BPM ${targetBpm}`);

            setTimeout(() => {
                if (state.simulateStress) stopSimulation();
            }, 3000);
        }
    }, 100);
}

function stopSimulation() {
    state.simulateStress = false;
    state.simulationType = null;
    // DO NOT reset targetBpm - keep it at current value until page refresh

    if (UI.monitorBtn) UI.monitorBtn.classList.remove('active');
    if (UI.hazardBtn) UI.hazardBtn.classList.remove('active');

    state.isEmergency = false;
    log('System', 'Simulation stopped. BPM maintained at current level.');
}

function syncUI(updateSlider = true) {
    const displayBpm = Math.round(state.bpm);
    if (UI.bpmDisplay) UI.bpmDisplay.innerHTML = `${displayBpm} <span class="metric-unit">BPM</span>`;
    if (updateSlider && UI.bpmSlider) UI.bpmSlider.value = displayBpm;

    if (UI.spo2Display) UI.spo2Display.innerHTML = `${state.spo2}`;
    if (UI.spo2Slider) UI.spo2Slider.value = state.spo2;
    checkVitals();
}


async function sendEmergencyAlert(isManual = false, overrideStatus = null, overrideSeverity = null, manualMessage = null) {
    const hr = getHeartRateStatus(state.bpm);
    const ox = getOxygenStatus(state.spo2);

    const status = overrideStatus || hr.status;
    const severity = overrideSeverity || hr.severity;

    if (!isManual && status === 'NORMAL' && !manualMessage) return; // Don't send normal updates unless manual or message

    state.isEmergency = true;
    state.lastAlertTime = Date.now();

    // Update UI
    if (UI.statusDot) {
        UI.statusDot.className = 'status-indicator'; // Reset
        status === 'CRITICAL' ? UI.statusDot.classList.add('emergency') : null;
    }

    if (UI.systemStatus) {
        UI.systemStatus.textContent = `${status}: ${Math.round(state.bpm)} BPM`;
        UI.systemStatus.style.color = status === 'CRITICAL' ? "var(--accent-red)" : (status === 'ALERT' ? "#e17055" : "var(--accent-green)");
    }

    const container = document.querySelector('.container');
    if (container && status === 'CRITICAL') {
        container.style.boxShadow = "inset 0 0 50px rgba(255, 71, 87, 0.2)";
    }

    // Check if location is available
    if (state.lat === null) {
        log('System', 'Awaiting GPS lock for payload...');
        // We will proceed anyway mostly, or wait briefly? 
        // For demo, let's just send what we have or waits 
    }

    const payload = {
        message: manualMessage || `${status}_BROADCAST | BPM: ${Math.round(state.bpm)} | SpO2: ${state.spo2}%`,
        event_id: `EVT-${Date.now()}`,
        status: status,
        severity: severity,
        device: { id: "SH-PRO-V2", battery: "88%" },
        vitals: {
            hr: Math.round(state.bpm),
            hr_status: hr.status,
            hr_severity: hr.severity,
            ox: state.spo2,
            ox_status: ox.status,
            temperature: parseFloat(state.temperature.toFixed(1)),
            temperature_unit: "°C",
            blood_pressure_systolic: state.bloodPressureSys,
            blood_pressure_diastolic: state.bloodPressureDia,
            blood_pressure_unit: "mmHg",
            respiratory_rate: state.respiratoryRate,
            respiratory_rate_unit: "bpm",
			DeviceId: "9000263995",
            activity: state.activityMode || state.activityState
        },
        location: {
            lat: state.lat || 17.5142,
            lon: state.lon || 78.3948,
            timestamp: new Date().toISOString()
        },
        nearest_hospitals: state.hospitals
    };

    log('Network', `Broadcasting to CloudHub...`);
    log('Payload', JSON.stringify(payload));
    console.log("MuleSoft Payload:", payload);

    try {
        // Simple POST to reduce CORS preflight friction
        const response = await fetch('http://localhost:8081/healthcare', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        log('Server', `Success: ${response.status} ${text.substring(0, 20)}`);
    } catch (err) {
        // "Failed to fetch" usually means a CORS block on the RESPONSE.
        // The REQUEST often still reaches MuleSoft and gets logged.
        log('Network', `Request sent. (Note: Verify in MuleSoft logs if browser blocks response)`);
        console.warn("Fetch Error (Likely CORS):", err);
    }
}

// Utility: Haversine Formula for distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

// Utility: Logger
function log(source, message) {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.classList.add('log-entry');
    div.innerHTML = `<span class="log-time">[${time}] ${source}:</span> ${message}`;
    UI.consoleLog.prepend(div);
}

// Start
init();



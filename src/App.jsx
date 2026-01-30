import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Navigation, AlertTriangle, ShieldCheck, Activity, LocateFixed, ThermometerSun } from 'lucide-react'

// --- CONSTANTS ---
const API_URL = "https://getresponse-8nc864.5sc6y6-4.usa-e2.cloudhub.io/response";
const TRIGGER_BPM = 140; // The threshold
const BASE_BPM = 72; // Resting heart rate

// --- UTILS ---
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function App() {
    // State
    const [bpm, setBpm] = useState(BASE_BPM)
    const [isSimulatingEmergency, setIsSimulatingEmergency] = useState(false)
    const [location, setLocation] = useState({ lat: null, lon: null, address: "Locating..." })
    const [hospital, setHospital] = useState({ name: "Searching...", distance: "-" })
    const [apiStatus, setApiStatus] = useState("IDLE") // IDLE, SENDING, SENT, ERROR
    const [logs, setLogs] = useState([])

    // Refs for tracking animation loops
    const bpmRef = useRef(bpm)
    bpmRef.current = bpm

    // --- LOGGING ---
    const log = (msg) => {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50))
    }

    // --- LOCATION & HOSPITAL ---
    useEffect(() => {
        log("System Initializing...")
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords
                    setLocation({ lat: latitude, longitude: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` })
                    log(`Location fixed: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)

                    // Find Hospital (Overpass API)
                    try {
                        const query = `[out:json];(node["amenity"="hospital"](around:5000,${latitude},${longitude}););out;`;
                        const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
                        const data = await res.json();
                        if (data.elements?.[0]) {
                            const h = data.elements[0];
                            const dist = getDistance(latitude, longitude, h.lat, h.lon).toFixed(2);
                            setHospital({ name: h.tags.name || "Emergency Clinic", distance: `${dist} km` });
                            log(`Nearest Hospital: ${h.tags.name} (${dist} km)`)
                        } else {
                            setHospital({ name: "City General (Mock)", distance: "2.5 km" })
                            log("No hospitals found nearby using API. Using mock data.")
                        }
                    } catch (e) {
                        setHospital({ name: "City General (Mock)", distance: "2.5 km" })
                        log("Hospital search failed. Using mock data.");
                    }
                },
                (err) => {
                    log("Location Access Denied. Using fallback.")
                    setLocation({ lat: 40.7128, lon: -74.0060, address: "NYC (Fallback)" })
                    setHospital({ name: "Metro General", distance: "1.2 km" })
                }
            )
        }
    }, [])

    // --- HEART RATE LOGIC ---
    useEffect(() => {
        const interval = setInterval(() => {
            setBpm(prevBpm => {
                let nextBpm = prevBpm;

                if (isSimulatingEmergency) {
                    // Ramping up mode
                    // Increase by random amount 1-4 per tick (tick is 500ms -> +2-8 bpm/sec)
                    // If we are over 180, clamp it.
                    if (prevBpm < 180) {
                        nextBpm += Math.floor(Math.random() * 3) + 1;
                    }

                    // Trigger Point
                    if (prevBpm < TRIGGER_BPM && nextBpm >= TRIGGER_BPM) {
                        triggerEmergencyApi(nextBpm);
                    }
                } else {
                    // Normal fluctuation mode (+/- 1-2) around BASE_BPM
                    // Tend towards BASE_BPM if strict manual mode isn't forcing it
                    const noise = Math.floor(Math.random() * 5) - 2; // -2 to +2
                    nextBpm = prevBpm + noise;

                    // Gently pull back to base if we drifted too far naturally
                    if (nextBpm > BASE_BPM + 5) nextBpm -= 1;
                    if (nextBpm < BASE_BPM - 5) nextBpm += 1;
                }

                return nextBpm;
            });
        }, 800); // Update every 800ms for natural feel

        return () => clearInterval(interval);
    }, [isSimulatingEmergency])

    // --- API CALL ---
    const triggerEmergencyApi = async (currentBpm) => {
        if (apiStatus === "SENT" || apiStatus === "SENDING") return;

        setApiStatus("SENDING");
        log("CRITICAL BPM DETECTED! Initiating Emergency Protocol...");

        const payload = {
            timestamp: new Date().toISOString(),
            type: "CRITICAL_VITALS",
            vitals: { bpm: currentBpm, spo2: 96 },
            location: location,
            hospital: hospital
        };

        try {
            // Small artificial delay for dramatic effect
            await new Promise(r => setTimeout(r, 1500));

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setApiStatus("SENT");
                log(`EMERGENCY ALERT SENT SUCCESSFULLY! Response: ${res.status}`);
            } else {
                throw new Error(`API Error ${res.status}`);
            }
        } catch (e) {
            setApiStatus("ERROR");
            log(`ALERT FAILED: ${e.message}`);
        }
    }

    // --- MANUAL TRIGGER UI HANDLER ---
    const handleManualTrigger = () => {
        if (isSimulatingEmergency) return; // Already running
        log("MANUAL OVERRIDE: Simulating Tachycardia Event...");
        setIsSimulatingEmergency(true);
    }

    const handleReset = () => {
        setIsSimulatingEmergency(false);
        setBpm(BASE_BPM);
        setApiStatus("IDLE");
        log("System Reset. Vital signs normalizing.");
    }

    return (
        <div className="app-container">
            {/* Background Ambience */}
            <div className="ambient-bg" style={{
                background: isSimulatingEmergency ?
                    'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15), rgba(15, 16, 19, 1))' :
                    'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), rgba(15, 16, 19, 1))',
                position: 'fixed', inset: 0, zIndex: -1, transition: 'background 2s ease'
            }} />

            <main className="dashboard-grid">

                {/* LEFT PANEL: DATA */}
                <div className="panel data-panel">
                    <header>
                        <ShieldCheck className="icon-shield" size={24} />
                        <h2>MediGuard AI</h2>
                        <span className="status-badge" style={{
                            borderColor: apiStatus === "SENT" ? '#ef4444' : '#10b981',
                            color: apiStatus === "SENT" ? '#ef4444' : '#10b981'
                        }}>
                            {apiStatus === "SENT" ? "EMERGENCY ACTIVE" : "SYSTEM SECURE"}
                        </span>
                    </header>

                    <div className="location-card">
                        <div className="card-row">
                            <LocateFixed size={18} className="text-blue" />
                            <div>
                                <label>Current Location</label>
                                <div className="value">{location.address}</div>
                            </div>
                        </div>
                        <div className="card-row">
                            <Navigation size={18} className="text-green" />
                            <div>
                                <label>Nearest Aid</label>
                                <div className="value">{hospital.name}</div>
                                <div className="sub-value">{hospital.distance} away</div>
                            </div>
                        </div>
                    </div>

                    <div className="console-log">
                        <h3>System Terminal</h3>
                        <div className="logs-window">
                            <AnimatePresence>
                                {logs.map((l, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="log-line"
                                    >
                                        {l}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* CENTER PANEL: SMARTWATCH */}
                <div className="watch-container">
                    <div className="watch-frame">
                        <div className="watch-screen">
                            {/* WATCH UI */}
                            <div className="watch-header">
                                <span>10:42</span>
                                <BatteryIcon level={85} />
                            </div>

                            <div className="watch-content">
                                <div className="ring-container">
                                    {/* PULSING RINGS */}
                                    <motion.div
                                        className="pulse-ring"
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.3, 0, 0.3],
                                            borderColor: bpm > 100 ? '#ef4444' : '#3b82f6'
                                        }}
                                        transition={{
                                            duration: 60 / bpm,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    />
                                    <motion.div
                                        className="pulse-core"
                                        animate={{ scale: [1, 0.9, 1] }}
                                        transition={{
                                            duration: 60 / bpm,
                                            repeat: Infinity
                                        }}
                                        style={{
                                            background: bpm > 100 ?
                                                'linear-gradient(135deg, #ef4444, #b91c1c)' :
                                                'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        }}
                                    >
                                        <Heart size={32} color="white" fill="white" />
                                    </motion.div>
                                </div>

                                <div className="bpm-display">
                                    <span className="bpm-value">
                                        {bpm}
                                        <span className="bpm-unit">BPM</span>
                                    </span>
                                    <Activity size={24} className="activity-wave" />
                                </div>

                                {apiStatus === "SENT" && (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="sos-overlay"
                                    >
                                        <AlertTriangle size={48} />
                                        <span>HELP ON WAY</span>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                        {/* Crown/Button */}
                        <div className="watch-crown" />
                        <div className="watch-btn" />
                    </div>

                    <div className="interaction-area">
                        {!isSimulatingEmergency ? (
                            <button className="trigger-btn" onClick={handleManualTrigger}>
                                <ThermometerSun size={18} />
                                <span>Simulate Attack</span>
                            </button>
                        ) : (
                            <button className="reset-btn" onClick={handleReset}>
                                Reset System
                            </button>
                        )}
                    </div>
                </div>

            </main>

            <style>{`
        /* Embedded CSS for speed/simplicity in one file edit */
        .app-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 4rem;
          width: 90%;
          max-width: 1200px;
          height: 80vh;
        }
        .panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        header { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 1rem;
        }
        h2 { font-size: 1.2rem; font-weight: 600; margin: 0; flex: 1; }
        .location-card {
          background: rgba(0,0,0,0.2);
          border-radius: 16px;
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .card-row { display: flex; gap: 1rem; align-items: flex-start; }
        .card-row label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 0.95rem; font-weight: 500; margin-top: 2px; }
        .sub-value { font-size: 0.8rem; color: #666; }
        .text-blue { color: #3b82f6; }
        .text-green { color: #10b981; }

        .console-log { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .console-log h3 { font-size: 0.9rem; color: #666; margin-bottom: 0.5rem; }
        .logs-window { 
          flex: 1; 
          background: #000; 
          border-radius: 12px; 
          padding: 1rem; 
          font-family: 'Fira Code', monospace; 
          font-size: 0.75rem; 
          color: #a3a3a3; 
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .log-line { margin-bottom: 0.4rem; border-left: 2px solid #333; padding-left: 8px; }

        .watch-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .watch-frame {
          width: 300px; /* Bigger watch */
          height: 380px;
          background: #1a1b20;
          border-radius: 48px;
          box-shadow: 
            0 20px 50px rgba(0,0,0,0.5),
            inset 0 0 0 2px #333,
            inset 0 0 20px rgba(0,0,0,0.8);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .watch-screen {
          width: 270px;
          height: 350px;
          background: black;
          border-radius: 40px;
          overflow: hidden;
          position: relative;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .watch-crown {
          position: absolute;
          right: -12px;
          top: 80px;
          width: 12px;
          height: 40px;
          background: #333;
          border-radius: 4px; /* Crown shape */
        }
        .watch-btn {
          position: absolute;
          right: -8px;
          bottom: 100px;
          width: 8px;
          height: 50px;
          background: #333;
          border-radius: 4px;
        }
        .watch-header {
          width: 100%;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #666;
        }
        .watch-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 2rem;
        }
        .ring-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
        }
        .pulse-ring {
          position: absolute;
          inset: 0;
          border: 2px solid #3b82f6;
          border-radius: 50%;
        }
        .pulse-core {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
        }
        .bpm-display { display: flex; flex-direction: column; align-items: center; }
        .bpm-value { font-size: 4rem; font-weight: 700; line-height: 1; }
        .bpm-unit { font-size: 1rem; color: #666; margin-left: 4px; font-weight: 400; }
        .sos-overlay {
          position: absolute;
          inset: 0;
          background: rgba(239, 68, 68, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          font-weight: 800;
          font-size: 1.2rem;
          backdrop-filter: blur(4px);
        }
        
        .interaction-area { margin-top: 3rem; }
        .trigger-btn, .reset-btn {
          display: flex;
          align-items: center; /* Ensures icon and text are aligned */
          justify-content: center; /* Center content horizontally */
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-radius: 50px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .trigger-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }
        .reset-btn { background: #333; }
        
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
        </div>
    )
}

function BatteryIcon({ level }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>{level}%</span>
            <div style={{ width: 18, height: 9, border: '1px solid #444', borderRadius: 2, padding: 1 }}>
                <div style={{ width: `${level}%`, height: '100%', background: level > 20 ? 'white' : 'red', borderRadius: 1 }} />
            </div>
        </div>
    )
}

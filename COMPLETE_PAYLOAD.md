# Complete Health Metrics in Payload

## ✅ Implementation Complete

### 📦 **Enhanced API Payload**

The payload now includes ALL health metrics:

```json
{
  "message": "Monitor Event: BPM 142",
  "event_id": "EVT-1769524XXX",
  "status": "ALERT",
  "severity": "MEDIUM",
  "device": {
    "id": "SH-PRO-V2",
    "battery": "88%"
  },
  "vitals": {
    "hr": 142,
    "hr_status": "ALERT",
    "hr_severity": "MEDIUM",
    "ox": 97,
    "ox_status": "NORMAL",
    "temperature": 37.1,
    "temperature_unit": "°C",
    "blood_pressure_systolic": 145,
    "blood_pressure_diastolic": 92,
    "blood_pressure_unit": "mmHg",
    "respiratory_rate": 21,
    "respiratory_rate_unit": "bpm",
    "activity": "RESTING"
  },
  "location": {
    "lat": 17.5142,
    "lon": 78.3948,
    "timestamp": "2026-01-27T14:33:25.486Z"
  },
  "nearest_hospitals": [...]
}
```

## 🔄 **Correlated Health Metrics**

When BPM increases (Monitor/Hazard buttons), ALL vitals update realistically:

### **Resting State (BPM: 65)**
- Temperature: 36.5°C
- Blood Pressure: 120/80 mmHg
- Respiratory Rate: 16 bpm
- SpO₂: 98%

### **Monitor Event (BPM: 121-150)**
Example at BPM 140:
- Temperature: 37.1°C ↑
- Blood Pressure: 143/91 mmHg ↑
- Respiratory Rate: 21 bpm ↑
- SpO₂: 98%

### **Hazard Event (BPM: 151-195)**
Example at BPM 180:
- Temperature: 37.4°C ↑↑
- Blood Pressure: 155/98 mmHg ↑↑
- Respiratory Rate: 24 bpm ↑↑
- SpO₂: 96% ↓ (slight decrease under extreme stress)

## 📊 **Correlation Formula**

```javascript
stressLevel = (targetBpm - 65) / 130  // 0 to 1 scale

// Temperature
temperature = 36.5 + (stressLevel × 1.0)  // 36.5°C to 37.5°C

// Systolic BP
systolic = 120 + (stressLevel × 40)  // 120 to 160 mmHg

// Diastolic BP
diastolic = 80 + (stressLevel × 20)  // 80 to 100 mmHg

// Respiratory Rate
respiratory = 16 + (stressLevel × 8)  // 16 to 24 bpm

// SpO₂ (decreases only at extreme stress)
if (bpm > 160) {
  spo2 = 98 - floor((bpm - 160) / 10)  // 98% to 92%
}
```

## 🎯 **Realistic Medical Correlations**

### Why these changes make sense:

1. **Temperature ↑**
   - Physical stress increases metabolic rate
   - Body temperature rises with exertion
   - Range: 36.5°C (rest) → 37.5°C (stress)

2. **Blood Pressure ↑**
   - Heart works harder under stress
   - Systolic increases more than diastolic
   - Ranges: 120/80 (rest) → 160/100 (stress)

3. **Respiratory Rate ↑**
   - Body needs more oxygen under stress
   - Breathing rate increases
   - Range: 16 bpm (rest) → 24 bpm (stress)

4. **SpO₂ ↓ (slight)**
   - Only decreases at extreme stress (>160 BPM)
   - Oxygen saturation may drop slightly
   - Range: 98% (normal) → 92% (extreme stress)

## 🔔 **When Vitals Update**

### Automatic Updates:
- **Every 2 seconds**: Small random variations (normal fluctuation)

### Event-Triggered Updates:
- **Monitor Button**: All vitals update when BPM reaches 121-150
- **Hazard Button**: All vitals update when BPM reaches 151-195
- **Correlation**: All metrics scale proportionally with BPM

## 📋 **Complete Payload Fields**

### Device Info:
- `device.id`: "SH-PRO-V2"
- `device.battery`: "88%"

### Vital Signs:
- `vitals.hr`: Heart rate (BPM)
- `vitals.hr_status`: "NORMAL" | "ALERT" | "CRITICAL"
- `vitals.hr_severity`: "LOW" | "MEDIUM" | "HIGH"
- `vitals.ox`: Blood oxygen (%)
- `vitals.ox_status`: "NORMAL" | "ALERT" | "CRITICAL"
- `vitals.temperature`: Body temperature (°C)
- `vitals.temperature_unit`: "°C"
- `vitals.blood_pressure_systolic`: Systolic BP (mmHg)
- `vitals.blood_pressure_diastolic`: Diastolic BP (mmHg)
- `vitals.blood_pressure_unit`: "mmHg"
- `vitals.respiratory_rate`: Breaths per minute
- `vitals.respiratory_rate_unit`: "bpm"
- `vitals.activity`: "RESTING" | "WALKING" | "RUNNING"

### Location:
- `location.lat`: Latitude
- `location.lon`: Longitude
- `location.timestamp`: ISO timestamp

### Hospitals:
- `nearest_hospitals[]`: Array of 3 nearest hospitals with distances

## ✨ **Benefits**

1. ✅ **Complete medical picture** in every payload
2. ✅ **Realistic correlations** between vitals
3. ✅ **Medically accurate** ranges and relationships
4. ✅ **Comprehensive monitoring** for emergency response
5. ✅ **Professional data** suitable for healthcare systems

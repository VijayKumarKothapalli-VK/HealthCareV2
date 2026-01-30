# BPM Range Updates - Final Configuration

## ✅ Updated BPM Ranges for Buttons

### **Monitor Event Button**
- **BPM Range**: 121 - 150
- **Status**: ALERT
- **Severity**: MEDIUM
- **Logic**: Generates random BPM between 121-150 (elevated heart rate)

### **Hazard Test Button**
- **BPM Range**: 151 - 195
- **Status**: CRITICAL
- **Severity**: HIGH
- **Logic**: Generates random BPM above 150 (dangerous tachycardia)

## 📊 Status Logic (Automatic)

The status is now **automatically determined** by the actual BPM value:

### CRITICAL (High Risk)
- **BPM < 40** → Dangerous bradycardia (very slow)
- **BPM > 150** → Severe tachycardia (very fast)
- **Action**: Immediate medical attention required
- **Status**: CRITICAL
- **Severity**: HIGH

### ALERT (Moderate Risk)
- **BPM: 121-150** → Heart rate too high
- **Meaning**: May indicate stress, fever, or cardiac strain
- **Action**: Monitor closely and notify user
- **Status**: ALERT
- **Severity**: MEDIUM

### NORMAL (Healthy Range)
- **BPM: 50-120** → Acceptable range for most adults
- **Action**: No emergency action required
- **Status**: NORMAL
- **Severity**: LOW

## 🔄 Example Payloads

### Monitor Event (BPM 135)
```json
{
  "message": "Monitor Event: BPM 135",
  "status": "ALERT",
  "severity": "MEDIUM",
  "vitals": {
    "hr": 135,
    "hr_status": "ALERT",
    "hr_severity": "MEDIUM"
  }
}
```

### Hazard Event (BPM 175)
```json
{
  "message": "Hazard Event: BPM 175",
  "status": "CRITICAL",
  "severity": "HIGH",
  "vitals": {
    "hr": 175,
    "hr_status": "CRITICAL",
    "hr_severity": "HIGH"
  }
}
```

## 🎯 Key Changes Made

1. **Monitor Button**: Changed from 80-120 → **121-150**
2. **Hazard Button**: Changed from 170-195 → **151-195**
3. **Status Determination**: Now uses `null` to let `getHeartRateStatus()` determine status automatically
4. **Consistent Logic**: Both buttons now align with the medical status thresholds

## ✨ Result

- **Monitor Event** will ALWAYS trigger **ALERT** status
- **Hazard Test** will ALWAYS trigger **CRITICAL** status
- Status and severity are determined by actual BPM value
- Payload accurately reflects the medical risk level

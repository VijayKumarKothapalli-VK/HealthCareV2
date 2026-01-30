# Changes Summary

## Overview
Removed steps logic functionality and simplified the Monitor and Hazard button behaviors as requested.

## Changes Made

### 1. **Removed Steps Functionality**
   - Removed `steps` and `stepsIncrementV` from state object
   - Removed `watchSteps` from UI object
   - Removed all step increment logic from `updateClock()` function
   - Removed `steps` field from API payload
   - Removed `setActivity()` function entirely

### 2. **Monitor Button (toggleMonitoringMode)**
   - **New Behavior**: When clicked, increases BPM within 5 seconds to a random monitor BPM value (80-120)
   - Calculates ramp speed dynamically: `bpmDifference / 300` (assuming 60 FPS × 5 seconds)
   - Triggers API immediately when target BPM is reached
   - Sends payload with status "MONITOR" and severity "MEDIUM"
   - Auto-stops simulation 2 seconds after API call

### 3. **Hazard Button (toggleHazardMode)**
   - **New Behavior**: When clicked, gradually increases BPM to critical value (170-195)
   - Calculates ramp speed for ~8 seconds: `bpmDifference / 480` (60 FPS × 8 seconds)
   - Triggers API when critical threshold is reached
   - Sends payload with status "CRITICAL" and severity "HIGH"
   - Auto-stops simulation 3 seconds after API call

### 4. **API Payload Structure**
   - Removed `steps` field from vitals
   - Payload now includes:
     - `message`: Status broadcast with BPM and SpO2
     - `event_id`: Unique event identifier
     - `status`: MONITOR or CRITICAL
     - `severity`: MEDIUM or HIGH
     - `device`: Device info
     - `vitals`: Heart rate, oxygen, and activity status (no steps)
     - `location`: GPS coordinates and timestamp
     - `nearest_hospitals`: Array of nearby hospitals

## Technical Details

### Ramp Speed Calculation
- **Monitor Mode**: 5 seconds to reach target
  - Formula: `state.rampSpeed = Math.abs(targetBpm - state.bpm) / 300`
  
- **Hazard Mode**: 8 seconds to reach critical value
  - Formula: `state.rampSpeed = Math.abs(targetBpm - state.bpm) / 480`

### BPM Ranges
- **Monitor Mode**: Random value between 80-120 BPM (normal to slightly elevated)
- **Hazard Mode**: Random value between 170-195 BPM (critical tachycardia)

## Files Modified
- `c:\AI Hackathon\HealthCare Site\script.js`

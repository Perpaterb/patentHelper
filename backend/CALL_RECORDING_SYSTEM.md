# Call Recording System - Technical Documentation

**Last Updated:** 2025-12-05
**Status:** Phone Call Recording - WORKING | Video Call Recording - WORKING

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [How It Works](#how-it-works)
4. [Key Files](#key-files)
5. [Problems Solved](#problems-solved)
6. [Audio Player Improvements](#audio-player-improvements)
7. [Pending Work](#pending-work)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The call recording system uses a **"Ghost Recorder"** approach with Puppeteer (headless Chrome) to join calls as a silent participant and capture all audio streams server-side.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CALL RECORDING FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Mobile App                   Backend Server                       │
│   ──────────                   ──────────────                       │
│                                                                     │
│   1. User starts call          2. POST /phone-calls/start           │
│      ───────────────────────────►                                   │
│                                                                     │
│                                3. Puppeteer launches headless       │
│                                   browser, loads recorder.html       │
│                                                                     │
│                                4. Ghost recorder joins call via     │
│                                   WebRTC signaling (REST polling)   │
│                                                                     │
│   5. All participants'         ◄───────────────────────────────     │
│      audio is mixed                                                 │
│                                                                     │
│   6. MediaRecorder captures    7. Recording stored as WebM          │
│      all remote streams           (converted to MP3 for storage)    │
│                                                                     │
│   8. User ends call            9. POST /phone-calls/:id/end         │
│      ───────────────────────────►                                   │
│                                                                     │
│                               10. stopRecording() called            │
│                                   - Stop MediaRecorder              │
│                                   - Upload recording via /upload    │
│                                   - Close browser                   │
│                                                                     │
│  11. Recording available      ◄─────────────────────────────────    │
│      in call details                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Server-Side Recording
| Component | Technology | Purpose |
|-----------|------------|---------|
| Headless Browser | Puppeteer (Chrome) | Runs recorder.html in headless mode |
| Audio Capture | MediaRecorder API | Records mixed audio streams |
| WebRTC | Native browser WebRTC | Receives audio from call participants |
| Signaling | REST API polling | SDP/ICE candidate exchange |
| Storage | Local filesystem → S3 | Temporary then permanent storage |

### Client-Side Playback
| Component | Technology | Purpose |
|-----------|------------|---------|
| Audio Engine | expo-av (Audio.Sound) | Cross-platform audio playback |
| UI Components | React Native | AudioPlayer, PhoneCallDetailsScreen |
| Web Support | Platform detection | Different event handling for web |

---

## How It Works

### 1. Call Initiation
When a user starts a phone call:

```javascript
// POST /groups/:groupId/phone-calls
// Creates PhoneCall record, returns callId
```

### 2. Recording Start
The backend spawns a Puppeteer instance:

```javascript
// services/recorder.service.js - startRecording()
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--use-fake-ui-for-media-stream',      // Auto-allow media permissions
    '--use-fake-device-for-media-stream',   // Use fake audio device
    '--autoplay-policy=no-user-gesture-required',
    // ... more flags
  ],
});

// Load recorder page with auth
const recorderUrl = new URL('/recorder.html', apiUrl);
recorderUrl.searchParams.set('token', authToken);
// ...
await page.goto(recorderUrl.toString());
```

### 3. Ghost Recorder Joins Call
The `recorder.html` page:

1. Creates a **silent local audio stream** (Web Audio API oscillator with gain=0)
2. Connects to WebRTC signaling via REST API polling
3. Joins the call as a participant (invisible to users)
4. Receives audio from all other participants
5. Mixes and records all incoming audio streams

### 4. Audio Capture
```javascript
// recorder.html - startRecording()
mediaRecorder = new MediaRecorder(remoteStream, {
  mimeType: 'audio/webm;codecs=opus'
});

mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
};
```

### 5. Call End & Upload
When the call ends:

1. `stopRecording()` called on recorder page
2. MediaRecorder stopped, chunks assembled into Blob
3. Recording uploaded via `POST /groups/:groupId/files/upload`
4. Puppeteer browser closed
5. Recording URL stored in PhoneCall record

---

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `backend/services/recorder.service.js` | Puppeteer recording orchestration |
| `backend/public/recorder.html` | Headless page that captures audio |
| `backend/controllers/phoneCalls.controller.js` | Phone call API endpoints |
| `backend/controllers/videoCalls.controller.js` | Video call API endpoints |

### Frontend (Mobile)
| File | Purpose |
|------|---------|
| `mobile-main/src/screens/groups/PhoneCallDetailsScreen.jsx` | Call details with recording playback |
| `mobile-main/src/screens/groups/VideoCallDetailsScreen.jsx` | Video call details |
| `mobile-main/src/components/AudioPlayer.jsx` | Reusable audio player component |

---

## Problems Solved

### Problem 1: Click Track Noise (SOLVED 2025-12-04)

**Symptom:** Audible clicking/ticking sound during calls (not in recording)

**Root Cause:** Puppeteer's `--use-fake-device-for-media-stream` flag creates a fake audio input device that produces a metronome-like click track. This was being sent to other call participants.

**Failed Approaches:**
- Various Puppeteer audio flags
- Attempting to disable fake device

**Solution:** Replace `getUserMedia()` with a silent Web Audio API stream:

```javascript
// recorder.html - init()
// OLD (caused click track):
// localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

// NEW (silent):
const silentAudioContext = new AudioContext();
const oscillator = silentAudioContext.createOscillator();
const gainNode = silentAudioContext.createGain();
gainNode.gain.value = 0; // Silent!
oscillator.connect(gainNode);
const silentDestination = silentAudioContext.createMediaStreamDestination();
gainNode.connect(silentDestination);
oscillator.start();

localStream = silentDestination.stream;
```

**Key Insight:** WebRTC requires a local audio stream for negotiation, but we don't need to send actual audio. The Web Audio API creates a valid MediaStream that satisfies WebRTC requirements while being completely silent.

### Problem 2: Recording Indicator Delay (DROPPED)

**Original Goal:** Only show recording indicator after MediaRecorder actually starts.

**Approach Attempted:**
1. Added `actuallyRecording` flag to recorder sessions
2. Created `/recorder-started` endpoint
3. Modified controllers to check recording status

**Result:** Multiple attempts caused 404 errors on `/recorder-signal` endpoints. Despite route definitions appearing correct, the changes consistently broke signaling.

**Decision:** Feature dropped to preserve working state. The recording indicator appears when the call starts, not when recording actually begins (small delay ~1-2 seconds is acceptable).

### Problem 3: Auto-Refresh After Recording Upload (SOLVED 2025-12-04)

**Symptom:** After call ends, user sees "0:00" duration and no recording. Must navigate away and back to see recording.

**Solution:** Added polling mechanism to both PhoneCallDetailsScreen and VideoCallDetailsScreen:

```javascript
// Poll for recording after call ends
useEffect(() => {
  const shouldPoll = call?.status === 'ended' &&
                     !call?.recordingUrl &&
                     !call?.recording?.url;

  if (!shouldPoll) return;

  let pollCount = 0;
  const maxPolls = 12; // 60 seconds max

  const pollForRecording = setInterval(async () => {
    pollCount++;
    const response = await api.get(`/groups/${groupId}/phone-calls`);
    const updatedCall = response.data.phoneCalls?.find(c => c.callId === callId);

    if (updatedCall?.recordingUrl || updatedCall?.recording?.url) {
      setCall(updatedCall);
      clearInterval(pollForRecording);
    }

    if (pollCount >= maxPolls) {
      clearInterval(pollForRecording);
    }
  }, 5000); // Every 5 seconds

  return () => clearInterval(pollForRecording);
}, [call?.status, call?.recordingUrl, call?.recording?.url]);
```

### Problem 4: Audio Player Seek Not Working on Web (SOLVED 2025-12-04)

**Symptom:**
- Progress bar not clickable on web (Expo Web)
- Seek dot overflowing message bubble bounds

**Root Cause:**
1. `event.nativeEvent.locationX` doesn't exist on web - only on native
2. `marginLeft: -8` on seek dot caused overflow

**Solution:**

```javascript
// Platform-specific seek handling
const handleSeek = async (event) => {
  let locationX;

  if (Platform.OS === 'web') {
    // Web: use offsetX or calculate from pageX
    if (event.nativeEvent.offsetX !== undefined) {
      locationX = event.nativeEvent.offsetX;
    } else if (event.nativeEvent.pageX !== undefined) {
      locationX = event.nativeEvent.pageX - progressBarLeft;
    }
  } else {
    // Mobile: use locationX
    locationX = event.nativeEvent.locationX;
  }

  // Clamp and seek
  locationX = Math.max(0, Math.min(locationX, progressBarWidth));
  const seekPosition = (locationX / progressBarWidth) * duration;
  await sound.setPositionAsync(Math.floor(seekPosition));
};
```

For overflow, changed from `marginLeft` to `transform`:
```javascript
seekDot: {
  position: 'absolute',
  transform: [{ translateX: -8 }], // Doesn't cause overflow
}
```

---

## Audio Player Improvements

### Features Added (2025-12-04)

1. **Seek Functionality**
   - Tap anywhere on progress bar to jump to that position
   - Works on both mobile and web platforms
   - Visual seek dot indicator

2. **Unified Styling**
   - AudioPlayer (messages) now matches PhoneCallDetailsScreen (call recordings)
   - Circular play button with colored background
   - Thicker progress bar (6px)
   - Larger seek dot (16px)
   - Time display: current position / total duration

3. **Web Platform Support**
   - Platform-specific event handling
   - Cursor pointer on web
   - Proper touch target sizing

4. **Full Width in Messages**
   - AudioPlayer takes 100% width of message bubble
   - Proper wrapper with vertical margin

---

## Video Call Recording (IMPLEMENTED 2025-12-04)

### Architecture

Video call recording uses a separate `videoRecorder.html` that captures both video and audio:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VIDEO CALL RECORDING FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Participants                  Ghost Recorder (Puppeteer)          │
│   ────────────                  ───────────────────────────          │
│                                                                     │
│   ┌─────────┐                   ┌─────────────────────────────┐     │
│   │ User A  │ ──video+audio──►  │   videoRecorder.html        │     │
│   └─────────┘                   │                             │     │
│                                 │  ┌───────────────────────┐  │     │
│   ┌─────────┐                   │  │   CANVAS (1280x720)   │  │     │
│   │ User B  │ ──video+audio──►  │  │  ┌─────┐  ┌─────┐    │  │     │
│   └─────────┘                   │  │  │  A  │  │  B  │    │  │     │
│                                 │  │  └─────┘  └─────┘    │  │     │
│   ┌─────────┐                   │  │  ┌─────┐  ┌─────┐    │  │     │
│   │ User C  │ ──video+audio──►  │  │  │  C  │  │  D  │    │  │     │
│   └─────────┘                   │  │  └─────┘  └─────┘    │  │     │
│                                 │  └───────────────────────┘  │     │
│   ┌─────────┐                   │                             │     │
│   │ User D  │ ──video+audio──►  │  + Audio Mixer (all mixed)  │     │
│   └─────────┘                   └─────────────────────────────┘     │
│                                             │                       │
│                                             ▼                       │
│                                 ┌─────────────────────────────┐     │
│                                 │  MediaRecorder               │     │
│                                 │  - Canvas stream (30fps)     │     │
│                                 │  - Mixed audio stream        │     │
│                                 │  - Output: WebM (VP8+Opus)   │     │
│                                 └─────────────────────────────┘     │
│                                             │                       │
│                                             ▼                       │
│                                 ┌─────────────────────────────┐     │
│                                 │  Server: Convert to MP4      │     │
│                                 │  (ffmpeg: H.264 + AAC)       │     │
│                                 └─────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Grid Layout

Participants are displayed in an equal-sized grid:

| Participants | Grid Layout |
|--------------|-------------|
| 1 | 1×1 |
| 2 | 2×1 (side by side) |
| 3-4 | 2×2 |
| 5-6 | 3×2 |
| 7-9 | 3×3 |
| 10-12 | 4×3 |
| 13-16 | 4×4 |

Each participant gets equal screen space, with letterboxing to preserve aspect ratios.

### Key Files

| File | Purpose |
|------|---------|
| `backend/public/videoRecorder.html` | Video recording with canvas grid |
| `backend/public/recorder.html` | Audio-only recording (phone calls) |
| `backend/services/recorder.service.js` | Selects correct recorder based on callType |
| `backend/services/videoConverter.js` | WebM to MP4 conversion (ffmpeg) |

### Technical Details

**Video Recording:**
- Canvas size: 1280×720 (720p)
- Frame rate: 30fps
- Video codec: VP8 (WebM) → H.264 (MP4)
- Video bitrate: 2.5 Mbps

**Audio Recording:**
- Sample rate: 48kHz
- Audio codec: Opus (WebM) → AAC (MP4)
- Audio bitrate: 128 kbps
- All participants mixed into single track

**Local Stream:**
- Silent audio (Web Audio API oscillator with gain=0)
- Black video (canvas with black fill)
- Required for WebRTC negotiation but sends no real content

### Problem 5: Video Recording Not Playing (SOLVED 2025-12-05)

**Symptom:** Video recordings saved but wouldn't play - "File not found" errors.

**Root Cause:** Video recordings were being saved to disk but no metadata JSON file was created. The `/files/:fileId` endpoint requires a metadata file to serve files.

**Solution:** Added metadata JSON file creation in `videoCalls.controller.js` (matching the pattern used by phone calls):

```javascript
// Create metadata JSON file for storage service compatibility
const metadataPath = path.join(uploadsDir, `${fileId}.json`);
const metadata = {
  fileId, fileName, mimeType: 'video/mp4',
  size: fileSize, category: 'recordings',
  userId, groupId, callId, durationMs,
};
await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
```

### Problem 6: Video Not Playing on Mobile/Web (SOLVED 2025-12-05)

**Symptom:** MP4 files wouldn't play on iOS, Android, or web browsers.

**Root Cause:** ffmpeg conversion settings weren't optimized for universal playback compatibility.

**Solution:** Added compatibility flags to `videoConverter.js`:

```javascript
ffmpeg(inputPath)
  .outputOptions([
    '-preset fast',
    '-crf 23',
    '-movflags +faststart',    // Enable streaming
    '-profile:v baseline',      // Wide compatibility (iOS, Android, web)
    '-level 3.1',              // Wide device support
    '-pix_fmt yuv420p',        // Required for QuickTime/iOS
  ])
```

### Problem 7: Video Player Not Working on Expo Web (SOLVED 2025-12-05)

**Symptom:** Video recordings wouldn't play when running mobile-main on web (Expo Web).

**Root Cause:** expo-av Video component doesn't work reliably on web platform.

**Solution:** Added platform detection in `VideoCallDetailsScreen.jsx` to use native HTML video on web:

```jsx
{Platform.OS === 'web' ? (
  <video
    src={recordingUrl}
    controls
    style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
  />
) : (
  <Video
    source={{ uri: recordingUrl }}
    useNativeControls
    resizeMode={ResizeMode.CONTAIN}
  />
)}
```

---

## Future Enhancements

- [ ] Recording quality settings (bitrate options)
- [ ] Recording compression before upload
- [ ] Background upload with progress indicator
- [ ] Recording playback speed control (1x, 1.5x, 2x)
- [ ] Waveform visualization

---

## Troubleshooting

### Common Issues

#### 1. Recording Not Starting
**Check:**
- Puppeteer installed correctly (`npm install puppeteer`)
- Chrome available in headless mode
- Backend has sufficient memory for headless Chrome

**Logs to check:**
```
[Recorder] Starting recording for phone-{callId}
[Recorder Page] Creating silent local stream...
[Recorder Page] Connected to call
```

#### 2. 404 on Recorder Signal
**Symptom:** `POST /groups/:groupId/phone-calls/:callId/recorder-signal` returns 404

**Cause:** Route not properly registered or controller export missing

**Solution:** Check `phoneCalls.controller.js` exports and route definitions

#### 3. Click Track Still Audible
**Symptom:** Clicking sound during call

**Check:** Ensure `recorder.html` is using the silent Web Audio API approach, not `getUserMedia`

#### 4. Recording Upload Fails
**Check:**
- Auth token valid and not expired
- File upload endpoint working
- Sufficient storage quota

**Logs:**
```
[Recorder] Uploading recording... 123456 bytes
[Recorder] Upload response: { success: true, ... }
```

#### 5. iOS Simulator Noise (Safe to Ignore)

When running on the iOS Simulator, you'll see many audio/video warnings. **All are harmless** - the simulator lacks real hardware:

| Warning Pattern | Explanation |
|-----------------|-------------|
| `[AudioToolbox] LoudnessManager.mm: IsHardwareSupported: no plist loaded` | No real audio hardware |
| `[CoreAudio] HALC_ProxySystem/HALC_ShellObject` errors | Audio proxy limitations |
| `[AudioToolbox] iOSSimulatorAudioDevice: Abandoning I/O cycle` | Audio reconfiguration noise |
| `[CoreFoundation] AddInstanceForFactory: No factory registered` | Audio factory registration |
| `[CoreAudio] HALPlugIn::StopIOProc: got an error` | Audio plugin issues |
| `[VideoToolbox] (Fig) signalled err=-12900` | Video decoder init |
| `[MediaToolbox] <<<< VRP >>>> signalled err=-12852` | Video renderer proxy |
| `[TranslationUI] Visual isTranslatable: NO` | Translation not supported |
| `[VisionKitCore] Request to remove background on unsupported device` | Not supported on simulator |
| `[CoreGraphics] verify_image_parameters: invalid bits/pixel` | Graphics quirk |

**These DO NOT appear on real iOS devices.** Audio/video work correctly despite these messages.

#### 6. WebRTC ICE Candidate Warning
```
WARN [WebRTC] No peer connection for <uuid> to add ICE candidate
```

**Expected behavior.** ICE candidates sometimes arrive before the peer connection is created locally. The code handles this gracefully.

#### 7. Expo AV Deprecation Warning
```
WARN [expo-av]: Expo AV has been deprecated and will be removed in SDK 54.
```

**Action required before SDK 54:** Migrate from `expo-av` to `expo-video` for video playback. We already use native HTML video on web.

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-04 | Click track fix (silent Web Audio stream) |
| 2025-12-04 | Auto-refresh polling for recordings |
| 2025-12-04 | Audio player seek functionality |
| 2025-12-04 | Web platform audio player fixes |
| 2025-12-04 | Unified audio player styling |
| 2025-12-04 | Removed participant count from call details |
| 2025-12-04 | Video call recording with canvas grid layout |
| 2025-12-04 | WebM → MP4 conversion for video recordings |
| 2025-12-05 | Fixed metadata file creation for video recordings |
| 2025-12-05 | Improved MP4 encoding for universal compatibility |
| 2025-12-05 | Added native HTML video player for Expo Web |

---

## Reference Commits

Key commits for this feature:

```
09c9b03 - fix: Remove click track from phone call recording
          (Silent Web Audio API stream instead of fake device)

[hash]  - feat: Add auto-refresh polling for phone call recordings
[hash]  - feat: Add auto-refresh polling for video call recordings
[hash]  - feat: Add seek functionality to audio players
[hash]  - refactor: Update AudioPlayer to match call recording player style
[hash]  - fix: Make AudioPlayer 100% width with margin in message bubble
[hash]  - fix: Remove participant count from call details screens
[hash]  - fix: Fix audio player seek bar for web platform
```

---

## Contact / Support

For issues with the recording system:
1. Check server logs for `[Recorder]` prefixed messages
2. Check browser console in recorder.html for `[Recorder Page]` messages
3. Verify WebRTC signaling with `/recorder-signal` endpoint logs

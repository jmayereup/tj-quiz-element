# Web Speech API: Voice Selection Guide (v1.3)

This guide explains how to implement a unified, robust Text-to-Speech (TTS) system with a "Best Voice" fallback and a clean overlay selection UI that works consistently on both desktop and mobile.

## 1. Core State
Track the selected voice name and the playback state.

```javascript
this.selectedVoiceName = null;
this.isPlayingAll = false;
```

## 2. Getting the "Best" Voice
Browsers provide many voices, but some are much better than others (e.g., "Natural" on Edge, "Google" on Chrome, "Siri" on iOS). Use a priority list to find the highest quality voice for a given language.

```javascript
_getBestVoice(lang) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const langPrefix = lang.split(/[-_]/)[0].toLowerCase();
  
  // 1. Filter by language
  let langVoices = voices.filter(v => v.lang.toLowerCase() === lang.toLowerCase());
  if (langVoices.length === 0) {
    langVoices = voices.filter(v => v.lang.split(/[-_]/)[0].toLowerCase() === langPrefix);
  }

  if (langVoices.length === 0) return null;

  // 2. Priority list
  const priorities = ["natural", "google", "premium", "siri"];
  for (const p of priorities) {
    const found = langVoices.find(v => v.name.toLowerCase().includes(p));
    if (found) return found;
  }

  // 3. Fallback
  const nonRobotic = langVoices.find(v => !v.name.toLowerCase().includes("microsoft"));
  return nonRobotic || langVoices[0];
}
```

> [!TIP]
> **Android Selection**: On Android, always set `utterance.lang` even when `utterance.voice` is assigned.

## 3. Implementing the Unified Voice Overlay
Instead of a standard `<select>` dropdown, use a compact button that opens a clean selection overlay.

### HTML Structure
```html
<button id="voice-btn" title="Choose Voice">
  <!-- Speaking Head Icon -->
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M9 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 8c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm-6 4c.22-.72 3.31-2 6-2 2.7 0 5.77 1.29 6 2H3zM15.08 7.05c.84 1.18.84 2.71 0 3.89l1.68 1.69c2.02-2.02 2.02-5.17 0-7.27l-1.68 1.69zM18.42 3.7l-1.7 1.71c2.3 2 2.3 5.6 0 7.6l1.7 1.71c3.28-3.23 3.28-8.15 0-11.02z"/>
  </svg>
</button>

<div class="voice-overlay">
  <div class="voice-card">
    <div class="voice-card-header">
      <h3>Choose Voice</h3>
      <button class="close-voice-btn">×</button>
    </div>
    <div class="voice-list"></div>
  </div>
</div>
```

### JavaScript Logic
The `onvoiceschanged` event is critical for populating the list as voices load.

```javascript
_updateVoiceList() {
  const voices = window.speechSynthesis.getVoices();
  const voiceList = this.shadowRoot.querySelector('.voice-list');
  const lang = "en-US";
  const langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
  const bestVoice = this._getBestVoice(lang);

  voiceList.innerHTML = '';
  langVoices.sort((a, b) => a.name.localeCompare(b.name));

  langVoices.forEach(voice => {
    const btn = document.createElement('button');
    btn.classList.add('voice-option-btn');
    if (this.selectedVoiceName === voice.name) btn.classList.add('active');
    
    btn.innerHTML = `<span>${voice.name}</span>`;
    if (bestVoice && voice.name === bestVoice.name) {
      btn.innerHTML += `<span class="badge">Best</span>`;
    }

    btn.onclick = () => {
      this.selectedVoiceName = voice.name;
      this._updateVoiceList();
      this._hideVoiceOverlay();
    };
    voiceList.appendChild(btn);
  });
}
```

## 4. Premium CSS Styling
Use a blurred backdrop for the overlay and clean, hoverable buttons for the voice list.

```css
.voice-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.voice-card {
  background: white;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  border-radius: 1.2em;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.voice-option-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
  font-weight: 600;
}
```

## 5. In-App Browser Detection
In-app browsers (Instagram, Facebook) often have limited TTS support. Always prompt users to open in Safari or Chrome for the best experience.

```javascript
_shouldShowAudioControls() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("instagram") || ua.includes("facebook") || ua.includes("line")) {
    return false;
  }
  return !!window.speechSynthesis;
}
```

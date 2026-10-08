// Web Audio API Sound Manager for MaritimeGuard
// Manages Level 1 Beep and Level 2 Siren with user interaction unlocking

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isUnlocked = false;
    this.beepTimer = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.isBeeping = false;
    this.isSirening = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isUnlocked = true;
    return this.isUnlocked;
  }

  // Level 1: repeating short beep every second
  startBeep() {
    if (!this.isUnlocked) return;
    if (this.isBeeping) return;
    this.isBeeping = true;

    const playSingleBeep = () => {
      if (!this.isBeeping || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime); // 880 Hz tone (A5)

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.2);
      } catch (e) {
        console.warn('Beep audio error:', e);
      }
    };

    playSingleBeep();
    this.beepTimer = setInterval(playSingleBeep, 1000);
  }

  stopBeep() {
    this.isBeeping = false;
    if (this.beepTimer) {
      clearInterval(this.beepTimer);
      this.beepTimer = null;
    }
  }

  // Level 2: loud continuous two-tone siren
  startSiren() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isSirening) return;
    this.isSirening = true;

    try {
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc1 = this.ctx.createOscillator();
      this.sirenOsc1.type = 'sawtooth';

      let toneHigh = false;
      this.sirenOsc1.frequency.setValueAtTime(650, this.ctx.currentTime);
      this.sirenOsc1.connect(this.sirenGain);
      this.sirenOsc1.start();

      this._sirenTimer = setInterval(() => {
        if (!this.isSirening || !this.ctx || !this.sirenOsc1) return;
        toneHigh = !toneHigh;
        const targetFreq = toneHigh ? 950 : 650;
        this.sirenOsc1.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
      }, 400);
    } catch (e) {
      console.warn('Siren audio error:', e);
    }
  }

  stopSiren() {
    this.isSirening = false;
    if (this._sirenTimer) {
      clearInterval(this._sirenTimer);
      this._sirenTimer = null;
    }
    try {
      if (this.sirenOsc1) {
        this.sirenOsc1.stop();
        this.sirenOsc1.disconnect();
        this.sirenOsc1 = null;
      }
      if (this.sirenGain) {
        this.sirenGain.disconnect();
        this.sirenGain = null;
      }
    } catch (e) {
      console.warn('Error stopping siren:', e);
    }
  }

  testBeep() {
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      console.warn(e);
    }
  }

  testSiren() {
    this.init();
    this.startSiren();
    setTimeout(() => {
      this.stopSiren();
    }, 2500);
  }

  stopAll() {
    this.stopBeep();
    this.stopSiren();
  }
}

export const soundManager = new SoundManager();

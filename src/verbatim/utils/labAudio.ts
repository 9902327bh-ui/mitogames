let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      sharedCtx = new AudioCtx();
    }
  }
  if (sharedCtx && sharedCtx.state === 'suspended') {
    void sharedCtx.resume();
  }
  return sharedCtx;
}

export function playLabTone(
  type:
    | 'pour'
    | 'drop'
    | 'stir'
    | 'heat'
    | 'success'
    | 'error'
    | 'victory'
    | 'chime'
    | 'sparkle'
    | 'glove'
    | 'pickup'
    | 'bubbles',
  muted: boolean
) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playNote = (
    freqStart: number,
    freqEnd: number,
    duration: number,
    oscType: OscillatorType = 'sine',
    gainPeak = 0.08,
    delay = 0
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(freqStart, now + delay);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, freqEnd),
      now + delay + duration
    );

    gain.gain.setValueAtTime(0.001, now + delay);
    gain.gain.linearRampToValueAtTime(gainPeak, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.02);
  };

  switch (type) {
    case 'pour':
      playNote(260, 420, 0.22, 'sine', 0.07, 0);
      playNote(340, 520, 0.2, 'sine', 0.05, 0.08);
      break;
    case 'drop':
      playNote(780, 440, 0.12, 'sine', 0.07, 0);
      break;
    case 'stir':
      playNote(320, 390, 0.14, 'triangle', 0.05, 0);
      playNote(390, 320, 0.14, 'triangle', 0.05, 0.14);
      break;
    case 'heat':
      playNote(180, 260, 0.28, 'triangle', 0.06, 0);
      break;
    case 'glove':
      playNote(440, 587.33, 0.14, 'sine', 0.07, 0);
      break;
    case 'pickup':
      playNote(420, 560, 0.1, 'triangle', 0.06, 0);
      break;
    case 'chime':
      playNote(587.33, 587.33, 0.12, 'sine', 0.06, 0);
      playNote(880, 880, 0.18, 'sine', 0.06, 0.08);
      break;
    case 'sparkle':
      playNote(659.25, 987.77, 0.15, 'sine', 0.06, 0);
      playNote(987.77, 1318.5, 0.18, 'sine', 0.05, 0.08);
      break;
    case 'bubbles':
      playNote(360, 620, 0.09, 'sine', 0.05, 0);
      playNote(480, 760, 0.09, 'sine', 0.05, 0.08);
      playNote(560, 880, 0.1, 'sine', 0.04, 0.16);
      break;
    case 'success':
      playNote(523.25, 523.25, 0.12, 'sine', 0.07, 0);
      playNote(659.25, 659.25, 0.18, 'sine', 0.08, 0.09);
      break;
    case 'error':
      playNote(220, 155, 0.2, 'sawtooth', 0.04, 0);
      break;
    case 'victory':
      playNote(523.25, 523.25, 0.14, 'sine', 0.08, 0);
      playNote(659.25, 659.25, 0.14, 'sine', 0.08, 0.11);
      playNote(783.99, 783.99, 0.16, 'sine', 0.08, 0.22);
      playNote(1046.5, 1046.5, 0.34, 'sine', 0.09, 0.34);
      break;
  }
}

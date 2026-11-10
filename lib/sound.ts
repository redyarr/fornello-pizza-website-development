// Client-side Web Audio Sound Synthesis
// Generates native restaurant chimes and UI feedback without external audio files

export function playBellChime(): void {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Fundamental bell tone (A5 - 880Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    // Overtone chime (A6 - 1760Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1760, now)
    gain2.gain.setValueAtTime(0.12, now)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 1.2)
    osc2.stop(now + 0.8)
  } catch {
    // Graceful fallback if audio context is blocked
  }
}

export function playSuccessChime(): void {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5 major triad

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.07
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.15, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.35)
    })
  } catch {
    // Graceful fallback
  }
}

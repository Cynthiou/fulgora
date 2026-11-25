import { useEffect, useRef } from "react";

export type Alerts = {
  // A short tone (3, 2, 1) or a long one (0)
  beep: (durationMs: number) => void;
  // Vibration when the browser offers it; nothing otherwise
  vibrate: (durationMs: number) => void;
};

let audioContext: AudioContext | null = null;

// One tone through the Web Audio API. The context is created on the first
// call, which happens right after a tap of the user (browsers require it).
function playTone(durationMs: number) {
  if (typeof AudioContext === "undefined") {
    return;
  }
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationMs / 1000);
  } catch {
    // No sound: the visual signal remains (RM-061).
  }
}

function vibrateIfPossible(durationMs: number) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Not available here: nothing to do (RM-063).
    }
  }
}

export const defaultAlerts: Alerts = {
  beep: playTone,
  vibrate: vibrateIfPossible,
};

// Fires the alerts of a countdown once each: short beeps at 3, 2, 1, a long
// beep and a vibration at 0 (RM-060). Every alert has its visual twin on the
// screen (RM-061); none writes anything (RM-062).
export function useTimerAlerts(
  secondsLeft: number,
  alerts: Alerts = defaultAlerts,
) {
  const fired = useRef(new Set<number>());

  useEffect(() => {
    if (secondsLeft > 3 || fired.current.has(secondsLeft)) {
      return;
    }
    fired.current.add(secondsLeft);
    if (secondsLeft === 0) {
      alerts.beep(600);
      alerts.vibrate(400);
    } else {
      alerts.beep(120);
    }
  }, [secondsLeft, alerts]);
}

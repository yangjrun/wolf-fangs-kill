/**
 * Web Speech-based narrator for the werewolf game.
 *
 * Wraps `window.speechSynthesis` with a serial queue so phase narrations don't
 * trample each other. Voice selection prefers Chinese voices (zh-CN / zh-TW),
 * falling back to whatever the platform has.
 *
 * Usage:
 *   import { narrator } from '@/services/narrator';
 *   narrator.configure({ enabled: true, rate: 1.0 });
 *   narrator.speak('天黑了');
 *   narrator.stop();
 */

export interface NarratorOptions {
  enabled: boolean;
  rate: number;         // 0.5 - 2.0; SpeechSynthesisUtterance.rate
  voiceName?: string;   // preferred SpeechSynthesisVoice.name; auto-pick if unset
}

class Narrator {
  private options: NarratorOptions = { enabled: true, rate: 1.0 };
  private queue: string[] = [];
  private speaking = false;
  private voicesCache: SpeechSynthesisVoice[] | null = null;

  configure(opts: Partial<NarratorOptions>): void {
    this.options = { ...this.options, ...opts };
    if (!this.options.enabled) this.stop();
  }

  /** Returns the list of available voices, prioritizing Chinese ones. */
  availableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    if (this.voicesCache && this.voicesCache.length > 0) return this.voicesCache;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) this.voicesCache = voices;
    return voices;
  }

  /** Speak the given text. If a sentence is already playing, it is queued. */
  speak(text: string): void {
    if (!this.options.enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!text.trim()) return;
    this.queue.push(text);
    if (!this.speaking) this.drainQueue();
  }

  /** Stop all speech and clear the queue. */
  stop(): void {
    this.queue = [];
    this.speaking = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  private drainQueue(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.speaking = false;
      return;
    }
    this.speaking = true;

    const utterance = new SpeechSynthesisUtterance(next);
    utterance.rate = this.options.rate;
    const voice = this.pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'zh-CN';
    }

    utterance.onend = () => {
      this.drainQueue();
    };
    utterance.onerror = () => {
      this.drainQueue();
    };

    window.speechSynthesis.speak(utterance);
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const voices = this.availableVoices();
    if (voices.length === 0) return null;

    if (this.options.voiceName) {
      const named = voices.find((v) => v.name === this.options.voiceName);
      if (named) return named;
    }

    // Prefer Chinese voices
    const zh = voices.find((v) => v.lang?.toLowerCase().startsWith('zh'));
    if (zh) return zh;

    return voices[0] ?? null;
  }
}

export const narrator = new Narrator();

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSpeechSpotlight } from './useSpeechSpotlight';
import type { ActiveSpeech } from './useSpeechSpotlight';

describe('useSpeechSpotlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize with null active speech', () => {
    const spotlight = useSpeechSpotlight();
    expect(spotlight.active.value).toBeNull();
    expect(spotlight.typedChars.value).toBe(0);
  });

  it('should set active speech when show is called', () => {
    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'Hello world',
      internalThought: 'Thinking...',
      day: 1,
      type: 'SPEAK',
    };

    spotlight.show(speech);
    expect(spotlight.active.value).toEqual(speech);
    expect(spotlight.typedChars.value).toBe(0);
  });

  it('should increment typedChars over time', async () => {
    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'Test',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };

    spotlight.show(speech);
    expect(spotlight.typedChars.value).toBe(0);

    // Advance by CHAR_DELAY_MS (50ms)
    vi.advanceTimersByTime(50);
    expect(spotlight.typedChars.value).toBe(1);

    vi.advanceTimersByTime(50);
    expect(spotlight.typedChars.value).toBe(2);

    vi.advanceTimersByTime(50);
    expect(spotlight.typedChars.value).toBe(3);

    vi.advanceTimersByTime(50);
    expect(spotlight.typedChars.value).toBe(4);
  });

  it('should stop typing when content is fully displayed', async () => {
    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'Hi',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };

    spotlight.show(speech);

    // Type all characters (2 chars * 50ms = 100ms)
    await vi.advanceTimersByTimeAsync(100);
    expect(spotlight.typedChars.value).toBe(2);

    // Skip to avoid waiting for hold timer
    spotlight.skip();

    // Should still be visible after skipping
    expect(spotlight.active.value).toEqual(speech);
  });

  it('should skip current speech immediately', async () => {
    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'Long speech here',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };

    const promise = spotlight.show(speech);

    // Start typing
    vi.advanceTimersByTime(100);
    expect(spotlight.typedChars.value).toBe(2);

    // Skip immediately
    spotlight.skip();
    await promise;

    // Should still be visible
    expect(spotlight.active.value).toEqual(speech);
  });

  it('should dismiss and clear active speech', () => {
    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'Test',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };

    spotlight.show(speech);
    expect(spotlight.active.value).toEqual(speech);

    spotlight.dismiss();
    expect(spotlight.active.value).toBeNull();
    expect(spotlight.typedChars.value).toBe(0);
  });

  it('should replace previous speech when show is called again', () => {
    const spotlight = useSpeechSpotlight();
    const speech1: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'First',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };
    const speech2: ActiveSpeech = {
      playerId: 'p2',
      persona: null,
      content: 'Second',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };

    spotlight.show(speech1);
    vi.advanceTimersByTime(100);
    expect(spotlight.typedChars.value).toBeGreaterThan(0);

    // Show second speech should reset
    spotlight.show(speech2);
    expect(spotlight.active.value).toEqual(speech2);
    expect(spotlight.typedChars.value).toBe(0);
  });

  it('should handle SHERIFF_RUN type', () => {
    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'I want to be sheriff',
      internalThought: '',
      day: 1,
      type: 'SHERIFF_RUN',
    };

    spotlight.show(speech);
    expect(spotlight.active.value?.type).toBe('SHERIFF_RUN');
  });

  it('should clean up timers on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const spotlight = useSpeechSpotlight();
    const speech: ActiveSpeech = {
      playerId: 'p1',
      persona: null,
      content: 'Test',
      internalThought: '',
      day: 1,
      type: 'SPEAK',
    };

    spotlight.show(speech);
    vi.advanceTimersByTime(50);

    // Simulate unmount by calling dismiss
    spotlight.dismiss();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

'use client';

import { useEffect, useRef } from 'react';
import { useSpriteStore } from '@/stores/sprite-store';
import {
  SPRITE_FPS,
  SPRITE_FRAME_COUNTS,
  spriteSrc,
} from '@/types/sprite';
import type { SpriteState } from '@/types/sprite';

/** Blink interval range in ms. */
const BLINK_MIN_MS = 3_000;
const BLINK_MAX_MS = 5_000;
/** Duration of a single blink animation in ms. */
const BLINK_DURATION_MS = 300;

/**
 * Drives the sprite animation loop via requestAnimationFrame.
 *
 * - Advances frames at the configured FPS for the current state.
 * - Triggers random blink interruptions (3-5 s intervals).
 * - Returns the current image src for rendering.
 *
 * This hook does NOT render anything — it only manages timing and
 * frame advancement. The consumer reads the returned `src` and
 * renders an `<img>` or `<Image>`.
 */
export function useSpriteAnimation(): string {
  const current = useSpriteStore((s) => s.current);
  const frame = useSpriteStore((s) => s.frame);
  const playing = useSpriteStore((s) => s.playing);
  const activate = useSpriteStore((s) => s.activate);
  const deactivate = useSpriteStore((s) => s.deactivate);

  // ── Frame advance loop ──────────────────────────────────
  const lastFrameTime = useRef(0);

  useEffect(() => {
    if (!playing) return;
    lastFrameTime.current = performance.now();

    let rafId: number;

    const tick = (time: DOMHighResTimeStamp) => {
      const state = useSpriteStore.getState();
      if (!state.playing) return;

      const fps = SPRITE_FPS[state.current];
      const interval = 1000 / fps;

      if (time - lastFrameTime.current >= interval) {
        lastFrameTime.current = time;
        const totalFrames = SPRITE_FRAME_COUNTS[state.current];
        const nextFrame = (state.frame + 1) % totalFrames;
        state.setFrame(nextFrame);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, current]); // restart loop when state changes

  // ── Blink interrupt ─────────────────────────────────────
  useEffect(() => {
    if (!playing) return;

    let blinkTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const delay =
        BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
      blinkTimeout = setTimeout(() => {
        activate('blink');

        // End blink after its duration
        setTimeout(() => {
          deactivate('blink');
          scheduleBlink();
        }, BLINK_DURATION_MS);
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, [playing, activate, deactivate]);

  return spriteSrc(current, frame);
}

/**
 * Convenience: bridge existing CharacterAvatar boolean props
 * to sprite store activate/deactivate calls.
 *
 * Call this from the component that knows the character's
 * behavioral state (walking, sitting, etc.).
 */
export function useSpriteStateSync(props: {
  isWalking: boolean;
  isSitting: boolean;
  isSurprised: boolean;
}) {
  const activate = useSpriteStore((s) => s.activate);
  const deactivate = useSpriteStore((s) => s.deactivate);

  useSyncState('walk', props.isWalking, activate, deactivate);
  useSyncState('sit', props.isSitting, activate, deactivate);
  useSyncState('surprised', props.isSurprised, activate, deactivate);
}

function useSyncState(
  state: SpriteState,
  active: boolean,
  activate: (s: SpriteState) => void,
  deactivate: (s: SpriteState) => void,
) {
  const prevRef = useRef(active);
  useEffect(() => {
    if (active && !prevRef.current) activate(state);
    if (!active && prevRef.current) deactivate(state);
    prevRef.current = active;
  }, [active, state, activate, deactivate]);
}

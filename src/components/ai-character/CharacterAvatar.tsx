'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { CharacterExpression } from '@/types';

interface CharacterAvatarProps {
  size?: number;
  isThinking?: boolean;
  isWalking?: boolean;
  expression?: CharacterExpression;
  isSitting?: boolean;
  facingLeft?: boolean;
  onClick?: () => void;
}

export function CharacterAvatar({
  size = 100,
  isThinking = false,
  isWalking = false,
  expression = 'neutral',
  isSitting = false,
  facingLeft = false,
  onClick,
}: CharacterAvatarProps) {
  const h = Math.round(size * 1.4);

  // ── Idle glance reaction: periodically trigger a "looking around" motion ──
  const [isGlancing, setIsGlancing] = useState(false);

  const scheduleGlance = useCallback(() => {
    const delay = 12_000 + Math.random() * 6_000; // 12–18s
    return setTimeout(() => setIsGlancing(true), delay);
  }, []);

  useEffect(() => {
    // Only glance when truly idle (not walking, sitting, or thinking)
    if (isWalking || isSitting || isThinking) {
      setIsGlancing(false); // eslint-disable-line react-hooks/set-state-in-effect -- resets flag when no longer idle
      return;
    }
    const timer = scheduleGlance();
    return () => clearTimeout(timer);
  }, [isWalking, isSitting, isThinking, scheduleGlance]);

  // Reset glance flag after animation completes, then schedule next
  useEffect(() => {
    if (!isGlancing) return;
    const reset = setTimeout(() => {
      setIsGlancing(false);
    }, 1800); // matches glance animation duration
    return () => clearTimeout(reset);
  }, [isGlancing]);

  // Schedule next glance after previous one ends
  useEffect(() => {
    if (isGlancing || isWalking || isSitting || isThinking) return;
    const timer = scheduleGlance();
    return () => clearTimeout(timer);
  }, [isGlancing, isWalking, isSitting, isThinking, scheduleGlance]);

  const getAnimation = () => {
    if (isSitting) {
      return { rotate: -3, scaleY: 1, y: 0 };
    }
    if (isWalking) {
      return {
        rotate: [-1.5, 1.5, -1.5],
        scaleY: [1, 0.98, 1, 0.98, 1],
      };
    }
    if (isThinking) {
      return { y: [0, -4, 4, 0], rotate: [0, -2, 2, 0] };
    }
    if (isGlancing) {
      // Quick "looking around" tilt — larger than idle breathing
      return {
        rotate: [0, 3, -2.5, 0.5, 0],
        scaleY: [1, 1.01, 1, 1.005, 1],
      };
    }
    // Idle: subtle breathing with gentle head sway
    return {
      scaleY: [1, 1.005, 1],
      scaleX: [1, 0.995, 1],
      rotate: [0, -0.8, 0, 0.8, 0],
    };
  };

  const getTransition = () => {
    if (isSitting) {
      return { type: 'spring' as const, damping: 20, stiffness: 200 };
    }
    if (isWalking) {
      return { repeat: Infinity, duration: 0.6, ease: 'easeInOut' as const };
    }
    if (isThinking) {
      return { repeat: Infinity, duration: 1.4, ease: 'easeInOut' as const };
    }
    if (isGlancing) {
      return { duration: 1.8, ease: 'easeInOut' as const };
    }
    // Idle breathing cycle — slow and natural
    return { repeat: Infinity, duration: 5, ease: 'easeInOut' as const };
  };

  return (
    <motion.button
      onClick={onClick}
      className="relative focus:outline-none select-none"
      style={{
        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.12))',
        transformOrigin: 'bottom center',
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      aria-label="AIキャラクター"
    >
      {/* Movement animation wrapper */}
      <motion.div
        animate={getAnimation()}
        transition={getTransition()}
        style={{ transformOrigin: 'bottom center' }}
      >
        {/* Blink wrapper — CSS keyframe applies vertical squash from top */}
        <div
          style={{
            transform: facingLeft ? 'scaleX(-1)' : undefined,
            transformOrigin: 'top center',
            animation: 'aimo-blink 5s ease-in-out infinite',
          }}
        >
          <Image
            src="/characters/phil-default.png"
            alt="Aimo"
            width={size}
            height={h}
            className="object-contain pointer-events-none"
            style={{ width: size, height: h }}
            priority
            draggable={false}
          />
        </div>
      </motion.div>

      {/* Expression indicator */}
      <ExpressionIndicator expression={expression} size={size} />

      {/* Thinking dots */}
      {isThinking && (
        <motion.div
          className="absolute -top-1 -right-1 flex items-center gap-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 0.2, 0.4].map((delay) => (
            <motion.span
              key={delay}
              className="block h-2 w-2 rounded-full bg-primary"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.8, delay }}
            />
          ))}
        </motion.div>
      )}

      {/* Sitting shadow */}
      {isSitting && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-foreground/10"
          style={{
            width: size * 0.6,
            height: size * 0.06,
            filter: 'blur(2px)',
          }}
        />
      )}
    </motion.button>
  );
}

function ExpressionIndicator({
  expression,
  size,
}: {
  expression: CharacterExpression;
  size: number;
}) {
  if (expression === 'neutral' || expression === 'thinking') return null;

  const indicatorSize = Math.max(16, size * 0.14);

  if (expression === 'happy') {
    return (
      <motion.div
        className="absolute pointer-events-none"
        style={{ top: -indicatorSize * 0.5, left: '50%', x: '-50%' }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.span
          style={{ fontSize: indicatorSize }}
          animate={{
            y: [0, -6, 0],
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          ✨
        </motion.span>
      </motion.div>
    );
  }

  if (expression === 'surprised') {
    return (
      <motion.div
        className="absolute pointer-events-none"
        style={{ top: -indicatorSize, right: 0 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 300 }}
      >
        <span
          className="font-bold text-accent"
          style={{ fontSize: indicatorSize * 1.3 }}
        >
          !
        </span>
      </motion.div>
    );
  }

  return null;
}

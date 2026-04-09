'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
} from 'framer-motion';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from './ChatBubble';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { useViewerStore } from '@/stores/viewer-store';
import { useReactionStore } from '@/stores/reaction-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useHydration } from '@/stores/use-hydration';
import { pickReactionMessage } from '@/lib/reaction-messages';
import type { CharacterExpression } from '@/types';

/** Minimum interval between page reactions (ms) */
const PAGE_REACTION_COOLDOWN = 30_000;

function getCharacterSize(): number {
  const w = window.innerWidth;
  if (w >= 1280) return 200;
  if (w >= 1024) return 160;
  if (w >= 768) return 130;
  return 90;
}

function getHomePosition(): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = getCharacterSize();
  const charH = size * 1.4;
  return {
    x: w - size - 24,
    y: h - charH - 24,
  };
}

function getRandomSafePosition(): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = getCharacterSize();
  const charH = size * 1.4;
  const minX = 20;
  const maxX = w - size - 20;
  const minY = 120;
  const maxY = h - charH - 20;
  return {
    x: Math.max(minX, Math.min(maxX, minX + Math.random() * (maxX - minX))),
    y: Math.max(minY, Math.min(maxY, minY + Math.random() * (maxY - minY))),
  };
}

function isDesktop(): boolean {
  return window.innerWidth >= 1024;
}

/** Find snap target near card top edges */
function findSnapTarget(
  charX: number,
  charY: number,
  charW: number,
  charH: number,
): { x: number; y: number } | null {
  const threshold = 50;
  const cards = document.querySelectorAll('[data-snap-target]');
  let bestDist = threshold;
  let snapPos: { x: number; y: number } | null = null;

  for (const card of Array.from(cards)) {
    const rect = card.getBoundingClientRect();
    const charBottom = charY + charH;
    const edgeY = rect.top;

    if (charX + charW < rect.left - 20 || charX > rect.right + 20) continue;

    const dist = Math.abs(charBottom - edgeY);
    if (dist < bestDist) {
      const snapX = Math.max(
        rect.left + 8,
        Math.min(rect.right - charW - 8, charX),
      );
      snapPos = { x: snapX, y: edgeY - charH };
      bestDist = dist;
    }
  }

  return snapPos;
}

// Default export required for next/dynamic ssr:false to work correctly.
// Named exports + ssr:false is broken in Next.js 16.
export default function AICharacter() {
  // ── All hooks must be called unconditionally ──
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [charSize, setCharSize] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);

  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const wanderMode = useSettingsStore((s) => s.wanderMode);
  const isSending = useChatStore((s) => s.isSending);
  const isLoading = useViewerStore((s) => s.isLoading);
  const viewerContent = useViewerStore((s) => s.content);
  const reaction = useReactionStore((s) => s.reaction);
  const clearReaction = useReactionStore((s) => s.clearReaction);
  const triggerReaction = useReactionStore((s) => s.triggerReaction);
  const displayName = hydrated ? aiName : 'アイモ';

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const wanderTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAnimation = useRef<{ stop: () => void } | null>(null);
  const isWandering = useRef(true);
  const initialized = useRef(false);
  const lastReactedUrl = useRef<string | null>(null);
  const lastPageReactionAt = useRef(0);

  // Auto-clear reaction after 4 seconds
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(clearReaction, 4000);
    return () => clearTimeout(timer);
  }, [reaction, clearReaction]);

  // React to new page loads with a short comment
  useEffect(() => {
    if (!viewerContent || !isClient || !hydrated) return;
    // Deduplicate: skip if already reacted to this URL
    if (viewerContent.url === lastReactedUrl.current) return;
    lastReactedUrl.current = viewerContent.url;
    // Cooldown: avoid reacting too frequently
    const now = Date.now();
    if (now - lastPageReactionAt.current < PAGE_REACTION_COOLDOWN) return;
    // Short delay so loading/thinking animation settles first
    const timer = setTimeout(() => {
      // Don't interrupt active chat
      if (useChatStore.getState().isSending) return;
      lastPageReactionAt.current = Date.now();
      const ctx = viewerContent.type === 'youtube' ? 'page-youtube' : 'page-article';
      const currentParams = useAIProfileStore.getState().params;
      triggerReaction('happy', pickReactionMessage(ctx, currentParams));
    }, 800);
    return () => clearTimeout(timer);
  }, [viewerContent, isClient, hydrated, triggerReaction]);

  // Derive expression from app state
  const expression: CharacterExpression = (() => {
    if (isSending || isLoading) return 'thinking';
    if (reaction) return reaction.expression;
    if (greeting) return 'happy';
    return 'neutral';
  })();

  // Initialize size + position (only runs on client after mount)
  useEffect(() => {
    if (!isClient) return;
    const size = getCharacterSize();
    setCharSize(size); // eslint-disable-line react-hooks/set-state-in-effect -- syncs with window dimensions
    const home = getHomePosition();
    x.set(home.x);
    y.set(home.y);
    initialized.current = true;

    const handleResize = () => {
      setCharSize(getCharacterSize());
      if (!isDragging && !isSitting && isWandering.current) {
        const newHome = getHomePosition();
        x.set(newHome.x);
        y.set(newHome.y);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth walk animation
  const walkTo = useCallback(
    (targetX: number, targetY: number) => {
      if (currentAnimation.current) currentAnimation.current.stop();

      const currentX = x.get();
      const dx = targetX - currentX;
      if (Math.abs(dx) > 5) setFacingLeft(dx < 0);

      const distance = Math.sqrt(
        (targetX - currentX) ** 2 + (targetY - y.get()) ** 2,
      );
      const duration = Math.max(2, Math.min(5, distance / 80));

      setIsWalking(true);

      const animX = animate(x, targetX, {
        duration,
        ease: 'easeInOut',
        onComplete: () => setIsWalking(false),
      });
      const animY = animate(y, targetY, { duration, ease: 'easeInOut' });

      currentAnimation.current = {
        stop: () => {
          animX.stop();
          animY.stop();
          setIsWalking(false);
        },
      };
    },
    [x, y],
  );

  // Wandering
  const startWandering = useCallback(() => {
    if (wanderTimer.current) clearInterval(wanderTimer.current);
    if (!isDesktop() || !wanderMode) return;

    wanderTimer.current = setInterval(() => {
      if (!isWandering.current) return;
      const target = getRandomSafePosition();
      walkTo(target.x, target.y);
    }, 6000 + Math.random() * 4000);
  }, [wanderMode, walkTo]);

  useEffect(() => {
    if (!isClient || !hydrated || !initialized.current) return;

    if (isOpen || isMinimized || !wanderMode) {
      isWandering.current = false;
      if (wanderTimer.current) clearInterval(wanderTimer.current);
      if (currentAnimation.current) currentAnimation.current.stop();

      if (!isSitting) {
        const home = getHomePosition();
        walkTo(home.x, home.y); // eslint-disable-line react-hooks/set-state-in-effect -- syncs animation with motion values
      }
    } else {
      isWandering.current = true;
      setIsSitting(false);
      startWandering();
    }

    return () => {
      if (wanderTimer.current) clearInterval(wanderTimer.current);
    };
  }, [isClient, hydrated, isOpen, isMinimized, wanderMode, startWandering, walkTo, isSitting]);

  // Greeting (personality-aware)
  useEffect(() => {
    if (!isClient || !hydrated) return;
    const timer = setTimeout(() => {
      const currentParams = useAIProfileStore.getState().params;
      setGreeting(pickReactionMessage('greeting', currentParams));
    }, 1500);
    const hideTimer = setTimeout(() => setGreeting(null), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [isClient, hydrated]);

  // drag is only enabled after hydration so SSR and client initial render match
  const canDrag = hydrated && isDesktop();

  if (!isClient) return null;

  if (isMinimized) {
    return (
      <motion.button
        className="fixed bottom-5 right-5 z-50 rounded-full bg-primary p-3 text-white"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={() => setIsMinimized(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`${displayName}を表示`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>
    );
  }

  const charH = Math.round(charSize * 1.4);

  return (
    <motion.div
      className="fixed z-50"
      style={{
        x,
        y,
        width: charSize,
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
      }}
      drag={canDrag}
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => {
        setIsDragging(true);
        setIsSitting(false);
        isWandering.current = false;
        if (wanderTimer.current) clearInterval(wanderTimer.current);
        if (currentAnimation.current) currentAnimation.current.stop();
      }}
      onDragEnd={() => {
        setIsDragging(false);

        // Check for snap targets
        const snap = findSnapTarget(x.get(), y.get(), charSize, charH);
        if (snap) {
          animate(x, snap.x, { duration: 0.3, ease: 'easeOut' });
          animate(y, snap.y, { duration: 0.3, ease: 'easeOut' });
          setIsSitting(true);
          return;
        }

        // Resume wandering after delay
        setTimeout(() => {
          if (!isOpen && !isMinimized && wanderMode) {
            isWandering.current = true;
            startWandering();
          }
        }, 5000);
      }}
    >
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 w-[calc(100vw-2.5rem)] max-w-[400px]"
            style={{ bottom: charH + 16 }}
          >
            <ChatPanel
              onClose={() => setIsOpen(false)}
              onMinimize={() => {
                setIsOpen(false);
                setIsMinimized(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat bubble — reaction messages take priority over greeting */}
      <ChatBubble
        message={reaction?.message ?? greeting}
        visible={!isOpen && !!(reaction?.message || greeting)}
      />

      {/* Character */}
      <CharacterAvatar
        size={charSize}
        isThinking={isSending}
        isWalking={isWalking}
        expression={expression}
        isSitting={isSitting}
        facingLeft={facingLeft}
        onClick={() => {
          if (isDragging) return;
          setIsOpen(!isOpen);
          setGreeting(null);
        }}
      />
    </motion.div>
  );
}

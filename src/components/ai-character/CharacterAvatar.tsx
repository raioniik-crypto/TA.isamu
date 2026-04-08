'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface CharacterAvatarProps {
  size?: number;
  isThinking?: boolean;
  onClick?: () => void;
}

/**
 * Aimoのメインキャラクター画像
 * size は幅(px)。高さは 1.4 倍で縦長に表示。
 */
export function CharacterAvatar({
  size = 100,
  isThinking = false,
  onClick,
}: CharacterAvatarProps) {
  const h = Math.round(size * 1.4);

  return (
    <motion.button
      onClick={onClick}
      className="relative focus:outline-none select-none"
      style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.12))' }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      aria-label="AIキャラクター"
    >
      {/* 呼吸アニメーション */}
      <motion.div
        animate={
          isThinking
            ? { y: [0, -4, 4, 0], rotate: [0, -2, 2, 0] }
            : { y: [0, -6, 0] }
        }
        transition={
          isThinking
            ? { repeat: Infinity, duration: 1.4, ease: 'easeInOut' }
            : { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
        }
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
      </motion.div>

      {/* 考え中インジケーター */}
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
    </motion.button>
  );
}

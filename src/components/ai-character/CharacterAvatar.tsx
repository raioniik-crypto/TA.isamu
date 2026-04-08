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
 * public/characters/phil-default.png を表示する
 */
export function CharacterAvatar({
  size = 100,
  isThinking = false,
  onClick,
}: CharacterAvatarProps) {
  const h = size * 1.5;

  return (
    <motion.button
      onClick={onClick}
      className="relative focus:outline-none"
      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.10))' }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.93 }}
      aria-label="AIキャラクター"
    >
      {/* ゆるい浮遊 */}
      <motion.div
        animate={
          isThinking
            ? { y: [0, -3, 3, 0], rotate: [0, -1.5, 1.5, 0] }
            : { y: [0, -5, 0] }
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
          className="object-contain"
          style={{ width: size, height: h }}
          priority
        />
      </motion.div>

      {/* 考え中ドット */}
      {isThinking && (
        <motion.div
          className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-surface"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      )}
    </motion.button>
  );
}

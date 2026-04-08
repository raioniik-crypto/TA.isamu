'use client';

import { motion } from 'framer-motion';

interface CharacterAvatarProps {
  size?: number;
  isThinking?: boolean;
  onClick?: () => void;
}

/**
 * AIキャラクターのアバター（SVGベース）
 * 柔らかく親しみやすいデザイン
 */
export function CharacterAvatar({
  size = 56,
  isThinking = false,
  onClick,
}: CharacterAvatarProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative rounded-full focus:outline-none"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isThinking ? { rotate: [0, -3, 3, 0] } : {}}
      transition={
        isThinking
          ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
          : {}
      }
      aria-label="AIキャラクター"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 背景円 */}
        <circle cx="50" cy="50" r="48" fill="url(#avatarGradient)" />

        {/* 顔 */}
        <circle cx="50" cy="52" r="30" fill="white" opacity="0.9" />

        {/* 左目 */}
        <ellipse cx="40" cy="47" rx="4" ry="5" fill="#4338ca">
          <animate
            attributeName="ry"
            values="5;1;5"
            dur="3s"
            repeatCount="indefinite"
            begin="2s"
          />
        </ellipse>

        {/* 右目 */}
        <ellipse cx="60" cy="47" rx="4" ry="5" fill="#4338ca">
          <animate
            attributeName="ry"
            values="5;1;5"
            dur="3s"
            repeatCount="indefinite"
            begin="2s"
          />
        </ellipse>

        {/* 口 */}
        <path
          d="M42 58 Q50 65 58 58"
          stroke="#4338ca"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* ほっぺ */}
        <circle cx="33" cy="55" r="4" fill="#fca5a5" opacity="0.5" />
        <circle cx="67" cy="55" r="4" fill="#fca5a5" opacity="0.5" />

        {/* アンテナ */}
        <path
          d="M50 22 L50 12"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="50" cy="10" r="3" fill="#fbbf24">
          {isThinking && (
            <animate
              attributeName="r"
              values="3;5;3"
              dur="0.8s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        <defs>
          <linearGradient
            id="avatarGradient"
            x1="10"
            y1="10"
            x2="90"
            y2="90"
          >
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>

      {/* 考え中インジケーター */}
      {isThinking && (
        <motion.div
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      )}
    </motion.button>
  );
}

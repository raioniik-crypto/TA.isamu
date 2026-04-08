'use client';

import { motion } from 'framer-motion';

interface CharacterAvatarProps {
  size?: number;
  isThinking?: boolean;
  onClick?: () => void;
}

/**
 * Aimoの全身キャラクター（SVGベース）
 * 白い雪だるま体型 + 細い黒線の手足 + マットで柔らかい質感
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
        <svg
          width={size}
          height={h}
          viewBox="0 0 100 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ========== アンテナ ========== */}
          <line
            x1="50" y1="18" x2="50" y2="6"
            stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="50" cy="5" r="3.5" fill="#f5f5f5" stroke="#2d2d2d" strokeWidth="1.5">
            {isThinking && (
              <animate
                attributeName="fill"
                values="#f5f5f5;#fbbf24;#f5f5f5"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* ========== 頭 (上段) ========== */}
          <circle cx="50" cy="38" r="22" fill="#f5f5f5" stroke="#e8e8e8" strokeWidth="1" />
          {/* ハイライト */}
          <ellipse cx="44" cy="30" rx="8" ry="5" fill="white" opacity="0.5" />

          {/* 左目 */}
          <circle cx="42" cy="36" r="3" fill="#2d2d2d" />
          <circle cx="43" cy="34.5" r="1" fill="white" opacity="0.7" />

          {/* 右目 */}
          <circle cx="58" cy="36" r="3" fill="#2d2d2d" />
          <circle cx="59" cy="34.5" r="1" fill="white" opacity="0.7" />

          {/* 口 */}
          <path
            d="M44 44 Q50 50 56 44"
            stroke="#2d2d2d"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* ほっぺ */}
          <circle cx="34" cy="42" r="4" fill="#fca5a5" opacity="0.25" />
          <circle cx="66" cy="42" r="4" fill="#fca5a5" opacity="0.25" />

          {/* ========== ボディ (下段) ========== */}
          <circle cx="50" cy="80" r="28" fill="#f5f5f5" stroke="#e8e8e8" strokeWidth="1" />
          {/* ボディのハイライト */}
          <ellipse cx="42" cy="70" rx="10" ry="7" fill="white" opacity="0.45" />

          {/* ========== 左腕 ========== */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 28 70;6 28 70;0 28 70;-4 28 70;0 28 70"
              dur="4s"
              repeatCount="indefinite"
            />
            <line
              x1="26" y1="72" x2="10" y2="86"
              stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round"
            />
            <circle cx="9" cy="87" r="4" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1" />
          </g>

          {/* ========== 右腕 ========== */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 72 70;-6 72 70;0 72 70;4 72 70;0 72 70"
              dur="4s"
              repeatCount="indefinite"
              begin="0.6s"
            />
            <line
              x1="74" y1="72" x2="90" y2="86"
              stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round"
            />
            <circle cx="91" cy="87" r="4" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1" />
          </g>

          {/* ========== 左脚 ========== */}
          <line
            x1="40" y1="106" x2="36" y2="124"
            stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="36" cy="126" r="4.5" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1" />

          {/* ========== 右脚 ========== */}
          <line
            x1="60" y1="106" x2="64" y2="124"
            stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="64" cy="126" r="4.5" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1" />

          {/* ========== 足元の影 ========== */}
          <ellipse cx="50" cy="138" rx="22" ry="4" fill="#000" opacity="0.06">
            <animate
              attributeName="rx"
              values="22;18;22"
              dur="3.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.06;0.03;0.06"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </ellipse>
        </svg>
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

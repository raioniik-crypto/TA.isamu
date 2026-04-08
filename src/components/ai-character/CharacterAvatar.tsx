'use client';

import { motion } from 'framer-motion';

interface CharacterAvatarProps {
  size?: number;
  isThinking?: boolean;
  onClick?: () => void;
}

/**
 * Aimoの全身キャラクター（SVGベース）
 * 小型ロボット風の相棒デザイン
 */
export function CharacterAvatar({
  size = 120,
  isThinking = false,
  onClick,
}: CharacterAvatarProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative focus:outline-none"
      style={{ filter: 'drop-shadow(0 6px 20px rgba(99,102,241,0.3))' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.93 }}
      aria-label="AIキャラクター"
    >
      {/* ふわふわ浮遊アニメーション */}
      <motion.div
        animate={
          isThinking
            ? { y: [0, -3, 3, 0], rotate: [0, -2, 2, 0] }
            : { y: [0, -6, 0] }
        }
        transition={
          isThinking
            ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
            : { repeat: Infinity, duration: 3, ease: 'easeInOut' }
        }
      >
        <svg
          width={size}
          height={size * 1.35}
          viewBox="0 0 120 162"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* === アンテナ === */}
          <line
            x1="60" y1="22" x2="60" y2="8"
            stroke="#6366f1" strokeWidth="3" strokeLinecap="round"
          />
          <circle cx="60" cy="6" r="5" fill="#fbbf24">
            {isThinking && (
              <animate
                attributeName="r"
                values="5;7;5"
                dur="0.7s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* アンテナの光 */}
          {isThinking && (
            <circle cx="60" cy="6" r="9" fill="#fbbf24" opacity="0.25">
              <animate
                attributeName="r"
                values="9;14;9"
                dur="0.7s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.25;0.08;0.25"
                dur="0.7s"
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* === 頭部 === */}
          <ellipse cx="60" cy="48" rx="36" ry="32" fill="url(#headGrad)" />
          {/* 顔面 */}
          <ellipse cx="60" cy="50" rx="28" ry="25" fill="white" opacity="0.93" />

          {/* 左目 */}
          <ellipse cx="48" cy="46" rx="5" ry="6" fill="#4338ca">
            <animate
              attributeName="ry"
              values="6;1;6"
              dur="4s"
              repeatCount="indefinite"
              begin="2s"
            />
          </ellipse>
          <circle cx="49.5" cy="44" r="2" fill="white" opacity="0.8" />

          {/* 右目 */}
          <ellipse cx="72" cy="46" rx="5" ry="6" fill="#4338ca">
            <animate
              attributeName="ry"
              values="6;1;6"
              dur="4s"
              repeatCount="indefinite"
              begin="2s"
            />
          </ellipse>
          <circle cx="73.5" cy="44" r="2" fill="white" opacity="0.8" />

          {/* 口 */}
          <path
            d="M50 60 Q60 70 70 60"
            stroke="#4338ca"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* ほっぺ */}
          <circle cx="36" cy="56" r="5" fill="#fca5a5" opacity="0.35" />
          <circle cx="84" cy="56" r="5" fill="#fca5a5" opacity="0.35" />

          {/* === 胴体 === */}
          <path
            d="M38 78 Q38 72 48 72 L72 72 Q82 72 82 78 L80 108 Q80 114 72 114 L48 114 Q40 114 40 108 Z"
            fill="url(#bodyGrad)"
          />
          {/* ボディのハイライト */}
          <path
            d="M50 76 L70 76 Q74 76 74 80 L73 100 Q73 104 69 104 L51 104 Q47 104 47 100 L46 80 Q46 76 50 76Z"
            fill="white"
            opacity="0.12"
          />
          {/* 胸のライト */}
          <circle cx="60" cy="90" r="4" fill="#fbbf24" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.7;0.35;0.7"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="60" cy="90" r="2" fill="#fbbf24" />

          {/* === 左腕 === */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 38 82;8 38 82;0 38 82;-5 38 82;0 38 82"
              dur="4s"
              repeatCount="indefinite"
            />
            <path
              d="M38 82 L24 94"
              stroke="url(#bodyGrad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="22" cy="96" r="6" fill="url(#bodyGrad)" />
          </g>

          {/* === 右腕 === */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 82 82;-8 82 82;0 82 82;5 82 82;0 82 82"
              dur="4s"
              repeatCount="indefinite"
              begin="0.5s"
            />
            <path
              d="M82 82 L96 94"
              stroke="url(#bodyGrad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="98" cy="96" r="6" fill="url(#bodyGrad)" />
          </g>

          {/* === 足 === */}
          {/* 左足 */}
          <ellipse cx="50" cy="118" rx="10" ry="4" fill="url(#bodyGrad)" />
          <rect x="46" y="114" width="8" height="6" rx="2" fill="url(#bodyGrad)" />
          {/* 右足 */}
          <ellipse cx="70" cy="118" rx="10" ry="4" fill="url(#bodyGrad)" />
          <rect x="66" y="114" width="8" height="6" rx="2" fill="url(#bodyGrad)" />

          {/* === 足元の影 === */}
          <ellipse cx="60" cy="130" rx="30" ry="5" fill="#6366f1" opacity="0.08">
            <animate
              attributeName="rx"
              values="30;26;30"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.08;0.04;0.08"
              dur="3s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* === Gradient定義 === */}
          <defs>
            <linearGradient id="headGrad" x1="24" y1="16" x2="96" y2="80">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="bodyGrad" x1="38" y1="72" x2="82" y2="118">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* 考え中インジケーター */}
      {isThinking && (
        <motion.div
          className="absolute top-0 right-2 h-4 w-4 rounded-full bg-accent border-2 border-surface"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      )}
    </motion.button>
  );
}

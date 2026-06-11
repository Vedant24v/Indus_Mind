import React from "react"
import { motion } from "framer-motion"

export const GradientTracing = ({
  width,
  height,
  baseColor = "rgba(255, 255, 255, 0.2)",
  gradientColors = ["#3b82f6", "#60a5fa", "#3b82f6"],
  animationDuration = 2,
  strokeWidth = 2,
  path,
}) => {
  const defaultPath = `M0,${height / 2} L${width},${height / 2}`;
  const actualPath = path || defaultPath;
  const gradientId = `pulse-${Math.random().toString(36).substring(2, 11)}`;

  return (
    <div className="relative" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
      >
        <path
          d={actualPath}
          stroke={baseColor}
          strokeOpacity="0.2"
          strokeWidth={strokeWidth}
        />
        <path
          d={actualPath}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
        <defs>
          <motion.linearGradient
            animate={{
              x1: [0, width * 2],
              x2: [0, width],
            }}
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              ease: "linear",
            }}
            id={gradientId}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={gradientColors[0]} stopOpacity="0" />
            <stop stopColor={gradientColors[1]} />
            <stop offset="1" stopColor={gradientColors[2]} stopOpacity="0" />
          </motion.linearGradient>
        </defs>
      </svg>
    </div>
  )
}

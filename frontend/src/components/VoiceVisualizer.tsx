import React from 'react'
import { motion } from 'framer-motion'

interface VoiceVisualizerProps {
  audioLevel: number
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ audioLevel }) => {
  const bars = 5
  
  return (
    <div className="voice-visualizer">
      <div className="visualizer-bars">
        {Array.from({ length: bars }).map((_, index) => {
          const delay = index * 0.05
          const height = Math.max(0.2, audioLevel * (1 - index * 0.1))
          
          return (
            <motion.div
              key={index}
              className="visualizer-bar"
              animate={{
                scaleY: height,
              }}
              transition={{
                duration: 0.1,
                delay,
                ease: 'easeOut',
              }}
            />
          )
        })}
      </div>
      
      <div className="audio-level-text">
        Audio Level: {Math.round(audioLevel * 100)}%
      </div>

      <style>{`
        .voice-visualizer {
          margin-top: 1.5rem;
          padding: 1rem;
          background-color: rgba(15, 23, 42, 0.5);
          border-radius: 0.5rem;
        }

        .visualizer-bars {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 0.5rem;
          height: 3rem;
        }

        .visualizer-bar {
          width: 0.5rem;
          background-color: var(--primary-color);
          border-radius: 0.25rem;
          transform-origin: bottom;
        }

        .audio-level-text {
          text-align: center;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

export default VoiceVisualizer
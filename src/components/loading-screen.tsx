'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export function LoadingScreen({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center gap-6"
      >
        <div className="relative">
            <motion.div
            animate={{
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 1.5,
                ease: 'easeInOut',
                repeat: Infinity,
            }}
            >
            <Heart className="h-20 w-20 text-primary" fill="currentColor" />
            </motion.div>
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
            {text || "Setting things up for you..."}
        </p>
      </motion.div>
    </div>
  );
}

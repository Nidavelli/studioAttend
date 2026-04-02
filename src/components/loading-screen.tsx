'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Card } from './ui/card';
import { useEffect, useState } from 'react';

export function LoadingScreen({ text }: { text?: string }) {
  const [dynamicText, setDynamicText] = useState(text || "Setting things up for you...");
  const loadingTexts = [
    "Preparing your dashboard...",
    "Syncing your data...",
    "Almost ready...",
    "Finalizing details..."
  ];

  useEffect(() => {
    setDynamicText(text || "Setting things up for you...");
    
    // Cycle through messages if it's a generic loading state
    if (!text) {
        const interval = setInterval(() => {
            setDynamicText(prev => {
                const currentIndex = loadingTexts.indexOf(prev);
                const nextIndex = (currentIndex + 1) % loadingTexts.length;
                return loadingTexts[nextIndex];
            });
        }, 2000);
        return () => clearInterval(interval);
    }
  }, [text]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-8 max-w-sm w-full">
            <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative flex items-center justify-center h-20 w-20">
                    {/* Outer glow/ripple */}
                    <motion.div
                        className="absolute h-full w-full rounded-full bg-primary/30"
                        animate={{
                            scale: [1, 1.8, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            ease: 'easeInOut',
                            repeat: Infinity,
                        }}
                    />
                    {/* Heart Icon */}
                    <motion.div
                        animate={{
                            scale: [1, 1.25, 1],
                            filter: ['drop-shadow(0 0 0.5rem hsl(var(--primary) / 0.3))', 'drop-shadow(0 0 1.5rem hsl(var(--primary) / 0.5))', 'drop-shadow(0 0 0.5rem hsl(var(--primary) / 0.3))'],
                        }}
                        transition={{
                            duration: 1.5,
                            ease: 'easeInOut',
                            repeat: Infinity,
                        }}
                    >
                        <Heart className="h-16 w-16 text-primary" fill="currentColor" />
                    </motion.div>
                </div>
                <p className="text-lg font-medium text-muted-foreground text-center">
                    {dynamicText}
                </p>
            </div>
        </Card>
      </motion.div>
    </div>
  );
}

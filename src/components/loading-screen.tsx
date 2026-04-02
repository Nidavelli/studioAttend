'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Card } from './ui/card';

export function LoadingScreen({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-8 max-w-sm w-full">
            <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative">
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
                        <Heart className="h-20 w-20 text-primary" fill="currentColor" />
                    </motion.div>
                </div>
                <p className="text-lg font-medium text-muted-foreground animate-pulse text-center">
                    {text || "Setting things up for you..."}
                </p>
            </div>
        </Card>
      </motion.div>
    </div>
  );
}

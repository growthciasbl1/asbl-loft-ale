'use client';

import { motion } from 'framer-motion';

export default function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-white/20 border-t-highlight rounded-full"
      />
    </div>
  );
}

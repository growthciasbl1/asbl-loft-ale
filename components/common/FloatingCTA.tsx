'use client';

import { motion } from 'framer-motion';

export default function FloatingCTA() {
  return (
    <motion.a
      href="https://wa.me/919999999999"
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-6 py-4 bg-green-500 hover:bg-green-600 rounded-full shadow-2xl font-semibold text-white"
    >
      <span className="text-xl">💬</span>
      Chat on WhatsApp
    </motion.a>
  );
}

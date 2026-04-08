'use client';

import { motion } from 'framer-motion';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-6 text-2xl font-bold text-foreground">設定</h1>
        <SettingsForm />
      </motion.div>
    </div>
  );
}

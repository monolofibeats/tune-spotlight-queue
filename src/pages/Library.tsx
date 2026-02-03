import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { StreamLibrary } from '@/components/StreamLibrary';
import { ClipsGallery, Clip } from '@/components/ClipCreator';
import { ClipViewer } from '@/components/ClipViewer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AnimatePresence } from 'framer-motion';

const Library = () => {
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <StreamLibrary />
            <ClipsGallery onClipSelect={setSelectedClip} />
          </motion.div>
        </div>
      </main>

      <LanguageSwitcher />

      <AnimatePresence>
        {selectedClip && (
          <ClipViewer clip={selectedClip} onClose={() => setSelectedClip(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;

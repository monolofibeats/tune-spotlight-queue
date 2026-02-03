import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { StreamLibrary } from '@/components/StreamLibrary';
import { ClipsGallery } from '@/components/ClipCreator';

const Library = () => {
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
            <ClipsGallery />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Library;

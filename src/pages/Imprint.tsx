 import { Header } from '@/components/Header';
 import { Footer } from '@/components/Footer';
 import { motion } from 'framer-motion';
 import { ArrowLeft } from 'lucide-react';
 import { Link } from 'react-router-dom';
 
 const Imprint = () => {
   return (
     <div className="min-h-screen bg-background flex flex-col">
       <Header />
       
       <main className="flex-1 pt-24 pb-16 px-4">
         <div className="container mx-auto max-w-2xl">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
           >
             <Link 
               to="/" 
               className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
             >
               <ArrowLeft className="w-4 h-4" />
               Back to Home
             </Link>
             
             <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
               Imprint
             </h1>
             
             <div className="space-y-6 text-muted-foreground">
               <div>
                 <p className="text-foreground font-medium">reverie network</p>
                 <p>Schleswiger Str. 12</p>
                 <p>39122 Magdeburg, Germany</p>
               </div>
               
               <div>
                 <p className="text-foreground font-medium">VAT ID</p>
                 <p>USt-ID: DE366434046</p>
               </div>
               
               <div>
                 <p className="text-foreground font-medium">Contact</p>
                 <p>
                   <a 
                     href="mailto:info@reverienet.com" 
                     className="hover:text-primary transition-colors"
                   >
                     info@reverienet.com
                   </a>
                 </p>
                 <p>
                   <a 
                     href="tel:+4917647199071" 
                     className="hover:text-primary transition-colors"
                   >
                     +49 176 47199071
                   </a>
                 </p>
               </div>
             </div>
           </motion.div>
         </div>
       </main>
       
       <Footer />
     </div>
   );
 };
 
 export default Imprint;
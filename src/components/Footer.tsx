 import { Link } from 'react-router-dom';
 
 export function Footer() {
   return (
     <footer className="border-t border-border/50 bg-card/30 py-6 px-4">
       <div className="container mx-auto max-w-5xl flex justify-center">
         <Link 
           to="/imprint" 
           className="text-sm text-muted-foreground hover:text-primary transition-colors"
         >
           Imprint
         </Link>
       </div>
     </footer>
   );
 }
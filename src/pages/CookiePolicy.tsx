import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookiePolicy = () => {
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
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Cookie Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: 10.02.2026</p>

            <div className="space-y-8 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies?</h2>
                <p>Cookies are small text files stored on your device when you visit a website. They help ensure basic functionality, improve user experience, and remember preferences.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. How UpStar Uses Cookies</h2>
                <p className="mb-2">UpStar uses essential cookies and similar technologies to operate the platform properly. These cookies may be used for purposes such as:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Maintaining sessions and login status</li>
                  <li>Remembering user preferences (e.g. language or interface settings)</li>
                  <li>Temporarily storing form inputs or submissions</li>
                  <li>Ensuring platform security and stability</li>
                  <li>Supporting basic usage analysis related to platform functionality</li>
                </ul>
                <p className="mt-2">These cookies are strictly necessary for the platform to work.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Analytics & Platform Functionality</h2>
                <p>UpStar may process basic, non-intrusive usage information to understand how the platform is used (e.g. feature usage, login activity, submission counts). This information is used only to improve platform performance and functionality and is not used for advertising or cross-site tracking.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Advertising & Tracking</h2>
                <p>UpStar does not use advertising cookies, retargeting technologies, or third-party ad tracking systems. We do not sell or share personal data for advertising purposes.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Services</h2>
                <p>Some features of UpStar may involve third-party services (such as authentication providers or embedded content). These services may set their own cookies in accordance with their respective privacy policies. UpStar does not control third-party cookies.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Managing Cookies</h2>
                <p>You can control or delete cookies through your browser settings at any time. Please note that disabling cookies may limit certain platform features or functionality.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Changes to This Policy</h2>
                <p>This Cookie Policy may be updated if platform features or legal requirements change. The latest version will always be available on the UpStar website.</p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;

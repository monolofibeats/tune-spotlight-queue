import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
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

            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: 10.02.2026</p>

            <div className="space-y-8 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
                <p>UpStar is a digital platform operated by Reverie Network (sole proprietor: Jakob Düsterhöft). UpStar provides interactive features related to live content, music, media, and community interaction. This Privacy Policy explains how we collect, use, and protect personal data when you use the platform.</p>
                <p className="mt-2">Contact: <a href="mailto:info@reverienet.com" className="hover:text-primary transition-colors">info@reverienet.com</a></p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Data We May Collect</h2>
                <p className="mb-3">Depending on how you interact with the platform, we may collect the following categories of data:</p>
                <h3 className="text-foreground font-medium mb-2">a) User & Account Information</h3>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  <li>Email address</li>
                  <li>Username or display name</li>
                  <li>Authentication data (including email/password or third-party login providers)</li>
                  <li>Account-related metadata generated through platform usage or transactions</li>
                </ul>
                <h3 className="text-foreground font-medium mb-2">b) Content & Interaction Data</h3>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  <li>Media files, links, or other content submitted by users</li>
                  <li>Messages, feedback, or interactions within the platform</li>
                  <li>Information voluntarily provided during participation in features, streams, or reviews</li>
                </ul>
                <h3 className="text-foreground font-medium mb-2">c) Technical & Usage Data</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>IP address</li>
                  <li>Device and browser information</li>
                  <li>Log files, timestamps, and interaction data</li>
                  <li>General usage patterns and feature interactions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Cookies, Local Storage & Similar Technologies</h2>
                <p>UpStar uses essential cookies, local storage, and similar technologies to ensure core platform functionality, including but not limited to remembering user preferences and settings.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. How We Use Personal Data</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Operating, maintaining, and improving the platform</li>
                  <li>Enabling interactive and live features</li>
                  <li>Managing user accounts and access</li>
                  <li>Processing transactions or service-related actions</li>
                  <li>Ensuring security, fraud prevention, and platform integrity</li>
                  <li>Communicating important service-related information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Services & Integrations</h2>
                <p className="mb-2">UpStar may use third-party services to support platform functionality. This may include, but is not limited to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hosting and infrastructure providers</li>
                  <li>Authentication, database, and communication services</li>
                  <li>Payment and transaction processors</li>
                  <li>Media, audio, or content processing services</li>
                  <li>Embedded or connected third-party platforms (e.g. live streaming or social platforms)</li>
                </ul>
                <p className="mt-2">Each third-party service operates under its own privacy policy.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Advertising, Promotion & Platform Content</h2>
                <p>UpStar may promote its own services, content, or features within the platform or during live interactions. We do not sell personal data to third parties. Any promotional activity is platform-related and does not involve unauthorized data sharing.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. International Data Processing</h2>
                <p>UpStar is accessible globally. Personal data may be processed in countries outside your country of residence. We take reasonable measures to protect personal data regardless of where it is processed.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Data Retention</h2>
                <p>Personal data is retained only as long as necessary to fulfill the purposes outlined in this policy or to comply with legal obligations. Users may request deletion of their personal data, subject to legal or operational requirements.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. User Rights</h2>
                <p className="mb-2">Depending on applicable laws, users may have the right to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Access personal data</li>
                  <li>Request correction or deletion</li>
                  <li>Object to or restrict certain processing activities</li>
                </ul>
                <p className="mt-2">Requests can be submitted to <a href="mailto:info@reverienet.com" className="hover:text-primary transition-colors">info@reverienet.com</a>.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Updates to This Policy</h2>
                <p>This Privacy Policy may be updated from time to time to reflect platform changes or legal requirements. The current version will always be available on the UpStar website.</p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;

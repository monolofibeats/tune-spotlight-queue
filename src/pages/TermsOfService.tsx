import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
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

            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: 10.02.2026</p>

            <div className="space-y-8 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
                <p>UpStar is an interactive digital platform operated by Reverie Network (sole proprietor: Jakob Düsterhöft). UpStar provides live streaming, music and media review features, community interaction, and related services. The platform may evolve over time and introduce new features.</p>
                <p className="mt-2">By accessing or using UpStar, you agree to these Terms of Service.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Eligibility & Age Requirements</h2>
                <p>UpStar is generally accessible to all users. Some streams or content may be intended for mature audiences (18+), including the use of explicit language or themes. By accessing such content, users confirm that they meet the applicable age requirements and agree to view it voluntarily.</p>
                <p className="mt-2">UpStar does not allow explicit or pornographic content.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts & Participation</h2>
                <p className="mb-2">Users may:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Create accounts manually or via third-party login providers</li>
                  <li>Have accounts created automatically after purchasing platform services</li>
                  <li>Participate anonymously in certain features</li>
                </ul>
                <p className="mt-2">Users are responsible for maintaining the security of their accounts.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. User Content & Responsibility</h2>
                <p className="mb-2">Users may submit content, including but not limited to music files, links, messages or other media.</p>
                <p className="mb-2 text-foreground font-medium">Important:</p>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Users confirm that they own or have the necessary rights to submit any content.</li>
                  <li>Users are solely responsible for the content they submit.</li>
                  <li>UpStar does not verify ownership or legality of submitted content.</li>
                </ul>
                <p>UpStar is not responsible for copyright violations by users, inappropriate or unexpected content submitted by users, or consequences resulting from user-submitted content.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Live Streams, Reviews & Opinions</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Reviews, ratings, and feedback provided on UpStar are subjective opinions.</li>
                  <li>No guarantees are made regarding fairness, accuracy, exposure, promotion, or outcomes.</li>
                  <li>Participation does not guarantee positive feedback, visibility, or success.</li>
                </ul>
                <p className="mt-2">UpStar is an entertainment platform, not a professional evaluation or career service.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Content Use & Recording</h2>
                <p className="mb-2">By submitting content, users grant UpStar a non-exclusive, limited right to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Play, display, or review the content live on the platform</li>
                  <li>Use the content for platform-related features</li>
                </ul>
                <p className="mt-2">Any use of content outside the platform (e.g. promotional clips) may require additional consent. UpStar is not responsible for third parties recording, clipping, or sharing live streams.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Paid Features & Payments</h2>
                <p className="mb-2">UpStar may offer paid features, including but not limited to priority placement, submission-related services, and platform-specific enhancements.</p>
                <p className="mb-2">Payments are non-refundable once a service has been initiated or fulfilled, including when:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>A song is reviewed</li>
                  <li>A submission is skipped due to streamer preference</li>
                  <li>The service outcome does not meet user expectations</li>
                </ul>
                <p className="mt-2">Refunds may only be considered if a paid service is not provided at all.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Moderation & Enforcement</h2>
                <p className="mb-2">UpStar reserves the right to remove or restrict content, skip submissions, moderate interactions, suspend or ban users, and modify or end streams. These actions may be taken at UpStar's sole discretion, with or without prior notice.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
                <p className="mb-2">Use of UpStar is at your own risk. UpStar is not liable for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Loss of data, income, or opportunities</li>
                  <li>Emotional distress or reputational harm</li>
                  <li>Career or promotional outcomes</li>
                  <li>User-generated content or opinions expressed on the platform</li>
                </ul>
                <p className="mt-2">To the maximum extent permitted by law, all liability is excluded.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to the Service</h2>
                <p>UpStar may modify, suspend, or discontinue features at any time. These Terms may be updated to reflect platform changes. Continued use of the platform constitutes acceptance of updated Terms.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">11. Governing Law</h2>
                <p>These Terms are governed by applicable laws, without regard to conflict-of-law principles.</p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const footerLinks = {
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'FAQs', href: '/#faq' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Docs', href: '/docs' },
      { label: 'Support', href: '/support' },
    ],
  },
  about: {
    title: 'About',
    links: [
      { label: 'Imprint', href: '/imprint' },
    ],
  },
  socials: {
    title: 'Socials',
    links: [
      { label: 'Instagram', href: 'https://www.instagram.com/mosi039/', external: true },
      { label: 'TikTok', href: 'https://www.tiktok.com/@mosi391', external: true },
      { label: 'Twitch', href: 'https://www.twitch.tv/', external: true },
      { label: 'Youtube', href: 'https://www.youtube.com/@UpStargg', external: true },
    ],
  },
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-12 px-4 relative z-10">
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {Object.entries(footerLinks).map(([key, section], sectionIndex) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <h4 className="font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={link.label}>
                    {link.external ? (
                      <motion.a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {link.label}
                      </motion.a>
                    ) : (
                      <Link to={link.href}>
                        <motion.span
                          className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block"
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {link.label}
                        </motion.span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        
        <div className="border-t border-border/30 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} UpStar. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

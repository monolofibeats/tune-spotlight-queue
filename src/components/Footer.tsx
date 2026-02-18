import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

export function Footer() {
  const { t } = useLanguage();

  const footerLinks = {
    legal: {
      title: t('footer.legal'),
      links: [
        { label: t('footer.privacyPolicy'), href: '/privacy' },
        { label: t('footer.termsOfService'), href: '/terms' },
        { label: t('footer.cookiePolicy'), href: '/cookies' },
      ],
    },
    about: {
      title: t('footer.about'),
      links: [
        { label: t('footer.imprint'), href: '/imprint' },
      ],
    },
    socials: {
      title: t('footer.socials'),
      links: [
        { label: 'Instagram', href: 'https://www.instagram.com/mosi039/', external: true },
        { label: 'TikTok', href: 'https://www.tiktok.com/@mosi391', external: true },
        { label: 'Twitch', href: 'https://www.twitch.tv/', external: true },
        { label: 'Youtube', href: 'https://www.youtube.com/@UpStargg', external: true },
      ],
    },
  };

  return (
    <footer className="border-t border-border/50 bg-card/30 py-12 px-4 relative z-10">
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
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
                {section.links.map((link) => (
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
            © {new Date().getFullYear()} UpStar. {t('footer.allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}

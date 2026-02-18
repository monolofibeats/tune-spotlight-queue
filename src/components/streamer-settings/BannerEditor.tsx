import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flag, 
  Link2, 
  Type,
  Palette,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

interface BannerSettings {
  bannerEnabled: boolean;
  bannerText: string;
  bannerLink: string;
  bannerColor: string;
}

interface BannerEditorProps {
  settings: BannerSettings;
  onChange: (settings: Partial<BannerSettings>) => void;
}

const BANNER_COLORS = [
  { label: 'Gold', value: '45 90% 50%' },
  { label: 'Green', value: '142 76% 36%' },
  { label: 'Blue', value: '217 91% 60%' },
  { label: 'Purple', value: '270 76% 60%' },
  { label: 'Pink', value: '330 80% 60%' },
  { label: 'Red', value: '0 72% 51%' },
];

export function BannerEditor({ settings, onChange }: BannerEditorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="w-5 h-5" />
                {t('banner.title')}
              </CardTitle>
              <CardDescription>{t('banner.desc')}</CardDescription>
            </div>
            <Switch
              checked={settings.bannerEnabled}
              onCheckedChange={(checked) => onChange({ bannerEnabled: checked })}
            />
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {settings.bannerEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="space-y-6 pt-0">
                <div 
                  className="p-3 rounded-lg text-center font-medium text-sm"
                  style={{ 
                    backgroundColor: `hsl(${settings.bannerColor} / 0.2)`,
                    borderColor: `hsl(${settings.bannerColor})`,
                    borderWidth: 1,
                    color: `hsl(${settings.bannerColor})`
                  }}
                >
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  {settings.bannerText || t('banner.previewText')}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bannerText" className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      {t('banner.textLabel')}
                    </Label>
                    <Input
                      id="bannerText"
                      value={settings.bannerText}
                      onChange={(e) => onChange({ bannerText: e.target.value })}
                      placeholder={t('banner.textPlaceholder')}
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      {settings.bannerText?.length || 0}/100
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerLink" className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      {t('banner.linkLabel')}
                    </Label>
                    <Input
                      id="bannerLink"
                      value={settings.bannerLink}
                      onChange={(e) => onChange({ bannerLink: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      {t('banner.colorLabel')}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {BANNER_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => onChange({ bannerColor: color.value })}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            settings.bannerColor === color.value
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: `hsl(${color.value})` }}
                          title={color.label}
                        />
                      ))}
                    </div>
                    <Input
                      value={settings.bannerColor}
                      onChange={(e) => onChange({ bannerColor: e.target.value })}
                      placeholder="45 90% 50%"
                      className="font-mono mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

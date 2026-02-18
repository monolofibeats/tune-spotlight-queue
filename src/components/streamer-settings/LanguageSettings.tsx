import { 
  Globe, 
  Check
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSettingsProps {
  language: string;
  onChange: (language: string) => void;
}

const LANGUAGES = [
  { 
    value: 'de', 
    label: 'Deutsch', 
    nativeLabel: 'German',
    flag: '🇩🇪' 
  },
  { 
    value: 'en', 
    label: 'English', 
    nativeLabel: 'English',
    flag: '🇬🇧' 
  },
];

export function LanguageSettings({ language, onChange }: LanguageSettingsProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('langSettings.title')}
          </CardTitle>
          <CardDescription>
            {t('langSettings.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={language}
            onValueChange={onChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {LANGUAGES.map((lang) => (
              <Label
                key={lang.value}
                htmlFor={`lang-${lang.value}`}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  language === lang.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem 
                  value={lang.value} 
                  id={`lang-${lang.value}`}
                  className="sr-only"
                />
                <span className="text-3xl">{lang.flag}</span>
                <div className="flex-1">
                  <p className="font-medium">{lang.label}</p>
                  <p className="text-sm text-muted-foreground">{lang.nativeLabel}</p>
                </div>
                {language === lang.value && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-border/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> {t('langSettings.note')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

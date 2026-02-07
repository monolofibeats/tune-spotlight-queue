import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Type, 
  Square, 
  Image as ImageIcon,
  Sparkles,
  Layers,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DesignSettings {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  buttonStyle: string;
  backgroundType: string;
  backgroundImageUrl: string;
  backgroundGradient: string;
  animationStyle: string;
  cardStyle: string;
}

interface DesignCustomizerProps {
  settings: DesignSettings;
  onChange: (settings: Partial<DesignSettings>) => void;
}

const FONT_OPTIONS = [
  { value: 'system', label: 'System Default', preview: 'font-sans' },
  { value: 'inter', label: 'Inter', preview: 'font-sans' },
  { value: 'poppins', label: 'Poppins', preview: 'font-sans' },
  { value: 'space-grotesk', label: 'Space Grotesk', preview: 'font-display' },
  { value: 'playfair', label: 'Playfair Display', preview: 'font-serif' },
  { value: 'jetbrains-mono', label: 'JetBrains Mono', preview: 'font-mono' },
];

const BUTTON_STYLES = [
  { value: 'rounded', label: 'Rounded', className: 'rounded-lg' },
  { value: 'pill', label: 'Pill', className: 'rounded-full' },
  { value: 'sharp', label: 'Sharp', className: 'rounded-none' },
  { value: 'soft', label: 'Soft', className: 'rounded-xl' },
];

const ANIMATION_STYLES = [
  { value: 'none', label: 'None', description: 'No animations' },
  { value: 'subtle', label: 'Subtle', description: 'Gentle fade and slide effects' },
  { value: 'playful', label: 'Playful', description: 'Bouncy, energetic animations' },
  { value: 'elegant', label: 'Elegant', description: 'Smooth, sophisticated transitions' },
];

const CARD_STYLES = [
  { value: 'glass', label: 'Glassmorphism', className: 'bg-card/50 backdrop-blur border-border/50' },
  { value: 'solid', label: 'Solid', className: 'bg-card border-border' },
  { value: 'outlined', label: 'Outlined', className: 'bg-transparent border-2 border-border' },
  { value: 'gradient', label: 'Gradient', className: 'bg-gradient-to-br from-card to-muted border-border/50' },
];

const PRESET_GRADIENTS = [
  { value: 'none', label: 'None', gradient: '' },
  { value: 'sunset', label: 'Sunset', gradient: 'linear-gradient(135deg, hsl(20 90% 50%), hsl(340 80% 50%))' },
  { value: 'ocean', label: 'Ocean', gradient: 'linear-gradient(135deg, hsl(200 80% 40%), hsl(220 80% 30%))' },
  { value: 'forest', label: 'Forest', gradient: 'linear-gradient(135deg, hsl(140 60% 30%), hsl(160 70% 25%))' },
  { value: 'purple', label: 'Purple Haze', gradient: 'linear-gradient(135deg, hsl(270 70% 40%), hsl(290 60% 30%))' },
  { value: 'gold', label: 'Gold', gradient: 'linear-gradient(135deg, hsl(45 90% 50%), hsl(35 80% 40%))' },
];

const COLOR_PRESETS = [
  { label: 'Gold', value: '45 90% 50%' },
  { label: 'Green', value: '142 76% 36%' },
  { label: 'Blue', value: '217 91% 60%' },
  { label: 'Purple', value: '270 76% 60%' },
  { label: 'Pink', value: '330 80% 60%' },
  { label: 'Red', value: '0 72% 51%' },
  { label: 'Orange', value: '25 95% 53%' },
  { label: 'Cyan', value: '185 84% 45%' },
];

export function DesignCustomizer({ settings, onChange }: DesignCustomizerProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList className="glass p-1 rounded-xl w-full grid grid-cols-4">
          <TabsTrigger value="colors" className="gap-2 rounded-lg">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Colors</span>
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2 rounded-lg">
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">Typography</span>
          </TabsTrigger>
          <TabsTrigger value="background" className="gap-2 rounded-lg">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Background</span>
          </TabsTrigger>
          <TabsTrigger value="effects" className="gap-2 rounded-lg">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Effects</span>
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Brand Colors</CardTitle>
              <CardDescription>Choose your primary and accent colors (HSL format)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Primary Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => onChange({ primaryColor: preset.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        settings.primaryColor === preset.value 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: `hsl(${preset.value})` }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => onChange({ primaryColor: e.target.value })}
                  placeholder="45 90% 50%"
                  className="font-mono"
                />
                <div 
                  className="h-12 rounded-lg border border-border"
                  style={{ backgroundColor: `hsl(${settings.primaryColor})` }}
                />
              </div>

              <div className="space-y-3">
                <Label>Accent Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => onChange({ accentColor: preset.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        settings.accentColor === preset.value 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: `hsl(${preset.value})` }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <Input
                  value={settings.accentColor}
                  onChange={(e) => onChange({ accentColor: e.target.value })}
                  placeholder="45 90% 50%"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Font Family</CardTitle>
              <CardDescription>Choose the primary font for your page</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.fontFamily}
                onValueChange={(value) => onChange({ fontFamily: value })}
                className="grid grid-cols-2 md:grid-cols-3 gap-3"
              >
                {FONT_OPTIONS.map((font) => (
                  <Label
                    key={font.value}
                    htmlFor={font.value}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      settings.fontFamily === font.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={font.value} id={font.value} />
                    <span className={font.preview}>{font.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Button Style</CardTitle>
              <CardDescription>Choose the shape of buttons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BUTTON_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => onChange({ buttonStyle: style.value })}
                    className={`p-4 border transition-all ${style.className} ${
                      settings.buttonStyle === style.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`h-8 bg-primary/20 ${style.className}`} />
                    <span className="text-sm mt-2 block">{style.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Background Tab */}
        <TabsContent value="background" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Background Type</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.backgroundType}
                onValueChange={(value) => onChange({ backgroundType: value })}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="bg-solid"
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    settings.backgroundType === 'solid'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="solid" id="bg-solid" />
                  <Square className="w-8 h-8" />
                  <span className="text-sm">Solid</span>
                </Label>
                <Label
                  htmlFor="bg-gradient"
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    settings.backgroundType === 'gradient'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="gradient" id="bg-gradient" />
                  <Layers className="w-8 h-8" />
                  <span className="text-sm">Gradient</span>
                </Label>
                <Label
                  htmlFor="bg-image"
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                    settings.backgroundType === 'image'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="image" id="bg-image" />
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">Image</span>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {settings.backgroundType === 'gradient' && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Gradient Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {PRESET_GRADIENTS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => onChange({ backgroundGradient: preset.gradient })}
                      className={`h-16 rounded-lg border-2 transition-all ${
                        settings.backgroundGradient === preset.gradient
                          ? 'border-foreground scale-105'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ 
                        background: preset.gradient || 'hsl(var(--background))',
                      }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Custom Gradient CSS</Label>
                  <Input
                    value={settings.backgroundGradient}
                    onChange={(e) => onChange({ backgroundGradient: e.target.value })}
                    placeholder="linear-gradient(135deg, #color1, #color2)"
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {settings.backgroundType === 'image' && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Background Image</CardTitle>
                <CardDescription>Enter a URL or upload an image</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={settings.backgroundImageUrl}
                  onChange={(e) => onChange({ backgroundImageUrl: e.target.value })}
                  placeholder="https://..."
                />
                {settings.backgroundImageUrl && (
                  <div 
                    className="h-32 rounded-lg bg-cover bg-center border border-border"
                    style={{ backgroundImage: `url(${settings.backgroundImageUrl})` }}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Effects Tab */}
        <TabsContent value="effects" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Animation Style</CardTitle>
              <CardDescription>Control how elements animate on your page</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.animationStyle}
                onValueChange={(value) => onChange({ animationStyle: value })}
                className="grid grid-cols-2 gap-3"
              >
                {ANIMATION_STYLES.map((style) => (
                  <Label
                    key={style.value}
                    htmlFor={`anim-${style.value}`}
                    className={`flex flex-col gap-1 p-4 rounded-lg border cursor-pointer transition-all ${
                      settings.animationStyle === style.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={style.value} id={`anim-${style.value}`} />
                      <span className="font-medium">{style.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-6">{style.description}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Card Style</CardTitle>
              <CardDescription>Choose the appearance of content cards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CARD_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => onChange({ cardStyle: style.value })}
                    className={`p-4 rounded-lg transition-all ${style.className} ${
                      settings.cardStyle === style.value
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                  >
                    <div className="h-12 rounded border border-border/50" />
                    <span className="text-sm mt-2 block">{style.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

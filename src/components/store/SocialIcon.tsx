import { Facebook, Globe, Instagram, Linkedin, MessageCircle, Twitter, Youtube, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

export const SOCIAL_PLATFORMS: { value: string; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Website' },
];

const ICONS: Record<string, ComponentType<LucideProps>> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  website: Globe,
};

export default function SocialIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  const Icon = ICONS[platform.toLowerCase()] || Globe;
  return <Icon size={size} aria-hidden="true" />;
}

export const socialLabel = (platform: string) => SOCIAL_PLATFORMS.find((p) => p.value === platform.toLowerCase())?.label || platform;

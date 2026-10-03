import {
  LayoutDashboard, Heart, Sparkles, CalendarDays, MessageCircle, UploadCloud, Wallet, BookOpen, ShieldCheck, UserRound, Settings,
  Bell, CalendarCheck, ShieldAlert, RefreshCw, Film, Images, LifeBuoy, FileText, Users, ClipboardList, CreditCard, Camera, Video, Package,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  LayoutDashboard, Heart, Sparkles, CalendarDays, MessageCircle, UploadCloud, Wallet, BookOpen, ShieldCheck, UserRound, Settings,
  Bell, CalendarCheck, ShieldAlert, RefreshCw, Film, Images, LifeBuoy, FileText, Users, ClipboardList, CreditCard, Camera, Video, Package,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof ICONS;

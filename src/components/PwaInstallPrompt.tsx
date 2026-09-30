import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  X,
  Bell,
  CheckCircle2,
  Share,
  PlusSquare,
  Sparkles
} from 'lucide-react';
import { ModalShell } from './ModalShell';

interface PwaInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Notification permission check
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsGranted(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    }
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotificationsGranted(true);
        new Notification('خريطة المصانع المصرية 🏭', {
          body: 'تم تفعيل إشعارات المناقصات والطلبات الفورية بنجاح!',
          icon: '/favicon.ico',
        });
      }
    }
  };

  return (
    <ModalShell id="pwa-install" open={isOpen} onClose={onClose} rootClassName="p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Icon */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-100">
              تثبيت التطبيق على الهاتف (PWA)
            </h3>
            <p className="text-xs text-slate-400">
              استخدم المنصة كتطبيق أصلي سريع بدون الحاجة لمتجر التطبيقات
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="space-y-2.5 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>تشغيل فوري بملء الشاشة مع أيقونة على شاشة هاتفك الرئيسية</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>تنبيهات فورية عند وصول طلبات تسعير أو عروض مناقصات جديدة</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>تصفح الخريطة والبيانات حتى في حالة بطء أو انقطاع الإنترنت</span>
          </div>
        </div>

        {/* OS Specific Instructions */}
        {isIOS ? (
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2 text-xs">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Share className="w-4 h-4" />
              <span>خطوات التثبيت على iPhone (متصفح Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>اضغط على زر المشاركة <strong>(Share ⬆️)</strong> أسفل الشاشة في Safari.</li>
              <li>مرر لأسفل واختر <strong>"إضافة إلى الصفحة الرئيسية" (Add to Home Screen)</strong>.</li>
              <li>اضغط <strong>"إضافة" (Add)</strong> بالأعلى ليظهر التطبيق مع تطبيقاتك.</li>
            </ol>
          </div>
        ) : (
          deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-sm transition-all"
            >
              <Download className="w-5 h-5" />
              <span>تثبيت التطبيق على جهازي بنقرة واحدة</span>
            </button>
          )
        )}

        {/* Push Notifications Card */}
        <div className="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/20 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>إشعارات المناقصات والصفقات</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {notificationsGranted ? 'الإشعارات مفعلة على هذا الجهاز ✓' : 'تفعيل التنبيهات الفورية للعروض'}
            </div>
          </div>

          <button
            onClick={handleEnableNotifications}
            disabled={notificationsGranted}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              notificationsGranted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {notificationsGranted ? 'مفعلة ✓' : 'تفعيل'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

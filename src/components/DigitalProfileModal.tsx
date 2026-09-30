import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  QrCode,
  Download,
  Share2,
  Copy,
  Check,
  Building2,
  MapPin,
  ShieldCheck,
  Phone,
  MessageCircle,
  ExternalLink,
  Award,
  Globe,
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';
import { Factory } from '../types';
import { ModalShell } from './ModalShell';

interface DigitalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  factory: Factory | null;
}

export const DigitalProfileModal: React.FC<DigitalProfileModalProps> = ({
  isOpen,
  onClose,
  factory,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!factory) return;
    const url = `${window.location.origin}/?factory=${factory.id}`;

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUri) => {
        setQrDataUrl(dataUri);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });
  }, [factory]);

  if (!isOpen || !factory) return null;

  const shareUrl = `${window.location.origin}/?factory=${factory.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${factory.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: factory.name,
          text: `بطاقة مصنع "${factory.name}" على الخريطة الصناعية المعتمدة:`,
          url: shareUrl,
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <ModalShell id="digital-profile" open={isOpen && !!factory} onClose={onClose} rootClassName="p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100">
                بطاقة المصنع الرقمية ورمز الاستجابة السريع (QR)
              </h3>
              <p className="text-[11px] text-slate-400">
                شارك الرابط والـ QR على كروت العمل وشاحنات النقل والمنتجات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Virtual ID Card */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 rounded-3xl border-2 border-amber-500/40 shadow-xl relative overflow-hidden space-y-4">
            
            {/* Top Badge */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base sm:text-lg font-black text-amber-400">
                    {factory.name}
                  </h2>
                  {factory.isLocationVerified && (
                    <span title="موقع جغرافي معتمد رسمياً">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  {factory.city} • {factory.industrialArea || 'المنطقة الصناعية'}
                </p>
              </div>

              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                معتمد رسمياً
              </span>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner mx-auto max-w-[200px]">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${factory.name}`}
                  className="w-44 h-44 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-500">
                  جاري توليد الرمز...
                </div>
              )}
              <span className="text-[10px] font-black text-slate-900 mt-1">
                امسح الرمز للوصول الفوري للموقع والكتالوج
              </span>
            </div>

            {/* Sectors and Details */}
            <div className="flex flex-wrap gap-1 justify-center">
              {factory.sectors.map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>

            {/* Quick Contacts */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <a
                href={`tel:${factory.salesOfficer?.phone}`}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>اتصال المبيعات</span>
              </a>

              <a
                href={`https://wa.me/${(factory.salesOfficer?.whatsapp || factory.salesOfficer?.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً مصنع ${factory.name}، وصلت إليكم عبر البطاقة الرقمية المعتمدة.`)}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب مباشر</span>
              </a>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={handleDownloadQR}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>تحميل رمز QR</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </button>

            <button
              onClick={handleShare}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة الكارت</span>
            </button>
          </div>

          {/* URL text display */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[280px] font-mono dir-ltr">{shareUrl}</span>
            <span className="text-[10px] text-amber-400 font-bold shrink-0 mr-2">رابط دائم 🔗</span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

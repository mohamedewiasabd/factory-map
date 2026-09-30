import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  X, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  MessageSquare, 
  ShoppingBag, 
  UserCheck, 
  Building2, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  FileText,
  Clock,
  Sparkles,
  Edit3,
  Award,
  ShieldCheck,
  Navigation,
  Globe2,
  Calendar,
  Layers,
  Layers as LayersIcon,
  QrCode,
  FileDown
} from 'lucide-react';
import { Factory, Review } from '../types';
import { fetchFactoryReviews, addFactoryReview, verifyFactoryLocation } from '../services/dataService';
import { ModalShell } from './ModalShell';

interface FactoryDetailsModalProps {
  factory: Factory | null;
  onClose: () => void;
  onStartChat: (factory: Factory, role: 'sales' | 'purchasing') => void;
  onCreateOrder: (factory: Factory) => void;
  onEditFactory?: (factory: Factory) => void;
  onFactoryUpdated?: (updated: Factory) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  onOpenDigitalProfile?: (factory: Factory) => void;
  onOpenCatalog?: (factory: Factory) => void;
}

export const FactoryDetailsModal: React.FC<FactoryDetailsModalProps> = ({
  factory,
  onClose,
  onStartChat,
  onCreateOrder,
  onEditFactory,
  onFactoryUpdated,
  currentUserId,
  isAdmin,
  onOpenDigitalProfile,
  onOpenCatalog
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isVerifyingLoc, setIsVerifyingLoc] = useState(false);
  const [currentFactory, setCurrentFactory] = useState<Factory | null>(factory);

  // Mini Map inside Modal
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    setCurrentFactory(factory);
  }, [factory]);

  useEffect(() => {
    if (!currentFactory) return;
    setLoadingReviews(true);
    fetchFactoryReviews(currentFactory.id)
      .then((data) => setReviews(data))
      .catch(() => {})
      .finally(() => setLoadingReviews(false));
  }, [currentFactory]);

  // Initialize Mini Leaflet Map in Modal
  useEffect(() => {
    if (!currentFactory || !miniMapRef.current) return;

    const timer = setTimeout(() => {
      if (!miniMapRef.current) return;
      if (miniMapInstance.current) {
        miniMapInstance.current.invalidateSize();
        return;
      }

      const map = L.map(miniMapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([currentFactory.lat, currentFactory.lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([currentFactory.lat, currentFactory.lng]).addTo(map);
      const popupEl = L.DomUtil.create('div');
      const popupText = document.createElement('b');
      popupText.textContent = currentFactory.name;
      popupEl.appendChild(popupText);
      popupEl.appendChild(document.createElement('br'));
      popupEl.appendChild(document.createTextNode(currentFactory.industrialArea || ''));
      marker.bindPopup(popupEl).openPopup();

      miniMapInstance.current = map;
    }, 250);

    return () => {
      clearTimeout(timer);
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [currentFactory]);

  if (!currentFactory) return null;

  const isOwner = currentUserId && currentFactory.ownerId === currentUserId;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingReview(true);
      const rev = await addFactoryReview(currentFactory.id, {
        rating: newRating,
        comment: newComment.trim(),
      });
      setReviews([rev, ...reviews]);
      setNewComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to add review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const cleanWhatsappNumber = (phoneStr: string) => {
    return phoneStr.replace(/[^0-9]/g, '');
  };

  const handleToggleLocationVerification = async () => {
    try {
      setIsVerifyingLoc(true);
      const newStatus = !currentFactory.isLocationVerified;
      const updated = await verifyFactoryLocation(currentFactory.id, newStatus);
      setCurrentFactory(updated);
      if (onFactoryUpdated) {
        onFactoryUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to update location verification:', err);
    } finally {
      setIsVerifyingLoc(false);
    }
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentFactory.lat},${currentFactory.lng}`;

  return (
    <ModalShell id="factory-details" open={!!currentFactory} onClose={onClose} align="bottom" rootClassName="p-0 sm:p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-auto max-h-[94dvh] sm:max-h-[92vh] flex flex-col text-slate-100">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1 bg-slate-700 rounded-full mx-auto mt-2 z-10" />

        {/* Header with image or industrial pattern */}
        <div className="relative h-40 sm:h-52 bg-slate-800 overflow-hidden shrink-0">
          {currentFactory.imageBase64 ? (
            <img
              src={currentFactory.imageBase64}
              alt={currentFactory.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 flex items-center justify-center">
              <Building2 className="w-16 h-16 text-slate-700" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Edit button if owner or admin */}
          {(isOwner || isAdmin) && onEditFactory && (
            <button
              onClick={() => onEditFactory(currentFactory)}
              className="absolute top-4 right-4 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-amber-400 hover:text-amber-300 rounded-xl backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-500/30"
            >
              <Edit3 className="w-4 h-4" />
              تعديل بيانات المصنع والموقع
            </button>
          )}

          {/* Badges and rating on header */}
          <div className="absolute bottom-3 right-4 left-4 sm:right-6 sm:left-6 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  currentFactory.status === 'approved'
                    ? 'bg-emerald-500/90 text-slate-950 font-black'
                    : 'bg-amber-500/90 text-slate-950 font-black'
                }`}>
                  {currentFactory.status === 'approved' ? '✓ مصنع معتمد' : '⏳ قيد المراجعة'}
                </span>

                {currentFactory.isLocationVerified ? (
                  <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/90 text-white font-black flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    موقع معتمد ومدقق GPS
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-amber-400 border border-amber-500/30">
                    موقع تقريبي
                  </span>
                )}

                <span className="flex items-center gap-1 text-xs bg-slate-900/80 px-2.5 py-0.5 rounded-full text-amber-400 font-bold border border-slate-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {currentFactory.rating} ({currentFactory.reviewsCount})
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-white">{currentFactory.name}</h1>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                {currentFactory.city} - {currentFactory.industrialArea} ({currentFactory.address})
              </p>
            </div>

            {/* Quick Actions Header */}
            <div className="flex flex-wrap items-center gap-2">
              {onOpenDigitalProfile && (
                <button
                  onClick={() => onOpenDigitalProfile(currentFactory)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow-md backdrop-blur-sm"
                  title="بطاقة المصنع الرقمية ورمز الاستجابة السريع QR"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>كارت QR</span>
                </button>
              )}
              {onOpenCatalog && (
                <button
                  onClick={() => onOpenCatalog(currentFactory)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors shadow-md backdrop-blur-sm"
                  title="تحميل الكتالوج وعروض الأسعار بصيغة PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>كتالوج PDF</span>
                </button>
              )}
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                ملاحة GPS
              </a>
              <button
                onClick={() => onCreateOrder(currentFactory)}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                طلب تسعير / شراء
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Admin Location Verification Bar */}
          {isAdmin && (
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="font-bold text-slate-100">إدارة تدقيق الموقع الجغرافي: </span>
                  <span className="text-slate-300">
                    {currentFactory.isLocationVerified
                      ? `تم الاعتماد رسمياً بواسطة ${currentFactory.locationVerifiedBy || 'الإدارة'}`
                      : 'الموقع غير معتمد بعد'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleToggleLocationVerification}
                disabled={isVerifyingLoc}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  currentFactory.isLocationVerified
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md'
                }`}
              >
                {isVerifyingLoc
                  ? 'جاري التحديث...'
                  : currentFactory.isLocationVerified
                  ? 'إلغاء اعتماد الموقع'
                  : '✅ اعتماد وتوثيق الموقع بالـ GPS'}
              </button>
            </div>
          )}

          {/* Industrial Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800 text-xs">
            {currentFactory.establishedYear && (
              <div>
                <span className="text-slate-400 block text-[11px]">سنة التأسيس:</span>
                <span className="font-bold text-slate-100 text-sm">{currentFactory.establishedYear}</span>
              </div>
            )}
            {currentFactory.totalAreaM2 && (
              <div>
                <span className="text-slate-400 block text-[11px]">المساحة الإجمالية:</span>
                <span className="font-bold text-slate-100 text-sm">{currentFactory.totalAreaM2.toLocaleString()} م²</span>
              </div>
            )}
            {currentFactory.productionLinesCount && (
              <div>
                <span className="text-slate-400 block text-[11px]">خطوط الإنتاج:</span>
                <span className="font-bold text-slate-100 text-sm">{currentFactory.productionLinesCount} خطوط آلية</span>
              </div>
            )}
            {currentFactory.commercialRegNo && (
              <div>
                <span className="text-slate-400 block text-[11px]">السجل التجاري/الصناعي:</span>
                <span className="font-bold text-slate-100 text-sm">{currentFactory.commercialRegNo}</span>
              </div>
            )}
          </div>

          {/* Production Capacity & Exporter Status */}
          {(currentFactory.productionCapacity || currentFactory.isExporter) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {currentFactory.productionCapacity && (
                <div className="bg-sky-950/30 border border-sky-800/40 p-3 rounded-2xl">
                  <span className="text-[11px] text-sky-400 font-bold block mb-1">⚙️ الطاقة الإنتاجية المقدرة:</span>
                  <p className="text-slate-200 font-semibold">{currentFactory.productionCapacity}</p>
                </div>
              )}
              {currentFactory.isExporter && (
                <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-2xl">
                  <span className="text-[11px] text-emerald-400 font-bold block mb-1">🌍 مصنع مصدّر للأسواق الخارجية:</span>
                  <p className="text-slate-200 font-semibold">
                    {currentFactory.exportMarkets?.join('، ') || 'دول الخليج وأوروبا وأفريقيا'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Certifications (ISO etc.) */}
          {currentFactory.certifications && currentFactory.certifications.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                شهادات الجودة والاعتمادات الصناعية الرسمية:
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentFactory.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="text-xs bg-slate-800 border border-slate-700 text-amber-300 px-3 py-1 rounded-xl flex items-center gap-1.5 font-semibold"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sectors and Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">القطاعات الصناعية:</span>
            {currentFactory.sectors?.map((sector) => (
              <span
                key={sector}
                className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl font-medium"
              >
                {sector}
              </span>
            ))}
          </div>

          {/* About Factory */}
          <div>
            <h3 className="text-sm font-bold text-amber-400 mb-2">نبذة عن المصنع ومجال التصنيع:</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
              {currentFactory.description}
            </p>
          </div>

          {/* Products List */}
          {currentFactory.productsList && currentFactory.productsList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-amber-400">المنتجات وخطوط التصنيع:</h3>
                {onOpenCatalog && (
                  <button
                    onClick={() => onOpenCatalog(currentFactory)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    تحميل الكتالوج وعروض الأسعار PDF
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentFactory.productsList.map((prod, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{prod}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini Leaflet Map Preview */}
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                الموقع الجغرافي للمصنع على الخريطة
              </span>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1 font-bold"
              >
                فتح الاتجاهات المباشرة بالـ GPS 🧭
              </a>
            </div>
            <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-700">
              <div ref={miniMapRef} className="w-full h-full z-0" />
            </div>
          </div>

          {/* Dedicated Officers Cards (Sales & Purchasing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Sales Officer Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-amber-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">مسؤول المبيعات</h4>
                    <p className="text-[11px] text-amber-400 font-semibold">{currentFactory.salesOfficer?.name}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20">
                  طلبات التوريد
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono dir-ltr">{currentFactory.salesOfficer?.phone}</span>
                </div>
                {currentFactory.salesOfficer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentFactory.salesOfficer.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onStartChat(currentFactory, 'sales')}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  محادثة مبيعات المنصة
                </button>
                {currentFactory.salesOfficer?.whatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsappNumber(currentFactory.salesOfficer.whatsapp)}?text=${encodeURIComponent(`مرحباً مصنع ${currentFactory.name}، نود الاستفسار عن عروض الأسعار والتوريد`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                    title="محادثة واتساب"
                  >
                    💬 واتساب
                  </a>
                )}
                <a
                  href={`tel:${currentFactory.salesOfficer?.phone}`}
                  className="p-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  title="اتصال هاتفي"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Purchasing Officer Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-blue-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">مسؤول المشتريات والخامات</h4>
                    <p className="text-[11px] text-blue-400 font-semibold">{currentFactory.purchasingOfficer?.name || 'قسم المشتريات'}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/20">
                  توريد المواد الخام
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono dir-ltr">{currentFactory.purchasingOfficer?.phone || 'غير محدد'}</span>
                </div>
                {currentFactory.purchasingOfficer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentFactory.purchasingOfficer.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onStartChat(currentFactory, 'purchasing')}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1 shadow-md shadow-blue-600/20 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  محادثة مشتريات وتوريد
                </button>
                {currentFactory.purchasingOfficer?.whatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsappNumber(currentFactory.purchasingOfficer.whatsapp)}?text=${encodeURIComponent(`مرحباً قسم مشتريات مصنع ${currentFactory.name}، لدينا عروض توريد مواد خام`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                    title="محادثة واتساب"
                  >
                    💬 واتساب
                  </a>
                )}
                {currentFactory.purchasingOfficer?.phone && (
                  <a
                    href={`tel:${currentFactory.purchasingOfficer.phone}`}
                    className="p-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Working hours & Website */}
          {(currentFactory.workingDaysHours || currentFactory.website) && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
              {currentFactory.workingDaysHours && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>أوقات العمل: {currentFactory.workingDaysHours}</span>
                </div>
              )}
              {currentFactory.website && (
                <a
                  href={currentFactory.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sky-400 hover:underline font-bold"
                >
                  <Globe2 className="w-4 h-4" />
                  زيارة الموقع الإلكتروني للمصنع
                </a>
              )}
            </div>
          )}

          {/* Reviews & Ratings Section */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                تقييمات وتجارب العملاء والموردين ({reviews.length})
              </h3>
            </div>

            {/* Submit new review form */}
            <form onSubmit={handleReviewSubmit} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">أضف تقييمك وتجربتك مع المصنع:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={2}
                  required
                  placeholder="اكتب تعليقك حول جودة المنتجات، الالتزام بمواعيد التوريد، والتعامل مع المبيعات..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between">
                {reviewSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم نشر تقييمك بنجاح!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={submittingReview || !newComment.trim()}
                  className="mr-auto px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition-all disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingReview ? 'جاري النشر...' : 'نشر التقييم'}
                </button>
              </div>
            </form>

            {/* Reviews List */}
            <div className="space-y-3">
              {loadingReviews ? (
                <p className="text-xs text-slate-400">جاري تحميل التقييمات...</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  لا توجد تقييمات سابقة لهذا المصنع بعد. كن أول من يضيف تقييماً!
                </p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{rev.userName}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(rev.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

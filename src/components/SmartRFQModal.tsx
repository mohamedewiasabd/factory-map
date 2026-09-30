import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Send,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Truck,
  Sparkles,
  Phone,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RFQItem, RFQBid, Factory, getAllIndustrialSectors, DEFAULT_CITIES_LIST } from '../types';
import { createRFQ, submitRFQBid, acceptRFQBid } from '../services/dataService';
import { ModalShell } from './ModalShell';

interface SmartRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfqs: RFQItem[];
  onRefreshRFQs: () => Promise<void>;
  currentUser?: {
    uid: string;
    email: string;
    displayName: string;
    phone?: string;
  } | null;
  userFactory?: Factory | null;
  onStartChatWithFactory?: (factoryId: string) => void;
}

export const SmartRFQModal: React.FC<SmartRFQModalProps> = ({
  isOpen,
  onClose,
  rfqs,
  onRefreshRFQs,
  currentUser,
  userFactory,
  onStartChatWithFactory,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [expandedRfqId, setExpandedRfqId] = useState<string | null>(null);

  // New RFQ Form State
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState(() => getAllIndustrialSectors()[0] || 'ورق وطباعة وتغليف');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('قطعة');
  const [targetCity, setTargetCity] = useState(DEFAULT_CITIES_LIST[0]);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [details, setDetails] = useState('');
  const [requesterName, setRequesterName] = useState(currentUser?.displayName || '');
  const [requesterPhone, setRequesterPhone] = useState(currentUser?.phone || '');
  const [requesterCompany, setRequesterCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Bid Form State for a specific RFQ
  const [biddingRfqId, setBiddingRfqId] = useState<string | null>(null);
  const [bidPricePerUnit, setBidPricePerUnit] = useState<number | ''>('');
  const [bidDeliveryDays, setBidDeliveryDays] = useState<number | ''>(7);
  const [bidNotes, setBidNotes] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  if (!isOpen) return null;

  const allSectors = getAllIndustrialSectors();

  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !quantity || !requesterName || !requesterPhone) return;

    setIsSubmitting(true);
    try {
      await createRFQ({
        title,
        sector,
        quantity: Number(quantity),
        unit,
        targetCity,
        deliveryLocation: deliveryLocation || targetCity,
        deadline,
        details,
        requesterName,
        requesterPhone,
        requesterCompany,
        requesterId: currentUser?.uid || 'guest-' + Date.now(),
        requesterEmail: currentUser?.email,
      });

      setBroadcastSuccess(true);
      await onRefreshRFQs();

      setTimeout(() => {
        setBroadcastSuccess(false);
        setActiveTab('browse');
        // Reset form
        setTitle('');
        setQuantity('');
        setDetails('');
        setDeliveryLocation('');
      }, 2000);
    } catch (error) {
      console.error('Error creating RFQ:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBid = async (rfq: RFQItem) => {
    if (!bidPricePerUnit) return;
    setIsSubmittingBid(true);

    try {
      const priceNum = Number(bidPricePerUnit);
      const total = priceNum * rfq.quantity;
      const fName = userFactory?.name || 'مصنع معتمد في المنصة';

      await submitRFQBid(rfq.id, {
        factoryId: userFactory?.id || 'fac-bidder-' + Date.now(),
        factoryName: fName,
        factoryCity: userFactory?.city || targetCity,
        factoryPhone: userFactory?.salesOfficer?.phone || requesterPhone,
        factoryWhatsapp: userFactory?.salesOfficer?.whatsapp || userFactory?.salesOfficer?.phone,
        pricePerUnit: priceNum,
        totalPrice: total,
        currency: 'EGP',
        deliveryDays: Number(bidDeliveryDays) || 7,
        notes: bidNotes,
        submittedBy: currentUser?.displayName || fName,
        submittedByEmail: currentUser?.email || 'sales@factory.eg',
      });

      setBiddingRfqId(null);
      setBidPricePerUnit('');
      setBidNotes('');
      await onRefreshRFQs();
    } catch (error) {
      console.error('Error submitting bid:', error);
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const handleAcceptBid = async (rfqId: string, bidId: string) => {
    if (!confirm('هل أنت متأكد من قبول وترسية المناقصة على هذا المصنع؟')) return;
    await acceptRFQBid(rfqId, bidId);
    await onRefreshRFQs();
  };

  const filteredRFQs = rfqs.filter((r) => {
    if (filterSector !== 'all' && r.sector !== filterSector) return false;
    if (filterCity !== 'all' && r.targetCity !== filterCity) return false;
    return true;
  });

  return (
    <ModalShell id="rfq" open={isOpen} onClose={onClose} rootClassName="p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">
                  بورصة المناقصات وطلبات التسعير الفورية (B2B RFQ)
                </h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  بث فوري للمصانع
                </span>
              </div>
              <p className="text-xs text-slate-400">
                اطلب كمياتك ومواصفاتك ليصل طلبك فوراً لمصانع القطاع وتتنافس في أفضل الأسعار
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('browse')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'browse'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>المناقصات الحالية</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
              {rfqs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>+ طرح طلب تسعير / مناقصة جديدة</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {activeTab === 'create' ? (
            /* Create RFQ Form */
            <form onSubmit={handleCreateRFQ} className="space-y-4 max-w-2xl mx-auto">
              {broadcastSuccess && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">تم نشر المناقصة وبث الإشعار للمصانع بنجاح!</h4>
                    <p className="text-xs text-emerald-400/80">ستتلقى عروض الأسعار والتنافس مباشرة في لوحة المناقصات ومحادثات المبيعات.</p>
                  </div>
                </div>
              )}

              <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-300/90 leading-relaxed">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>آلية العمل:</strong> بمجرد إرسال الطلب، يقوم النظام بالبث الفوري لجميع المصانع المسجلة في قطاعك في الخريطة ليقدم كل مصنع أفضل عرض سعر وموعد تسليم مباشر.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  عنوان طلب التوريد / المناقصة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مطلوب توريد 50,000 كرتونة مضلعة أو 25 طن صاج مجلفن"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    القطاع الصناعي المستهدف *
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {allSectors.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      الكمية المطلوبة *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="مثال: 5000"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      الوحدة *
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="قطعة">قطعة</option>
                      <option value="طن">طن</option>
                      <option value="كرتونة">كرتونة</option>
                      <option value="متر مربع">متر مربع</option>
                      <option value="متر طولي">متر طولي</option>
                      <option value="شيكارة / كيس">شيكارة / كيس</option>
                      <option value="برميل">برميل</option>
                      <option value="بالتة">بالتة</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    مدينة موقع التسليم *
                  </label>
                  <select
                    value={targetCity}
                    onChange={(e) => setTargetCity(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {DEFAULT_CITIES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    العنوان التفصيلي للتوريد
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مخازن الشركة بالمنطقة الصناعية الرابعة"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المواصفات الفنية والشروط المطلوبة *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="المقاسات الدقيقة، خامة الصنع، سماكة المنتج، نوع الطباعة، شروط الدفع، وشهادات الجودة المطلوبة..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم المسؤول / المشتري *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم بالكامل"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم الهاتف للتواصل *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01xxxxxxxxx"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم الشركة / المقاول (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شركة النصر للمقاولات"
                    value={requesterCompany}
                    onChange={(e) => setRequesterCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 text-sm"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري بث المناقصة للمصانع...' : 'بث المناقصة الفورية الآن'}</span>
              </button>
            </form>
          ) : (
            /* Browse RFQs List */
            <div className="space-y-4">
              
              {/* Filters bar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold">تصفية حسب:</span>
                
                <select
                  value={filterSector}
                  onChange={(e) => setFilterSector(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-semibold focus:outline-none"
                >
                  <option value="all">كل القطاعات الصناعية</option>
                  {allSectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-200 font-semibold focus:outline-none"
                >
                  <option value="all">كل المدن المستهدفة</option>
                  {DEFAULT_CITIES_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <div className="mr-auto text-[11px] text-slate-400">
                  {filteredRFQs.length} مناقصة نشطة
                </div>
              </div>

              {filteredRFQs.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/30 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                  <p className="text-sm font-semibold">لا توجد مناقصات مطابقة للفلاتر حالياً.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    كن أول من يطرح مناقصة جديدة الآن
                  </button>
                </div>
              ) : (
                filteredRFQs.map((rfq) => {
                  const isExpanded = expandedRfqId === rfq.id;
                  const isBidding = biddingRfqId === rfq.id;
                  const isOwner = currentUser?.uid && currentUser.uid === rfq.requesterId;
                  const bids = rfq.bids || [];

                  return (
                    <div
                      key={rfq.id}
                      className="bg-slate-950/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {rfq.sector}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {rfq.targetCity}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              rfq.status === 'awarded'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {rfq.status === 'awarded' ? 'تمت الترسية والتعميد ✓' : 'مفتوحة للعروض 🟢'}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-slate-100">
                            {rfq.title}
                          </h3>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <div className="text-sm font-black text-amber-400">
                            الكمية: {rfq.quantity.toLocaleString('ar-EG')} {rfq.unit}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            العروض المقدمة: {bids.length} عرض
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                        {rfq.details}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400 border-t border-slate-800/80">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span>طالب التوريد: <strong>{rfq.requesterName}</strong> {rfq.requesterCompany ? `(${rfq.requesterCompany})` : ''}</span>
                          <a href={`tel:${rfq.requesterPhone}`} className="text-amber-400 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {rfq.requesterPhone}
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedRfqId(isExpanded ? null : rfq.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>العروض ({bids.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {rfq.status === 'open' && (
                            <button
                              onClick={() => setBiddingRfqId(isBidding ? null : rfq.id)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm shadow-amber-500/20 transition-colors"
                            >
                              + تقديم عرض سعر المصنع
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bidding Form */}
                      {isBidding && (
                        <div className="p-3.5 bg-slate-900 rounded-2xl border border-amber-500/40 space-y-3 animate-in fade-in">
                          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            تقديم عرض سعر رسمي من مصنعك
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                سعر الوحدة (جنيه) *
                              </label>
                              <input
                                type="number"
                                required
                                min={0.1}
                                step="any"
                                placeholder="مثال: 15.5"
                                value={bidPricePerUnit}
                                onChange={(e) => setBidPricePerUnit(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-800 rounded-lg border border-slate-700 text-slate-100 font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                مدة التوريد (أيام)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={bidDeliveryDays}
                                onChange={(e) => setBidDeliveryDays(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-800 rounded-lg border border-slate-700 text-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                الإجمالي التقديري
                              </label>
                              <div className="px-2.5 py-1.5 text-xs bg-slate-950 rounded-lg border border-slate-800 text-amber-400 font-black">
                                {bidPricePerUnit ? (Number(bidPricePerUnit) * rfq.quantity).toLocaleString('ar-EG') + ' EGP' : '-'}
                              </div>
                            </div>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="شروط التسليم، شامل النقل للموقع، طريقة الدفع، وملاحظات أخرى..."
                              value={bidNotes}
                              onChange={(e) => setBidNotes(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-slate-800 rounded-lg border border-slate-700 text-slate-100"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setBiddingRfqId(null)}
                              className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingBid || !bidPricePerUnit}
                              onClick={() => handleSubmitBid(rfq)}
                              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
                            >
                              {isSubmittingBid ? 'جاري الإرسال...' : 'تأكيد إرسال العرض'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expanded Bids Section */}
                      {isExpanded && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-in fade-in">
                          <h4 className="text-xs font-bold text-slate-300">
                            عروض الأسعار المتنافسة ({bids.length}):
                          </h4>

                          {bids.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-2 bg-slate-900/40 rounded-xl text-center">
                              لم يقدم أي مصنع عرض سعر حتى الآن. كن أول مصنع يقدم عرضه!
                            </p>
                          ) : (
                            bids.map((b) => (
                              <div
                                key={b.id}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  b.status === 'accepted'
                                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                                    : 'bg-slate-900 border-slate-800'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-100">
                                      {b.factoryName}
                                    </span>
                                    {b.factoryCity && (
                                      <span className="text-[10px] text-slate-400">
                                        📍 {b.factoryCity}
                                      </span>
                                    )}
                                    {b.status === 'accepted' && (
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                        العرض الفائز المقبول ✓
                                      </span>
                                    )}
                                  </div>
                                  {b.notes && (
                                    <p className="text-[11px] text-slate-400">
                                      {b.notes}
                                    </p>
                                  )}
                                  <div className="text-[10px] text-slate-500">
                                    مدة التوريد: {b.deliveryDays} أيام • مقدم من: {b.submittedBy}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  <div className="text-left sm:text-right">
                                    <div className="text-sm font-black text-amber-400">
                                      {b.pricePerUnit} {b.currency} <span className="text-[10px] font-normal text-slate-400">/ {rfq.unit}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-semibold">
                                      الإجمالي: {b.totalPrice.toLocaleString('ar-EG')} {b.currency}
                                    </div>
                                  </div>

                                  {/* Direct WhatsApp button */}
                                  {b.factoryWhatsapp && (
                                    <a
                                      href={`https://wa.me/${b.factoryWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً مصنع ${b.factoryName}، بخصوص عرض سعركم لمناقصة: "${rfq.title}"`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors"
                                      title="محادثة واتساب مبيعات المصنع"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </a>
                                  )}

                                  {/* Accept Bid Button (Only for requester) */}
                                  {rfq.status === 'open' && (
                                    <button
                                      onClick={() => handleAcceptBid(rfq.id, b.id)}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
                                    >
                                      قبول العرض
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

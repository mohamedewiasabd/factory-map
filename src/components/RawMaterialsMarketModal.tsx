import React, { useState } from 'react';
import {
  X,
  Package,
  Plus,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Building2,
  Trash2,
  CheckCircle2,
  Tag,
  Boxes,
  Truck
} from 'lucide-react';
import { RawMaterialListing, Factory, DEFAULT_CITIES_LIST } from '../types';
import { createRawMaterialListing, deleteRawMaterialListing } from '../services/dataService';
import { ModalShell } from './ModalShell';

interface RawMaterialsMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  listings: RawMaterialListing[];
  onRefreshListings: () => Promise<void>;
  userFactory?: Factory | null;
  currentUser?: {
    uid: string;
    email: string;
    displayName: string;
    phone?: string;
  } | null;
}

const CATEGORIES = [
  'خامات بلاستيك وبوليمرات',
  'صاج ومعادن وخردة',
  'خيوط وغزول ومنسوجات',
  'كرتون وورق وباليتات',
  'كيماويات وبراميل',
  'خطوط ومعدات مستعملة',
  'أخرى'
];

export const RawMaterialsMarketModal: React.FC<RawMaterialsMarketModalProps> = ({
  isOpen,
  onClose,
  listings,
  onRefreshListings,
  userFactory,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'add'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add listing state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('طن');
  const [pricePerUnit, setPricePerUnit] = useState<number | ''>('');
  const [condition, setCondition] = useState<'new_surplus' | 'recyclable_scrap' | 'stock_lot'>('new_surplus');
  const [city, setCity] = useState(userFactory?.city || DEFAULT_CITIES_LIST[0]);
  const [industrialArea, setIndustrialArea] = useState(userFactory?.industrialArea || '');
  const [contactPhone, setContactPhone] = useState(userFactory?.salesOfficer?.phone || currentUser?.phone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(userFactory?.salesOfficer?.whatsapp || userFactory?.salesOfficer?.phone || '');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !quantity || !contactPhone) return;

    setIsSubmitting(true);
    try {
      await createRawMaterialListing({
        title,
        category,
        quantity: Number(quantity),
        unit,
        pricePerUnit: pricePerUnit ? Number(pricePerUnit) : undefined,
        currency: 'EGP',
        condition,
        factoryId: userFactory?.id || 'fac-vendor-' + Date.now(),
        factoryName: userFactory?.name || 'مصنع مسجل',
        city,
        industrialArea,
        contactPhone,
        contactWhatsapp: contactWhatsapp || contactPhone,
        description,
      });

      await onRefreshListings();
      setActiveTab('browse');
      setTitle('');
      setQuantity('');
      setPricePerUnit('');
      setDescription('');
    } catch (err) {
      console.error('Error adding raw material listing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('هل تم بيع هذه الخامة أو ترغب في إزالتها من البورصة؟')) return;
    await deleteRawMaterialListing(id);
    await onRefreshListings();
  };

  const filtered = listings.filter((item) => {
    if (item.status === 'sold') return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedCity !== 'all' && item.city !== selectedCity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.factoryName.toLowerCase().includes(q) ||
        item.industrialArea.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <ModalShell id="raw-materials" open={isOpen} onClose={onClose} rootClassName="p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">
                  بورصة الخامات وفائض الإنتاج ومستلزمات المصانع
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  تجارة بين المصانع B2B
                </span>
              </div>
              <p className="text-xs text-slate-400">
                شراء وبيع فوائض الخامات، الصاج، البلاستيك، الباليتات، ومخلفات الإنتاج لتقليل الهدر وتوفير النولون
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

        {/* Tab switcher */}
        <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'browse'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>المعروض حالياً</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                {listings.filter((l) => l.status === 'available').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'add'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ عرض خامات أو سكراب للبيع</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {activeTab === 'add' ? (
            /* Add Listing Form */
            <form onSubmit={handleAddListing} className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم وعنوان الخامة أو فائض الإنتاج *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فائض 10 طن بولي إيثيلين، أو 1500 بالتة خشب زان، أو قصاصات صاج ليزر"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    تصنيف الخامة *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-bold focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    حالة المادة *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  >
                    <option value="new_surplus">جديد وفائض إنتاج أصلي</option>
                    <option value="recyclable_scrap">سكراب ومخلفات قابلة للتدوير</option>
                    <option value="stock_lot">ستوك مخازن / تصفية</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      الكمية *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="10"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      الوحدة *
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-2 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                    >
                      <option value="طن">طن</option>
                      <option value="كيلو">كيلو</option>
                      <option value="بالتة">بالتة</option>
                      <option value="برميل">برميل</option>
                      <option value="متر">متر</option>
                      <option value="قطعة">قطعة</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    السعر المطلوب للوحدة (جنيه)
                  </label>
                  <input
                    type="number"
                    placeholder="اختياري (أو للتفاوض)"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    المدينة الصناعية الحالية *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  >
                    {DEFAULT_CITIES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    المنطقة / البلوك
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: المنطقة الصناعية الأولى"
                    value={industrialArea}
                    onChange={(e) => setIndustrialArea(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المواصفات الفنية وطريقة التسليم *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="المواصفات الفنية، درجة النقاوة، التغليف، وهل الاستلام أرض المصنع أو متاح التوصيل..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم الهاتف للاتصال المباشر *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01xxxxxxxxx"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم الواتساب
                  </label>
                  <input
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-sm transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'جاري النشر في البورصة...' : 'نشر المعروض في البورصة الصناعية'}</span>
              </button>
            </form>
          ) : (
            /* Browse Market Grid */
            <div className="space-y-4">
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-xs">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث في الخامات، سكراب، أو اسم المصنع..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-100 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-semibold focus:outline-none"
                >
                  <option value="all">كل التصنيفات</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-200 font-semibold focus:outline-none"
                >
                  <option value="all">كل المدن</option>
                  {DEFAULT_CITIES_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/30 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                  <Package className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                  <p className="text-sm font-semibold">لا توجد خامات معروضة مطابقة للبحث.</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    أضف أول عرض لخاماتك أو سكراب مصنعك
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filtered.map((item) => {
                    const isMyFactory = userFactory && userFactory.id === item.factoryId;
                    const conditionLabel =
                      item.condition === 'new_surplus'
                        ? 'فائض إنتاج أصلي 🟢'
                        : item.condition === 'recyclable_scrap'
                        ? 'سكراب للتدوير ♻️'
                        : 'ستوك تصفية 📦';

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {conditionLabel}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-100">
                            {item.title}
                          </h3>

                          <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed line-clamp-3">
                            {item.description}
                          </p>

                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-semibold text-slate-200">{item.factoryName}</span>
                            <span>•</span>
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.city} {item.industrialArea ? `(${item.industrialArea})` : ''}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-amber-400">
                              {item.pricePerUnit ? `${item.pricePerUnit.toLocaleString('ar-EG')} EGP / ${item.unit}` : 'السعر للتفاوض'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              الكمية المتاحة: {item.quantity.toLocaleString('ar-EG')} {item.unit}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isMyFactory && (
                              <button
                                onClick={() => handleDeleteListing(item.id)}
                                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="تم البيع / حذف العرض"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {item.contactWhatsapp && (
                              <a
                                href={`https://wa.me/${item.contactWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً مصنع ${item.factoryName}، أود الاستفسار عن عرض الخامة في البورصة: "${item.title}"`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>واتساب</span>
                              </a>
                            )}

                            <a
                              href={`tel:${item.contactPhone}`}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700"
                              title="اتصال هاتفي"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

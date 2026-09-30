import React, { useRef } from 'react';
import {
  X,
  FileDown,
  Printer,
  Package,
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Award,
  Layers,
  Clock,
  Phone,
  Mail,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Factory } from '../types';
import { ModalShell } from './ModalShell';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  factory: Factory | null;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  factory,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !factory) return null;

  const handlePrintOrSavePDF = () => {
    window.print();
  };

  const products = factory.productsList && factory.productsList.length > 0
    ? factory.productsList
    : ['منتجات وخدمات صناعية هندسية متخصصة', 'خطوط إنتاج وتوريدات مصانع معتمدة'];

  return (
    <ModalShell id="catalog" open={isOpen && !!factory} onClose={onClose} rootClassName="p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100">
                كتالوج المنتجات والمواصفات الفنية وعروض الأسعار
              </h3>
              <p className="text-[11px] text-slate-400">
                بيانات المصنع الفنية والمواصفات الرسمية القابلة للتحميل والطباعة كـ PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintOrSavePDF}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>تحميل الكتالوج PDF / طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Catalog Container */}
        <div
          ref={printAreaRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-slate-900 print:bg-white print:text-black print:p-0 print:m-0"
        >
          {/* Printable Formal Header */}
          <div className="border-b-2 border-amber-500 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:border-black">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-amber-400 print:text-black">
                  {factory.name}
                </h1>
                {factory.isLocationVerified && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 print:text-black border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    موقع معتمد بالـ GPS ✓
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 print:text-gray-700 font-semibold">
                {factory.city} • {factory.industrialArea || 'المنطقة الصناعية'} • {factory.address}
              </p>
              <div className="text-[11px] text-slate-400 print:text-gray-600 flex items-center gap-3">
                {factory.commercialRegNo && <span>سجل تجاري / صناعي: {factory.commercialRegNo}</span>}
                {factory.establishedYear && <span>تأسس عام: {factory.establishedYear}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-400 print:text-gray-800 space-y-1 shrink-0 bg-slate-950/60 print:bg-transparent p-3 rounded-2xl border border-slate-800 print:border-none">
              <div className="font-bold text-amber-400 print:text-black">إدارة المبيعات والتوريدات:</div>
              <div>هاتف: {factory.salesOfficer?.phone}</div>
              <div>واتساب: {factory.salesOfficer?.whatsapp || factory.salesOfficer?.phone}</div>
              <div>بريد: {factory.salesOfficer?.email}</div>
            </div>
          </div>

          {/* Factory Overview */}
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-200 print:text-black flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400 print:text-black" />
              <span>نبذة عن المصنع والقدرات التشغيلية:</span>
            </h4>
            <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed bg-slate-950/40 print:bg-gray-50 p-3.5 rounded-2xl border border-slate-800 print:border-gray-200">
              {factory.description}
            </p>
          </div>

          {/* Quick Metrics Spec Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 bg-slate-950/60 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
              <div className="text-[10px] text-slate-400 print:text-gray-600 font-semibold">المساحة الإجمالية</div>
              <div className="text-xs sm:text-sm font-black text-amber-400 print:text-black mt-0.5">
                {factory.totalAreaM2 ? `${factory.totalAreaM2.toLocaleString('ar-EG')} م²` : 'مساحة صناعية كبرى'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
              <div className="text-[10px] text-slate-400 print:text-gray-600 font-semibold">خطوط الإنتاج</div>
              <div className="text-xs sm:text-sm font-black text-amber-400 print:text-black mt-0.5">
                {factory.productionLinesCount ? `${factory.productionLinesCount} خطوط آلية` : 'خطوط آلية حديثة'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
              <div className="text-[10px] text-slate-400 print:text-gray-600 font-semibold">الطاقة الإنتاجية</div>
              <div className="text-xs sm:text-sm font-black text-amber-400 print:text-black mt-0.5">
                {factory.productionCapacity || 'طاقة إنتاجية كبرى'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 print:bg-gray-100 rounded-2xl border border-slate-800 print:border-gray-300">
              <div className="text-[10px] text-slate-400 print:text-gray-600 font-semibold">التصدير للخارج</div>
              <div className="text-xs sm:text-sm font-black text-emerald-400 print:text-black mt-0.5">
                {factory.isExporter ? 'مُصدّر معتمد ✓' : 'توزيع محلي وإقليمي'}
              </div>
            </div>
          </div>

          {/* Quality Certifications */}
          {factory.certifications && factory.certifications.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-200 print:text-black flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400 print:text-black" />
                <span>شهادات الجودة والاعتمادات الدولية:</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {factory.certifications.map((c) => (
                  <span
                    key={c}
                    className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-300 print:bg-gray-200 print:text-black rounded-xl border border-amber-500/20"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Products & Datasheets Table */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-200 print:text-black flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400 print:text-black" />
                <span>قائمة المنتجات الرئيسية ومواصفات التوريد:</span>
              </span>
              <span className="text-[11px] text-slate-400 print:text-gray-600">
                الأسعار تحدد بحسب الكميات وعقود التوريد
              </span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 print:bg-gray-100 text-slate-300 print:text-black border-b border-slate-800 print:border-gray-300 font-bold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم المنتج / الخدمة الصناعية</th>
                    <th className="p-3">المواصفات الفنية المعتمدة</th>
                    <th className="p-3">الحد الأدنى للطلب (MOQ)</th>
                    <th className="p-3">مدة التجهيز والتسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-200 text-slate-200 print:text-gray-900">
                  {products.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-100 print:text-black">{prod}</td>
                      <td className="p-3 text-slate-300 print:text-gray-700">
                        مطابق للمواصفات القياسية المصرية والعالمية
                      </td>
                      <td className="p-3 text-amber-400 print:text-black font-semibold">
                        بحسب حجم الطلبية
                      </td>
                      <td className="p-3 text-slate-300 print:text-gray-700">
                        من 5 إلى 14 يوم عمل
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formal Stamp and Signature Block */}
          <div className="pt-6 border-t-2 border-slate-800 print:border-gray-400 flex items-center justify-between text-xs text-slate-400 print:text-gray-700">
            <div>
              <div>تاريخ استخراج الكتالوج: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
              <div>تم التوثيق والاعتماد عبر منصة خريطة المصانع المصرية الرسمية</div>
            </div>
            <div className="text-center">
              <div className="w-24 h-16 border-2 border-dashed border-slate-700 print:border-gray-400 rounded-xl flex items-center justify-center text-[10px] text-slate-500 print:text-gray-500 mb-1">
                خاتم المصنع المعتمد
              </div>
              <div className="text-[10px] font-bold text-slate-400 print:text-gray-600">ختم إدارة المبيعات</div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

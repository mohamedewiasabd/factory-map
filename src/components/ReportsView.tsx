import React from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  PieChart, 
  TrendingUp, 
  Building2, 
  MapPin, 
  Layers, 
  Calendar,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Factory, Order, INDUSTRIAL_SECTORS } from '../types';

interface ReportsViewProps {
  factories: Factory[];
  orders: Order[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ factories, orders }) => {
  // Sector distribution count
  const sectorCounts: Record<string, number> = {};
  INDUSTRIAL_SECTORS.forEach((s) => (sectorCounts[s] = 0));
  factories.forEach((f) => {
    f.sectors?.forEach((s) => {
      if (sectorCounts[s] !== undefined) {
        sectorCounts[s] += 1;
      }
    });
  });

  // Top sectors
  const sortedSectors = Object.entries(sectorCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // City distribution
  const cityCounts: Record<string, number> = {};
  factories.forEach((f) => {
    cityCounts[f.city] = (cityCounts[f.city] || 0) + 1;
  });
  const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);

  // Order stats
  const totalVolume = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const conversionRate =
    orders.length > 0
      ? (
          (orders.filter((o) => o.status === 'delivered' || o.status === 'accepted').length /
            orders.length) *
          100
        ).toFixed(1)
      : '0.0';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['اسم المصنع', 'المدينة', 'المنطقة الصناعية', 'القطاعات', 'مسؤول المبيعات', 'الهاتف', 'التقييم', 'الحالة'];
    const rows = factories.map((f) => [
      `"${f.name}"`,
      `"${f.city}"`,
      `"${f.industrialArea}"`,
      `"${f.sectors.join(', ')}"`,
      `"${f.salesOfficer?.name}"`,
      `"${f.salesOfficer?.phone}"`,
      f.rating,
      f.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `factory_map_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* Header and Print Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-slate-100">
              التقرير الصناعي الدوري الشامل
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تحليل بيانات المنشآت الصناعية، التوزيع الجغرافي، وحجم المعاملات التجارية المنفذة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            تصدير ملف Excel / CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400">إجمالي المصانع المسجلة</span>
          <h3 className="text-2xl font-black text-slate-100 mt-1">{factories.length}</h3>
          <span className="text-[10px] text-emerald-400">
            {factories.filter((f) => f.status === 'approved').length} معتمد رسمياً
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400">حجم عقود وأوامر الشراء</span>
          <h3 className="text-xl font-black text-emerald-400 mt-1">
            {totalVolume.toLocaleString()} EGP
          </h3>
          <span className="text-[10px] text-slate-400">{orders.length} طلبية مسجلة</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400">معدل تحويل الطلبات</span>
          <h3 className="text-2xl font-black text-blue-400 mt-1">{conversionRate}%</h3>
          <span className="text-[10px] text-slate-400">نسبة القبول والتنفيذ</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400">القطاعات الصناعية المغطاة</span>
          <h3 className="text-2xl font-black text-amber-400 mt-1">{sortedSectors.length}</h3>
          <span className="text-[10px] text-slate-400">من أصل 14 قطاعاً معتمداً</span>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sector Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            توزيع المصانع حسب القطاع الصناعي
          </h3>

          <div className="space-y-2.5">
            {sortedSectors.map(([sector, count]) => {
              const percentage = factories.length > 0 ? Math.round((count / factories.length) * 100) : 0;
              return (
                <div key={sector} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{sector}</span>
                    <span className="text-slate-400 font-mono font-bold">
                      {count} مصانع ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            الكثافة الصناعية حسب المدينة والمنطقة
          </h3>

          <div className="space-y-2.5">
            {sortedCities.map(([city, count]) => {
              const percentage = factories.length > 0 ? Math.round((count / factories.length) * 100) : 0;
              return (
                <div key={city} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{city}</span>
                    <span className="text-slate-400 font-mono font-bold">
                      {count} منشآت ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

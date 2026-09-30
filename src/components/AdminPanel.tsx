import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Check, 
  X, 
  AlertTriangle, 
  Building2, 
  MapPin, 
  Star, 
  CheckCircle2, 
  Layers, 
  Users, 
  BarChart, 
  Tag, 
  RefreshCw,
  Search
} from 'lucide-react';
import { Factory, INDUSTRIAL_SECTORS } from '../types';
import { approveFactoryWithAI, rejectFactory, verifyFactoryLocation } from '../services/dataService';
import { ModalShell } from './ModalShell';

interface AdminPanelProps {
  factories: Factory[];
  onFactoryUpdated: () => void;
  onSelectFactory: (factory: Factory) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  factories,
  onFactoryUpdated,
  onSelectFactory,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingFactory, setRejectingFactory] = useState<Factory | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminTab, setAdminTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [aiClassificationNotice, setAiClassificationNotice] = useState<string | null>(null);

  const pendingFactories = factories.filter((f) => f.status === 'pending');
  const approvedFactories = factories.filter((f) => f.status === 'approved');

  const handleApproveWithAI = async (factory: Factory) => {
    try {
      setLoadingId(factory.id);
      setAiClassificationNotice(`جاري استدعاء نموذج الذكاء الاصطناعي لتصنيف مصنع "${factory.name}"...`);
      
      const approved = await approveFactoryWithAI(factory.id);
      
      setAiClassificationNotice(
        `✓ تم اعتماد المصنع وتصنيفه ذكياً في قطاع: [${approved.sectors.join('، ')}] بنجاح!`
      );
      setTimeout(() => setAiClassificationNotice(null), 5000);
      onFactoryUpdated();
    } catch (e: any) {
      console.error('Approval failed:', e);
      setAiClassificationNotice('حدث خطأ أثناء الاعتماد: ' + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingFactory || !rejectionReason.trim()) return;

    try {
      setLoadingId(rejectingFactory.id);
      await rejectFactory(rejectingFactory.id, rejectionReason.trim());
      setRejectingFactory(null);
      setRejectionReason('');
      onFactoryUpdated();
    } catch (e) {
      console.error('Rejection failed:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleVerifyLocation = async (factory: Factory) => {
    try {
      setLoadingId(factory.id);
      await verifyFactoryLocation(factory.id, !factory.isLocationVerified);
      onFactoryUpdated();
    } catch (e: any) {
      console.error('Failed to toggle location verification:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const displayList =
    adminTab === 'pending'
      ? pendingFactories
      : adminTab === 'approved'
      ? approvedFactories
      : factories;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* Admin Panel Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-100">
                لوحة تدقيق الإدارة والاعتماد الذكي
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                مشرف النظام
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مراجعة صفحات المصانع وتفعيلها وتصنيفها الآلي بالذكاء الاصطناعي قبل ظهورها للعامة
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">بانتظار المراجعة</span>
            <span className="text-base font-extrabold text-amber-400">{pendingFactories.length}</span>
          </div>
          <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">المصانع المعتمدة</span>
            <span className="text-base font-extrabold text-emerald-400">{approvedFactories.length}</span>
          </div>
        </div>
      </div>

      {/* AI Notification Banner */}
      {aiClassificationNotice && (
        <div className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{aiClassificationNotice}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setAdminTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            adminTab === 'pending'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>قيد المراجعة والتدقيق</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-900/50">
            {pendingFactories.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('approved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            adminTab === 'approved'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>المصانع المعتمدة والمفعلة</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-900/50">
            {approvedFactories.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            adminTab === 'all'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>كافة المنشآت ({factories.length})</span>
        </button>
      </div>

      {/* Factories Moderation Queue */}
      <div className="space-y-4">
        {displayList.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">لا توجد مصانع في هذا القسم حالياً</p>
            <p className="text-xs text-slate-500 mt-1">
              جميع الطلبات تم تدقيقها وتصنيفها والرد عليها بالكامل.
            </p>
          </div>
        ) : (
          displayList.map((factory) => {
            const isPending = factory.status === 'pending';
            const isProcessing = loadingId === factory.id;

            return (
              <div
                key={factory.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isPending ? '⏳ بانتظار الموافقة' : '✓ معتمد للعامة'}
                    </span>
                    <h3 className="font-bold text-base text-slate-100">{factory.name}</h3>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{factory.city} - {factory.industrialArea} ({factory.address})</span>
                  </p>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {factory.description}
                  </p>

                  {/* Officers & Sectors snapshot */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="text-[11px] text-slate-400">
                      مسؤول المبيعات: <strong className="text-slate-200">{factory.salesOfficer?.name}</strong> ({factory.salesOfficer?.phone})
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] text-slate-400">
                      القطاعات: <strong className="text-amber-400">{factory.sectors?.join(', ')}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <button
                    onClick={() => handleToggleVerifyLocation(factory)}
                    disabled={isProcessing}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1 transition-all ${
                      factory.isLocationVerified
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                        : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title={factory.isLocationVerified ? 'الموقع معتمد ومدقق - انقر للإلغاء' : 'انقر لاعتماد الموقع الجغرافي بالـ GPS'}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{factory.isLocationVerified ? '✓ موقع معتمد' : 'اعتماد الموقع'}</span>
                  </button>

                  <button
                    onClick={() => onSelectFactory(factory)}
                    className="flex-1 md:flex-none px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors"
                  >
                    معاينة كاملة
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => handleApproveWithAI(factory)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isProcessing ? 'جاري التصنيف الذكي...' : 'موافقة وتصنيف بالذكاء الاصطناعي'}
                      </button>

                      <button
                        onClick={() => setRejectingFactory(factory)}
                        disabled={isProcessing}
                        className="p-2 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors"
                        title="رفض مع إبداء السبب"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectingFactory && (
        <ModalShell id="admin-reject" open={!!rejectingFactory} onClose={() => setRejectingFactory(null)} rootClassName="p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              رفض طلب تسجيل المصنع: {rejectingFactory.name}
            </h3>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  سبب الرفض (سيتم إرسال هذا التنبيه لمالك المصنع لتعديل بياناته):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="مثال: يرجى توضيح موقع المصنع بشكل أدق على الخريطة وإضافة رقم هاتف مبيعات صحيح..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingFactory(null)}
                  className="px-4 py-2 text-xs bg-slate-800 rounded-xl text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl"
                >
                  تأكيد الرفض
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

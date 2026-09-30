import React from 'react';
import { 
  MapPin, 
  MessageSquare, 
  Plus, 
  PackageCheck, 
  Menu, 
  ShieldCheck, 
  BarChart3, 
  Code2, 
  X,
  LogOut,
  User,
  Sparkles,
  ExternalLink,
  FileSpreadsheet,
  Boxes,
  Smartphone
} from 'lucide-react';
import { logoutUser } from '../lib/firebase';
import { ModalShell } from './ModalShell';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenRegister: () => void;
  unreadNotifsCount: number;
  isAdmin: boolean;
  currentUser: any;
  showMoreMenu: boolean;
  setShowMoreMenu: (show: boolean) => void;
  onOpenRFQ?: () => void;
  onOpenRawMaterials?: () => void;
  onOpenPwaInstall?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenRegister,
  unreadNotifsCount,
  isAdmin,
  currentUser,
  showMoreMenu,
  setShowMoreMenu,
  onOpenRFQ,
  onOpenRawMaterials,
  onOpenPwaInstall
}) => {
  return (
    <>
      {/* Native-style Bottom App Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 text-slate-400 select-none pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.4)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          
          {/* Tab 1: Map */}
          <button
            onClick={() => {
              setActiveTab('map');
              setShowMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 h-full transition-transform active:scale-90 ${
              activeTab === 'map' && !showMoreMenu
                ? 'text-amber-400 font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MapPin className="w-5 h-5" />
              {activeTab === 'map' && !showMoreMenu && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-[10px] mt-1">الخريطة</span>
          </button>

          {/* Tab 2: Chat & Messages */}
          <button
            onClick={() => {
              setActiveTab('chat');
              setShowMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 h-full relative transition-transform active:scale-90 ${
              activeTab === 'chat' && !showMoreMenu
                ? 'text-amber-400 font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
              {activeTab === 'chat' && !showMoreMenu && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-[10px] mt-1">المراسلات</span>
          </button>

          {/* Center Action Button: Register Factory */}
          <div className="relative -top-3">
            <button
              onClick={() => {
                onOpenRegister();
                setShowMoreMenu(false);
              }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex flex-col items-center justify-center shadow-lg shadow-amber-500/35 border-2 border-slate-900 transition-transform active:scale-90"
              title="إضافة مصنع جديد"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
              <span className="text-[8px] font-black -mt-0.5">أضف</span>
            </button>
          </div>

          {/* Tab 3: Orders */}
          <button
            onClick={() => {
              setActiveTab('orders');
              setShowMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center w-14 h-full transition-transform active:scale-90 ${
              activeTab === 'orders' && !showMoreMenu
                ? 'text-amber-400 font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <PackageCheck className="w-5 h-5" />
              {activeTab === 'orders' && !showMoreMenu && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-[10px] mt-1">الطلبات</span>
          </button>

          {/* Tab 4: More / Menu */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center w-14 h-full transition-transform active:scale-90 ${
              showMoreMenu || ['admin', 'reports', 'api'].includes(activeTab)
                ? 'text-amber-400 font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              {isAdmin && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <span className="text-[10px] mt-1">المزيد</span>
          </button>
        </div>
      </nav>

      {/* Slide-up "More" Drawer / Bottom Sheet */}
      {showMoreMenu && (
        <ModalShell id="more-menu" open={showMoreMenu} onClose={() => setShowMoreMenu(false)} align="bottom">
          <div 
            className="w-full bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-in slide-in-from-bottom-5 duration-200"
          >
            {/* Grab handle bar */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-100">القوائم الإضافية والخدمات</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {onOpenRFQ && (
                <button
                  onClick={() => {
                    onOpenRFQ();
                    setShowMoreMenu(false);
                  }}
                  className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right flex flex-col justify-between transition-all active:scale-95"
                >
                  <FileSpreadsheet className="w-5 h-5 text-amber-400 mb-1" />
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">المناقصات الفورية</span>
                    <span className="text-[10px] text-slate-400">طلبات عروض الأسعار B2B والتنافس</span>
                  </div>
                </button>
              )}

              {onOpenRawMaterials && (
                <button
                  onClick={() => {
                    onOpenRawMaterials();
                    setShowMoreMenu(false);
                  }}
                  className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-right flex flex-col justify-between transition-all active:scale-95"
                >
                  <Boxes className="w-5 h-5 text-emerald-400 mb-1" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">بورصة الخامات</span>
                    <span className="text-[10px] text-slate-400">فائض الإنتاج والمستلزمات والسكراب</span>
                  </div>
                </button>
              )}

              {onOpenPwaInstall && (
                <button
                  onClick={() => {
                    onOpenPwaInstall();
                    setShowMoreMenu(false);
                  }}
                  className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-right flex flex-col justify-between transition-all active:scale-95"
                >
                  <Smartphone className="w-5 h-5 text-sky-400 mb-1" />
                  <div>
                    <span className="text-xs font-bold text-sky-300 block">تثبيت التطبيق (PWA)</span>
                    <span className="text-[10px] text-slate-400">تشغيل كتطبيق أصلي وإشعارات الصفقات</span>
                  </div>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setShowMoreMenu(false);
                  }}
                  className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-right flex flex-col justify-between transition-all active:scale-95"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">تدقيق الإدارة</span>
                    <span className="text-[10px] text-slate-400">مراجعة واعتماد المصانع بالذكاء الاصطناعي</span>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTab('reports');
                  setShowMoreMenu(false);
                }}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-right flex flex-col justify-between transition-all active:scale-95"
              >
                <BarChart3 className="w-5 h-5 text-amber-400 mb-1" />
                <div>
                  <span className="text-xs font-bold text-slate-100 block">التقارير الصناعية</span>
                  <span className="text-[10px] text-slate-400">تحليلات القطاعات والكثافة الجغرافية</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('api');
                  setShowMoreMenu(false);
                }}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-right flex flex-col justify-between transition-all active:scale-95"
              >
                <Code2 className="w-5 h-5 text-blue-400 mb-1" />
                <div>
                  <span className="text-xs font-bold text-slate-100 block">واجهة المطورين API</span>
                  <span className="text-[10px] text-slate-400">ربط أنظمة الـ ERP الخارجية</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onOpenRegister();
                  setShowMoreMenu(false);
                }}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-right flex flex-col justify-between transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 text-emerald-400 mb-1" />
                <div>
                  <span className="text-xs font-bold text-slate-100 block">تسجيل مصنع جديد</span>
                  <span className="text-[10px] text-slate-400">إضافة منشأة وتحديد الموقع</span>
                </div>
              </button>
            </div>

            {/* User Profile Bar in Sheet */}
            {currentUser && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-100">{currentUser.displayName || currentUser.email}</p>
                    <span className="text-[10px] text-amber-400">{isAdmin ? 'مشرف المنصة العام' : 'مستخدم موثق'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logoutUser();
                    setShowMoreMenu(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 hover:bg-red-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  خروج
                </button>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </>
  );
};

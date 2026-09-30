import React from 'react';
import { 
  MapPin, 
  PlusCircle, 
  MessageSquare, 
  PackageCheck, 
  ShieldCheck, 
  BarChart3, 
  Code2, 
  Bell, 
  LogIn, 
  LogOut, 
  Factory as FactoryIcon,
  User as UserIcon,
  Sparkles,
  FileSpreadsheet,
  Boxes,
  Smartphone
} from 'lucide-react';
import { loginWithGoogle, logoutUser } from '../lib/firebase';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenRegister: () => void;
  onOpenNotifications: () => void;
  unreadNotifsCount: number;
  currentUser: any;
  isAdmin: boolean;
  officerRoleSummary?: {
    isSales: boolean;
    isPurchasing: boolean;
    isOwner: boolean;
    salesFactoryNames: string[];
    purchasingFactoryNames: string[];
    ownedFactoryNames: string[];
  };
  onOpenRFQ?: () => void;
  onOpenRawMaterials?: () => void;
  onOpenPwaInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenRegister,
  onOpenNotifications,
  unreadNotifsCount,
  currentUser,
  isAdmin,
  officerRoleSummary,
  onOpenRFQ,
  onOpenRawMaterials,
  onOpenPwaInstall
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo & Platform Name */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform" 
            onClick={() => setActiveTab('map')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/25 text-slate-950 font-black shrink-0">
              <FactoryIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                  Factory Map
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  خريطة المصانع
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                المنصة الصناعية الموحدة للمبيعات والمشتريات
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                activeTab === 'map'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              الخريطة والبحث
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all relative ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              المراسلات والرد الآلي
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                AI
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              الطلبات وعقود التوريد
            </button>

            {onOpenRFQ && (
              <button
                onClick={onOpenRFQ}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-amber-300 hover:text-white hover:bg-amber-500/10 border border-amber-500/30 transition-all font-semibold"
                title="نظام طلبات عروض الأسعار والمناقصات الفورية"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>المناقصات الفورية</span>
              </button>
            )}

            {onOpenRawMaterials && (
              <button
                onClick={onOpenRawMaterials}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/30 transition-all font-semibold"
                title="بورصة الخامات وفائض الإنتاج ومستلزمات المصانع"
              >
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>بورصة الخامات</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeTab === 'admin'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                تدقيق الإدارة
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </button>
            )}

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                activeTab === 'reports'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              التقارير
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                activeTab === 'api'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              API
            </button>
          </nav>

          {/* Action Buttons & Auth */}
          <div className="flex items-center gap-2">
            
            {/* Install PWA button */}
            {onOpenPwaInstall && (
              <button
                onClick={onOpenPwaInstall}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-all active:scale-95"
                title="تثبيت التطبيق على الهاتف أو الحاسوب (PWA)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">تثبيت التطبيق</span>
              </button>
            )}

            {/* Desktop-only Add Factory button */}
            <button
              onClick={onOpenRegister}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة صفحة مصنع</span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors active:scale-90"
              title="التنبيهات الفورية"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>

            {/* User Profile or Google Sign In */}
            {currentUser ? (
              <div className="flex items-center gap-2 pr-1 border-r border-slate-800">
                <div className="flex items-center gap-1.5 text-xs">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-8 h-8 rounded-full border border-amber-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="hidden lg:block text-right">
                    <p className="font-semibold text-slate-200 truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <span className="text-[10px] text-amber-400 block truncate max-w-[150px] font-bold">
                      {isAdmin 
                        ? '👑 مشرف المنصة' 
                        : officerRoleSummary?.isSales 
                        ? `💼 مبيعات: ${officerRoleSummary.salesFactoryNames[0] || 'مصنع'}` 
                        : officerRoleSummary?.isPurchasing 
                        ? `🛒 مشتريات: ${officerRoleSummary.purchasingFactoryNames[0] || 'مصنع'}` 
                        : officerRoleSummary?.isOwner 
                        ? `🏭 مالك: ${officerRoleSummary.ownedFactoryNames[0] || 'مصنع'}` 
                        : 'مستخدم مسجل'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => logoutUser()}
                  className="hidden md:block p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => loginWithGoogle()}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>دخول</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

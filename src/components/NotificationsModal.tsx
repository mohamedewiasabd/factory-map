import React from 'react';
import { 
  X, 
  Bell, 
  Check, 
  Clock, 
  PackageCheck, 
  ShieldCheck, 
  MessageSquare, 
  Star,
  ExternalLink
} from 'lucide-react';
import { NotificationItem } from '../types';
import { markNotificationAsRead } from '../services/dataService';
import { ModalShell } from './ModalShell';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onSelectNotification: (notif: NotificationItem) => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectNotification,
  onMarkAllRead
}) => {
  if (!isOpen) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order_status':
        return <PackageCheck className="w-5 h-5 text-emerald-400" />;
      case 'factory_approval':
        return <ShieldCheck className="w-5 h-5 text-blue-400" />;
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-amber-400" />;
      case 'review':
        return <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <ModalShell id="notifications" open={isOpen} onClose={onClose} align="bottom" rootClassName="p-0 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[80vh] pb-[env(safe-area-inset-bottom)]">
        
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-12 h-1 bg-slate-700 rounded-full mx-auto mt-2" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-3 sm:py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">التنبيهات والإشعارات الفورية</h3>
              <p className="text-[11px] text-slate-400">تحديثات الأوامر، الموافقات، والرسائل الجديدة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                تحديد الكل كمقروء
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              لا توجد تنبيهات جديدة في الوقت الحالي.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  onSelectNotification(notif);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  !notif.read
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-100">{notif.title}</h4>
                    <span className="text-[10px] text-slate-500">
                      {new Date(notif.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
};

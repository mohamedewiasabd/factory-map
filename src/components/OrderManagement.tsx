import React, { useState, useEffect } from 'react';
import { 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  Search, 
  Filter, 
  FileText, 
  Plus, 
  ChevronRight, 
  Building2, 
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Order, OrderStatus, Factory } from '../types';
import { fetchOrders, updateOrderStatus, createOrder } from '../services/dataService';
import { ModalShell } from './ModalShell';

interface OrderManagementProps {
  currentUser: any;
  factories: Factory[];
  isAdmin: boolean;
  highlightOrderId?: string;
  onOpenCreateOrderModal?: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  currentUser,
  factories,
  isAdmin,
  highlightOrderId,
  onOpenCreateOrderModal
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Update Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('accepted');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Manual New Order Modal
  const [showManualCreateModal, setShowManualCreateModal] = useState(false);
  const [orderFactoryId, setOrderFactoryId] = useState('');
  const [orderTitle, setOrderTitle] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(100);
  const [orderUnit, setOrderUnit] = useState('قطعة');
  const [orderTargetPrice, setOrderTargetPrice] = useState(150);
  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    loadOrders();
  }, [currentUser]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);

      if (highlightOrderId) {
        const found = data.find((o) => o.id === highlightOrderId);
        if (found) setSelectedOrder(found);
      }
    } catch (e) {
      console.error('Error loading orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const userEmail = currentUser?.email?.toLowerCase().trim();
  const factoryForSelectedOrder = factories.find((f) => f.id === selectedOrder?.factoryId);
  const isSalesForSelectedOrder = factoryForSelectedOrder?.salesOfficer?.email?.toLowerCase().trim() === userEmail;
  const isPurchasingForSelectedOrder = factoryForSelectedOrder?.purchasingOfficer?.email?.toLowerCase().trim() === userEmail;
  const isOwnerForSelectedOrder = factoryForSelectedOrder?.ownerEmail?.toLowerCase().trim() === userEmail || factoryForSelectedOrder?.ownerId === currentUser?.uid;
  const canManageSelectedOrder = isAdmin || isOwnerForSelectedOrder || isSalesForSelectedOrder || isPurchasingForSelectedOrder;

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !canManageSelectedOrder) return;

    try {
      setUpdating(true);
      const rolePrefix = isSalesForSelectedOrder 
        ? `[مسؤول المبيعات: ${factoryForSelectedOrder?.salesOfficer?.name}] ` 
        : isPurchasingForSelectedOrder
        ? `[مسؤول المشتريات: ${factoryForSelectedOrder?.purchasingOfficer?.name}] `
        : isOwnerForSelectedOrder
        ? `[إدارة المصنع] `
        : `[إدارة المنصة] `;

      const updated = await updateOrderStatus(selectedOrder.id, targetStatus, rolePrefix + (statusNote || 'تحديث حالة الطلب'));
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSelectedOrder(updated);
      setShowStatusModal(false);
      setStatusNote('');
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !orderFactoryId || !orderTitle) return;

    const factory = factories.find((f) => f.id === orderFactoryId);
    if (!factory) return;

    try {
      setUpdating(true);
      const newOrder = await createOrder({
        factoryId: factory.id,
        factoryName: factory.name,
        factoryOwnerId: factory.ownerId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'العميل',
        buyerEmail: currentUser.email || '',
        buyerPhone: currentUser.phoneNumber || '',
        title: orderTitle,
        quantity: Number(orderQuantity),
        unit: orderUnit,
        targetPrice: Number(orderTargetPrice),
        totalAmount: Number(orderQuantity) * Number(orderTargetPrice),
        currency: 'EGP',
        notes: orderNotes,
        status: 'pending',
        source: 'manual',
      });

      setOrders([newOrder, ...orders]);
      setSelectedOrder(newOrder);
      setShowManualCreateModal(false);
      // Reset form
      setOrderTitle('');
      setOrderNotes('');
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setUpdating(false);
    }
  };

  // KPIs
  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const acceptedCount = orders.filter((o) => o.status === 'accepted' || o.status === 'in_production').length;
  const completedCount = orders.filter((o) => o.status === 'delivered').length;
  const totalVolume = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = o.title.toLowerCase().includes(q);
      const matchFactory = o.factoryName.toLowerCase().includes(q);
      const matchBuyer = o.buyerName.toLowerCase().includes(q);
      if (!matchTitle && !matchFactory && !matchBuyer) return false;
    }
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            قيد المراجعة والتأكيد
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3" />
            تم قبول الطلب
          </span>
        );
      case 'in_production':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <TrendingUp className="w-3 h-3" />
            جاري التصنيع والتجهيز
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Truck className="w-3 h-3" />
            تم الشحن والتوريد
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            تم الاستلام بنجاح
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            ملغي
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">إجمالي الطلبات</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">{totalOrdersCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">القيمة التقديرية الكلية</p>
            <h3 className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
              {totalVolume.toLocaleString()} EGP
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">طلبات قيد المراجعة</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{pendingCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold">قيد التصنيع والمكتملة</p>
            <h3 className="text-xl sm:text-2xl font-black text-blue-400 mt-1">{acceptedCount + completedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Order View Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث برقم الطلب، اسم المصنع، الصنف، أو المشتري..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-800 text-slate-200 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="accepted">تم القبول</option>
              <option value="in_production">قيد التصنيع</option>
              <option value="shipped">تم الشحن</option>
              <option value="delivered">تم التسليم</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowManualCreateModal(true)}
          className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          إنشاء أمر شراء جديد
        </button>
      </div>

      {/* Orders List & Selected Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table / List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-850">
            <h3 className="text-sm font-bold text-slate-100">
              قائمة أوامر الشراء وعقود التوريد ({filteredOrders.length})
            </h3>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              لا توجد طلبات مطابقة للبحث أو الفلتر المختار.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-r-4 border-amber-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-400">
                          #{order.id.slice(-6)}
                        </span>
                        {getStatusBadge(order.status)}
                        {order.source === 'ai_chat' && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.2 rounded-full font-bold">
                            عبر الرد الآلي
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-100">{order.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400">🏭 {order.factoryName}</span>
                        <span>•</span>
                        <span>بواسطة: {order.buyerName}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-400 font-mono">
                        {order.totalAmount ? `${order.totalAmount.toLocaleString()} ${order.currency || 'EGP'}` : 'تسعير عند الاتفاق'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.quantity} {order.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Order Detailed Sidebar */}
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between ${
          !selectedOrder ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">
                      أمر شراء #{selectedOrder.id.slice(-6)}
                    </span>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="lg:hidden text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-md bg-slate-800"
                    >
                      إغلاق ✕
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-0.5">
                    {selectedOrder.title}
                  </h3>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">المصنع المورد:</span>
                  <span className="font-bold text-slate-200">{selectedOrder.factoryName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المشتري:</span>
                  <span className="font-bold text-slate-200">{selectedOrder.buyerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الكمية:</span>
                  <span className="font-bold text-slate-200">
                    {selectedOrder.quantity} {selectedOrder.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">إجمالي القيمة:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {selectedOrder.totalAmount?.toLocaleString()} {selectedOrder.currency || 'EGP'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">تاريخ الطلب:</span>
                  <span className="text-slate-300">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="text-xs">
                  <span className="text-slate-400 font-bold block mb-1">الملاحظات والمواصفات:</span>
                  <p className="p-2.5 bg-slate-800/60 rounded-xl text-slate-300 leading-relaxed">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Order Status History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-amber-400 mb-2">سجل تتبع الحالة (Tracking):</h4>
                <div className="space-y-2">
                  {selectedOrder.trackingUpdates?.map((track, i) => (
                    <div
                      key={i}
                      className="p-2 bg-slate-850 rounded-xl border border-slate-800 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>{track.note}</span>
                        <span className="text-slate-500 font-normal">
                          {new Date(track.timestamp).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        بواسطة: {track.updatedBy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Officer Authorization Banner */}
              {canManageSelectedOrder ? (
                <div className="space-y-3 pt-2">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-200">
                        {isSalesForSelectedOrder
                          ? `أنت مسؤول المبيعات المعتمد (${factoryForSelectedOrder?.salesOfficer?.name})`
                          : isPurchasingForSelectedOrder
                          ? `أنت مسؤول المشتريات المعتمد (${factoryForSelectedOrder?.purchasingOfficer?.name})`
                          : isOwnerForSelectedOrder
                          ? `أنت مالك المصنع (${factoryForSelectedOrder?.name})`
                          : 'صلاحيات المشرف العام'}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        حسابك ({userEmail}) مخول رسمياً بإدارة الطلب وتحديث مراحل الإنتاج والشحن.
                      </p>
                    </div>
                  </div>

                  {/* Change Status Action Button */}
                  <button
                    onClick={() => {
                      setTargetStatus(selectedOrder.status);
                      setShowStatusModal(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                  >
                    <TrendingUp className="w-4 h-4" />
                    تحديث حالة الطلب وإرسال تنبيه للمشتري
                  </button>
                </div>
              ) : (
                <div className="bg-slate-800/40 p-2.5 rounded-xl text-[11px] text-slate-400 border border-slate-800 text-center">
                  أنت مسجل كمشتري/متابع لهذا الطلب. التحديثات تدار بواسطة مسؤول مبيعات المصنع.
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileText className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-xs">اختر أي أمر شراء من القائمة لعرض كامل تفاصيله وسجل التتبع</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Update Order Status */}
      {showStatusModal && selectedOrder && (
        <ModalShell id="order-status" open={showStatusModal && !!selectedOrder} onClose={() => setShowStatusModal(false)} rootClassName="p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              تحديث حالة الطلب #{selectedOrder.id.slice(-6)}
            </h3>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اختر الحالة الجديدة:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                  className="w-full py-2 px-3 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-200"
                >
                  <option value="pending">قيد المراجعة</option>
                  <option value="accepted">تم قبول الطلب (Accepted)</option>
                  <option value="in_production">قيد التصنيع والتجهيز (In Production)</option>
                  <option value="shipped">تم الشحن والتوريد (Shipped)</option>
                  <option value="delivered">تم الاستلام بنجاح (Delivered)</option>
                  <option value="cancelled">ملغي (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ملاحظة التحديث أو تفاصيل الشحن (ستصل كتنبيه للمشتري):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="مثال: تم الانتهاء من فحص الجودة وخروج سيارة الشحن متجهة إلى موقع التسليم..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-xs bg-slate-800 rounded-xl text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl"
                >
                  {updating ? 'جاري التحديث...' : 'تحديث وإرسال التنبيه'}
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}

      {/* Modal: Manual Create Order */}
      {showManualCreateModal && (
        <ModalShell id="order-create" open={showManualCreateModal} onClose={() => setShowManualCreateModal(false)} rootClassName="p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              إنشاء أمر شراء / طلب تسعير وتوريد جديد
            </h3>

            <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">اختر المصنع *</label>
                <select
                  required
                  value={orderFactoryId}
                  onChange={(e) => setOrderFactoryId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200"
                >
                  <option value="">-- حدد المصنع المورد --</option>
                  {factories.filter((f) => f.status === 'approved').map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} - {f.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">عنوان الطلبية أو الصنف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: توريد 10,000 كرتونة خماسية الطبقات مقاس 40x30"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الكمية *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={orderUnit}
                    onChange={(e) => setOrderUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">سعر الوحدة التقديري</label>
                  <input
                    type="number"
                    min={0}
                    value={orderTargetPrice}
                    onChange={(e) => setOrderTargetPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ملاحظات ومواصفات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="المواصفات الفنية، مواعيد الاستلام المستهدفة، أو شروط التغليف..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl"
                >
                  {updating ? 'جاري الإرسال...' : 'تأكيد وإرسال للمصنع'}
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

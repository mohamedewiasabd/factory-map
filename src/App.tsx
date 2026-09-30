import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, SUPER_ADMIN_EMAIL, resumeNativeAuth } from './lib/firebase';
import { Factory, NotificationItem, Order, RFQItem, RawMaterialListing } from './types';
import { 
  fetchFactories, 
  createFactory, 
  updateFactoryDetails, 
  fetchOrders, 
  fetchUserNotifications, 
  markNotificationAsRead,
  fetchRFQs,
  fetchRawMaterials
} from './services/dataService';
import { Navbar } from './components/Navbar';
import { FactoryMap } from './components/FactoryMap';
import { FactoryDetailsModal } from './components/FactoryDetailsModal';
import { RegisterFactoryModal } from './components/RegisterFactoryModal';
import { UnifiedChat } from './components/UnifiedChat';
import { OrderManagement } from './components/OrderManagement';
import { AdminPanel } from './components/AdminPanel';
import { ReportsView } from './components/ReportsView';
import { ApiConsole } from './components/ApiConsole';
import { NotificationsModal } from './components/NotificationsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SmartRFQModal } from './components/SmartRFQModal';
import { RawMaterialsMarketModal } from './components/RawMaterialsMarketModal';
import { DigitalProfileModal } from './components/DigitalProfileModal';
import { CatalogModal } from './components/CatalogModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Factories & Orders State
  const [factories, setFactories] = useState<Factory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialListing[]>([]);

  // Modals & Chat Flow State
  const [selectedFactoryForModal, setSelectedFactoryForModal] = useState<Factory | null>(null);
  const [selectedFactoryForQR, setSelectedFactoryForQR] = useState<Factory | null>(null);
  const [selectedFactoryForCatalog, setSelectedFactoryForCatalog] = useState<Factory | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [isRawMaterialsModalOpen, setIsRawMaterialsModalOpen] = useState(false);
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);

  // Chat initiation state from map/card
  const [chatFactory, setChatFactory] = useState<Factory | null>(null);
  const [chatRole, setChatRole] = useState<'sales' | 'purchasing'>('sales');

  // Highlight order state
  const [highlightOrderId, setHighlightOrderId] = useState<string | undefined>(undefined);

  // Super admin check: user email equals SUPER_ADMIN_EMAIL
  const isAdmin = currentUser?.email === SUPER_ADMIN_EMAIL;

  // Listen to Auth State
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (active) {
        setCurrentUser(user);
        setAuthLoading(false);
      }
    });
    resumeNativeAuth().catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Fetch factories and initial data
  const loadPlatformData = async () => {
    try {
      const [facs, ords] = await Promise.all([fetchFactories(), fetchOrders()]);
      setFactories(facs);
      setOrders(ords);
    } catch (e) {
      console.error('Failed to load initial platform data:', e);
    }
  };

  const loadRFQs = async () => {
    try {
      const data = await fetchRFQs();
      setRfqs(data);
    } catch (e) {
      console.warn('Failed to load RFQs:', e);
    }
  };

  const loadRawMaterialsData = async () => {
    try {
      const data = await fetchRawMaterials();
      setRawMaterials(data);
    } catch (e) {
      console.warn('Failed to load raw materials:', e);
    }
  };

  useEffect(() => {
    loadPlatformData();
    loadRFQs();
    loadRawMaterialsData();
  }, []);

  // Digital Profile direct deep link (?factory=fac-xxx)
  useEffect(() => {
    if (factories.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const factoryId = params.get('factory') || (window.location.hash.startsWith('#factory=') ? window.location.hash.replace('#factory=', '') : null);
    if (factoryId) {
      const found = factories.find((f) => f.id === factoryId);
      if (found) {
        setSelectedFactoryForModal(found);
        setActiveTab('map');
      }
    }
  }, [factories]);

  // Fetch Notifications when user changes
  useEffect(() => {
    if (currentUser) {
      fetchUserNotifications(currentUser.uid)
        .then((notifs) => setNotifications(notifs))
        .catch(() => {});
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  // Handle Register or Update Factory
  const handleSaveFactory = async (factoryData: any) => {
    if (editingFactory) {
      const updated = await updateFactoryDetails(editingFactory.id, factoryData);
      setFactories((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditingFactory(null);
    } else {
      const created = await createFactory(factoryData);
      setFactories((prev) => [created, ...prev]);
    }
    // Refresh list
    loadPlatformData();
  };

  // Start Chat with a factory
  const handleStartChatWithFactory = (factory: Factory, role: 'sales' | 'purchasing') => {
    setChatFactory(factory);
    setChatRole(role);
    setActiveTab('chat');
    setSelectedFactoryForModal(null);
  };

  // Order conversion from chat
  const handleOrderCreatedFromChat = (orderId: string) => {
    setHighlightOrderId(orderId);
    setActiveTab('orders');
    loadPlatformData();
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const userEmail = currentUser?.email?.toLowerCase().trim();
  const salesFactories = factories.filter((f) => f.salesOfficer?.email?.toLowerCase().trim() === userEmail);
  const purchasingFactories = factories.filter((f) => f.purchasingOfficer?.email?.toLowerCase().trim() === userEmail);
  const ownedFactories = factories.filter((f) => f.ownerEmail?.toLowerCase().trim() === userEmail || (currentUser && f.ownerId === currentUser.uid));

  const officerRoleSummary = {
    isSales: salesFactories.length > 0,
    isPurchasing: purchasingFactories.length > 0,
    isOwner: ownedFactories.length > 0,
    salesFactoryNames: salesFactories.map((f) => f.name),
    purchasingFactoryNames: purchasingFactories.map((f) => f.name),
    ownedFactoryNames: ownedFactories.map((f) => f.name),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-amber-500 selection:text-slate-950">
      
      {/* Universal Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRegister={() => {
          setEditingFactory(null);
          setIsRegisterModalOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        unreadNotifsCount={unreadNotifsCount}
        currentUser={currentUser}
        isAdmin={isAdmin}
        officerRoleSummary={officerRoleSummary}
        onOpenRFQ={() => setIsRFQModalOpen(true)}
        onOpenRawMaterials={() => setIsRawMaterialsModalOpen(true)}
        onOpenPwaInstall={() => setIsPwaInstallModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full flex flex-col">
        {activeTab === 'map' && (
          <div className="relative flex-1 w-full h-full flex flex-col">
            <FactoryMap
              factories={factories}
              onSelectFactory={(fac) => setSelectedFactoryForModal(fac)}
              onStartChat={handleStartChatWithFactory}
              currentUserId={currentUser?.uid}
              isAdmin={isAdmin}
              onOpenRFQModal={() => setIsRFQModalOpen(true)}
              onOpenRawMaterialsMarket={() => setIsRawMaterialsModalOpen(true)}
              onOpenDigitalProfile={(fac) => setSelectedFactoryForQR(fac)}
              onOpenCatalog={(fac) => setSelectedFactoryForCatalog(fac)}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <UnifiedChat
            currentUser={currentUser}
            factories={factories}
            initialFactory={chatFactory}
            initialTargetRole={chatRole}
            onOrderCreatedFromChat={handleOrderCreatedFromChat}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'orders' && (
          <div className="pb-24 md:pb-6 flex-1">
            <OrderManagement
              currentUser={currentUser}
              factories={factories}
              isAdmin={isAdmin}
              highlightOrderId={highlightOrderId}
            />
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="pb-24 md:pb-6 flex-1">
            <AdminPanel
              factories={factories}
              onFactoryUpdated={loadPlatformData}
              onSelectFactory={(fac) => setSelectedFactoryForModal(fac)}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="pb-24 md:pb-6 flex-1">
            <ReportsView
              factories={factories}
              orders={orders}
            />
          </div>
        )}

        {activeTab === 'api' && (
          <div className="pb-24 md:pb-6">
            <ApiConsole />
          </div>
        )}
      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <div className="md:hidden">
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenRegister={() => {
            setEditingFactory(null);
            setIsRegisterModalOpen(true);
          }}
          unreadNotifsCount={unreadNotifsCount}
          isAdmin={isAdmin}
          currentUser={currentUser}
          showMoreMenu={showMoreMenu}
          setShowMoreMenu={setShowMoreMenu}
          onOpenRFQ={() => setIsRFQModalOpen(true)}
          onOpenRawMaterials={() => setIsRawMaterialsModalOpen(true)}
          onOpenPwaInstall={() => setIsPwaInstallModalOpen(true)}
        />
      </div>

      {/* Factory Details Modal */}
      <FactoryDetailsModal
        factory={selectedFactoryForModal}
        onClose={() => setSelectedFactoryForModal(null)}
        onStartChat={handleStartChatWithFactory}
        onCreateOrder={(fac) => {
          setSelectedFactoryForModal(null);
          setActiveTab('orders');
        }}
        onEditFactory={(fac) => {
          setSelectedFactoryForModal(null);
          setEditingFactory(fac);
          setIsRegisterModalOpen(true);
        }}
        onFactoryUpdated={(updated) => {
          setFactories((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          setSelectedFactoryForModal(updated);
        }}
        currentUserId={currentUser?.uid}
        isAdmin={isAdmin}
        onOpenDigitalProfile={(fac) => setSelectedFactoryForQR(fac)}
        onOpenCatalog={(fac) => setSelectedFactoryForCatalog(fac)}
      />

      {/* Register/Edit Factory Modal */}
      <RegisterFactoryModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setEditingFactory(null);
        }}
        onSubmit={handleSaveFactory}
        initialData={editingFactory}
        isAdmin={isAdmin}
      />

      {/* Real-time Notifications Center */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onSelectNotification={(notif) => {
          setIsNotificationsModalOpen(false);
          if (notif.type === 'order_status') {
            setActiveTab('orders');
          } else if (notif.type === 'factory_approval') {
            if (isAdmin) {
              setActiveTab('admin');
            } else {
              setActiveTab('map');
            }
          } else if (notif.type === 'new_message') {
            setActiveTab('chat');
          } else if (notif.type === 'rfq_broadcast' || notif.type === 'rfq_bid_received') {
            setIsRFQModalOpen(true);
          }
        }}
        onMarkAllRead={() => {
          notifications.forEach((n) => markNotificationAsRead(n.id));
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
      />

      {/* 1. Smart RFQ & B2B Tenders Modal */}
      <SmartRFQModal
        isOpen={isRFQModalOpen}
        onClose={() => setIsRFQModalOpen(false)}
        rfqs={rfqs}
        onRefreshRFQs={loadRFQs}
        currentUser={currentUser}
        userFactory={ownedFactories[0] || null}
        onStartChatWithFactory={(facId) => {
          const fac = factories.find((f) => f.id === facId);
          if (fac) {
            handleStartChatWithFactory(fac, 'sales');
            setIsRFQModalOpen(false);
          }
        }}
      />

      {/* 2. B2B Raw Materials & Scrap Exchange Modal */}
      <RawMaterialsMarketModal
        isOpen={isRawMaterialsModalOpen}
        onClose={() => setIsRawMaterialsModalOpen(false)}
        listings={rawMaterials}
        onRefreshListings={loadRawMaterialsData}
        userFactory={ownedFactories[0] || null}
        currentUser={currentUser}
      />

      {/* 3. Digital Factory Profile & QR Code Modal */}
      <DigitalProfileModal
        isOpen={!!selectedFactoryForQR}
        onClose={() => setSelectedFactoryForQR(null)}
        factory={selectedFactoryForQR}
      />

      {/* 4. PDF Catalog & Product Showcase Modal */}
      <CatalogModal
        isOpen={!!selectedFactoryForCatalog}
        onClose={() => setSelectedFactoryForCatalog(null)}
        factory={selectedFactoryForCatalog}
      />

      {/* 5. PWA Mobile App Install Prompt */}
      <PwaInstallPrompt
        isOpen={isPwaInstallModalOpen}
        onClose={() => setIsPwaInstallModalOpen(false)}
      />
    </div>
  );
}

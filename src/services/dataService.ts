import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, SUPER_ADMIN_EMAIL } from '../lib/firebase';
import {
  Factory,
  Order,
  Conversation,
  Message,
  Review,
  NotificationItem,
  UserProfile,
  UserRole,
  RFQItem,
  RFQBid,
  RawMaterialListing
} from '../types';
import { INITIAL_APPROVED_FACTORIES } from '../mockData';
import { classifyFactorySectors, askFactoryAutoResponder } from './aiService';

const CACHE_KEY_FACTORIES = 'factory_map_cached_factories_v1';
const CACHE_KEY_ORDERS = 'factory_map_cached_orders_v1';

/**
 * Recursively strips away any `undefined` values from an object or array,
 * which Firestore strictly forbids in setDoc and updateDoc.
 */
export function cleanFirestorePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestorePayload(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// In-memory cache to prevent quota draining
let memoryFactories: Factory[] = [];
let memoryOrders: Order[] = [];
let memoryNotifications: NotificationItem[] = [];

// Initialize local cache
try {
  const local = localStorage.getItem(CACHE_KEY_FACTORIES);
  if (local) {
    memoryFactories = JSON.parse(local);
  }
} catch (e) {}

export async function fetchFactories(forceRefresh = false): Promise<Factory[]> {
  if (memoryFactories.length > 0 && !forceRefresh) {
    return memoryFactories;
  }

  try {
    const colRef = collection(db, 'factories');
    const snapshot = await getDocs(colRef);
    let list: Factory[] = [];

    if (!snapshot.empty) {
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Factory);
      });
    }

    // If Firestore is empty (initial deployment), populate with seed factories
    if (list.length === 0) {
      list = [...INITIAL_APPROVED_FACTORIES];
      // Try writing initial seed in background
      Promise.all(
        list.map((fac) => setDoc(doc(db, 'factories', fac.id), fac).catch(() => {}))
      ).catch(() => {});
    } else {
      // Ensure seed factories are present if not already in list
      const existingIds = new Set(list.map((f) => f.id));
      for (const seed of INITIAL_APPROVED_FACTORIES) {
        if (!existingIds.has(seed.id)) {
          list.push(seed);
        }
      }
    }

    memoryFactories = list;
    try {
      localStorage.setItem(CACHE_KEY_FACTORIES, JSON.stringify(list));
    } catch (e) {}
    return list;
  } catch (error) {
    console.warn('Using cached/initial factories due to Firestore read limit or error:', error);
    if (memoryFactories.length === 0) {
      memoryFactories = [...INITIAL_APPROVED_FACTORIES];
    }
    return memoryFactories;
  }
}

export async function createFactory(factoryData: Omit<Factory, 'id' | 'status' | 'rating' | 'reviewsCount' | 'createdAt' | 'updatedAt'>): Promise<Factory> {
  const user = auth.currentUser;
  const newId = 'fac-' + Date.now();
  const now = new Date().toISOString();

  const newFactory: Factory = {
    ...factoryData,
    id: newId,
    ownerId: user?.uid || 'anonymous',
    ownerEmail: user?.email || '',
    status: 'pending', // Under admin moderation
    rating: 5.0,
    reviewsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const payload = cleanFirestorePayload(newFactory);

  try {
    await setDoc(doc(db, 'factories', newId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `factories/${newId}`);
  }

  // Update memory & local storage cache
  memoryFactories.unshift(newFactory);
  try {
    localStorage.setItem(CACHE_KEY_FACTORIES, JSON.stringify(memoryFactories));
  } catch (e) {}

  // Create notification for admin
  createNotification({
    userId: 'admin',
    title: 'مصنع جديد قيد المراجعة',
    message: `قام ${newFactory.ownerEmail || 'مستخدم'} بتقديم طلب تسجيل مصنع "${newFactory.name}". يرجى المراجعة والتصنيف.`,
    type: 'factory_approval',
    linkId: newId,
  }).catch(() => {});

  return newFactory;
}

export async function approveFactoryWithAI(factoryId: string, customSectors?: string[]): Promise<Factory> {
  const factory = memoryFactories.find((f) => f.id === factoryId);
  if (!factory) {
    throw new Error('Factory not found');
  }

  let finalSectors = customSectors || factory.sectors;
  let aiReason = '';

  // If sectors need AI classification
  if (!customSectors || customSectors.length === 0) {
    try {
      const aiResult = await classifyFactorySectors({
        name: factory.name,
        description: factory.description,
        products: factory.productsList,
      });
      finalSectors = aiResult.sectors;
      aiReason = aiResult.reasoning;
    } catch (e) {
      console.warn('AI classification fallback:', e);
    }
  }

  const updates: Partial<Factory> = {
    status: 'approved',
    sectors: finalSectors,
    approvedAt: new Date().toISOString(),
    approvedBy: auth.currentUser?.email || 'Admin',
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'factories', factoryId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `factories/${factoryId}`);
  }

  // Update memory
  const updatedFactory = { ...factory, ...updates };
  memoryFactories = memoryFactories.map((f) => (f.id === factoryId ? updatedFactory : f));
  try {
    localStorage.setItem(CACHE_KEY_FACTORIES, JSON.stringify(memoryFactories));
  } catch (e) {}

  // Notify owner
  if (factory.ownerId) {
    createNotification({
      userId: factory.ownerId,
      title: 'تمت الموافقة على صفحة مصنعك بنجاح!',
      message: `تم اعتماد مصنع "${factory.name}" وتصنيفه ذكياً في قطاع: ${finalSectors.join('، ')}. يظهر الآن للعامة على الخريطة التفاعلية.`,
      type: 'factory_approval',
      linkId: factoryId,
    }).catch(() => {});
  }

  return updatedFactory;
}

export async function rejectFactory(factoryId: string, reason: string): Promise<Factory> {
  const factory = memoryFactories.find((f) => f.id === factoryId);
  if (!factory) throw new Error('Factory not found');

  const updates: Partial<Factory> = {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'factories', factoryId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `factories/${factoryId}`);
  }

  const updated = { ...factory, ...updates };
  memoryFactories = memoryFactories.map((f) => (f.id === factoryId ? updated : f));

  if (factory.ownerId) {
    createNotification({
      userId: factory.ownerId,
      title: 'تم رفض طلب تسجيل المصنع',
      message: `لم تتم الموافقة على مصنع "${factory.name}". السبب: ${reason}`,
      type: 'factory_approval',
      linkId: factoryId,
    }).catch(() => {});
  }

  return updated;
}

export async function updateFactoryDetails(factoryId: string, updates: Partial<Factory>): Promise<Factory> {
  const factory = memoryFactories.find((f) => f.id === factoryId);
  if (!factory) throw new Error('Factory not found');

  const payload = cleanFirestorePayload({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  try {
    await updateDoc(doc(db, 'factories', factoryId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `factories/${factoryId}`);
  }

  const updated = { ...factory, ...payload };
  memoryFactories = memoryFactories.map((f) => (f.id === factoryId ? updated : f));
  try {
    localStorage.setItem(CACHE_KEY_FACTORIES, JSON.stringify(memoryFactories));
  } catch (e) {}

  return updated;
}

export async function verifyFactoryLocation(factoryId: string, isVerified: boolean): Promise<Factory> {
  const factory = memoryFactories.find((f) => f.id === factoryId);
  if (!factory) throw new Error('Factory not found');

  const updates: Partial<Factory> = {
    isLocationVerified: isVerified,
    updatedAt: new Date().toISOString(),
  };

  if (isVerified) {
    updates.locationVerifiedAt = new Date().toISOString();
    updates.locationVerifiedBy = auth.currentUser?.email || 'Admin';
  }

  const payload = cleanFirestorePayload(updates);

  try {
    await updateDoc(doc(db, 'factories', factoryId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `factories/${factoryId}`);
  }

  const updated = { ...factory, ...updates };
  memoryFactories = memoryFactories.map((f) => (f.id === factoryId ? updated : f));
  try {
    localStorage.setItem(CACHE_KEY_FACTORIES, JSON.stringify(memoryFactories));
  } catch (e) {}

  if (isVerified && factory.ownerId) {
    createNotification({
      userId: factory.ownerId,
      title: 'تم اعتماد وتدقيق الموقع الجغرافي للمصنع',
      message: `تم اعتماد وتوثيق إحداثيات مصنعك "${factory.name}" رسمياً بالـ GPS على الخريطة الصناعية.`,
      type: 'factory_approval',
      linkId: factoryId,
    }).catch(() => {});
  }

  return updated;
}

// ----------------- REVIEWS -----------------
export async function addFactoryReview(factoryId: string, reviewData: { rating: number; comment: string }): Promise<Review> {
  const user = auth.currentUser;
  const newId = 'rev-' + Date.now();
  const review: Review = {
    id: newId,
    factoryId,
    userId: user?.uid || 'anon',
    userName: user?.displayName || user?.email?.split('@')[0] || 'مستخدم المنصة',
    userPhoto: user?.photoURL || undefined,
    rating: reviewData.rating,
    comment: reviewData.comment,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, `factories/${factoryId}/reviews`, newId), review);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `factories/${factoryId}/reviews/${newId}`);
  }

  // Update factory rating in cache & firestore
  const factory = memoryFactories.find((f) => f.id === factoryId);
  if (factory) {
    const newCount = (factory.reviewsCount || 0) + 1;
    const currentRating = factory.rating || 5;
    const newRating = Number(((currentRating * factory.reviewsCount + review.rating) / newCount).toFixed(1));
    updateFactoryDetails(factoryId, { rating: newRating, reviewsCount: newCount }).catch(() => {});

    // Notify factory owner
    if (factory.ownerId) {
      createNotification({
        userId: factory.ownerId,
        title: 'تقييم جديد لمصنعك!',
        message: `أضاف ${review.userName} تقييماً بمعدل ${review.rating} نجوم: "${review.comment.slice(0, 50)}..."`,
        type: 'review',
        linkId: factoryId,
      }).catch(() => {});
    }
  }

  return review;
}

export async function fetchFactoryReviews(factoryId: string): Promise<Review[]> {
  try {
    const colRef = collection(db, `factories/${factoryId}/reviews`);
    const snap = await getDocs(colRef);
    const reviews: Review[] = [];
    snap.forEach((d) => reviews.push({ id: d.id, ...d.data() } as Review));
    return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Reviews fetch fallback');
    return [];
  }
}

// ----------------- ORDERS -----------------
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  const newId = 'ord-' + Date.now();
  const now = new Date().toISOString();

  const newOrder: Order = {
    ...orderData,
    id: newId,
    createdAt: now,
    updatedAt: now,
    trackingUpdates: [
      {
        status: orderData.status || 'pending',
        note: 'تم إنشاء أمر الشراء بنجاح',
        timestamp: now,
        updatedBy: orderData.buyerName || 'المشتري',
      },
    ],
  };

  try {
    await setDoc(doc(db, 'orders', newId), newOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${newId}`);
  }

  memoryOrders.unshift(newOrder);
  try {
    localStorage.setItem(CACHE_KEY_ORDERS, JSON.stringify(memoryOrders));
  } catch (e) {}

  // Notify factory owner
  if (orderData.factoryOwnerId) {
    createNotification({
      userId: orderData.factoryOwnerId,
      title: 'طلب شراء جديد وارد!',
      message: `استلمت طلب شراء جديد "${newOrder.title}" بقيمة ${newOrder.totalAmount || 'تقديرية'} من ${newOrder.buyerName}.`,
      type: 'order_status',
      linkId: newId,
    }).catch(() => {});
  }

  return newOrder;
}

export async function fetchOrders(): Promise<Order[]> {
  const user = auth.currentUser;
  if (memoryOrders.length > 0) return memoryOrders;

  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);
    const list: Order[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
    memoryOrders = list;
    return list;
  } catch (error) {
    console.warn('Orders fetch error or empty:', error);
    return memoryOrders;
  }
}

export async function updateOrderStatus(orderId: string, status: Order['status'], note: string): Promise<Order> {
  const user = auth.currentUser;
  const order = memoryOrders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const now = new Date().toISOString();
  const newTracking = [
    ...(order.trackingUpdates || []),
    {
      status,
      note: note || `تحديث حالة الطلب إلى: ${status}`,
      timestamp: now,
      updatedBy: user?.displayName || user?.email || 'المسؤول',
    },
  ];

  const updates: Partial<Order> = {
    status,
    updatedAt: now,
    trackingUpdates: newTracking,
  };

  try {
    await updateDoc(doc(db, 'orders', orderId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }

  const updated = { ...order, ...updates };
  memoryOrders = memoryOrders.map((o) => (o.id === orderId ? updated : o));

  // Notify buyer of status update
  if (order.buyerId) {
    const statusTitles: Record<string, string> = {
      accepted: 'تم قبول طلب الشراء الخاص بك',
      in_production: 'طلبك الآن قيد التصنيع والتجهيز',
      shipped: 'تم شحن طلبيتك الصناعية',
      delivered: 'تم تسليم طلبيتك بنجاح',
      cancelled: 'تم إلغاء طلب الشراء',
    };

    createNotification({
      userId: order.buyerId,
      title: statusTitles[status] || 'تحديث على طلب الشراء',
      message: `طلب "${order.title}" في مصنع "${order.factoryName}": ${note}`,
      type: 'order_status',
      linkId: orderId,
    }).catch(() => {});
  }

  return updated;
}

// ----------------- NOTIFICATIONS -----------------
export async function createNotification(notif: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>): Promise<NotificationItem> {
  const newId = 'notif-' + Date.now() + Math.random().toString(36).substring(2, 6);
  const item: NotificationItem = {
    ...notif,
    id: newId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'notifications', newId), item);
  } catch (error) {
    // Non blocking fallback
  }

  memoryNotifications.unshift(item);
  return item;
}

export async function fetchUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', '==', userId), limit(30));
    const snap = await getDocs(q);
    const list: NotificationItem[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as NotificationItem));
    // Also include any in-memory alerts
    const local = memoryNotifications.filter((n) => n.userId === userId || n.userId === 'all');
    const merged = [...list, ...local];
    const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());
    return unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return memoryNotifications.filter((n) => n.userId === userId || n.userId === 'all');
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (e) {}
  memoryNotifications = memoryNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
}

// ----------------- CONVERSATIONS & CHAT -----------------
export async function fetchUserConversations(userId: string, managedFactoryIds: string[] = []): Promise<Conversation[]> {
  try {
    const colRef = collection(db, 'conversations');
    const q1 = query(colRef, where('participants', 'array-contains', userId), limit(40));
    const snap1 = await getDocs(q1);
    const map = new Map<string, Conversation>();

    snap1.forEach((d) => {
      map.set(d.id, { id: d.id, ...d.data() } as Conversation);
    });

    // If user is sales or purchasing officer for factories, include those factory conversations
    if (managedFactoryIds && managedFactoryIds.length > 0) {
      // Fetch in chunks of up to 10 for firestore 'in' query
      const chunks = [];
      for (let i = 0; i < managedFactoryIds.length; i += 10) {
        chunks.push(managedFactoryIds.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        try {
          const q2 = query(colRef, where('factoryId', 'in', chunk), limit(40));
          const snap2 = await getDocs(q2);
          snap2.forEach((d) => {
            map.set(d.id, { id: d.id, ...d.data() } as Conversation);
          });
        } catch (e) {
          console.warn('Managed factory conversations fetch warning:', e);
        }
      }
    }

    const list = Array.from(map.values());
    return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  } catch (error) {
    console.warn('Conversations fetch error:', error);
    return [];
  }
}

export async function createConversation(convData: Omit<Conversation, 'id' | 'createdAt' | 'lastMessage' | 'lastMessageAt'>): Promise<Conversation> {
  const newId = 'conv-' + Date.now();
  const now = new Date().toISOString();
  const newConv: Conversation = {
    ...convData,
    id: newId,
    lastMessage: 'بدء المحادثة',
    lastMessageAt: now,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'conversations', newId), newConv);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `conversations/${newId}`);
  }

  return newConv;
}

export async function fetchConversationMessages(convId: string): Promise<Message[]> {
  try {
    const colRef = collection(db, `conversations/${convId}/messages`);
    const snap = await getDocs(colRef);
    const list: Message[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Message));
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    console.warn('Messages fetch error:', error);
    return [];
  }
}

export async function sendMessage(convId: string, msgData: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
  const newId = 'msg-' + Date.now();
  const now = new Date().toISOString();
  const message: Message = {
    ...msgData,
    id: newId,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, `conversations/${convId}/messages`, newId), message);
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: msgData.text.slice(0, 100),
      lastMessageAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `conversations/${convId}/messages/${newId}`);
  }

  return message;
}

// ==========================================
// 8. Smart RFQ & B2B Tenders
// ==========================================
const CACHE_KEY_RFQS = 'factory_map_rfqs_v1';
let memoryRFQs: RFQItem[] = [];

export async function fetchRFQs(): Promise<RFQItem[]> {
  try {
    const colRef = collection(db, 'rfqs');
    const snap = await getDocs(query(colRef, limit(60)));
    const list: RFQItem[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RFQItem));

    if (list.length > 0) {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      memoryRFQs = list;
      try {
        localStorage.setItem(CACHE_KEY_RFQS, JSON.stringify(list));
      } catch (e) {}
      return list;
    }
  } catch (error) {
    console.warn('Firestore RFQ fetch error, using cache/mock:', error);
  }

  // Fallback to local storage or initial RFQs
  try {
    const raw = localStorage.getItem(CACHE_KEY_RFQS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryRFQs = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  // Mock initial sample RFQs
  const initialRFQs: RFQItem[] = [
    {
      id: 'rfq-sample-1',
      title: 'مطلوب توريد 50,000 كرتونة مضلعة 5 طبقات للتصدير',
      sector: 'ورق وطباعة وتغليف',
      quantity: 50000,
      unit: 'كرتونة',
      targetCity: 'السادس من أكتوبر',
      deliveryLocation: 'المنطقة الصناعية الرابعة، 6 أكتوبر',
      deadline: '2026-10-15',
      details: 'مواصفات: كرتون مضلع BC Flute عالي التحمل للرطوبة، طباعة 2 لون للشعار، تسليم خلال أسبوعين.',
      requesterName: 'م. أحمد ممدوح',
      requesterPhone: '01012345678',
      requesterCompany: 'الأندلس للصناعات الغذائية والتصدير',
      requesterId: 'demo-buyer-1',
      status: 'open',
      bids: [
        {
          id: 'bid-1',
          rfqId: 'rfq-sample-1',
          factoryId: 'fac-1',
          factoryName: 'مصنع الأهرام للكرتون المضلع',
          factoryCity: 'العاشر من رمضان',
          factoryPhone: '01223456789',
          factoryWhatsapp: '01223456789',
          pricePerUnit: 14.5,
          totalPrice: 725000,
          currency: 'EGP',
          deliveryDays: 10,
          notes: 'شامل التوصيل لمصنعكم بالسادس من أكتوبر والطباعة بجودة أوفست معتمدة.',
          submittedBy: 'أ. سامح عبد الفتاح',
          submittedByEmail: 'sales@ahram-carton.eg',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        }
      ],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'rfq-sample-2',
      title: 'مطلوب 40 طن قطاعات صاج مجلفن مدهون سماكة 0.7 مم',
      sector: 'حديد وصلب وتشكيل معادن',
      quantity: 40,
      unit: 'طن',
      targetCity: 'العاشر من رمضان',
      deliveryLocation: 'المنطقة B3، العاشر من رمضان',
      deadline: '2026-10-10',
      details: 'صاج صاج مجلفن معالج ضد الصدأ لعنابر وجمالونات، تسليم موقع العمل مباشرة.',
      requesterName: 'م. كريم الشناوي',
      requesterPhone: '01123456780',
      requesterCompany: 'المتحدة للإنشاءات المعدنية',
      requesterId: 'demo-buyer-2',
      status: 'open',
      bids: [],
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    }
  ];

  memoryRFQs = initialRFQs;
  return initialRFQs;
}

export async function createRFQ(rfqData: Omit<RFQItem, 'id' | 'createdAt' | 'updatedAt' | 'bids' | 'status'>): Promise<RFQItem> {
  const newId = 'rfq-' + Date.now();
  const now = new Date().toISOString();
  const newRFQ: RFQItem = {
    ...rfqData,
    id: newId,
    status: 'open',
    bids: [],
    createdAt: now,
    updatedAt: now,
  };

  const payload = cleanFirestorePayload(newRFQ);

  try {
    await setDoc(doc(db, 'rfqs', newId), payload);
  } catch (error) {
    console.warn('Firestore setDoc RFQ error, saving locally:', error);
  }

  memoryRFQs = [newRFQ, ...memoryRFQs];
  try {
    localStorage.setItem(CACHE_KEY_RFQS, JSON.stringify(memoryRFQs));
  } catch (e) {}

  // Broadcast Notification to all factories matching this sector!
  try {
    const relevantFactories = memoryFactories.filter((f) => 
      Array.isArray(f.sectors) && (f.sectors.includes(newRFQ.sector) || f.sectors.some((s) => newRFQ.sector.includes(s)))
    );

    for (const f of relevantFactories.slice(0, 15)) {
      if (f.ownerId) {
        await createNotification({
          userId: f.ownerId,
          title: `مناقصة جديدة في قطاع ${newRFQ.sector} 📢`,
          message: `طلب توريد جديد: "${newRFQ.title}" بكمية ${newRFQ.quantity} ${newRFQ.unit} في ${newRFQ.targetCity}. نافس وقدم عرضك الآن!`,
          type: 'rfq_broadcast',
          linkId: newId,
        });
      }
    }
  } catch (e) {
    console.warn('Broadcast notification error:', e);
  }

  return newRFQ;
}

export async function submitRFQBid(rfqId: string, bidData: Omit<RFQBid, 'id' | 'createdAt' | 'status' | 'rfqId'>): Promise<RFQBid> {
  const newBidId = 'bid-' + Date.now();
  const now = new Date().toISOString();
  const newBid: RFQBid = {
    ...bidData,
    id: newBidId,
    rfqId,
    status: 'pending',
    createdAt: now,
  };

  const rfqIndex = memoryRFQs.findIndex((r) => r.id === rfqId);
  if (rfqIndex !== -1) {
    memoryRFQs[rfqIndex].bids = [newBid, ...(memoryRFQs[rfqIndex].bids || [])];
    memoryRFQs[rfqIndex].updatedAt = now;
  }

  try {
    const rfqRef = doc(db, 'rfqs', rfqId);
    const snap = await getDoc(rfqRef);
    if (snap.exists()) {
      const existing = snap.data() as RFQItem;
      const updatedBids = [newBid, ...(existing.bids || [])];
      await updateDoc(rfqRef, {
        bids: cleanFirestorePayload(updatedBids),
        updatedAt: now,
      });
    }
  } catch (error) {
    console.warn('Submit bid firestore warning:', error);
  }

  try {
    localStorage.setItem(CACHE_KEY_RFQS, JSON.stringify(memoryRFQs));
  } catch (e) {}

  // Notify RFQ Creator
  if (rfqIndex !== -1 && memoryRFQs[rfqIndex].requesterId) {
    try {
      await createNotification({
        userId: memoryRFQs[rfqIndex].requesterId,
        title: `عرض سعر جديد لمناقصتك 🏷️`,
        message: `قدم مصنع "${newBid.factoryName}" عرض سعر بقيمة ${newBid.pricePerUnit} ${newBid.currency} للوحدة لمناقصة "${memoryRFQs[rfqIndex].title}".`,
        type: 'rfq_bid_received',
        linkId: rfqId,
      });
    } catch (e) {}
  }

  return newBid;
}

export async function acceptRFQBid(rfqId: string, bidId: string): Promise<void> {
  const now = new Date().toISOString();
  const rfq = memoryRFQs.find((r) => r.id === rfqId);
  if (rfq) {
    rfq.status = 'awarded';
    rfq.updatedAt = now;
    if (rfq.bids) {
      rfq.bids.forEach((b) => {
        if (b.id === bidId) b.status = 'accepted';
        else if (b.status === 'pending') b.status = 'rejected';
      });
    }
  }

  try {
    const rfqRef = doc(db, 'rfqs', rfqId);
    const snap = await getDoc(rfqRef);
    if (snap.exists()) {
      const existing = snap.data() as RFQItem;
      const updatedBids = (existing.bids || []).map((b) => {
        if (b.id === bidId) return { ...b, status: 'accepted' };
        if (b.status === 'pending') return { ...b, status: 'rejected' };
        return b;
      });
      await updateDoc(rfqRef, {
        status: 'awarded',
        bids: cleanFirestorePayload(updatedBids),
        updatedAt: now,
      });
    }
  } catch (error) {
    console.warn('Accept bid firestore warning:', error);
  }

  try {
    localStorage.setItem(CACHE_KEY_RFQS, JSON.stringify(memoryRFQs));
  } catch (e) {}
}

// ==========================================
// 9. B2B Raw Materials & Scrap Exchange
// ==========================================
const CACHE_KEY_RAW_MATERIALS = 'factory_map_raw_materials_v1';
let memoryRawMaterials: RawMaterialListing[] = [];

export async function fetchRawMaterials(): Promise<RawMaterialListing[]> {
  try {
    const colRef = collection(db, 'raw_materials');
    const snap = await getDocs(query(colRef, limit(60)));
    const list: RawMaterialListing[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RawMaterialListing));

    if (list.length > 0) {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      memoryRawMaterials = list;
      try {
        localStorage.setItem(CACHE_KEY_RAW_MATERIALS, JSON.stringify(list));
      } catch (e) {}
      return list;
    }
  } catch (error) {
    console.warn('Firestore raw materials fetch warning, using cache/mock:', error);
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY_RAW_MATERIALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryRawMaterials = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  // Sample Raw Materials & Scrap Listings
  const sampleList: RawMaterialListing[] = [
    {
      id: 'raw-1',
      title: 'فائض 8 طن حبيبات بولي إيثيلين HDPE مستوردة',
      category: 'خامات بلاستيك وبوليمرات',
      quantity: 8,
      unit: 'طن',
      pricePerUnit: 48000,
      currency: 'EGP',
      condition: 'new_surplus',
      factoryId: 'fac-plastic-1',
      factoryName: 'النيل للبلاستيك والعبوات',
      city: 'العاشر من رمضان',
      industrialArea: 'المنطقة الصناعية A1',
      contactPhone: '01099887766',
      contactWhatsapp: '01099887766',
      description: 'حبيبات HDPE أصلية خالية من الشوائب معبأة بأكياس 25 كجم، فائض عن خط الإنتاج متوفر للاستلام الفوري.',
      status: 'available',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'raw-2',
      title: 'خردة صاج معالج وقصاصات ليزر نظيفة للتدوير (15 طن)',
      category: 'صاج ومعادن وخردة',
      quantity: 15,
      unit: 'طن',
      pricePerUnit: 22000,
      currency: 'EGP',
      condition: 'recyclable_scrap',
      factoryId: 'fac-laser-1',
      factoryName: 'الدلتا للقص والتشكيل بالليزر',
      city: 'السادس من أكتوبر',
      industrialArea: 'المنطقة الصناعية الثالثة',
      contactPhone: '01211223344',
      contactWhatsapp: '01211223344',
      description: 'قصاصات صاج حديد نظيفة مضغوطة جاهزة للتحميل بمصانع الدرفلة والصهر.',
      status: 'available',
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    },
    {
      id: 'raw-3',
      title: '1,200 بالتة خشبية بحالة ممتازة مقاس 120×100 سم',
      category: 'كرتون وورق وباليتات',
      quantity: 1200,
      unit: 'بالتة',
      pricePerUnit: 140,
      currency: 'EGP',
      condition: 'new_surplus',
      factoryId: 'fac-logistics-1',
      factoryName: 'المصرية للصناعات اللوجستية',
      city: 'مدينة بدر والروبيكي',
      industrialArea: 'المنطقة الصناعية الأولى',
      contactPhone: '01155667788',
      contactWhatsapp: '01155667788',
      description: 'بالتات خشبية زان وبلوط معالجة حرارياً ضد الحشرات ومطابقة لمواصفات التصدير ISPM 15.',
      status: 'available',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    }
  ];

  memoryRawMaterials = sampleList;
  return sampleList;
}

export async function createRawMaterialListing(listingData: Omit<RawMaterialListing, 'id' | 'createdAt' | 'status'>): Promise<RawMaterialListing> {
  const newId = 'raw-' + Date.now();
  const now = new Date().toISOString();
  const newListing: RawMaterialListing = {
    ...listingData,
    id: newId,
    status: 'available',
    createdAt: now,
  };

  const payload = cleanFirestorePayload(newListing);

  try {
    await setDoc(doc(db, 'raw_materials', newId), payload);
  } catch (error) {
    console.warn('Firestore setDoc raw material warning:', error);
  }

  memoryRawMaterials = [newListing, ...memoryRawMaterials];
  try {
    localStorage.setItem(CACHE_KEY_RAW_MATERIALS, JSON.stringify(memoryRawMaterials));
  } catch (e) {}

  return newListing;
}

export async function deleteRawMaterialListing(id: string): Promise<void> {
  memoryRawMaterials = memoryRawMaterials.filter((m) => m.id !== id);
  try {
    localStorage.setItem(CACHE_KEY_RAW_MATERIALS, JSON.stringify(memoryRawMaterials));
    await setDoc(doc(db, 'raw_materials', id), { status: 'sold' }, { merge: true });
  } catch (e) {}
}


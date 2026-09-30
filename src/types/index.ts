export type UserRole = 'admin' | 'owner' | 'sales' | 'purchasing' | 'buyer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export type FactoryStatus = 'pending' | 'approved' | 'rejected';

export interface OfficerInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  notes?: string;
  userId?: string;
}

export interface Factory {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  name: string;
  description: string;
  sectors: string[];
  city: string;
  industrialArea: string;
  address: string;
  lat: number;
  lng: number;
  salesOfficer: OfficerInfo;
  purchasingOfficer: OfficerInfo;
  status: FactoryStatus;
  rejectionReason?: string;
  imageBase64?: string;
  rating: number;
  reviewsCount: number;
  aiAutoResponderEnabled: boolean;
  aiAutoResponderPrompt?: string;
  productsList?: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  
  // Rich Industrial & Location Verification Fields
  isLocationVerified?: boolean; // هل تم تدقيق واعتماد الموقع الجغرافي رسمياً
  locationVerifiedAt?: string;
  locationVerifiedBy?: string;
  establishedYear?: number; // سنة التأسيس
  totalAreaM2?: number; // المساحة الإجمالية بالمتر المربع
  productionCapacity?: string; // الطاقة الإنتاجية (مثلاً: 500 طن شهرياً)
  productionLinesCount?: number; // عدد خطوط الإنتاج
  certifications?: string[]; // شهادات الجودة والاعتمادات (ISO 9001, CE, Halal, إلخ)
  exportMarkets?: string[]; // أسواق ودول التصدير
  isExporter?: boolean; // هل المصنع يصدر للخارج
  commercialRegNo?: string; // رقم السجل التجاري أو الصناعي
  workingDaysHours?: string; // أوقات العمل
  website?: string; // الموقع الإلكتروني
}

export interface Review {
  id: string;
  factoryId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  factoryId: string;
  factoryName: string;
  factoryOwnerId?: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  title: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  totalAmount?: number;
  currency?: string;
  notes?: string;
  status: OrderStatus;
  source: 'manual' | 'ai_chat';
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
  trackingUpdates?: {
    status: OrderStatus;
    note: string;
    timestamp: string;
    updatedBy: string;
  }[];
}

export type ConversationType = 'internal_team' | 'support_admin' | 'b2b_factory';

export interface Conversation {
  id: string;
  type: ConversationType;
  factoryId?: string;
  factoryName?: string;
  targetRole?: 'sales' | 'purchasing' | 'support' | 'team';
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: string;
  isAiActive?: boolean;
  createdAt: string;
}

export interface OrderProposal {
  title: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  currency: string;
  specifications: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  isAi?: boolean;
  orderProposal?: OrderProposal;
  createdAt: string;
}

export type NotificationType =
  | 'order_status'
  | 'factory_approval'
  | 'new_message'
  | 'review'
  | 'rfq_broadcast'
  | 'rfq_bid_received'
  | 'rfq_awarded'
  | 'system';

export interface RFQBid {
  id: string;
  rfqId: string;
  factoryId: string;
  factoryName: string;
  factoryCity?: string;
  factoryPhone?: string;
  factoryWhatsapp?: string;
  pricePerUnit: number;
  totalPrice: number;
  currency: string;
  deliveryDays: number;
  notes?: string;
  submittedBy: string;
  submittedByEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface RFQItem {
  id: string;
  title: string;
  sector: string;
  quantity: number;
  unit: string;
  targetCity: string;
  deliveryLocation: string;
  lat?: number;
  lng?: number;
  deadline?: string;
  details: string;
  requesterName: string;
  requesterPhone: string;
  requesterCompany?: string;
  requesterId: string;
  requesterEmail?: string;
  status: 'open' | 'awarded' | 'closed';
  bids: RFQBid[];
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialListing {
  id: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit?: number;
  currency?: string;
  condition: 'new_surplus' | 'recyclable_scrap' | 'stock_lot';
  factoryId: string;
  factoryName: string;
  city: string;
  industrialArea: string;
  contactPhone: string;
  contactWhatsapp: string;
  description: string;
  imageBase64?: string;
  status: 'available' | 'sold';
  createdAt: string;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  description?: string;
  specifications?: string;
  moq?: string;
  leadTimeDays?: number;
  priceEstimate?: string;
  photoUrl?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export const DEFAULT_INDUSTRIAL_SECTORS = [
  'ملابس ومنسوجات',
  'صناعات غذائية ومشروبات',
  'ورق وطباعة وتغليف',
  'صناعات كيميائية وأسمدة',
  'بلاستيك ومطاط وبوليمرات',
  'صناعات هندسية ومعدنية',
  'حديد وصلب وتشكيل معادن',
  'خشب وأثاث وديكور',
  'صناعات دوائية ومستحضرات تجميل',
  'أجهزة ومستلزمات طبية وجراحية',
  'مواد بناء وسيراميك ورخام',
  'إلكترونيات وأجهزة كهربائية وكابلات',
  'جلود ودباغة ومصنوعات جلدية',
  'طاقة متجددة وبيئة وهيدروجين أخضر',
  'سيارات ومركبات وصناعات مغذية',
  'صناعات بحرية وبناء سفن ومعدات موانئ',
  'صناعات طيران ومسيرات وفضاء',
  'تعدين واستخراج ومعادن ثمينة',
  'زجاج وبلور وبصريات',
  'تدوير ومعالجة نفايات ومياه',
  'أعلاف وثروة حيوانية وداجنة',
  'صناعات نفطية وبتروكيماويات وغاز',
  'تكنولوجيا ومكونات ذكية وروبوتات',
  'معدات وماكينات صناعية',
  'صناعات حرفية وتراثية',
  'أخرى'
];

export const SECTORS_CACHE_KEY = 'factory_map_custom_sectors_v2';

export function getStoredCustomSectors(): string[] {
  try {
    const raw = localStorage.getItem(SECTORS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveCustomSector(sector: string): string[] {
  const trimmed = sector.trim();
  if (!trimmed) return getStoredCustomSectors();
  const current = getStoredCustomSectors();
  if (!current.includes(trimmed) && !DEFAULT_INDUSTRIAL_SECTORS.includes(trimmed)) {
    const updated = [trimmed, ...current];
    try {
      localStorage.setItem(SECTORS_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {}
    return updated;
  }
  return current;
}

export function getAllIndustrialSectors(factoriesList?: { sectors?: string[] }[]): string[] {
  const custom = getStoredCustomSectors();
  const set = new Set<string>([...DEFAULT_INDUSTRIAL_SECTORS, ...custom]);
  if (factoriesList) {
    for (const f of factoriesList) {
      if (Array.isArray(f.sectors)) {
        for (const s of f.sectors) {
          if (s && s.trim()) set.add(s.trim());
        }
      }
    }
  }
  return Array.from(set);
}

export const INDUSTRIAL_SECTORS = DEFAULT_INDUSTRIAL_SECTORS;

export const DEFAULT_CITIES_LIST = [
  // مدن مصر الصناعية الكبرى
  'العاشر من رمضان',
  'السادس من أكتوبر',
  'مدينة بدر والروبيكي',
  'برج العرب الجديدة',
  'مدينة السادات',
  'العبور',
  'العبور الجديدة',
  'المحلة الكبرى',
  'السويس والعين السخنة',
  'بورسعيد وشرق التفريعة',
  'الإسماعيلية',
  'دمياط الجديدة ومدينة الأثاث',
  'قويسنا الصناعية',
  'الصالحية الجديدة',
  'النوبارية الجديدة',
  'بني سويف (بياض العرب / كوم أبو راضي)',
  'المنيا الجديدة والمطاهرة',
  'أسيوط (عرب العوامر)',
  'سوهاج (الكوثر / غرب طهطا)',
  'قنا (قفط / نجع حمادي)',
  'الأقصر (طيبة الجديدة)',
  'أسوان (العلاقي)',
  'الفيوم (كوم أوشيم)',
  'كفر الدوار',
  'حلوان والتبين',
  'شق الثعبان',
  'القاهرة الجديدة',
  'شبرا الخيمة',
  'الإسكندرية (مرغم / العامرية / أبو قير)',
  'العلمين الجديدة',
  'مطروح',
  'شرم الشيخ (الرويسات)',
  'الغردقة الصناعية',
  'الطور (جنوب سيناء)',
  'العريش وبئر العبد (شمال سيناء)',
  // المدن الصناعية العربية والإقليمية
  'الرياض',
  'جدة',
  'الدمام',
  'الجبيل الصناعية',
  'ينبع الصناعية',
  'القصيم',
  'دبي',
  'أبوظبي',
  'الشارقة',
  'الدار البيضاء',
  'طنجة المتوسط',
  'عمان',
  'الزرقاء'
];

export const CITIES_CACHE_KEY = 'factory_map_custom_cities_v1';

export function getStoredCustomCities(): string[] {
  try {
    const raw = localStorage.getItem(CITIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveCustomCity(city: string): string[] {
  const trimmed = city.trim();
  if (!trimmed) return getStoredCustomCities();
  const current = getStoredCustomCities();
  if (!current.includes(trimmed) && !DEFAULT_CITIES_LIST.includes(trimmed)) {
    const updated = [trimmed, ...current];
    try {
      localStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {}
    return updated;
  }
  return current;
}

export function getAllIndustrialCities(factoriesList?: { city?: string }[]): string[] {
  const custom = getStoredCustomCities();
  const set = new Set<string>([...DEFAULT_CITIES_LIST, ...custom]);
  if (factoriesList) {
    for (const f of factoriesList) {
      if (f.city && f.city.trim()) {
        set.add(f.city.trim());
      }
    }
  }
  return Array.from(set);
}

export const CITIES_LIST = DEFAULT_CITIES_LIST;

export interface IndustrialZoneInfo {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const MAJOR_INDUSTRIAL_ZONES: IndustrialZoneInfo[] = [
  { id: '10th', name: 'العاشر من رمضان (A1-C6)', city: 'العاشر من رمضان', lat: 30.3012, lng: 31.7415, zoom: 12 },
  { id: '6th', name: 'السادس من أكتوبر (المناطق 1-6)', city: 'السادس من أكتوبر', lat: 29.9723, lng: 30.9328, zoom: 12 },
  { id: 'borg', name: 'برج العرب الجديدة الصناعية', city: 'برج العرب الجديدة', lat: 30.9124, lng: 29.5841, zoom: 12 },
  { id: 'badr', name: 'مدينة بدر والروبيكي للجلود', city: 'مدينة بدر', lat: 30.1415, lng: 31.7123, zoom: 12 },
  { id: 'sadat', name: 'مدينة السادات الصناعية', city: 'السادات', lat: 30.3758, lng: 30.5187, zoom: 12 },
  { id: 'obour', name: 'العبور الصناعية', city: 'العبور', lat: 30.2245, lng: 31.4721, zoom: 13 },
  { id: 'mahalla', name: 'المحلة الكبرى للغزل والنسيج', city: 'المحلة الكبرى', lat: 30.9706, lng: 31.1669, zoom: 13 },
  { id: 'suez', name: 'السويس والعين السخنة (تيدا)', city: 'السويس', lat: 29.6231, lng: 32.3412, zoom: 12 },
  { id: 'shaq', name: 'شق الثعبان للرخام والجرانيت', city: 'القاهرة', lat: 29.9321, lng: 31.3125, zoom: 13 },
  { id: 'quesna', name: 'قويسنا الصناعية (المنوفية)', city: 'قويسنا', lat: 30.5489, lng: 31.1458, zoom: 13 },
  { id: 'benisuef', name: 'كوم أبو راضي (بني سويف)', city: 'بني سويف', lat: 29.0823, lng: 31.1124, zoom: 12 }
];

export const CERTIFICATIONS_LIST = [
  'ISO 9001 (إدارة الجودة)',
  'ISO 14001 (البيئة)',
  'ISO 22000 (سلامة الغذاء)',
  'ISO 45001 (السلامة والصحة المهنية)',
  'علامة CE الأوروبية',
  'شهادة حلال (Halal)',
  'اعتماد هيئة التنمية الصناعية (IDA)',
  'اعتماد سلامة الغذاء (NFSA)',
  'سجل صناعي نشط',
  'سجل مصدّرين معتمد'
];

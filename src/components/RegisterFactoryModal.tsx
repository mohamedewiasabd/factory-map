import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  X, 
  MapPin, 
  Upload, 
  UserCheck, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  Info,
  Building,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  AlertTriangle,
  Compass,
  Award,
  Layers,
  ShieldCheck,
  Globe2,
  Calendar,
  Clock,
  HelpCircle,
  Wand2,
  CheckCircle2,
  Link2
} from 'lucide-react';
import { 
  Factory, 
  INDUSTRIAL_SECTORS, 
  CITIES_LIST, 
  MAJOR_INDUSTRIAL_ZONES, 
  CERTIFICATIONS_LIST, 
  IndustrialZoneInfo,
  getAllIndustrialCities,
  saveCustomCity,
  getAllIndustrialSectors,
  saveCustomSector
} from '../types';
import { compressAndEncodeImage, classifyFactorySectors } from '../services/aiService';
import { ModalShell } from './ModalShell';

interface RegisterFactoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (factoryData: any) => Promise<void>;
  initialData?: Factory | null;
  isAdmin?: boolean;
}

export const RegisterFactoryModal: React.FC<RegisterFactoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isAdmin
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>(() => getAllIndustrialCities());
  const [city, setCity] = useState(() => getAllIndustrialCities()[0] || 'العاشر من رمضان');
  const [showAddCityInput, setShowAddCityInput] = useState(false);
  const [newCityInput, setNewCityInput] = useState('');
  const [industrialArea, setIndustrialArea] = useState('');
  const [address, setAddress] = useState('');
  const [availableSectors, setAvailableSectors] = useState<string[]>(() => getAllIndustrialSectors());
  const [showAddSectorInput, setShowAddSectorInput] = useState(false);
  const [newSectorInput, setNewSectorInput] = useState('');
  const [isAiGeneratingSectors, setIsAiGeneratingSectors] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [lat, setLat] = useState<number>(30.3012);
  const [lng, setLng] = useState<number>(31.7415);

  const handleAddNewCity = () => {
    const trimmed = newCityInput.trim();
    if (!trimmed) return;
    saveCustomCity(trimmed);
    const updated = getAllIndustrialCities();
    setAvailableCities(updated);
    setCity(trimmed);
    setNewCityInput('');
    setShowAddCityInput(false);
  };

  const handleAddNewSector = (customSectorName?: string) => {
    const trimmed = (customSectorName || newSectorInput).trim();
    if (!trimmed) return;
    saveCustomSector(trimmed);
    const updated = getAllIndustrialSectors();
    setAvailableSectors(updated);
    if (!selectedSectors.includes(trimmed)) {
      setSelectedSectors((prev) => [...prev, trimmed]);
    }
    setNewSectorInput('');
    setShowAddSectorInput(false);
    setAutoSectorNotice(`✨ تم إضافة واعتماد القطاع: ${trimmed}`);
    setTimeout(() => setAutoSectorNotice(null), 4500);
  };

  // Auto-generation visual feedback toasts
  const [autoLocationToast, setAutoLocationToast] = useState<{
    city: string;
    area: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [autoSectorNotice, setAutoSectorNotice] = useState<string | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  // Rich Industrial Specifications
  const [establishedYear, setEstablishedYear] = useState<number | undefined>(undefined);
  const [totalAreaM2, setTotalAreaM2] = useState<number | undefined>(undefined);
  const [productionCapacity, setProductionCapacity] = useState('');
  const [productionLinesCount, setProductionLinesCount] = useState<number | undefined>(undefined);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [exportMarkets, setExportMarkets] = useState('');
  const [isExporter, setIsExporter] = useState(false);
  const [commercialRegNo, setCommercialRegNo] = useState('');
  const [workingDaysHours, setWorkingDaysHours] = useState('');
  const [website, setWebsite] = useState('');
  const [isLocationVerified, setIsLocationVerified] = useState(false);

  // Sales Officer Credentials (Name, Phone, Whatsapp, Email)
  const [salesName, setSalesName] = useState('');
  const [salesEmail, setSalesEmail] = useState('');
  const [salesPhone, setSalesPhone] = useState('');
  const [salesWhatsapp, setSalesWhatsapp] = useState('');
  const [salesNotes, setSalesNotes] = useState('');

  // Purchasing Officer Credentials (Name, Phone, Whatsapp, Email)
  const [purchasingName, setPurchasingName] = useState('');
  const [purchasingEmail, setPurchasingEmail] = useState('');
  const [purchasingPhone, setPurchasingPhone] = useState('');
  const [purchasingWhatsapp, setPurchasingWhatsapp] = useState('');
  const [purchasingNotes, setPurchasingNotes] = useState('');

  // Products list
  const [productsInput, setProductsInput] = useState('');

  // Image upload
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);

  // AI bot toggle
  const [aiAutoResponderEnabled, setAiAutoResponderEnabled] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [pickerTileType, setPickerTileType] = useState<'streets' | 'satellite'>('streets');

  // Mini picker map refs
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const pickerMapInstance = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const pickerTileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setCity(initialData.city || CITIES_LIST[0]);
      setIndustrialArea(initialData.industrialArea || '');
      setAddress(initialData.address || '');
      setSelectedSectors(initialData.sectors || []);
      setLat(initialData.lat || 30.3012);
      setLng(initialData.lng || 31.7415);

      setEstablishedYear(initialData.establishedYear);
      setTotalAreaM2(initialData.totalAreaM2);
      setProductionCapacity(initialData.productionCapacity || '');
      setProductionLinesCount(initialData.productionLinesCount);
      setSelectedCertifications(initialData.certifications || []);
      setExportMarkets(initialData.exportMarkets?.join('، ') || '');
      setIsExporter(initialData.isExporter ?? false);
      setCommercialRegNo(initialData.commercialRegNo || '');
      setWorkingDaysHours(initialData.workingDaysHours || '');
      setWebsite(initialData.website || '');
      setIsLocationVerified(initialData.isLocationVerified ?? false);

      setSalesName(initialData.salesOfficer?.name || '');
      setSalesEmail(initialData.salesOfficer?.email || '');
      setSalesPhone(initialData.salesOfficer?.phone || '');
      setSalesWhatsapp(initialData.salesOfficer?.whatsapp || '');
      setSalesNotes(initialData.salesOfficer?.notes || '');

      setPurchasingName(initialData.purchasingOfficer?.name || '');
      setPurchasingEmail(initialData.purchasingOfficer?.email || '');
      setPurchasingPhone(initialData.purchasingOfficer?.phone || '');
      setPurchasingWhatsapp(initialData.purchasingOfficer?.whatsapp || '');
      setPurchasingNotes(initialData.purchasingOfficer?.notes || '');

      setProductsInput(initialData.productsList?.join('، ') || '');
      setImageBase64(initialData.imageBase64 || '');
      setImagePreview(initialData.imageBase64 || '');
      setAiAutoResponderEnabled(initialData.aiAutoResponderEnabled ?? true);
      setAiPrompt(initialData.aiAutoResponderPrompt || '');
    } else {
      // Default reset
      setName('');
      setDescription('');
      setCity(CITIES_LIST[0]);
      setIndustrialArea('');
      setAddress('');
      setSelectedSectors([]);
      setLat(30.3012);
      setLng(31.7415);

      setEstablishedYear(undefined);
      setTotalAreaM2(undefined);
      setProductionCapacity('');
      setProductionLinesCount(undefined);
      setSelectedCertifications([]);
      setExportMarkets('');
      setIsExporter(false);
      setCommercialRegNo('');
      setWorkingDaysHours('');
      setWebsite('');
      setIsLocationVerified(false);

      setSalesName('');
      setSalesEmail('');
      setSalesPhone('');
      setSalesWhatsapp('');
      setSalesNotes('');
      setPurchasingName('');
      setPurchasingEmail('');
      setPurchasingPhone('');
      setPurchasingWhatsapp('');
      setPurchasingNotes('');
      setProductsInput('');
      setImageBase64('');
      setImagePreview('');
      setAiAutoResponderEnabled(true);
      setAiPrompt('');
    }
  }, [initialData, isOpen]);

  // Intelligent Automatic Location & Address Generation from Coordinates
  const autoGenerateLocationFromCoords = async (targetLat: number, targetLng: number) => {
    setGeocodingLoading(true);

    // 1. Calculate nearest calibrated Egyptian & Arab industrial zone
    let nearestZone: IndustrialZoneInfo | null = null;
    let minDistance = Infinity;

    for (const z of MAJOR_INDUSTRIAL_ZONES) {
      const dLat = z.lat - targetLat;
      const dLng = z.lng - targetLng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestZone = z;
      }
    }

    let detectedCity: string = nearestZone && minDistance < 0.28 ? nearestZone.city : CITIES_LIST[0];
    let detectedArea: string = nearestZone && minDistance < 0.28 ? nearestZone.name : '';
    let detectedAddr = '';

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&accept-language=ar&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          
          // Match city
          const rawCity = addr.city || addr.town || addr.county || addr.state || '';
          const matchedCity = CITIES_LIST.find((c) => rawCity.includes(c) || c.includes(rawCity));
          if (matchedCity) {
            detectedCity = matchedCity;
          } else if (rawCity) {
            detectedCity = rawCity;
          }

          // Detect Industrial Area or Block
          const rawArea = addr.industrial || addr.commercial || addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || '';
          if (rawArea) {
            detectedArea = rawArea.includes('صناع') ? rawArea : `المنطقة الصناعية - ${rawArea}`;
          } else if (nearestZone && minDistance < 0.28) {
            detectedArea = nearestZone.name;
          } else {
            detectedArea = `المنطقة الصناعية بـ ${detectedCity}`;
          }

          // Detailed Address
          const road = addr.road || addr.street || '';
          const houseNo = addr.house_number || addr.building || '';
          if (road) {
            detectedAddr = houseNo ? `قطعة ${houseNo}، ${road}` : `طريق ${road}`;
          } else {
            const parts = (data.display_name || '').split('،');
            detectedAddr = parts.slice(0, 3).join('، ');
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
      if (!detectedArea && nearestZone) {
        detectedArea = nearestZone.name;
      }
      if (!detectedAddr) {
        detectedAddr = `مجمع المصانع، ${detectedCity}`;
      }
    } finally {
      setGeocodingLoading(false);
    }

    // Automatically set form state with generated values!
    const finalLat = Number(targetLat.toFixed(5));
    const finalLng = Number(targetLng.toFixed(5));

    if (detectedCity) {
      saveCustomCity(detectedCity);
      setAvailableCities(getAllIndustrialCities());
    }

    setCity(detectedCity);
    setIndustrialArea(detectedArea);
    setAddress(detectedAddr);
    setLat(finalLat);
    setLng(finalLng);

    setAutoLocationToast({
      city: detectedCity,
      area: detectedArea,
      address: detectedAddr,
      lat: finalLat,
      lng: finalLng,
    });

    setTimeout(() => {
      setAutoLocationToast(null);
    }, 6000);
  };

  // Ref for debounced AI generation on typing
  const debounceSectorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic Industrial Sector Identification from Products Text
  const detectSectorsFromProducts = (text: string) => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    const matched = new Set<string>();

    const rules: { keywords: string[]; sector: string }[] = [
      {
        keywords: ['ملابس', 'منسوجات', 'قماش', 'غزل', 'نسيج', 'قطن', 'بوليستر', 'يونيفورم', 'تيشرت', 'بدلة', 'تطريز', 'صباغة', 'خيوط', 'مفروشات', 'شاش', 'صوف', 'جينز', 'وبريات', 'أردية', 'ستائر', 'تريكو'],
        sector: 'ملابس ومنسوجات'
      },
      {
        keywords: ['كرتون', 'ورق', 'تغليف', 'طباعة', 'أكياس', 'علب', 'كراتين', 'فلكسو', 'أوفست', 'فواصل', 'ليبل', 'شرينك', 'لاصق', 'دوبلكس', 'كرافت', 'سلوفان', 'شريط لاصق', 'أطباق بيض'],
        sector: 'ورق وطباعة وتغليف'
      },
      {
        keywords: ['طعام', 'غذاء', 'أغذية', 'صلصة', 'عصير', 'خضار', 'فواكه', 'مجمدات', 'ألبان', 'جبن', 'حلويات', 'بسكويت', 'مياه', 'زيوت', 'توابل', 'لحوم', 'دواجن', 'طماطم', 'فراولة', 'مركزات', 'مخللات', 'مخبوزات', 'سكر', 'شوكولاتة', 'طحينة', 'حلاوة', 'مربى'],
        sector: 'صناعات غذائية ومشروبات'
      },
      {
        keywords: ['كيماويات', 'أسمدة', 'مبيدات', 'منظفات', 'صابون', 'دهانات', 'بويات', 'أحبار', 'غراء', 'مذيبات', 'مطهرات', 'إضافات', 'بتروكيماويات', 'أصباغ', 'راتنجات', 'كلور', 'صودا كاوية'],
        sector: 'صناعات كيميائية وأسمدة'
      },
      {
        keywords: ['بلاستيك', 'مطاط', 'بولي إيثيلين', 'مواسير', 'خراطيم', 'براميل', 'حبيبات', 'حقن', 'سحب', 'نفخ', 'كاوتش', 'فوم', 'pet', 'hdpe', 'ldpe', 'بولي بروبيلين', 'أكياس بلاستيك', 'حقن بلاستيك'],
        sector: 'بلاستيك ومطاط وبوليمرات'
      },
      {
        keywords: ['صاج', 'تشكيل معادن', 'قص ليزر', 'ثني', 'cnc', 'خراطة', 'اسطمبات', 'قطع غيار', 'هياكل', 'مسامير', 'مضخات', 'ماكينات', 'جمالونات', 'هناجر', 'قوالب', 'محركات', 'تروس', 'صواميل', 'فرايز'],
        sector: 'صناعات هندسية ومعدنية'
      },
      {
        keywords: ['حديد', 'صلب', 'تسليح', 'بليت', 'كمر', 'زوايا حديد', 'ألومنيوم', 'نحاس', 'زنك', 'صهر', 'درفلة', 'سباكة معادن', 'حديد مجلفن', 'دربزينات', 'صهر معادن', 'مقاطع ألومنيوم'],
        sector: 'حديد وصلب وتشكيل معادن'
      },
      {
        keywords: ['خشب', 'أثاث', 'غرف نوم', 'مكاتب', 'دواليب', 'mdf', 'قشرة خشب', 'زان', 'سويد', 'كراسي', 'أبواب خشب', 'مطابخ', 'صالون', 'باركيه', 'موبيليا', 'طاولات'],
        sector: 'خشب وأثاث وديكور'
      },
      {
        keywords: ['دواء', 'أدوية', 'فارما', 'كبسولات', 'مضادات', 'أقراص', 'مراهم', 'كريمات', 'مستحضرات تجميل', 'شامبو', 'عطور', 'سيروم', 'صابون طبي'],
        sector: 'صناعات دوائية ومستحضرات تجميل'
      },
      {
        keywords: ['مستلزمات طبية', 'سرنجات', 'كانيولا', 'معقمات', 'شاش طبي', 'كمامات', 'قساطر', 'أجهزة طبية', 'عظام', 'أطراف صناعية', 'أجهزة تنفس', 'جبائر'],
        sector: 'أجهزة ومستلزمات طبية وجراحية'
      },
      {
        keywords: ['أسمنت', 'سيراميك', 'بورسلين', 'طوب', 'رخام', 'جرانيت', 'جبس', 'خرسانة', 'زجاج معماري', 'عزل', 'بلاط', 'محاجر', 'إنترلوك', 'كلينكر', 'مونة', 'عوازل'],
        sector: 'مواد بناء وسيراميك ورخام'
      },
      {
        keywords: ['إلكترونيات', 'كابلات', 'أسلاك', 'لوحات كهرباء', 'led', 'مفاتيح كهرباء', 'أجهزة منزلية', 'بوردات', 'محولات', 'تكييف', 'سخانات', 'شاشات', 'طاقة كهربائية', 'قواطع'],
        sector: 'إلكترونيات وأجهزة كهربائية وكابلات'
      },
      {
        keywords: ['جلد', 'جلود', 'دباغة', 'أحذية', 'حقائب', 'أحزمة', 'الروبيكي', 'شنط جلدية', 'محافظ جلد'],
        sector: 'جلود ودباغة ومصنوعات جلدية'
      },
      {
        keywords: ['طاقة شمسية', 'ألواح شمسية', 'إنفرتر', 'بطاريات شمسية', 'رياح', 'طاقة متجددة', 'هيدروجين أخضر', 'خلايا ضوئية'],
        sector: 'طاقة متجددة وبيئة وهيدروجين أخضر'
      },
      {
        keywords: ['سيارات', 'مركبات', 'شاحنات', 'أتوبيسات', 'تكاتك', 'فرامل', 'تيل', 'مساعدين', 'شكمانات', 'فلاتر سيارات', 'ضفائر', 'بطاريات سيارات', 'صناعات مغذية'],
        sector: 'سيارات ومركبات وصناعات مغذية'
      },
      {
        keywords: ['سفن', 'قوارب', 'لنشات', 'يخوت', 'بحرية', 'موانئ', 'ترسانة', 'أحواض بناء', 'حاويات شحن'],
        sector: 'صناعات بحرية وبناء سفن ومعدات موانئ'
      },
      {
        keywords: ['طيران', 'طائرات', 'مسيرات', 'درون', 'فضاء', 'أقمار صناعية', 'توربينات طيران'],
        sector: 'صناعات طيران ومسيرات وفضاء'
      },
      {
        keywords: ['ذهب', 'فضة', 'تعدين', 'مناجم', 'معادن ثمينة', 'فوسفات', 'كوارتز', 'رمال بيضاء', 'سبائك'],
        sector: 'تعدين واستخراج ومعادن ثمينة'
      },
      {
        keywords: ['زجاج', 'بلور', 'كريستال', 'بصريات', 'عدسات', 'نظارات', 'أكواب زجاج', 'قوارير زجاج'],
        sector: 'زجاج وبلور وبصريات'
      },
      {
        keywords: ['تدوير', 'معالجة مياه', 'صرف صناعي', 'تدوير بلاستيك', 'تدوير مخلفات', 'سماد عضوي', 'فرز نفايات'],
        sector: 'تدوير ومعالجة نفايات ومياه'
      },
      {
        keywords: ['أعلاف', 'علف', 'دواجن', 'مواشي', 'أسماك', 'مركزات أعلاف', 'ردة', 'كسب صويا', 'سيلاج'],
        sector: 'أعلاف وثروة حيوانية وداجنة'
      },
      {
        keywords: ['بترول', 'نفط', 'غاز', 'تكرير', 'شحوم', 'زيوت محركات', 'بيتومين', 'أسفلت'],
        sector: 'صناعات نفطية وبتروكيماويات وغاز'
      },
      {
        keywords: ['روبوت', 'روبوتات', 'طابعات 3d', 'أتمتة', 'ذكاء اصطناعي', 'حساسات', 'إنترنت الأشياء', 'شرائح إلكترونية'],
        sector: 'تكنولوجيا ومكونات ذكية وروبوتات'
      },
      {
        keywords: ['ماكينات صناعية', 'خطوط إنتاج', 'سيور ناقلة', 'غلايات', 'كمبروسر', 'ضواغط هواء', 'أفران صناعية'],
        sector: 'معدات وماكينات صناعية'
      },
      {
        keywords: ['فخار', 'خزف', 'خيامية', 'سجاد يدوي', 'نحاسيات', 'أرابيسك', 'تراث', 'حرف يدوية'],
        sector: 'صناعات حرفية وتراثية'
      }
    ];

    for (const rule of rules) {
      if (rule.keywords.some((k) => lower.includes(k))) {
        matched.add(rule.sector);
      }
    }

    if (matched.size > 0) {
      setSelectedSectors((prev) => {
        const merged = Array.from(new Set([...prev, ...Array.from(matched)]));
        return merged;
      });
      setAutoSectorNotice(`تم التعرف التلقائي على القطاع واختياره: ${Array.from(matched).join('، ')}`);
      setTimeout(() => setAutoSectorNotice(null), 4000);
    } else if (text.trim().length >= 8) {
      // If no standard keyword matched, trigger debounced AI dynamic generation
      if (debounceSectorTimerRef.current) clearTimeout(debounceSectorTimerRef.current);
      debounceSectorTimerRef.current = setTimeout(() => {
        handleAutoGenerateSectorsAI(text);
      }, 1200);
    }
  };

  const handleAutoGenerateSectorsAI = async (customText?: string) => {
    const textToAnalyze = (customText || productsInput || description || name).trim();
    if (!textToAnalyze) {
      setAutoSectorNotice('يرجى إدخال بعض المنتجات أو الوصف أولاً لتوليد القطاعات المناسبة.');
      setTimeout(() => setAutoSectorNotice(null), 3000);
      return;
    }

    try {
      setIsAiGeneratingSectors(true);
      const res = await classifyFactorySectors({
        name: name || 'مصنع جديد',
        description: description || textToAnalyze,
        products: [textToAnalyze]
      });

      const sectorsToApply = res.sectors || [];
      const newGenerated = res.newGeneratedSectors || [];

      // Save any newly created/specialized sectors
      [...sectorsToApply, ...newGenerated].forEach((s) => {
        if (s && s.trim()) {
          saveCustomSector(s.trim());
        }
      });

      const updatedAll = getAllIndustrialSectors();
      setAvailableSectors(updatedAll);

      setSelectedSectors((prev) => Array.from(new Set([...prev, ...sectorsToApply])));
      setAutoSectorNotice(`✨ تم توليد واعتماد القطاعات: ${sectorsToApply.join('، ')}`);
      setTimeout(() => setAutoSectorNotice(null), 5000);
    } catch (err) {
      console.warn('AI sector generation error:', err);
    } finally {
      setIsAiGeneratingSectors(false);
    }
  };

  const handleProductsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProductsInput(val);
    detectSectorsFromProducts(val);
  };

  // Toggle Picker Map Layer
  const togglePickerLayer = () => {
    if (!pickerMapInstance.current) return;
    const newType = pickerTileType === 'streets' ? 'satellite' : 'streets';
    if (pickerTileLayerRef.current) {
      pickerMapInstance.current.removeLayer(pickerTileLayerRef.current);
    }
    const tileUrl =
      newType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const layer = L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(pickerMapInstance.current);
    pickerTileLayerRef.current = layer;
    setPickerTileType(newType);
  };

  // Move Picker to Industrial Zone
  const handlePickerJumpToZone = (zone: IndustrialZoneInfo) => {
    if (pickerMapInstance.current) {
      pickerMapInstance.current.flyTo([zone.lat, zone.lng], zone.zoom, { duration: 1.2 });
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng([zone.lat, zone.lng]);
      }
    }
    autoGenerateLocationFromCoords(zone.lat, zone.lng);
  };

  // Locate Current Device GPS
  const handleLocateCurrentDevice = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (pickerMapInstance.current) {
          pickerMapInstance.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
          if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLatLng([latitude, longitude]);
          }
        }
        autoGenerateLocationFromCoords(latitude, longitude);
      },
      (err) => console.warn(err),
      { enableHighAccuracy: true }
    );
  };

  // Initialize Map Picker inside Modal
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapPickerRef.current) return;
      if (pickerMapInstance.current) {
        pickerMapInstance.current.invalidateSize();
        return;
      }

      const map = L.map(mapPickerRef.current, {
        zoomControl: true,
      }).setView([lat, lng], 11);

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      pickerTileLayerRef.current = tileLayer;

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        autoGenerateLocationFromCoords(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        autoGenerateLocationFromCoords(e.latlng.lat, e.latlng.lng);
      });

      pickerMarkerRef.current = marker;
      pickerMapInstance.current = map;
    }, 200);

    return () => {
      clearTimeout(timer);
      if (pickerMapInstance.current) {
        pickerMapInstance.current.remove();
        pickerMapInstance.current = null;
        pickerTileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSector = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter((s) => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const toggleCertification = (cert: string) => {
    if (selectedCertifications.includes(cert)) {
      setSelectedCertifications(selectedCertifications.filter((c) => c !== cert));
    } else {
      setSelectedCertifications([...selectedCertifications, cert]);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const encoded = await compressAndEncodeImage(file);
      setImageBase64(encoded);
      setImagePreview(encoded);
    } catch (err) {
      console.error('Image compression failed:', err);
      setErrorMsg('تعذر ضغط وتشفير الصورة. يرجى اختيار ملف آخر.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم المصنع');
      return;
    }
    if (!salesEmail.trim() || !salesPhone.trim() || !salesName.trim()) {
      setErrorMsg('يرجى إدخال بيانات مسؤول المبيعات كاملة (الاسم، الهاتف، والبريد الإلكتروني للربط بالحساب)');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const productsList = productsInput
        .split(/[،,]/)
        .map((p) => p.trim())
        .filter(Boolean);

      const parsedExportMarkets = exportMarkets
        .split(/[،,]/)
        .map((m) => m.trim())
        .filter(Boolean);

      const factoryPayload: any = {
        name: name.trim(),
        description: description.trim(),
        city,
        industrialArea: industrialArea.trim() || '',
        address: address.trim() || '',
        sectors: selectedSectors.length ? selectedSectors : ['صناعات هندسية ومعدنية'],
        lat,
        lng,
        certifications: selectedCertifications,
        exportMarkets: parsedExportMarkets,
        isExporter,
        isLocationVerified: isAdmin ? isLocationVerified : initialData?.isLocationVerified ?? false,
        salesOfficer: {
          name: salesName.trim(),
          email: salesEmail.trim().toLowerCase(),
          phone: salesPhone.trim(),
          whatsapp: salesWhatsapp.trim() || salesPhone.trim(),
          notes: salesNotes.trim() || '',
        },
        purchasingOfficer: {
          name: purchasingName.trim() || '',
          email: purchasingEmail.trim().toLowerCase() || '',
          phone: purchasingPhone.trim() || '',
          whatsapp: purchasingWhatsapp.trim() || purchasingPhone.trim() || '',
          notes: purchasingNotes.trim() || '',
        },
        productsList,
        imageBase64: imageBase64 || '',
        aiAutoResponderEnabled,
        aiAutoResponderPrompt: aiPrompt.trim() || '',
      };

      if (establishedYear) factoryPayload.establishedYear = Number(establishedYear);
      if (totalAreaM2) factoryPayload.totalAreaM2 = Number(totalAreaM2);
      if (productionCapacity.trim()) factoryPayload.productionCapacity = productionCapacity.trim();
      if (productionLinesCount) factoryPayload.productionLinesCount = Number(productionLinesCount);
      if (commercialRegNo.trim()) factoryPayload.commercialRegNo = commercialRegNo.trim();
      if (workingDaysHours.trim()) factoryPayload.workingDaysHours = workingDaysHours.trim();
      if (website.trim()) factoryPayload.website = website.trim();

      await onSubmit(factoryPayload);

      onClose();
    } catch (err: any) {
      console.error('Failed to submit factory:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ بيانات المصنع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell id="register-factory" open={isOpen} onClose={onClose} rootClassName="p-2 sm:p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                {initialData ? 'تعديل بيانات المصنع وتدقيق الموقع' : 'تسجيل مصنع جديد وتوليد بياناته بالـ GPS'}
              </h2>
              <p className="text-xs text-slate-400">
                توليد العنوان والمنطقة والقطاعات تلقائياً مع ربط حسابات المبيعات والمشتريات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-rose-400 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Interactive Map Picker with Auto-generation */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  1. تحديد نقطة المصنع على الخريطة (توليد العنوان والمدينة تلقائياً)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  انقر على الخريطة أو اسحب العلامة لتوليد المدينة الصناعية والمنطقة والعنوان وحفظ الإحداثيات فوراً.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  📍 {lat}, {lng}
                </span>
                <button
                  type="button"
                  onClick={togglePickerLayer}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:text-white flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pickerTileType === 'streets' ? '🛰️ قمر صناعي' : '🏙️ شوارع'}</span>
                </button>
              </div>
            </div>

            {/* Primary GPS Auto-Pin Button */}
            <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-amber-950/30 p-3 rounded-2xl border border-blue-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5 animate-pulse text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-100">
                    أنت الآن متواجد داخل مقر المصنع؟
                  </p>
                  <p className="text-[11px] text-slate-400">
                    اضغط هنا لتثبيت إحداثيات البوابة بالـ GPS وتوليد العنوان والمنطقة بالكامل تلقائياً.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLocateCurrentDevice}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all shrink-0"
              >
                <Compass className="w-4 h-4" />
                تثبيت موقعي وتوليد البيانات (GPS)
              </button>
            </div>

            {/* Quick Jumps to Industrial Zones */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">
                أو انقر للانتقال المباشر لأي منطقة صناعية وتوليد بياناتها:
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {MAJOR_INDUSTRIAL_ZONES.map((zone) => (
                  <button
                    type="button"
                    key={zone.id}
                    onClick={() => handlePickerJumpToZone(zone)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 whitespace-nowrap shrink-0 text-[11px]"
                  >
                    📍 {zone.name.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaflet Picker Map Canvas */}
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
              <div ref={mapPickerRef} className="w-full h-full z-0" />
              {geocodingLoading && (
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-10 text-xs font-bold text-amber-400">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin ml-2" />
                  جاري توليد العنوان والمنطقة الصناعية...
                </div>
              )}
            </div>

            {/* Auto-Generation Live Toast / Feedback */}
            {autoLocationToast && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold text-emerald-300">
                    تم توليد وتثبيت بيانات الموقع بنجاح وحفظ الإحداثيات ({autoLocationToast.lat}, {autoLocationToast.lng})!
                  </p>
                  <p className="text-slate-300">
                    📍 <strong>المدينة:</strong> {autoLocationToast.city} | <strong>المنطقة:</strong> {autoLocationToast.area}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    🏢 <strong>العنوان التفصيلي:</strong> {autoLocationToast.address}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Generated Company & Location Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Building className="w-4 h-4" />
              2. بيانات المصنع المولدة جغرافياً
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم المصنع / المنشأة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة الأهرام للصناعات الهندسية"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    المدينة الصناعية الرئيسية *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCityInput(!showAddCityInput)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    {showAddCityInput ? 'إلغاء ✕' : '+ إضافة مدينة أخرى'}
                  </button>
                </div>

                {showAddCityInput ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="اكتب اسم المدينة الصناعية الجديدة..."
                      value={newCityInput}
                      onChange={(e) => setNewCityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCity();
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-amber-500 focus:outline-none text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCity}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shrink-0 shadow-md shadow-amber-500/20"
                    >
                      حفظ واختيار
                    </button>
                  </div>
                ) : (
                  <select
                    value={city}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddCityInput(true);
                      } else {
                        setCity(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-bold text-amber-400"
                  >
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-amber-400 font-bold bg-slate-900">
                      + إضافة مدينة صناعية أخرى يدوياً...
                    </option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>اسم المنطقة الصناعية / البلوك</span>
                  <span className="text-[10px] text-emerald-400 font-normal">تولد تلقائياً ✨</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: المنطقة الصناعية الثالثة B4"
                  value={industrialArea}
                  onChange={(e) => setIndustrialArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-semibold text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>العنوان التفصيلي</span>
                  <span className="text-[10px] text-emerald-400 font-normal">تولد تلقائياً ✨</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: قطعة 15، طريق المصانع الرئيسي"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-semibold text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                نبذة تفصيلية عن المصنع وخطوط الإنتاج *
              </label>
              <textarea
                rows={3}
                required
                placeholder="صف مجالات التصنيع، الطاقة الإنتاجية، المواد الخام المستخدمة، وشهادات الجودة (ISO، إلخ)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  أهم المنتجات والخدمات (اكتب المنتجات ليتم تحديد القطاعات أو توليدها تلقائياً) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateSectorsAI()}
                    disabled={isAiGeneratingSectors}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 text-amber-400 ${isAiGeneratingSectors ? 'animate-spin' : ''}`} />
                    <span>{isAiGeneratingSectors ? 'جاري التوليد بالذكاء الاصطناعي...' : '✨ توليد قطاعات جديدة بالذكاء الاصطناعي'}</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="اكتب مثلاً: طائرات مسيرة، بطاريات ليثيوم، قطع غيار سيارات، كرتون مضلع، أجهزة طبية..."
                value={productsInput}
                onChange={handleProductsChange}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 text-slate-100 font-medium"
              />
              {autoSectorNotice && (
                <p className="text-[11px] text-emerald-400 font-bold mt-1.5 animate-in fade-in flex items-center gap-1">
                  <span>{autoSectorNotice}</span>
                </p>
              )}
            </div>

            {/* Industrial Sectors Selection & Generation */}
            <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <label className="block text-xs font-bold text-slate-200">
                    القطاعات الصناعية المعتمدة ({selectedSectors.length} محددة حالياً):
                  </label>
                  <p className="text-[11px] text-slate-400">
                    يتم الاختيار والتوليد التلقائي حسب المنتجات، ويمكنك النقر للإضافة أو الإلغاء
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSectorInput(!showAddSectorInput)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 hover:border-amber-500/50 transition-colors flex items-center gap-1"
                  >
                    {showAddSectorInput ? 'إلغاء ✕' : '+ إضافة قطاع مخصص'}
                  </button>
                </div>
              </div>

              {/* Add Custom Sector Inline Box */}
              {showAddSectorInput && (
                <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-amber-500/40 animate-in fade-in">
                  <input
                    type="text"
                    placeholder="اكتب اسم القطاع الصناعي الجديد..."
                    value={newSectorInput}
                    onChange={(e) => setNewSectorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewSector();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-800 rounded-lg border border-slate-700 focus:outline-none text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddNewSector()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shrink-0 shadow-md shadow-amber-500/20"
                  >
                    حفظ واختيار
                  </button>
                </div>
              )}

              {/* Sectors Pills */}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {availableSectors.map((sector) => {
                  const isChecked = selectedSectors.includes(sector);
                  return (
                    <button
                      type="button"
                      key={sector}
                      onClick={() => toggleSector(sector)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                        isChecked
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{sector}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Sales Officer Account & Credentials */}
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400" />
                3. بيانات مسؤول المبيعات (حساب إدارة المبيعات والطلبات) *
              </h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                ربط الحساب بالإيميل
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>صلاحية إدارة المبيعات:</strong> البريد الإلكتروني المدخل هنا سيكون الحساب المخوّل رسمياً بإدارة طلبات الشراء، عروض الأسعار، والرد على محادثات مبيعات المصنع عند تسجيل دخوله.
              </span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم الكامل لمسؤول المبيعات *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمود رضوان"
                  value={salesName}
                  onChange={(e) => setSalesName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  البريد الإلكتروني لمسؤول المبيعات (حساب الدخول) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="sales@company.com"
                  value={salesEmail}
                  onChange={(e) => setSalesEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم الهاتف المباشر *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+20 100 123 4567"
                  value={salesPhone}
                  onChange={(e) => setSalesPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم الواتس التجاري (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+20 100 123 4567"
                  value={salesWhatsapp}
                  onChange={(e) => setSalesWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Purchasing Officer Account & Credentials */}
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-blue-500/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                4. بيانات مسؤول المشتريات (حساب إدارة التوريد والخامات)
              </h3>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                ربط الحساب بالإيميل
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>صلاحية إدارة المشتريات:</strong> البريد الإلكتروني المدخل هنا سيكون الحساب المخوّل باستقبال عروض الموردين للمواد الخام وقطع الغيار والتواصل معهم.
              </span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم مسؤول المشتريات والخامات
                </label>
                <input
                  type="text"
                  placeholder="مثال: م. طارق عبد الرحمن"
                  value={purchasingName}
                  onChange={(e) => setPurchasingName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  البريد الإلكتروني لمسؤول المشتريات (حساب الدخول)
                </label>
                <input
                  type="email"
                  placeholder="procurement@company.com"
                  value={purchasingEmail}
                  onChange={(e) => setPurchasingEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم الهاتف المباشر للمشتريات
                </label>
                <input
                  type="tel"
                  placeholder="+20 101 987 6543"
                  value={purchasingPhone}
                  onChange={(e) => setPurchasingPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم الواتس لمسؤول المشتريات
                </label>
                <input
                  type="tel"
                  placeholder="+20 101 987 6543"
                  value={purchasingWhatsapp}
                  onChange={(e) => setPurchasingWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Production Specs & Certifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Award className="w-4 h-4" />
              5. مواصفات الإنتاج، شهادات الجودة (ISO) وسجلات المصنع
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  سنة التأسيس
                </label>
                <input
                  type="number"
                  placeholder="مثال: 2012"
                  value={establishedYear || ''}
                  onChange={(e) => setEstablishedYear(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  المساحة الإجمالية (متر مربع)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 15000"
                  value={totalAreaM2 || ''}
                  onChange={(e) => setTotalAreaM2(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  عدد خطوط الإنتاج
                </label>
                <input
                  type="number"
                  placeholder="مثال: 5"
                  value={productionLinesCount || ''}
                  onChange={(e) => setProductionLinesCount(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الطاقة الإنتاجية الشهرية أو السنوية
                </label>
                <input
                  type="text"
                  placeholder="مثال: 850 طن صلب شهرياً، أو 1.5 مليون عبوة"
                  value={productionCapacity}
                  onChange={(e) => setProductionCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم السجل التجاري / الصناعي
                </label>
                <input
                  type="text"
                  placeholder="مثال: 104829 / استثمار"
                  value={commercialRegNo}
                  onChange={(e) => setCommercialRegNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Certifications Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                شهادات الجودة والاعتمادات الصناعية:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CERTIFICATIONS_LIST.map((cert) => {
                  const isChecked = selectedCertifications.includes(cert);
                  return (
                    <button
                      type="button"
                      key={cert}
                      onClick={() => toggleCertification(cert)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isChecked
                          ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exporting status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                <input
                  type="checkbox"
                  id="chk-export"
                  checked={isExporter}
                  onChange={(e) => setIsExporter(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <label htmlFor="chk-export" className="text-xs font-semibold text-slate-200 cursor-pointer">
                  المصنع يصدر إنتاجه للأسواق الخارجية (Exporting Factory)
                </label>
              </div>

              {isExporter && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    دول وأسواق التصدير (مفصولة بفاصلة)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: السعودية، الإمارات، ألمانيا، كينيا"
                    value={exportMarkets}
                    onChange={(e) => setExportMarkets(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Website & Working Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الموقع الإلكتروني الرسمي (Website)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  أيام وساعات العمل الرسمية
                </label>
                <input
                  type="text"
                  placeholder="مثال: السبت - الخميس: 8:00 ص - 5:00 م"
                  value={workingDaysHours}
                  onChange={(e) => setWorkingDaysHours(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Image Upload */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Upload className="w-4 h-4" />
              6. صورة واجهة المصنع أو خط الإنتاج
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-44 h-28 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-500 text-xs">
                    <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    لا توجد صورة
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400"
                />
                <p className="text-[11px] text-slate-400">
                  {isCompressing
                    ? 'جاري ضغط ومعالجة الصورة ذكياً...'
                    : 'يتم ضغط الصورة تلقائياً لتناسب التخزين الآمن وتحميل الخريطة السريع.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 7: AI Auto-Responder */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4 text-amber-400" />
                تفعيل الرد الآلي الذكي للطلبات والاستفسارات التجارية
              </label>
              <input
                type="checkbox"
                checked={aiAutoResponderEnabled}
                onChange={(e) => setAiAutoResponderEnabled(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded bg-slate-700 border-slate-600"
              />
            </div>

            {aiAutoResponderEnabled && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  تعليمات مخصصة لمساعد المصنع الذكي (الأسعار، شروط التوريد، والحد الأدنى للطلب MOQ):
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: الحد الأدنى للطلب 1000 قطعة، نوفر عينات خلال 48 ساعة، ومواعيد الشحن أسبوعين."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900/95 py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || isCompressing}
              className="px-6 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  جاري الحفظ والتدقيق...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {initialData ? 'حفظ التعديلات' : 'تأكيد وحفظ بيانات المصنع'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

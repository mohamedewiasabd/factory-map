import { OrderProposal } from '../types';

export interface SectorClassificationResult {
  sectors: string[];
  newGeneratedSectors?: string[];
  reasoning: string;
}

export async function classifyFactorySectors(params: {
  name: string;
  description: string;
  products?: string[];
}): Promise<SectorClassificationResult> {
  try {
    const res = await fetch('/api/ai/classify-sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }
    const data = await res.json();
    return {
      sectors: Array.isArray(data.sectors) && data.sectors.length > 0 ? data.sectors : ['صناعات هندسية ومعدنية'],
      newGeneratedSectors: Array.isArray(data.newGeneratedSectors) ? data.newGeneratedSectors : [],
      reasoning: data.reasoning || 'تم التصنيف والتوليد استناداً إلى تحليل المنتجات والنشاط',
    };
  } catch (error) {
    console.warn('AI classification fallback:', error);
    // Intelligent heuristic fallback with rich sector generation
    const text = ((params.name || '') + ' ' + (params.description || '') + ' ' + (params.products?.join(' ') || '')).toLowerCase();
    const sectors: string[] = [];
    const newGenerated: string[] = [];

    if (text.includes('سيار') || text.includes('مركبات') || text.includes('فرامل') || text.includes('مساعدين') || text.includes('فلاتر سيارات')) {
      sectors.push('سيارات ومركبات وصناعات مغذية');
    }
    if (text.includes('سفن') || text.includes('قوارب') || text.includes('يخوت') || text.includes('بحرية') || text.includes('موانئ')) {
      sectors.push('صناعات بحرية وبناء سفن ومعدات موانئ');
    }
    if (text.includes('طيران') || text.includes('طائرات') || text.includes('درون') || text.includes('مسيرات') || text.includes('فضاء')) {
      sectors.push('صناعات طيران ومسيرات وفضاء');
    }
    if (text.includes('طبية') || text.includes('سرنجات') || text.includes('شاش') || text.includes('أجهزة طبية') || text.includes('جراحة') || text.includes('تعويضية')) {
      sectors.push('أجهزة ومستلزمات طبية وجراحية');
    }
    if (text.includes('زجاج') || text.includes('بلور') || text.includes('كريستال') || text.includes('بصريات') || text.includes('عدسات')) {
      sectors.push('زجاج وبلور وبصريات');
    }
    if (text.includes('ذهب') || text.includes('فضة') || text.includes('مجوهرات') || text.includes('تعدين') || text.includes('مناجم')) {
      sectors.push('تعدين واستخراج ومعادن ثمينة');
    }
    if (text.includes('علف') || text.includes('أعلاف') || text.includes('دواجن') || text.includes('حيواني') || text.includes('سمان') || text.includes('أسماك')) {
      sectors.push('أعلاف وثروة حيوانية وداجنة');
    }
    if (text.includes('تدوير') || text.includes('معالجة مياه') || text.includes('صرف') || text.includes('نفايات') || text.includes('سماد عضوي')) {
      sectors.push('تدوير ومعالجة نفايات ومياه');
    }
    if (text.includes('بترول') || text.includes('غاز') || text.includes('بتروكيماويات') || text.includes('مشتقات نفطية')) {
      sectors.push('صناعات نفطية وبتروكيماويات وغاز');
    }
    if (text.includes('روبوت') || text.includes('أتمتة') || text.includes('نانو') || text.includes('ذكية') || text.includes('شريحة') || text.includes('برمجيات مدمجة')) {
      sectors.push('تكنولوجيا ومكونات ذكية وروبوتات');
    }
    if (text.includes('قماش') || text.includes('ملابس') || text.includes('نسيج') || text.includes('غزل')) {
      sectors.push('ملابس ومنسوجات');
    }
    if (text.includes('كرتون') || text.includes('ورق') || text.includes('تغليف') || text.includes('طباعة')) {
      sectors.push('ورق وطباعة وتغليف');
    }
    if (text.includes('صلب') || text.includes('حديد') || text.includes('معادن') || text.includes('ليزر')) {
      sectors.push('حديد وصلب وتشكيل معادن');
    }
    if (text.includes('غذاء') || text.includes('طعام') || text.includes('تجميد') || text.includes('عصير')) {
      sectors.push('صناعات غذائية ومشروبات');
    }
    if (text.includes('بلاستيك') || text.includes('بوليمر')) {
      sectors.push('بلاستيك ومطاط وبوليمرات');
    }

    return {
      sectors: sectors.length ? sectors : ['صناعات هندسية ومعدنية'],
      newGeneratedSectors: newGenerated,
      reasoning: 'تم التحليل والتصنيف التلقائي الذكي بحسب الكلمات المفتاحية في النشاط والمنتجات',
    };
  }
}

export interface AutoResponderResult {
  reply: string;
  orderProposal: OrderProposal | null;
}

export async function askFactoryAutoResponder(params: {
  factoryName: string;
  factoryDescription?: string;
  productsList?: string[];
  officerRole: 'sales' | 'purchasing';
  systemPrompt?: string;
  chatHistory: { sender: 'user' | 'assistant'; text: string }[];
  userMessage: string;
}): Promise<AutoResponderResult> {
  try {
    const res = await fetch('/api/ai/chat-auto-responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn('Auto responder fallback:', error);
    // Fallback response with simulated order conversion if quantities are mentioned
    const msg = params.userMessage;
    const hasQuantity = /\d+/.test(msg);
    let orderProposal: OrderProposal | null = null;
    
    if (hasQuantity && (msg.includes('طن') || msg.includes('قطعة') || msg.includes('كرتون') || msg.includes('شراء') || msg.includes('طلب'))) {
      const match = msg.match(/(\d+)/);
      const qty = match ? parseInt(match[0], 10) : 100;
      orderProposal = {
        title: `طلبية توريد منتجات من ${params.factoryName}`,
        quantity: qty,
        unit: msg.includes('طن') ? 'طن' : msg.includes('كرتون') ? 'كرتونة' : 'قطعة',
        estimatedPrice: qty * 150,
        currency: 'EGP',
        specifications: `توريد توريد صناعي معتمد بحسب المواصفات الفنية المطلوبة: ${msg.slice(0, 100)}`
      };
    }

    return {
      reply: `مرحباً بك! أنا مساعد المبيعات الذكي في ${params.factoryName}. يسعدنا جداً اهتمامك بمنتجاتنا. ${
        orderProposal 
          ? 'لقد قمت بإعداد مسودة أمر شراء فوري لتسريع طلبك، يمكنك مراجعته وتأكيده مباشرة عبر الزر أدناه!' 
          : 'يمكننا توفير جميع الكميات المطلوبة مع فترات توريد قياسية وضمان جودة معتمد. هل ترغب في تحديد الكمية لإنشاء أمر شراء رسمي؟'
      }`,
      orderProposal
    };
  }
}

/**
 * Client-side image compression & base64 conversion
 * Requirement: "اعتماد رفع الصور تشفيرها وتحويلها الي نص مشفر لسهولة تخزينها في قاعدة البيانات"
 */
export async function compressAndEncodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(event.target?.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 75% quality for lightweight base64 string
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

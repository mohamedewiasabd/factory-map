import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { GoogleGenAI } from '@google/genai';

function serverApiPlugin(): Plugin {
  return {
    name: 'server-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        // Helper to parse JSON body
        const readBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch (e) {
                resolve({});
              }
            });
          });
        };

        const sendJson = (data: any, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(data));
        };

        // 1. AI Sector Auto-Classification & Dynamic Generation
        if (req.url === '/api/ai/classify-sectors' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { name, description, products } = body;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              return sendJson({ 
                sectors: ['صناعات هندسية ومعدنية'], 
                newGeneratedSectors: [],
                reasoning: 'تصنيف افتراضي لعدم توفر مفتاح الذكاء الاصطناعي' 
              });
            }

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
أنت خبير تصنيف وتوليد قطاعات صناعية ذكي واحترافي.
قم بتحليل بيانات ونشاط هذا المصنع ومنتجاته:
اسم المصنع: ${name || 'غير محدد'}
الوصف: ${description || 'غير محدد'}
المنتجات أو الخدمات: ${Array.isArray(products) ? products.join(', ') : products || 'غير محدد'}

القطاعات الشائعة المرجعية:
[
  "ملابس ومنسوجات",
  "صناعات غذائية ومشروبات",
  "ورق وطباعة وتغليف",
  "صناعات كيميائية وأسمدة",
  "بلاستيك ومطاط وبوليمرات",
  "صناعات هندسية ومعدنية",
  "حديد وصلب وتشكيل معادن",
  "خشب وأثاث وديكور",
  "صناعات دوائية ومستحضرات تجميل",
  "أجهزة ومستلزمات طبية وجراحية",
  "مواد بناء وسيراميك ورخام",
  "إلكترونيات وأجهزة كهربائية وكابلات",
  "جلود ودباغة ومصنوعات جلدية",
  "طاقة متجددة وبيئة وهيدروجين أخضر",
  "سيارات ومركبات وصناعات مغذية",
  "صناعات بحرية وبناء سفن ومعدات موانئ",
  "صناعات طيران ومسيرات وفضاء",
  "تعدين واستخراج ومعادن ثمينة",
  "زجاج وبلور وبصريات",
  "تدوير ومعالجة نفايات ومياه",
  "أعلاف وثروة حيوانية وداجنة",
  "صناعات نفطية وبتروكيماويات وغاز",
  "تكنولوجيا ومكونات ذكية وروبوتات",
  "معدات وماكينات صناعية",
  "صناعات حرفية وتراثية"
]

التعليمات:
1. إذا كانت منتجات المصنع تتبع أحد القطاعات المرجعية أعلاه بدقة، فاختره.
2. إذا كان المصنع ينتج منتجات متخصصة أو تكنولوجية أو نوعية غير مغطاة بدقة، فقم بتوليد وصياغة اسم قطاع صناعي جديد ورسمي وواضح باللغة العربية (مثال: "صناعات طائرات بدون طيار"، "صناعة بطاريات الليثيوم"، "صناعات نانو تكنولوجي"، "طباعة ثلاثية الأبعاد"، "صناعات طبية تعويضية").
3. يمكنك إرجاع 1 إلى 3 قطاعات متوافقة.

أرجع فقط كائن JSON بالصيغة التالية تماماً بدون نصوص إضافية:
{
  "sectors": ["اسم القطاع 1", "اسم القطاع 2 (إن وجد)"],
  "newGeneratedSectors": ["أي اسم قطاع جديد تم توليده وغير موجود في القائمة المرجعية"],
  "reasoning": "سبب موجز للتصنيف والتوليد باللغة العربية في سطر واحد"
}
            `;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json'
              }
            });

            const parsed = JSON.parse(response.text || '{}');
            return sendJson(parsed);
          } catch (err: any) {
            console.error('Error in /api/ai/classify-sectors:', err);
            return sendJson({ sectors: ['صناعات هندسية ومعدنية'], newGeneratedSectors: [], reasoning: 'تصنيف تلقائي احتياطي' }, 200);
          }
        }

        // 2. AI Sales Auto-Responder Bot
        if (req.url === '/api/ai/chat-auto-responder' && req.method === 'POST') {
          try {
            const body = await readBody();
            const {
              factoryName,
              factoryDescription,
              productsList,
              officerRole, // 'sales' | 'purchasing'
              systemPrompt,
              chatHistory, // array of { sender: 'user' | 'assistant', text: string }
              userMessage
            } = body;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              return sendJson({
                reply: `مرحباً بك! يسعدني كمسؤول ${officerRole === 'sales' ? 'المبيعات' : 'المشتريات'} في ${factoryName} تواصلك معنا. نحن نقوم بدراسة طلبك وسنوافيك بالتفاصيل فوراً.`,
                orderProposal: null
              });
            }

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
أنت الآن مسؤول ${officerRole === 'sales' ? 'المبيعات الأول' : 'المشتريات'} في مصنع "${factoryName}".
نبذة عن المصنع: ${factoryDescription || ''}
قائمة المنتجات: ${Array.isArray(productsList) ? productsList.join(', ') : ''}
تعليمات المصنع الإضافية للرد الآلي: ${systemPrompt || 'الترحيب بالعميل والرد على الأسعار والكميات باحترافية وتحديد شروط التوريد.'}

تاريخ المحادثة السابقة:
${chatHistory?.map((m: any) => `${m.sender === 'user' ? 'العميل' : 'المسؤول'}: ${m.text}`).join('\n')}

رسالة العميل الحالية:
"${userMessage}"

المطلوب:
1. رد بأسلوب تجاري راقٍ ولبق باللغة العربية الفصحى.
2. إذا كان العميل يطلب كمية محددة أو طلب تسعير أو أبدى رغبته في الشراء وتم الاتفاق أو توضيح الكمية والمواصفات، قم بإنشاء اقتراح أمر شراء رسمي (orderProposal).
3. أرجع النتيجة حصراً بصيغة JSON كالتالي:
{
  "reply": "نص الرد الذي سيظهر للعميل في المحادثة",
  "orderProposal": null أو كائن يحتوي على {
    "title": "عنوان الصنف أو الطلبية",
    "quantity": عدد رقمي,
    "unit": "قطعة / طن / كرتونة / متر",
    "estimatedPrice": سعر تقديري كرقم,
    "currency": "EGP أو USD أو SAR",
    "specifications": "المواصفات المطلوبة باختصار"
  }
}
            `;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json'
              }
            });

            const parsed = JSON.parse(response.text || '{}');
            return sendJson(parsed);
          } catch (err: any) {
            console.error('Error in /api/ai/chat-auto-responder:', err);
            return sendJson({
              reply: 'أهلاً بك، شكراً لتواصلك مع المصنع. طلبك قيد المتابعة من قبل المسؤول المباشر.',
              orderProposal: null
            });
          }
        }

        // 3. Simulated External API Endpoint for external ERP/CRM integrations
        if (req.url.startsWith('/api/v1/factories')) {
          return sendJson({
            status: 'success',
            message: 'External API endpoint is live',
            version: '1.0.0',
            docs: 'https://ais-dev-efbutvlfuvinclzknaeo2k-571796959824.europe-west2.run.app/api-docs'
          });
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      serverApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Factory Map - خريطة المصانع المصرية',
          short_name: 'FactoryMap',
          description: 'المنصة الصناعية الموحدة: استكشاف المصانع، المناقصات الفورية، بورصة الخامات وحاسبة النولون',
          lang: 'ar',
          dir: 'rtl',
          orientation: 'portrait-primary',
          categories: ['business', 'productivity', 'localization'],
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,json,woff2,png,svg,ico}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/([a-z0-9]+\.)?(openstreetmap\.org|tile\.openstreetmap\.org|cartodb-basemaps-[a-z0-9]+\.global\.ssl\.fastly\.net|basemaps\.cartocdn\.com|arcgisonline\.com)/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'map-tiles',
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


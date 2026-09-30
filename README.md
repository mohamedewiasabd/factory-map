<div align="center">
<h1>خريطة المصانع المصرية — Factory Map</h1>
<p>دليل المصانع على الخريطة: بحث، تصفية، تعاقدات (RFQ)، مواد خام، وبطاقات رقمية للمصانع.</p>
<p><strong>عربي | PWA + Android + iOS + Desktop (Windows/Linux/macOS)</strong></p>
</div>

## نظرة عامة
تطبيق خريطة تفاعلية يعرض المصانع المصرية، مع:
- خريطة Leaflet تفاعلية بألوان مميزة للنشاطات الصناعية.
- بحث وتصفية (مدينة، منطقة صناعية، نشاط، طاقة إنتاجية، شهادات ISO/BRC/HACCP).
- تحديد الموقع («حدّد موقعي») وإرشادات الوصول.
- بطاقة رقمية لكل مصنع + زر اتصال مباشر.
- طلبات تعاقد وتوريد (RFQ) ومتابعة حالة الموافقة/الرفض.
- إعلانات مواد خام، إشعارات داخلية، وتسجيل دخول عبر Google.
- إدارة حسب الأدوار (مستخدم / مشرف / مالك مصنع).

## المنصات والروابط
| المنصة | الرابط / الملف |
|---|---|
| الويب (PWA) | https://gen-lang-client-0409964320.web.app |
| سياسة الخصوصية | https://gen-lang-client-0409964320.web.app/privacy |
| app-ads.txt | https://gen-lang-client-0409964320.web.app/app-ads.txt |
| أندرويد | `release/factory-map-1.0.0-release.apk` + `.aab` |
| GitHub | https://github.com/mohamedewiasabd/factory-map (خاص) |

## التشغيل محلياً
**المتطلبات:** Node.js 22+ (`~/.nvm/versions/node/v22.22.1`) — لا تستخدم Node < 20 مع Vite 8.

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
npm install
npm run dev        # http://localhost:3000
```

متغيرات البيئة مطلوبة وقت التشغيل من الويب/app فقط — أعدك الجمعات الثابتة في `src/lib/firebase.ts` (Firebase config مضمّنة). لمزيد من التفاصيل راجع `.env.example`.

## الأوامر
| الأمر | المفعول |
|---|---|
| `npm run dev` | خادم التطوير Vite على المنفذ 3000 |
| `npm run lint` / `typecheck` | `tsc --noEmit` |
| `npm run build` | بناء PWA في `dist` |
| `npm run android:build` | بناء `dist` + `cap sync` + APK ديباج |
| `npm run android:release` | APK + AAB موقّعان (يتطلب `android/keystore.properties`) |
| `npm run ios:sync` | `dist` + `cap sync ios` |
| `npm run tauri -- build` | بناء سطح المكتب (Windows/Linux/macOS) |
| `npm run deploy:hosting` | نشر Hosting |
| `npm run deploy:rules` | نشر `firestore.rules` |

## بناء ونشر أندرويد
1. **المفتاح (مرة واحدة):** موجود في `android/keystore/factorymap-release.keystore` (كلمة المرور في `android/keystore.properties` — الملف محلي **لا يُرفع إلى git**؛ وقد وُضع نسخة في `release/`).
2. **البناء:**
```bash
export ANDROID_HOME="$HOME/Android/Sdk"
npm run android:release
```
النواتج: `android/app/build/outputs/apk/release/app-release.apk` و `bundle/release/app-release.aab`.
3. **CI:** يبني GitHub Actions (`.github/workflows/android.yml`) توقيعاً من أسرار المستودع.

## Firestore && القواعد
- **المشروع:** `gen-lang-client-0409964320` — قاعدة البيانات: `ai-studio-b43aca98-7cce-4bbc-aab1-f30f0287b065`.
- مجموعة `admins/{uid}` أو بريد الأدمن `mnymjdy897@gmail.com` يمنح صلاحيات المشرف.
- إضافة المصنع تبدأ بـ `status: 'pending'` ولا يمكن للمصنّع اعتماد مصنعه بنفسه.
- القواعد محددة في `firestore.rules` وتُنشر عبر `firebase deploy --only firestore:rules`.

## الإصدار وإدارة المتعارِضات
- الإصدارات من `package.json` (1.0.0) ومن `android/app/build.gradle` (`versionCode`/`versionName`) ومن `src-tauri/tauri.conf.json`.
- عند رفع نسخة جديدة لـ Play Store: زد `versionCode` وتحديث `CFBundleVersion` في `ios/App/App/Info.plist`.
- الملفات المنتجة توضع في `release/` مع `SHA256SUMS.txt`.

## أمن
- تعقيم إخراج الخرائط باستخدام `escapeHtml`/`textContent` (لا `innerHTML` على بيانات المستخدم).
- لا تُخزّن مفاتيح أدمن أو مفاتيح API في الكود (Firebase config عام آمنة لقواعد الوصول المشددة).
- `keystore.properties` و `*.keystore/` مستثناة من git.
import React, { useState } from 'react';
import { 
  Code2, 
  Key, 
  Copy, 
  Check, 
  Send, 
  Terminal, 
  Globe, 
  ExternalLink,
  BookOpen
} from 'lucide-react';

export const ApiConsole: React.FC = () => {
  const [apiKey, setApiKey] = useState('fm_live_sec_8849bf09c73e4210a56281e7d9b9a4c1');
  const [copied, setCopied] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<'factories' | 'orders' | 'classify'>('factories');
  const [testing, setTesting] = useState(false);
  const [responseJson, setResponseJson] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateNewKey = () => {
    const newKey = 'fm_live_sec_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setApiKey(newKey);
  };

  const handleRunTest = async () => {
    setTesting(true);
    try {
      if (selectedEndpoint === 'factories') {
        const res = await fetch('/api/v1/factories');
        const data = await res.json();
        setResponseJson(JSON.stringify(data, null, 2));
      } else if (selectedEndpoint === 'classify') {
        const res = await fetch('/api/ai/classify-sectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'مصنع الأهرام للبلاستيك',
            description: 'إنتاج خراطيم الري الزراعي وحبيبات البوليمرات',
          }),
        });
        const data = await res.json();
        setResponseJson(JSON.stringify(data, null, 2));
      } else {
        setResponseJson(
          JSON.stringify(
            {
              status: 'success',
              endpoint: '/api/v1/orders',
              message: 'ERP Webhook listener active. POST payloads accepted in JSON format.',
              examplePayload: {
                factoryId: 'fac-101',
                title: 'Order via ERP sync',
                quantity: 500,
                unit: 'piece',
              },
            },
            null,
            2
          )
        );
      }
    } catch (err: any) {
      setResponseJson(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-slate-100">
              واجهة برمجة التطبيقات للمطورين وأنظمة ERP
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ربط سلس مع برامج تخطيط الموارد وإدارة علاقات العملاء (Odoo, SAP, Oracle, Zoho)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-bold">
            REST API v1.0 • LIVE
          </span>
        </div>
      </div>

      {/* API Key Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          مفتاح التوثيق السري (Bearer API Token):
        </h3>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={apiKey}
            className="flex-1 py-2.5 px-4 bg-slate-800 rounded-xl border border-slate-700 font-mono text-xs text-amber-300 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ' : 'نسخ المفتاح'}</span>
          </button>
          <button
            onClick={generateNewKey}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
          >
            توليد مفتاح جديد
          </button>
        </div>
      </div>

      {/* Endpoints Documentation & Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Endpoints List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            نقاط الاتصال المتاحة (REST Endpoints)
          </h3>

          <div className="space-y-3">
            <div
              onClick={() => setSelectedEndpoint('factories')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedEndpoint === 'factories'
                  ? 'bg-amber-500/10 border-amber-500/60'
                  : 'bg-slate-800/60 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  GET
                </span>
                <span className="font-mono text-xs text-slate-200">/api/v1/factories</span>
              </div>
              <p className="text-xs text-slate-400">
                استرجاع قائمة المصانع المعتمدة مع إمكانية التصفية بالقطاع أو المدينة.
              </p>
            </div>

            <div
              onClick={() => setSelectedEndpoint('orders')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedEndpoint === 'orders'
                  ? 'bg-amber-500/10 border-amber-500/60'
                  : 'bg-slate-800/60 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  POST
                </span>
                <span className="font-mono text-xs text-slate-200">/api/v1/orders</span>
              </div>
              <p className="text-xs text-slate-400">
                إنشاء أمر توريد مباشر أو طلب تسعير من نظام ERP خارجي وتتبعه برمجياً.
              </p>
            </div>

            <div
              onClick={() => setSelectedEndpoint('classify')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedEndpoint === 'classify'
                  ? 'bg-amber-500/10 border-amber-500/60'
                  : 'bg-slate-800/60 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  POST
                </span>
                <span className="font-mono text-xs text-slate-200">/api/ai/classify-sectors</span>
              </div>
              <p className="text-xs text-slate-400">
                محرك تصنيف ذكي للمنتجات والمنشآت وفق القوائم الصناعية المعتمدة.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Live Sandbox */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              مختبر الاختبار التفاعلي (API Sandbox)
            </h3>
            <button
              onClick={handleRunTest}
              disabled={testing}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {testing ? 'جاري الإرسال...' : 'تنفيذ طلب تجريبي'}
            </button>
          </div>

          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs overflow-auto max-h-80">
            {responseJson ? (
              <pre className="text-emerald-400 whitespace-pre-wrap">{responseJson}</pre>
            ) : (
              <span className="text-slate-600 italic">
                اضغط على زر "تنفيذ طلب تجريبي" لاختبار الاستجابة اللحظية لنقطة الاتصال المحددة...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

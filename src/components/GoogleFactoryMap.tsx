/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Building2, 
  Compass, 
  X, 
  Layers, 
  Satellite, 
  Map as MapIcon,
  Navigation,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Factory, INDUSTRIAL_SECTORS, CITIES_LIST } from '../types';
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY, onGoogleMapsAuthError } from '../services/googleMapsService';

interface GoogleFactoryMapProps {
  factories: Factory[];
  onSelectFactory: (factory: Factory) => void;
  onStartChat: (factory: Factory, role: 'sales' | 'purchasing') => void;
  onFallbackToLeaflet?: () => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

export const GoogleFactoryMap: React.FC<GoogleFactoryMapProps> = ({
  factories,
  onSelectFactory,
  onStartChat,
  onFallbackToLeaflet,
  currentUserId,
  isAdmin
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [activeFactory, setActiveFactory] = useState<Factory | null>(null);
  const [isListView, setIsListView] = useState(false);

  // Filter factories
  const visibleFactories = factories.filter((fac) => {
    const canSee = fac.status === 'approved' || (currentUserId && fac.ownerId === currentUserId) || isAdmin;
    if (!canSee) return false;

    if (selectedSector !== 'all' && !fac.sectors.includes(selectedSector)) return false;
    if (selectedCity !== 'all' && fac.city !== selectedCity) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = fac.name.toLowerCase().includes(q);
      const matchDesc = fac.description?.toLowerCase().includes(q);
      const matchCity = fac.city?.toLowerCase().includes(q);
      const matchArea = fac.industrialArea?.toLowerCase().includes(q);
      const matchProducts = fac.productsList?.some((p) => p.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchCity && !matchArea && !matchProducts) return false;
    }

    return true;
  });

  // Initialize Google Map
  useEffect(() => {
    let isMounted = true;

    // Listen for authentication or target blocked errors
    onGoogleMapsAuthError((msg) => {
      if (isMounted) {
        setLoadError(msg);
      }
    });

    loadGoogleMaps()
      .then((g) => {
        if (!isMounted || !mapRef.current) return;

        const map = new g.maps.Map(mapRef.current, {
          center: { lat: 30.25, lng: 31.45 }, // Industrial Cairo / Delta Hub
          zoom: 8,
          mapTypeId: g.maps.MapTypeId.ROADMAP,
          zoomControl: true,
          mapTypeControl: false, // We provide modern mobile custom control
          streetViewControl: true,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'simplified' }],
            },
          ],
        });

        googleMapInstance.current = map;
        setMapLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        if (isMounted) {
          setLoadError(
            'حدث خطأ في ترخيص المفتاح (ApiTargetBlockedMapError): لم يتم تفعيل خدمة Maps JavaScript API على المفتاح أو يوجد تقييد للنطاق.'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!googleMapInstance.current || !mapLoaded || !window.google) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    visibleFactories.forEach((factory) => {
      if (!factory.lat || !factory.lng) return;

      const position = { lat: factory.lat, lng: factory.lng };
      bounds.extend(position);

      const isApproved = factory.status === 'approved';
      const pinColor = isApproved ? '#059669' : '#d97706';

      // SVG Factory marker pin
      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">
            <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 26 20 26s20-12 20-26C40 8.954 31.046 0 20 0z" fill="${pinColor}" stroke="#ffffff" stroke-width="2"/>
            <circle cx="20" cy="18" r="14" fill="#0f172a"/>
            <text x="20" y="23" font-size="14" text-anchor="middle" fill="#f8fafc">🏭</text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(36, 42),
        anchor: new window.google.maps.Point(18, 42),
      };

      const marker = new window.google.maps.Marker({
        position,
        map: googleMapInstance.current,
        title: factory.name,
        icon: svgIcon,
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener('click', () => {
        setActiveFactory(factory);

        // Open InfoWindow
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }

        const content = document.createElement('div');
        content.style.direction = 'rtl';
        content.style.fontFamily = "'Cairo', sans-serif";
        content.style.textAlign = 'right';
        content.style.minWidth = '220px';
        content.style.padding = '4px';

        const statusWrap = document.createElement('div');
        statusWrap.style.marginBottom = '4px';
        const statusBadge = document.createElement('span');
        statusBadge.style.fontSize = '10px';
        statusBadge.style.fontWeight = 'bold';
        statusBadge.style.background = isApproved ? '#d1fae5' : '#fef3c7';
        statusBadge.style.color = isApproved ? '#065f46' : '#92400e';
        statusBadge.style.padding = '2px 6px';
        statusBadge.style.borderRadius = '9999px';
        statusBadge.textContent = isApproved ? 'معتمد رسمياً' : 'قيد التدقيق';
        statusWrap.appendChild(statusBadge);
        content.appendChild(statusWrap);

        const title = document.createElement('h4');
        title.style.fontSize = '13px';
        title.style.fontWeight = '800';
        title.style.margin = '0 0 2px 0';
        title.style.color = '#0f172a';
        title.textContent = factory.name;
        content.appendChild(title);

        const sub = document.createElement('p');
        sub.style.fontSize = '11px';
        sub.style.color = '#475569';
        sub.style.margin = '0 0 8px 0';
        sub.textContent = `📍 ${factory.city || ''} - ${factory.industrialArea || ''}`;
        content.appendChild(sub);

        const btnWrap = document.createElement('div');
        btnWrap.style.display = 'flex';
        btnWrap.style.gap = '4px';
        const btnDet = document.createElement('button');
        btnDet.id = `gmap-det-${factory.id}`;
        btnDet.style.flex = '1';
        btnDet.style.padding = '5px';
        btnDet.style.fontSize = '11px';
        btnDet.style.fontWeight = 'bold';
        btnDet.style.background = '#0f172a';
        btnDet.style.color = 'white';
        btnDet.style.border = 'none';
        btnDet.style.borderRadius = '6px';
        btnDet.style.cursor = 'pointer';
        btnDet.textContent = 'الملف';
        const btnChat = document.createElement('button');
        btnChat.id = `gmap-chat-${factory.id}`;
        btnChat.style.flex = '1';
        btnChat.style.padding = '5px';
        btnChat.style.fontSize = '11px';
        btnChat.style.fontWeight = 'bold';
        btnChat.style.background = '#f59e0b';
        btnChat.style.color = '#0f172a';
        btnChat.style.border = 'none';
        btnChat.style.borderRadius = '6px';
        btnChat.style.cursor = 'pointer';
        btnChat.textContent = 'تواصل';
        btnWrap.appendChild(btnDet);
        btnWrap.appendChild(btnChat);
        content.appendChild(btnWrap);

        const infoWindow = new window.google.maps.InfoWindow({
          content,
          pixelOffset: new window.google.maps.Size(0, -38),
        });

        infoWindow.open(googleMapInstance.current, marker);
        activeInfoWindowRef.current = infoWindow;

        setTimeout(() => {
          const btnDet = document.getElementById(`gmap-det-${factory.id}`);
          const btnChat = document.getElementById(`gmap-chat-${factory.id}`);
          if (btnDet) btnDet.onclick = () => onSelectFactory(factory);
          if (btnChat) btnChat.onclick = () => onStartChat(factory, 'sales');
        }, 100);
      });

      markersRef.current.push(marker);
    });

    if (visibleFactories.length > 0 && !bounds.isEmpty()) {
      googleMapInstance.current.fitBounds(bounds);
    }
  }, [visibleFactories, mapLoaded]);

  // Switch map type (Roadmap, Satellite, Hybrid)
  const handleChangeMapType = (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    setMapTypeId(type);
    if (googleMapInstance.current && window.google) {
      googleMapInstance.current.setMapTypeId(type);
    }
  };

  // Locate Me
  const handleLocateMe = () => {
    if (!navigator.geolocation || !googleMapInstance.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        googleMapInstance.current?.setCenter(userLoc);
        googleMapInstance.current?.setZoom(13);
      },
      (err) => {
        console.warn('Geolocation error:', err);
      }
    );
  };

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-950">
      
      {/* Search & Sector Filter Top Bar */}
      <div className="z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-2.5 sm:p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم، المنتج، أو المنطقة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-9 py-2 text-xs sm:text-sm bg-slate-800 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City Selector */}
            <div className="w-28 sm:w-44 shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-2 px-2 text-xs sm:text-sm bg-slate-800 text-slate-200 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="all">📍 المدن</option>
                {CITIES_LIST.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle List View */}
            <button
              onClick={() => setIsListView(!isListView)}
              className="p-2 sm:px-3 sm:py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 shrink-0"
              title="التبديل بين الخريطة والقائمة"
            >
              {isListView ? '🗺️' : '📋'}
              <span className="hidden sm:inline">{isListView ? 'الخريطة' : 'القائمة'}</span>
            </button>
          </div>

          {/* Sector Horizontal Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs -mx-1 px-1">
            <button
              onClick={() => setSelectedSector('all')}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium ${
                selectedSector === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              الكل ({visibleFactories.length})
            </button>
            {INDUSTRIAL_SECTORS.map((sector) => {
              const isSelected = selectedSector === sector;
              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-800'
                  }`}
                >
                  {sector}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative flex-1 w-full h-full">
        
        {/* Google Maps DOM Canvas */}
        <div
          ref={mapRef}
          className={`w-full h-full z-0 transition-opacity duration-300 ${
            isListView ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Fallback if key load issue or ApiTargetBlockedMapError */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-slate-950/95 text-slate-300">
            <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-100">
                  تنبيه تفعيل Maps JavaScript API
                </h3>
                <p className="text-xs text-amber-300 font-mono mt-1 bg-amber-950/50 p-2 rounded-xl border border-amber-500/20 dir-ltr text-center">
                  ApiTargetBlockedMapError
                </p>
              </div>

              <div className="text-right text-xs text-slate-300 space-y-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <p className="font-bold text-amber-400">لتفعيل هذا المفتاح على خرائط Google الرسمية:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-1 text-[11px] leading-relaxed">
                  <li>افتح <strong>Google Cloud Console</strong> للمشروع التابع للمفتاح.</li>
                  <li>توجه إلى <strong>APIs & Services ⬅️ Library</strong>.</li>
                  <li>ابحث عن <strong>Maps JavaScript API</strong> واضغط <strong>Enable</strong>.</li>
                  <li>في صفحة <strong>Credentials</strong>، تأكد أن المفتاح لا يقيد الـ API (API Restrictions) أو اختر Maps JavaScript API ضمن المسموح به.</li>
                </ol>
              </div>

              {onFallbackToLeaflet && (
                <button
                  onClick={onFallbackToLeaflet}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  تشغيل الخريطة التفاعلية الفورية (Leaflet / OSM)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Map Controls on Top Corners */}
        {!isListView && (
          <>
            {/* Map Type Switcher (Roadmap vs Satellite / Hybrid) */}
            <div className="absolute top-4 right-4 z-10 flex items-center bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 p-1 shadow-xl">
              <button
                onClick={() => handleChangeMapType('roadmap')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  mapTypeId === 'roadmap' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>شوارع</span>
              </button>
              <button
                onClick={() => handleChangeMapType('hybrid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  mapTypeId === 'hybrid' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                <span>أقمار صناعية</span>
              </button>
            </div>

            {/* Locate Me Button */}
            <button
              onClick={handleLocateMe}
              className="absolute top-4 left-4 z-10 p-2.5 bg-slate-900/90 text-amber-400 hover:text-amber-300 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md active:scale-95 transition-transform"
              title="تحديد موقعي على الخريطة"
            >
              <Compass className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Active Factory Mobile Bottom Sheet */}
        {activeFactory && !isListView && (
          <div className="absolute bottom-20 md:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-20 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                    activeFactory.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {activeFactory.status === 'approved' ? 'مصنع معتمد ومفعل' : 'قيد التدقيق'}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-100">{activeFactory.name}</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {activeFactory.city} - {activeFactory.industrialArea}
                </p>
              </div>
              <button
                onClick={() => setActiveFactory(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              {activeFactory.description}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 p-2 rounded-xl">
                <p className="text-[10px] text-amber-400 font-bold">المبيعات:</p>
                <p className="font-medium text-slate-200 truncate">{activeFactory.salesOfficer?.name}</p>
                <p className="text-[10px] text-slate-400 truncate dir-ltr text-right">
                  {activeFactory.salesOfficer?.phone}
                </p>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl">
                <p className="text-[10px] text-blue-400 font-bold">المشتريات:</p>
                <p className="font-medium text-slate-200 truncate">{activeFactory.purchasingOfficer?.name}</p>
                <p className="text-[10px] text-slate-400 truncate dir-ltr text-right">
                  {activeFactory.purchasingOfficer?.phone}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onSelectFactory(activeFactory)}
                className="flex-1 py-2 px-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center justify-center gap-1 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                عرض الملف
              </button>
              <button
                onClick={() => onStartChat(activeFactory, 'sales')}
                className="flex-1 py-2 px-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                محادثة مبيعات
              </button>
            </div>
          </div>
        )}

        {/* List View Container */}
        {isListView && (
          <div className="absolute inset-0 z-10 overflow-y-auto p-3 sm:p-6 pb-28 md:pb-6 bg-slate-950">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-100">
                  المصانع المسجلة ({visibleFactories.length})
                </h2>
                <button
                  onClick={() => setIsListView(false)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  العودة لخريطة Google 🗺️
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleFactories.map((factory) => (
                  <div
                    key={factory.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            factory.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {factory.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {factory.rating} ({factory.reviewsCount})
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-slate-100 mb-1">{factory.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {factory.city} - {factory.industrialArea}
                      </p>

                      <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                        {factory.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => onSelectFactory(factory)}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        التفاصيل
                      </button>
                      <button
                        onClick={() => onStartChat(factory, 'sales')}
                        className="py-2 px-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                      >
                        تواصل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  MessageSquare, 
  Building2, 
  Compass, 
  X, 
  Layers,
  Maximize2,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Award,
  Calendar,
  Layers as LayersIcon,
  Globe2,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Route,
  ArrowRight,
  Car,
  Radar,
  Truck,
  QrCode,
  FileSpreadsheet,
  Boxes,
  FileDown,
  DollarSign,
  Calculator
} from 'lucide-react';
import { 
  Factory, 
  INDUSTRIAL_SECTORS, 
  CITIES_LIST, 
  MAJOR_INDUSTRIAL_ZONES, 
  IndustrialZoneInfo,
  getAllIndustrialCities,
  getAllIndustrialSectors
} from '../types';
import { escapeHtml } from '../lib/escapeHtml';

interface FactoryMapProps {
  factories: Factory[];
  onSelectFactory: (factory: Factory) => void;
  onStartChat: (factory: Factory, role: 'sales' | 'purchasing') => void;
  currentUserId?: string;
  isAdmin?: boolean;
  onOpenDigitalProfile?: (factory: Factory) => void;
  onOpenCatalog?: (factory: Factory) => void;
  onOpenRFQModal?: () => void;
  onOpenRawMaterialsMarket?: () => void;
}

type TileSource = 'osm' | 'satellite' | 'voyager' | 'dark';

interface TileConfig {
  name: string;
  icon: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

const TILE_CONFIGS: Record<TileSource, TileConfig> = {
  osm: {
    name: 'OpenStreetMap (القياسي)',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  satellite: {
    name: 'أقمار صناعية فضائية (Satellite)',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    maxZoom: 18,
  },
  voyager: {
    name: 'شوارع تفصيلية (Voyager)',
    icon: '🏙️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  dark: {
    name: 'النمط الليلي الداكن (Dark)',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  },
};

export const FactoryMap: React.FC<FactoryMapProps> = ({
  factories,
  onSelectFactory,
  onStartChat,
  currentUserId,
  isAdmin,
  onOpenDigitalProfile,
  onOpenCatalog,
  onOpenRFQModal,
  onOpenRawMaterialsMarket,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const radarCircleRef = useRef<L.Circle | null>(null);

  const [activeTile, setActiveTile] = useState<TileSource>('osm');
  const [showTileMenu, setShowTileMenu] = useState(false);
  const [showZoneMenu, setShowZoneMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [onlyVerifiedLocation, setOnlyVerifiedLocation] = useState(false);
  const [onlyExporters, setOnlyExporters] = useState(false);
  const [activeFactory, setActiveFactory] = useState<Factory | null>(null);
  const [isListView, setIsListView] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  // Radar & Radius Logistics State
  const [radarRadiusKm, setRadarRadiusKm] = useState<number | null>(null);
  const [truckType, setTruckType] = useState<'jumbo' | 'trailer' | 'pickup'>('jumbo');

  // GPS Routing State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    factory: Factory;
    distanceKm: string;
    durationMin: number;
  } | null>(null);

  // Distance helper
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Filter factories
  const visibleFactories = factories.filter((fac) => {
    const canSee = fac.status === 'approved' || (currentUserId && fac.ownerId === currentUserId) || isAdmin;
    if (!canSee) return false;

    if (selectedSector !== 'all' && !fac.sectors.includes(selectedSector)) {
      return false;
    }

    if (selectedCity !== 'all' && fac.city !== selectedCity) {
      return false;
    }

    if (onlyVerifiedLocation && !fac.isLocationVerified) {
      return false;
    }

    if (onlyExporters && !fac.isExporter) {
      return false;
    }

    // Radius radar filter
    if (radarRadiusKm && userCoords && fac.lat && fac.lng) {
      const dist = getDistanceKm(userCoords.lat, userCoords.lng, fac.lat, fac.lng);
      if (dist > radarRadiusKm) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = fac.name.toLowerCase().includes(q);
      const matchDesc = fac.description?.toLowerCase().includes(q);
      const matchCity = fac.city?.toLowerCase().includes(q);
      const matchArea = fac.industrialArea?.toLowerCase().includes(q);
      const matchProducts = fac.productsList?.some((p) => p.toLowerCase().includes(q));
      const matchSectors = fac.sectors?.some((s) => s.toLowerCase().includes(q));
      const matchCerts = fac.certifications?.some((c) => c.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchCity && !matchArea && !matchProducts && !matchSectors && !matchCerts) {
        return false;
      }
    }

    return true;
  });

  // Switch Tile Layer
  const setMapTile = (type: TileSource) => {
    if (!mapInstanceRef.current) return;
    const config = TILE_CONFIGS[type];
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || 'abc',
      maxZoom: config.maxZoom,
    });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
    setActiveTile(type);
    setShowTileMenu(false);
  };

  // Jump to Industrial Zone
  const handleJumpToZone = (zone: IndustrialZoneInfo) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([zone.lat, zone.lng], zone.zoom, { duration: 1.5 });
    setShowZoneMenu(false);
    setSelectedCity(zone.city);
  };

  // Locate user geolocation on map
  const handleLocateMe = (showPopup = true) => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        if (!mapInstanceRef.current) return;

        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.remove();
        }

        const locMarker = L.circleMarker([latitude, longitude], {
          radius: 11,
          color: '#ffffff',
          weight: 3,
          fillColor: '#2563eb',
          fillOpacity: 0.95,
        }).addTo(mapInstanceRef.current);

        if (showPopup) {
          locMarker.bindPopup('📍 موقعك الجغرافي الحالي (نقطة الانطلاق)').openPopup();
        }
        userLocationMarkerRef.current = locMarker;

        mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Geolocation denied or failed:', err);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  // Draw Fallback direct route
  const drawFallbackRoute = (uLat: number, uLng: number, targetFactory: Factory) => {
    if (!mapInstanceRef.current) return;
    if (!routeLayerRef.current) {
      routeLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }
    routeLayerRef.current.clearLayers();

    const latLngs: [number, number][] = [
      [uLat, uLng],
      [targetFactory.lat, targetFactory.lng],
    ];

    const polyline = L.polyline(latLngs, {
      color: '#f59e0b',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.9,
    }).addTo(routeLayerRef.current);

    mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [60, 60] });

    // Approx distance in KM
    const dLat = (targetFactory.lat - uLat) * (Math.PI / 180);
    const dLng = (targetFactory.lng - uLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(uLat * (Math.PI / 180)) *
        Math.cos(targetFactory.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = (6371 * c).toFixed(1);
    const duration = Math.round(Number(dist) * 1.2);

    setRouteInfo({
      factory: targetFactory,
      distanceKm: dist,
      durationMin: duration,
    });
  };

  // Start Driving Route to Factory via GPS and Open Source Routing Machine (OSRM)
  const handleStartRoute = (targetFactory: Factory) => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم خدمة تحديد الموقع الجغرافي GPS.');
      return;
    }

    setCalculatingRoute(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });

        if (mapInstanceRef.current) {
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }
          const locMarker = L.circleMarker([uLat, uLng], {
            radius: 11,
            color: '#ffffff',
            weight: 3,
            fillColor: '#2563eb',
            fillOpacity: 0.95,
          }).addTo(mapInstanceRef.current);
          locMarker.bindPopup('📍 موقعك الحالي (نقطة الانطلاق)').openPopup();
          userLocationMarkerRef.current = locMarker;
        }

        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${targetFactory.lng},${targetFactory.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distKm = (route.distance / 1000).toFixed(1);
            const durMin = Math.round(route.duration / 60);

            const coords: [number, number][] = route.geometry.coordinates;
            const latLngs: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);

            if (mapInstanceRef.current) {
              if (!routeLayerRef.current) {
                routeLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
              }
              routeLayerRef.current.clearLayers();

              // Shadow border for contrast
              const shadowLine = L.polyline(latLngs, {
                color: '#0f172a',
                weight: 9,
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round',
              });

              // Bright amber route line
              const mainLine = L.polyline(latLngs, {
                color: '#f59e0b',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              });

              routeLayerRef.current.addLayer(shadowLine);
              routeLayerRef.current.addLayer(mainLine);

              mapInstanceRef.current.fitBounds(mainLine.getBounds(), { padding: [60, 60] });
            }

            setRouteInfo({
              factory: targetFactory,
              distanceKm: distKm,
              durationMin: durMin,
            });
          } else {
            drawFallbackRoute(uLat, uLng, targetFactory);
          }
        } catch (err) {
          console.warn('OSRM routing fetch error:', err);
          drawFallbackRoute(uLat, uLng, targetFactory);
        } finally {
          setCalculatingRoute(false);
        }
      },
      (err) => {
        setCalculatingRoute(false);
        alert('يرجى السماح بالوصول لموقعك الجغرافي (GPS) في المتصفح لرسم خط السير المباشر نحو المصنع.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setRouteInfo(null);
  };

  // Fit all factory markers
  const handleFitAll = () => {
    if (!mapInstanceRef.current || visibleFactories.length === 0) return;
    const bounds = L.latLngBounds([]);
    visibleFactories.forEach((fac) => {
      if (fac.lat && fac.lng) {
        bounds.extend([fac.lat, fac.lng]);
      }
    });
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  };

  // Voice Navigation directions link
  const getDirectionsUrl = (lat: number, lng: number) => {
    return userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  // Initialize Leaflet map with OpenStreetMap & scale control
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.15, 31.35],
      zoom: 8,
      zoomControl: true,
    });

    // Add scale control
    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map);

    const config = TILE_CONFIGS[activeTile];
    const initialTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || 'abc',
      maxZoom: config.maxZoom,
    }).addTo(map);

    tileLayerRef.current = initialTileLayer;
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update Radar Radius circle on map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (radarCircleRef.current) {
      radarCircleRef.current.remove();
      radarCircleRef.current = null;
    }

    if (radarRadiusKm !== null) {
      const center = userCoords || { lat: 30.15, lng: 31.35 };
      const circle = L.circle([center.lat, center.lng], {
        radius: radarRadiusKm * 1000,
        color: '#f59e0b',
        weight: 2.5,
        dashArray: '8, 8',
        fillColor: '#f59e0b',
        fillOpacity: 0.12,
      }).addTo(mapInstanceRef.current);

      radarCircleRef.current = circle;
      mapInstanceRef.current.fitBounds(circle.getBounds(), { padding: [40, 40] });
    }
  }, [radarRadiusKm, userCoords]);

  // Logistics Freight Cost & Time Calculator
  const calculateFreight = (distKmNum: number, type: 'jumbo' | 'trailer' | 'pickup') => {
    if (type === 'pickup') {
      const cost = Math.round(1000 + distKmNum * 16);
      const speed = 70;
      const hours = (distKmNum / speed).toFixed(1);
      return { cost, hours, label: 'دبابة (1.5 طن)', desc: 'خامات خفيفة، طرود، عينات عاجلة' };
    } else if (type === 'jumbo') {
      const cost = Math.round(1800 + distKmNum * 26);
      const speed = 65;
      const hours = (distKmNum / speed).toFixed(1);
      return { cost, hours, label: 'جامبو (4 طن)', desc: 'كرتون، بضائع معبأة، قطع غيار' };
    } else {
      const cost = Math.round(4500 + distKmNum * 58);
      const speed = 55;
      const hours = (distKmNum / speed).toFixed(1);
      return { cost, hours, label: 'تريلا (25 طن)', desc: 'صاج، حديد، أسمنت، خامات ثقيلة' };
    }
  };

  // Update map markers when filtered factories change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds = L.latLngBounds([]);

    visibleFactories.forEach((factory) => {
      if (!factory.lat || !factory.lng) return;

      const latLng = L.latLng(factory.lat, factory.lng);
      bounds.extend(latLng);

      const isApproved = factory.status === 'approved';
      const isVerified = !!factory.isLocationVerified;
      const markerColor = !isApproved ? '#f59e0b' : '#059669';

      const customIcon = L.divIcon({
        className: 'custom-factory-marker',
        html: `
          <div style="position: relative; width: 42px; height: 42px;">
            <div style="
              background: ${markerColor};
              width: 40px;
              height: 40px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2px solid white;
              box-shadow: 0 4px 14px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 16px;">
                🏭
              </div>
            </div>
            ${isVerified ? `
              <div style="
                position: absolute;
                top: -4px;
                right: -4px;
                background: #10b981;
                border: 2px solid #ffffff;
                color: #ffffff;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 900;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              ">
                ✓
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -40],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      const cleanPhone = factory.salesOfficer?.phone?.replace(/[^0-9]/g, '') || '';
      const cleanWa = factory.salesOfficer?.whatsapp?.replace(/[^0-9]/g, '') || cleanPhone;

      const popupHtml = `
        <div style="direction: rtl; font-family: 'Cairo', sans-serif; text-align: right; min-width: 275px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; background: ${isApproved ? '#d1fae5' : '#fef3c7'}; color: ${isApproved ? '#065f46' : '#92400e'}; font-weight: 800;">
              ${isApproved ? 'مصنع معتمد' : 'قيد التدقيق'}
            </span>
            ${isVerified ? `
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 6px; background: #ecfdf5; color: #059669; font-weight: 800; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 2px;">
                ✓ موقع مدقق GPS
              </span>
            ` : ''}
          </div>

          <h4 style="font-size: 14px; font-weight: 800; margin: 0 0 3px 0; color: #0f172a;">${escapeHtml(factory.name)}</h4>
          <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.4;">
            📍 <strong>${escapeHtml(factory.city)}</strong> - ${escapeHtml(factory.industrialArea)}
          </p>

          ${factory.productionCapacity ? `
            <p style="font-size: 10px; color: #0369a1; background: #f0f9ff; padding: 4px 6px; border-radius: 6px; margin: 0 0 6px 0; border: 1px solid #bae6fd;">
              ⚙️ الطاقة الإنتاجية: <strong>${escapeHtml(factory.productionCapacity)}</strong>
            </p>
          ` : ''}

          <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 8px;">
            ${(factory.certifications || []).slice(0, 3).map((c) => `
              <span style="font-size: 9px; background: #f8fafc; color: #0f172a; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; font-weight: 600;">
                🏅 ${escapeHtml(c)}
              </span>
            `).join('')}
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            {/* Direct Route on Leaflet button */}
            <button id="btn-route-${factory.id}" style="width: 100%; padding: 7px; font-size: 11px; font-weight: 800; background: #f59e0b; color: #0f172a; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              🚗 خط السير المباشر نحو المصنع (GPS)
            </button>

            <div style="display: flex; gap: 4px;">
              <button id="btn-details-${factory.id}" style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer;">
                📋 عرض الملف
              </button>
              <button id="btn-sales-${factory.id}" style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; background: #334155; color: white; border: none; border-radius: 6px; cursor: pointer;">
                💬 مبيعات
              </button>
            </div>

            <div style="display: flex; gap: 4px;">
              <button id="btn-qr-${factory.id}" style="flex: 1; padding: 5px; font-size: 10px; font-weight: bold; background: #1e293b; color: #f59e0b; border: 1px solid #334155; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 2px;">
                📱 كارت QR
              </button>
              <button id="btn-catalog-${factory.id}" style="flex: 1; padding: 5px; font-size: 10px; font-weight: bold; background: #1e293b; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 2px;">
                📄 كتالوج PDF
              </button>
            </div>

            <div style="display: flex; gap: 4px;">
              <a href="${getDirectionsUrl(factory.lat, factory.lng)}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; padding: 5px; font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0284c7; text-decoration: none; border-radius: 6px; border: 1px solid #bae6fd; display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
                🧭 خرائط الهاتف
              </a>
              ${cleanWa ? `
                <a href="https://wa.me/${cleanWa}?text=${encodeURIComponent(`مرحباً مصنع ${factory.name}، نود الاستفسار عن منتجاتكم وتوريداتكم الصناعية`)}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; padding: 5px; font-size: 10px; font-weight: bold; background: #dcfce7; color: #15803d; text-decoration: none; border-radius: 6px; border: 1px solid #86efac; display: inline-flex; align-items: center; justify-content: center; gap: 2px;">
                  🟢 واتساب
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btnDetails = document.getElementById(`btn-details-${factory.id}`);
        const btnSales = document.getElementById(`btn-sales-${factory.id}`);
        const btnRoute = document.getElementById(`btn-route-${factory.id}`);
        const btnQr = document.getElementById(`btn-qr-${factory.id}`);
        const btnCatalog = document.getElementById(`btn-catalog-${factory.id}`);

        if (btnDetails) {
          btnDetails.onclick = () => onSelectFactory(factory);
        }
        if (btnSales) {
          btnSales.onclick = () => onStartChat(factory, 'sales');
        }
        if (btnRoute) {
          btnRoute.onclick = () => handleStartRoute(factory);
        }
        if (btnQr && onOpenDigitalProfile) {
          btnQr.onclick = () => onOpenDigitalProfile(factory);
        }
        if (btnCatalog && onOpenCatalog) {
          btnCatalog.onclick = () => onOpenCatalog(factory);
        }
      });

      marker.on('click', () => {
        setActiveFactory(factory);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    if (visibleFactories.length > 0 && bounds.isValid() && !routeInfo) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [visibleFactories]);

  const handleFocusFactory = (factory: Factory) => {
    setActiveFactory(factory);
    setIsListView(false);
    if (mapInstanceRef.current && factory.lat && factory.lng) {
      mapInstanceRef.current.flyTo([factory.lat, factory.lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-950 font-['Cairo',sans-serif]">
      
      {/* Top Filter and Search Bar */}
      <div className="z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-2 sm:p-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-2">
          
          {/* Main search and selectors row */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم، المنتج، المنطقة الصناعية أو شهادة ISO..."
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
            <div className="w-32 sm:w-44 shrink-0">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-2 px-2 text-xs sm:text-sm bg-slate-800 text-slate-200 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 truncate"
              >
                <option value="all">📍 كل المدن ({getAllIndustrialCities(factories).length})</option>
                {getAllIndustrialCities(factories).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Radar Radius & Logistics Filter */}
            <div className="w-28 sm:w-36 shrink-0">
              <select
                value={radarRadiusKm === null ? 'all' : radarRadiusKm}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setRadarRadiusKm(null);
                  } else {
                    const r = Number(val);
                    setRadarRadiusKm(r);
                    if (!userCoords) handleLocateMe(false);
                  }
                }}
                className={`w-full py-2 px-2 text-xs font-bold rounded-xl border focus:outline-none transition-all truncate ${
                  radarRadiusKm !== null
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title="رادار البحث بنطاق المسافة والشحن"
              >
                <option value="all">📡 رادار النطاق: الكل</option>
                <option value="15">📡 نطاق 15 كم (المجاورين)</option>
                <option value="30">📡 نطاق 30 كم</option>
                <option value="50">📡 نطاق 50 كم</option>
                <option value="100">📡 نطاق 100 كم</option>
              </select>
            </div>

            {/* Quick Verified GPS Location Toggle */}
            <button
              onClick={() => setOnlyVerifiedLocation(!onlyVerifiedLocation)}
              className={`px-2.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1 shrink-0 transition-all ${
                onlyVerifiedLocation
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
              title="تصفية المصانع ذات الموقع الجغرافي المعتمد والمدقق"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">موقع معتمد</span>
            </button>

            {/* B2B RFQ Button */}
            {onOpenRFQModal && (
              <button
                onClick={onOpenRFQModal}
                className="px-2.5 py-2 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 transition-all"
                title="بورصة المناقصات وطلبات التسعير الفورية"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">المناقصات الفورية</span>
              </button>
            )}

            {/* Raw Materials Market Button */}
            {onOpenRawMaterialsMarket && (
              <button
                onClick={onOpenRawMaterialsMarket}
                className="px-2.5 py-2 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0 transition-all"
                title="بورصة الخامات وفائض الإنتاج ومستلزمات المصانع"
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">بورصة الخامات</span>
              </button>
            )}

            {/* Toggle View button (Map vs List) */}
            <button
              onClick={() => setIsListView(!isListView)}
              className="p-2 sm:px-3 sm:py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 shrink-0"
              title="التبديل بين الخريطة والقائمة"
            >
              {isListView ? '🗺️' : '📋'}
              <span className="hidden sm:inline">{isListView ? 'الخريطة' : 'القائمة'}</span>
            </button>
          </div>

          {/* Industrial Sectors Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs -mx-1 px-1">
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
            {getAllIndustrialSectors(factories).map((sector) => {
              const isSelected = selectedSector === sector;
              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all font-medium ${
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

      {/* Main Map / List View Container */}
      <div className="relative flex-1 w-full h-full">
        {/* Leaflet Map DOM Element */}
        <div 
          ref={mapContainerRef} 
          className={`w-full h-full z-0 transition-opacity duration-300 ${isListView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
        />

        {/* Floating Active Route Information Banner */}
        {routeInfo && !isListView && (
          <div className="absolute top-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-30 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-amber-500/60 p-3 sm:p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 max-w-xl w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-md shadow-amber-500/30">
                  <Car className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                      مسار القيادة المباشر
                    </span>
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {routeInfo.factory.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                    <span className="text-amber-400 font-extrabold text-sm">📏 {routeInfo.distanceKm} كم</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-extrabold text-sm">⏱️ {routeInfo.durationMin} دقيقة</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <a
                  href={getDirectionsUrl(routeInfo.factory.lat, routeInfo.factory.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  توجيه صوتي
                </a>
                <button
                  onClick={handleClearRoute}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                >
                  إغلاق ✕
                </button>
              </div>
            </div>

            {/* Freight and Logistics Calculator Widget */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  حاسبة تكلفة الشحن والنولون:
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setTruckType('pickup')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      truckType === 'pickup' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    دبابة 1.5t
                  </button>
                  <button
                    onClick={() => setTruckType('jumbo')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      truckType === 'jumbo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    جامبو 4t
                  </button>
                  <button
                    onClick={() => setTruckType('trailer')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      truckType === 'trailer' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تريلا 25t
                  </button>
                </div>
              </div>

              {(() => {
                const fInfo = calculateFreight(parseFloat(routeInfo.distanceKm) || 30, truckType);
                return (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-300 text-[11px]">
                      {fInfo.label} • وصول الشاحنة: <strong className="text-emerald-400">{fInfo.hours} ساعة</strong>
                    </span>
                    <span className="font-black text-amber-400 text-xs">
                      نولون تقديري: ~{fInfo.cost.toLocaleString('ar-EG')} جنيه
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Calculating Route Spinner Toast */}
        {calculatingRoute && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-amber-500/50 text-slate-100 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-pulse">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            جاري التقاط إحداثيات GPS ورسم أسرع خط سير للمصنع...
          </div>
        )}

        {/* Floating Top Controls (Layer Switcher, Industrial Zone Picker, Fit All, Locate Me) */}
        {!isListView && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            
            {/* Tile Layer Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTileMenu(!showTileMenu);
                  setShowZoneMenu(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 text-slate-200 hover:text-white rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md text-xs font-bold transition-all active:scale-95"
                title="تغيير نمط الخريطة (OpenStreetMap / أقمار صناعية)"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">{TILE_CONFIGS[activeTile].name}</span>
                <span className="sm:hidden">{TILE_CONFIGS[activeTile].icon}</span>
              </button>

              {showTileMenu && (
                <div className="absolute top-11 left-0 z-30 w-56 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-1.5 backdrop-blur-md flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] text-slate-400 px-2 py-1 font-bold">
                    طبقات OpenStreetMap & Leaflet:
                  </div>
                  {(Object.keys(TILE_CONFIGS) as TileSource[]).map((key) => {
                    const cfg = TILE_CONFIGS[key];
                    const isCurrent = activeTile === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setMapTile(key)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-right font-medium transition-colors ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span>{cfg.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Industrial Zones Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowZoneMenu(!showZoneMenu);
                  setShowTileMenu(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 text-slate-200 hover:text-white rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md text-xs font-bold transition-all active:scale-95"
                title="الانتقال المباشر إلى منطقة صناعية كبرى"
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">المناطق الصناعية</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showZoneMenu && (
                <div className="absolute top-11 left-0 z-30 w-64 max-h-72 overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-1.5 backdrop-blur-md flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] text-slate-400 px-2 py-1 font-bold">
                    قفز مباشر لأشهر المدن والمناطق الصناعية:
                  </div>
                  {MAJOR_INDUSTRIAL_ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => handleJumpToZone(zone)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-right hover:bg-slate-800 text-slate-200 transition-colors"
                    >
                      <span className="font-semibold">{zone.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono">📍 {zone.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fit All Factories */}
            <button
              onClick={handleFitAll}
              className="p-2.5 bg-slate-900/95 text-slate-200 hover:text-amber-400 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md active:scale-95 transition-transform"
              title="إظهار جميع المصانع على الخريطة"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Locate Me Floating Button */}
            <button
              onClick={() => handleLocateMe(true)}
              className={`p-2.5 bg-slate-900/95 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md active:scale-95 transition-transform ${
                locatingUser ? 'text-amber-400 animate-spin' : 'text-amber-400 hover:text-amber-300'
              }`}
              title="تحديد موقعي الجغرافي الآن (GPS)"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected Factory Floating Drawer (Desktop/Mobile) */}
        {activeFactory && !isListView && (
          <div className="absolute bottom-20 md:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-20 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeFactory.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {activeFactory.status === 'approved' ? 'معتمد ومفعل' : 'قيد التدقيق'}
                  </span>
                  {activeFactory.isLocationVerified && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      موقع مدقق بالـ GPS
                    </span>
                  )}
                </div>
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

            {/* Industrial specs pill row */}
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] bg-slate-800/60 p-2 rounded-xl border border-slate-800">
              {activeFactory.totalAreaM2 && (
                <div>
                  <span className="text-slate-400 block text-[10px]">المساحة:</span>
                  <span className="font-bold text-slate-200">{activeFactory.totalAreaM2.toLocaleString()} م²</span>
                </div>
              )}
              {activeFactory.establishedYear && (
                <div>
                  <span className="text-slate-400 block text-[10px]">سنة التأسيس:</span>
                  <span className="font-bold text-slate-200">{activeFactory.establishedYear}</span>
                </div>
              )}
              {activeFactory.productionCapacity && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">الطاقة الإنتاجية:</span>
                  <span className="font-bold text-amber-400 truncate block">{activeFactory.productionCapacity}</span>
                </div>
              )}
            </div>

            {/* Quick Officer contact details */}
            <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 p-2 rounded-xl">
                <p className="text-[10px] text-amber-400 font-bold">المبيعات:</p>
                <p className="font-medium text-slate-200 truncate">{activeFactory.salesOfficer?.name}</p>
                <p className="text-[10px] text-slate-400 truncate dir-ltr text-right">{activeFactory.salesOfficer?.phone}</p>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl">
                <p className="text-[10px] text-blue-400 font-bold">المشتريات:</p>
                <p className="font-medium text-slate-200 truncate">{activeFactory.purchasingOfficer?.name}</p>
                <p className="text-[10px] text-slate-400 truncate dir-ltr text-right">{activeFactory.purchasingOfficer?.phone}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => handleStartRoute(activeFactory)}
                className="w-full py-2.5 px-3 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Car className="w-4 h-4" />
                رسم خط السير المباشر نحو المصنع (GPS)
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectFactory(activeFactory)}
                  className="flex-1 py-2 px-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  عرض الملف الكامل
                </button>
                {onOpenDigitalProfile && (
                  <button
                    onClick={() => onOpenDigitalProfile(activeFactory)}
                    className="py-2 px-2 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 transition-colors"
                    title="كارت المصنع الرقمي و QR"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>QR</span>
                  </button>
                )}
                {onOpenCatalog && (
                  <button
                    onClick={() => onOpenCatalog(activeFactory)}
                    className="py-2 px-2 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-colors"
                    title="كتالوج المنتجات PDF"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PDF</span>
                  </button>
                )}
                <button
                  onClick={() => onStartChat(activeFactory, 'sales')}
                  className="flex-1 py-2 px-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  محادثة مبيعات
                </button>
                <a
                  href={getDirectionsUrl(activeFactory.lat, activeFactory.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center"
                  title="ملاحة GPS بالصوت"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* List View Container (Alternative to Map) */}
        {isListView && (
          <div className="absolute inset-0 z-10 overflow-y-auto p-3 sm:p-6 pb-28 md:pb-6 bg-slate-950">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    دليل المصانع والمنشآت الصناعية ({visibleFactories.length})
                  </h2>
                  <p className="text-xs text-slate-400">مواقع جغرافية وبيانات إنتاجية وخطوط سير مباشرة</p>
                </div>
                <button
                  onClick={() => setIsListView(false)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800"
                >
                  العودة للخريطة 🗺️
                </button>
              </div>

              {visibleFactories.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-semibold">لم يتم العثور على مصانع مطابقة لبحثك</p>
                  <p className="text-xs text-slate-500 mt-1">جرب تغيير المنطقة الصناعية أو مسح كلمة البحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleFactories.map((factory) => (
                    <div
                      key={factory.id}
                      className="bg-slate-900 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              factory.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {factory.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                            </span>
                            {factory.isLocationVerified && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                ✓ GPS
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {factory.rating} ({factory.reviewsCount})
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-100 mb-1">{factory.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {factory.city} - {factory.industrialArea}
                        </p>

                        {factory.productionCapacity && (
                          <div className="text-[11px] text-sky-400 bg-sky-950/40 border border-sky-800/40 p-1.5 rounded-lg mb-2">
                            ⚙️ {factory.productionCapacity}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 mb-3">
                          {factory.sectors.map((sector) => (
                            <span
                              key={sector}
                              className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md"
                            >
                              {sector}
                            </span>
                          ))}
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                          {factory.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setIsListView(false);
                              handleStartRoute(factory);
                            }}
                            className="flex-1 py-1.5 px-2 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1"
                          >
                            <Car className="w-3.5 h-3.5" />
                            خط السير
                          </button>
                          <button
                            onClick={() => onSelectFactory(factory)}
                            className="flex-1 py-1.5 px-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
                          >
                            الملف الكامل
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onOpenDigitalProfile && (
                            <button
                              onClick={() => onOpenDigitalProfile(factory)}
                              className="flex-1 py-1 px-2 text-[11px] font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700/80 flex items-center justify-center gap-1 transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              كارت QR
                            </button>
                          )}
                          {onOpenCatalog && (
                            <button
                              onClick={() => onOpenCatalog(factory)}
                              className="flex-1 py-1 px-2 text-[11px] font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sky-400 border border-slate-700/80 flex items-center justify-center gap-1 transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              كتالوج PDF
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

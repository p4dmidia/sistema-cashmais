import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Star, MapPin, Store, ExternalLink, Clock, User } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Custom Google Maps style marker
const googleMarkerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class='marker-pin'></div><i class='marker-dot'></i>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42]
});

interface Company {
  id: number;
  nome_fantasia: string;
  latitude?: number;
  longitude?: number;
  address_city?: string;
  thumbnail_url?: string;
  description?: string;
  company_categories?: any[];
  is_verified?: boolean;
}

interface CategoryMapProps {
  companies: Company[];
  onCompanyClick: (id: number) => void;
}

export default function CategoryMap({ companies, onCompanyClick }: CategoryMapProps) {
  const companiesWithCoords = companies.filter(c => c.latitude && c.longitude);
  
  const defaultCenter: [number, number] = [-19.466, -44.246]; // Sete Lagoas
  const center: [number, number] = companiesWithCoords.length > 0 
    ? [Number(companiesWithCoords[0].latitude), Number(companiesWithCoords[0].longitude)]
    : defaultCenter;

  return (
    <div className="w-full h-full min-h-[600px] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative z-10">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {companiesWithCoords.map((company) => (
          <Marker 
            key={company.id} 
            position={[Number(company.latitude), Number(company.longitude)]}
            icon={googleMarkerIcon}
          >
            <Tooltip direction="top" offset={[0, -42]} opacity={1} permanent={false}>
               <span className="font-bold text-gray-900 px-2">{company.nome_fantasia}</span>
            </Tooltip>

            <Popup className="premium-popup" maxWidth={320}>
              <div className="flex flex-col bg-white overflow-hidden rounded-xl">
                <div className="relative h-32 w-full overflow-hidden bg-gray-100">
                  {company.thumbnail_url ? (
                    <img 
                      src={company.thumbnail_url} 
                      alt={company.nome_fantasia} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Store className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    DISPONÍVEL
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{company.nome_fantasia}</h3>
                    <div className="flex items-center text-xs text-gray-500">
                      <MapPin className="w-3 h-3 mr-1 text-[#70ff00]" />
                      {company.address_city || 'Sete Lagoas'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => onCompanyClick(company.id)}
                      className="w-full py-2.5 bg-[#70ff00] text-[#001144] rounded-lg font-bold text-xs hover:bg-[#50cc00] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#70ff00]/20"
                    >
                      <User className="w-3 h-3" /> Ver Perfil
                    </button>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.nome_fantasia + ' ' + (company.address_city || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir Maps
                    </a>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend/Status Overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="bg-[#001144]/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-white text-xs font-medium flex items-center gap-2 pointer-events-auto shadow-xl">
            <div className="w-2 h-2 bg-[#70ff00] rounded-full animate-pulse"></div>
            {companiesWithCoords.length} de {companies.length} empresas localizadas
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          background: #ef4444;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -15px 0 0 -15px;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .marker-dot {
          width: 8px;
          height: 8px;
          background: white;
          position: absolute;
          border-radius: 50%;
          left: 50%;
          top: 50%;
          margin: -4px 0 0 -4px;
          z-index: 10;
        }

        .premium-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .premium-popup .leaflet-popup-content {
          margin: 0;
          width: 300px !important;
        }
        .premium-popup .leaflet-popup-tip-container {
          display: none;
        }
        
        .leaflet-tooltip {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 4px 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .leaflet-tooltip-top:before {
          border-top-color: white;
        }
        
        .leaflet-container {
          background: #001144;
        }
      `}} />
    </div>
  );
}

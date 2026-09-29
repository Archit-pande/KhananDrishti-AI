import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const retinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: retinaUrl, iconUrl, shadowUrl });

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const resize = () => map.invalidateSize();
    resize();
    const timer = setTimeout(resize, 200);
    window.addEventListener("resize", resize);
    return () => { clearTimeout(timer); window.removeEventListener("resize", resize); };
  }, [map]);
  return null;
}

function MapFocus({ record }) {
  const map = useMap();
  useEffect(() => {
    if (record?.lat != null && record?.lng != null) map.flyTo([Number(record.lat), Number(record.lng)], 14, { duration: 0.8 });
  }, [record, map]);
  return null;
}

function getCoords(record, index) {
  const lat = Number(record?.lat ?? record?.coordinates?.lat);
  const lng = Number(record?.lng ?? record?.coordinates?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  const fallbacks = [[23.6501, 82.6902], [23.6523, 82.6948], [23.6561, 82.7032]];
  const point = fallbacks[index % fallbacks.length];
  return { lat: point[0], lng: point[1] };
}

function statusClass(value) {
  return String(value || "reported").toLowerCase().replace(/\s+/g, "-");
}

export default function CILMap({ records = [], theme = "dark" }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const categories = useMemo(() => ["All", ...new Set(records.map((record) => record.category).filter(Boolean))], [records]);
  const filtered = records.filter((record) => filter === "All" || record.category === filter);
  const center = filtered[0] ? getCoords(filtered[0], 0) : { lat: 23.652, lng: 82.696 };

  return (
    <main className="page-wrap map-page">
      <section className="page-heading"><div><span className="eyebrow">GIS OPERATIONS</span><h1>Live mine activity map</h1><p>View geo-tagged inspections, compliance records, safety observations and environmental alerts.</p></div><div className="heading-badge"><strong>{filtered.length}</strong><span>mapped records</span></div></section>
      <div className="map-layout-new">
        <div className="map-card"><MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom className="leaflet-map"><TileLayer attribution='&copy; OpenStreetMap contributors' url={theme === "dark" ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} /><MapResize /><MapFocus record={selected} />{filtered.map((record, index) => { const coords = getCoords(record, index); return <Marker key={record.id} position={[coords.lat, coords.lng]} eventHandlers={{ click: () => setSelected(record) }}><Popup><div className="map-popup"><span>{record.category} · {record.priority}</span><strong>{record.title}</strong><p>{record.mineName} · {record.zone}</p><b>{record.status}</b><small>{record.id}</small></div></Popup></Marker>; })}</MapContainer></div>
        <aside className="map-side"><div className="map-filter"><span className="eyebrow">FILTER</span><select value={filter} onChange={(e) => setFilter(e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="map-list">{filtered.map((record) => <button key={record.id} className={`map-record ${selected?.id === record.id ? "selected" : ""}`} onClick={() => setSelected(record)}><div className="map-marker">●</div><div><strong>{record.title}</strong><span>{record.mineName} · {record.zone}</span><small className={statusClass(record.status)}>{record.status} · risk {record.riskScore ?? 0}</small></div></button>)}</div></aside>
      </div>
    </main>
  );
}

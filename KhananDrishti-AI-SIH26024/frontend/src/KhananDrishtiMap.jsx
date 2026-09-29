import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin, RefreshCw, Radar, Search } from "lucide-react";
import { api } from "./services/api";

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const resize = () => map.invalidateSize();
    resize();
    const timer = setTimeout(resize, 300);
    window.addEventListener("resize", resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, [map]);
  return null;
}

function MapFocus({ record }) {
  const map = useMap();
  useEffect(() => {
    const lat = Number(record?.lat ?? record?.coordinates?.lat);
    const lng = Number(record?.lng ?? record?.coordinates?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], 15, { duration: 0.8 });
    }
  }, [record, map]);
  return null;
}

function getCoords(record, index = 0) {
  const lat = Number(record?.lat ?? record?.coordinates?.lat);
  const lng = Number(record?.lng ?? record?.coordinates?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  const fallbacks = [
    [23.6501, 82.6902],
    [23.6523, 82.6948],
    [23.6561, 82.7032],
    [23.6586, 82.7002],
    [23.6481, 82.7061]
  ];
  const point = fallbacks[index % fallbacks.length];
  return { lat: point[0], lng: point[1] };
}


function MapAutoCenter({ record }) {
  const map = useMap();
  useEffect(() => {
    if (!record) return;
    const point = getCoords(record, 0);
    map.setView([point.lat, point.lng], 13, { animate: true });
  }, [record, map]);
  return null;
}

function markerColor(priority) {
  return {
    Critical: "#e06b55",
    High: "#d5a84f",
    Medium: "#5bb7a3",
    Low: "#7aa7d8"
  }[priority] || "#7aa7d8";
}

function makeMarkerIcon(priority) {
  const color = markerColor(priority);
  return L.divIcon({
    className: "cil-map-pin",
    html: `<div style="--pin-color:${color}"><span></span></div>`,
    iconSize: [24, 30],
    iconAnchor: [12, 28],
    popupAnchor: [0, -26]
  });
}

function statusClass(value) {
  return String(value || "reported").toLowerCase().replace(/\s+/g, "-");
}

export default function KhananDrishtiMap({ records = [], theme = "dark" }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const [mapRecords, setMapRecords] = useState(records);
  const [nearbyRecords, setNearbyRecords] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [nearbyBusy, setNearbyBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMapRecords(Array.isArray(records) ? records : []);
  }, [records]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setRefreshBusy(true);
      try {
        const live = await api.getIssues("limit=1000");
        if (active && Array.isArray(live)) {
          setMapRecords(live);
          setMessage(`Live GIS data loaded: ${live.length} governance record(s).`);
        }
      } catch {
        if (active) setMessage("Live GIS is temporarily unavailable. Showing the latest available records.");
      } finally {
        if (active) setRefreshBusy(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(mapRecords.map((record) => record.category).filter(Boolean))],
    [mapRecords]
  );

  const sourceRecords = nearbyRecords.length ? nearbyRecords : mapRecords;
  const filtered = sourceRecords.filter((record) => filter === "All" || record.category === filter);
  const center = filtered[0] ? getCoords(filtered[0], 0) : { lat: 23.6523, lng: 82.6948 };

  const refreshLiveData = async () => {
    setRefreshBusy(true);
    try {
      const live = await api.getIssues("limit=1000");
      if (Array.isArray(live)) {
        setMapRecords(live);
        setNearbyRecords([]);
        setMessage(`Live GIS data refreshed: ${live.length} governance record(s).`);
      }
    } catch {
      setMessage("Live GIS refresh failed. The existing map data is still available.");
    } finally {
      setRefreshBusy(false);
    }
  };

  const locateMineActivity = () => {
    if (!navigator.geolocation) {
      setMessage("location services are not available in this browser.");
      return;
    }

    setNearbyBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: position }) => {
        const lat = Number(position.latitude.toFixed(6));
        const lng = Number(position.longitude.toFixed(6));
        setUserPosition({ lat, lng });
        try {
          const nearby = await api.getNearbyIssues(`lat=${lat}&lng=${lng}&radius=50000&limit=200`);
          const liveNearby = Array.isArray(nearby) ? nearby : [];
          setNearbyRecords(liveNearby);
          setMessage(
            liveNearby.length
              ? `${liveNearby.length} governance record(s) found within 50 km of your location.`
              : "No live records were returned within 50 km. The full mine dataset remains available."
          );
        } catch {
          setMessage("Nearby GIS search failed. The full mine dataset remains available.");
        } finally {
          setNearbyBusy(false);
        }
      },
      () => {
        setNearbyBusy(false);
        setMessage("Location permission was not granted. The map remains usable with live mine records.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  return (
    <main className="page-wrap map-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow"><Radar size={14} /> AI + GIS OPERATIONS</span>
          <h1>Live mine activity map</h1>
          <p>Real mine records from the governance API, mapped with the same Leaflet GIS approach used in Nagar Setu.</p>
        </div>
        <div className="map-header-actions">
          <button className="secondary-btn" onClick={refreshLiveData} disabled={refreshBusy}>
            {refreshBusy ? <RefreshCw size={15} className="spin" /> : <Search size={15} />}
            {refreshBusy ? "Refreshing" : "Refresh live data"}
          </button>
          <button className="secondary-btn" onClick={locateMineActivity} disabled={nearbyBusy}>
            {nearbyBusy ? <RefreshCw size={15} className="spin" /> : <LocateFixed size={15} />}
            {nearbyBusy ? "Searching nearby" : "Find nearby activity"}
          </button>
          <div className="heading-badge"><strong>{filtered.length}</strong><span>mapped records</span></div>
        </div>
      </section>

      {message && <div className="map-live-message"><MapPin size={14} /> {message}</div>}

      <div className="map-layout-new">
        <div className="map-card">
          <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom className="leaflet-map">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
              url={theme === "dark"
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
            />
            <MapResize />
            <MapAutoCenter record={filtered[0]} />
            <MapFocus record={selected} />
            {userPosition && (
              <CircleMarker
                center={[userPosition.lat, userPosition.lng]}
                radius={9}
                pathOptions={{ color: "#d5a84f", fillColor: "#d5a84f", fillOpacity: 0.85 }}
              >
                <Popup>Your current location</Popup>
              </CircleMarker>
            )}
            {filtered.map((record, index) => {
              const point = getCoords(record, index);
              return (
                <CircleMarker
                  key={record.id || record.issueId || `${record.title}-${index}`}
                  center={[point.lat, point.lng]}
                  radius={9}
                  pathOptions={{
                    color: markerColor(record.priority),
                    fillColor: markerColor(record.priority),
                    fillOpacity: 0.92,
                    weight: 2
                  }}
                  eventHandlers={{ click: () => setSelected(record) }}
                >
                  <Popup>
                    <div className="map-popup">
                      <span>{record.category} · {record.priority}</span>
                      <strong>{record.title}</strong>
                      <p>{record.mineName} · {record.zone}</p>
                      <b>{record.status}</b>
                      <small>risk {record.riskScore ?? 0} · {record.id || record.issueId}</small>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
        <aside className="map-side">
          <div className="map-filter">
            <span className="eyebrow">FILTER</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div className="map-list">
            {filtered.map((record) => (
              <button
                key={record.id || record.issueId}
                className={`map-record ${selected?.id === record.id ? "selected" : ""}`}
                onClick={() => setSelected(record)}
              >
                <div className={`map-marker ${String(record.priority || "").toLowerCase()}`}>●</div>
                <div>
                  <strong>{record.title}</strong>
                  <span>{record.mineName} · {record.zone}</span>
                  <small className={statusClass(record.status)}>{record.status} · risk {record.riskScore ?? 0}</small>
                </div>
              </button>
            ))}
            {!filtered.length && <div className="empty-mini">No map records match the current filter.</div>}
          </div>
          <div className="map-legend">
            <span className="small-label">SOURCE</span>
            <div><span className="legend-dot reported" /> Live governance API</div>
            <div><span className="legend-dot progress" /> Leaflet + CARTO GIS</div>
            <div><span className="legend-dot resolved" /> Browser GPS</div>
          </div>
        </aside>
      </div>
    </main>
  );
}

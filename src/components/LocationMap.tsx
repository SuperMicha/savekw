import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationMap({
  latitude,
  longitude,
  onLocationChange,
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Ініціалізація карти
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [latitude, longitude],
        13,
      );

      // Додаємо тайли OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Фіксуємо іконку маркера (Leaflet має проблеми з webpack)
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Додаємо маркер
      const marker = L.marker([latitude, longitude], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup("Перетягніть маркер для зміни локації").openPopup();

      // Обробник переміщення маркера
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    // Оновлення позиції при зміні координат
    if (mapRef.current && markerRef.current) {
      const newLatLng = L.latLng(latitude, longitude);
      markerRef.current.setLatLng(newLatLng);
      mapRef.current.setView(newLatLng, mapRef.current.getZoom());
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [latitude, longitude, onLocationChange]);

  return (
    <div
      ref={mapContainerRef}
      className="h-64 w-full rounded-md border border-gray-300"
      style={{ zIndex: 0 }}
    />
  );
}

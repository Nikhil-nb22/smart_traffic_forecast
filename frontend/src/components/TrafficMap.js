import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const TrafficMap = ({ routeData }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineGroupRef = useRef([]);
  const sourceMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([22.7196, 75.8577], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Enable location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            mapInstanceRef.current.setView([latitude, longitude], 14);
            if (userMarkerRef.current) mapInstanceRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current)
              .bindPopup("You are here").openPopup();
          },
          error => {
            console.error(error);
          },
          { enableHighAccuracy: true }
        );
      }
    }
  }, []);

  useEffect(() => {
    if (routeData && mapInstanceRef.current) {
      console.log("Drawing route on map with", routeData.segments.length, "segments");
      
      // Remove previous route and markers
      routePolylineGroupRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      routePolylineGroupRef.current = [];
      
      if (sourceMarkerRef.current) mapInstanceRef.current.removeLayer(sourceMarkerRef.current);
      if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);

      // Draw each segment with color
      for (let i = 0; i < routeData.segments.length; i++) {
        const seg = routeData.segments[i];
        const color = seg.congestion_level === 'red' ? 'red' : seg.congestion_level === 'yellow' ? 'yellow' : 'green';
        const latlngs = [
          [seg.latitude_start, seg.longitude_start],
          [seg.latitude_end, seg.longitude_end]
        ];
        console.log(`Drawing segment ${i}: ${color} from [${seg.latitude_start}, ${seg.longitude_start}] to [${seg.latitude_end}, ${seg.longitude_end}]`);
        const polyline = L.polyline(latlngs, {color, weight: 7, opacity: 0.8}).addTo(mapInstanceRef.current);
        routePolylineGroupRef.current.push(polyline);
      }
      
      // Fit map to route
      const allLatLngs = routeData.segments.flatMap(seg => [
        [seg.latitude_start, seg.longitude_start],
        [seg.latitude_end, seg.longitude_end]
      ]);
      mapInstanceRef.current.fitBounds(allLatLngs);
      
      // Add source and destination markers with red location emoji
      const src = routeData.segments[0];
      const dst = routeData.segments[routeData.segments.length-1];
      console.log("Adding source marker at:", src.latitude_start, src.longitude_start);
      console.log("Adding dest marker at:", dst.latitude_end, dst.longitude_end);
      
      sourceMarkerRef.current = L.marker([src.latitude_start, src.longitude_start], {
        icon: L.divIcon({className: '', html: '📍', iconSize: [36,36], iconAnchor: [18,36]})
      }).addTo(mapInstanceRef.current);
      
      destMarkerRef.current = L.marker([dst.latitude_end, dst.longitude_end], {
        icon: L.divIcon({className: '', html: '📍', iconSize: [36,36], iconAnchor: [18,36]})
      }).addTo(mapInstanceRef.current);
      
      console.log("Route drawing completed");
    }
  }, [routeData]);

  return <div id="map" ref={mapRef} />;
};

export default TrafficMap; 
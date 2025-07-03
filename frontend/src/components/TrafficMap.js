import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { findNearestLocation } from '../utils/locations';

const TrafficMap = ({ routeData, routes, selectedRouteIdx, onRouteClick, onMapClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineGroupRef = useRef([]);
  const sourceMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([22.7196, 75.8577], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add click event listener to the map
      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        // Find the nearest location
        const nearestLocation = findNearestLocation(lat, lng);
        if (onMapClick && nearestLocation) {
          onMapClick(nearestLocation);
        }
      });

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
  }, [onMapClick]);

  useEffect(() => {
    if (routes && routes.length > 0 && mapInstanceRef.current) {
      // Remove previous routes and markers
      routePolylineGroupRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      routePolylineGroupRef.current = [];
      if (sourceMarkerRef.current) mapInstanceRef.current.removeLayer(sourceMarkerRef.current);
      if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);
      // Draw all routes
      routes.forEach((r, idx) => {
        const color = r.recommended ? 'blue' : (idx === selectedRouteIdx ? 'orange' : '#888');
        const latlngs = r.segments.flatMap(seg => [
          [seg.latitude_start, seg.longitude_start],
          [seg.latitude_end, seg.longitude_end]
        ]);
        const polyline = L.polyline(latlngs, {
          color,
          weight: r.recommended ? 8 : 5,
          opacity: idx === selectedRouteIdx ? 1 : 0.5
        }).addTo(mapInstanceRef.current);
        polyline.on('click', () => {
          if (onRouteClick) onRouteClick(idx);
          L.popup()
            .setLatLng(latlngs[Math.floor(latlngs.length/2)])
            .setContent(`<b>${r.route_name}</b><br/>Distance: ${r.total_distance_km} km<br/>Time: ${r.total_time_min} min`)
            .openOn(mapInstanceRef.current);
        });
        routePolylineGroupRef.current.push(polyline);
      });
      // Fit map to selected route
      const allLatLngs = routes[selectedRouteIdx].segments.flatMap(seg => [
        [seg.latitude_start, seg.longitude_start],
        [seg.latitude_end, seg.longitude_end]
      ]);
      mapInstanceRef.current.fitBounds(allLatLngs);
      // Add source/dest markers for selected route
      const src = routes[selectedRouteIdx].segments[0];
      const dst = routes[selectedRouteIdx].segments[routes[selectedRouteIdx].segments.length-1];
      sourceMarkerRef.current = L.marker([src.latitude_start, src.longitude_start], {
        icon: L.divIcon({className: '', html: '📍', iconSize: [36,36], iconAnchor: [18,36]})
      }).addTo(mapInstanceRef.current);
      destMarkerRef.current = L.marker([dst.latitude_end, dst.longitude_end], {
        icon: L.divIcon({className: '', html: '📍', iconSize: [36,36], iconAnchor: [18,36]})
      }).addTo(mapInstanceRef.current);
    } else if (routeData && mapInstanceRef.current) {
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
  }, [routes, selectedRouteIdx, routeData]);

  return <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }} />;
};

export default TrafficMap; 
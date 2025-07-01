const form = document.getElementById('routeForm');
const map = L.map('map').setView([22.7196, 75.8577], 12); // Center on Indore

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const source = document.getElementById('source').value;
  const destination = document.getElementById('destination').value;
  const datetime = document.getElementById('datetime').value;
  const travel_mode = document.getElementById('travel_mode').value;

  const payload = {
    source,
    destination,
    date_time: new Date(datetime).toISOString(),
    travel_mode
  };

  const res = await fetch('http://localhost:8000/api/routes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log({data})
  if (res.ok) {
    map.eachLayer((layer) => { if (layer instanceof L.Polyline) map.removeLayer(layer); });

    data.forEach(route => {
      const latlngs = route.segments.map(seg => [
        [seg.latitude_start, seg.longitude_start],
        [seg.latitude_end, seg.longitude_end]
      ]).flat();

      const color = route.segments[0].congestion_level; // use first segment's level

      L.polyline(latlngs, {
        color,
        weight: route.recommended ? 6 : 4,
        dashArray: route.recommended ? null : '5,10'
      }).addTo(map).bindPopup(`${route.route_name}<br>${route.total_time_min} min`);
    });
  } else {
    alert(data.error || "Something went wrong");
  }
});

import React, { useState, useEffect } from 'react';
import TrafficMap from './TrafficMap';
import PermissionDialog from './PermissionDialog';
import { indoreLocations } from '../utils/locations';
import flatpickr from 'flatpickr';

const MainContent = () => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedTransport, setSelectedTransport] = useState('bike');
  const [trafficResult, setTrafficResult] = useState('');
  const [showTrafficResult, setShowTrafficResult] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [showAllSegments, setShowAllSegments] = useState(false);

  useEffect(() => {
    setShowPermissionDialog(true);
    
    // Initialize flatpickr for date and time inputs
    flatpickr("#date", {
      dateFormat: "d-m-Y"
    });

    flatpickr("#time", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "h:i K",
      time_24hr: false
    });
  }, []);

  const handlePermission = (allowed) => {
    setShowPermissionDialog(false);
    if (allowed) {
      console.log('Location permission granted');
    } else {
      alert("Location access is required for full functionality. You can enable it later in your browser settings.");
    }
  };

  const handleTransportChange = (transport) => {
    setSelectedTransport(transport);
  };

  const toISODateTime = (date, time) => {
    if (!date || !time) return new Date().toISOString();
    const [day, month, year] = date.split('-');
    let [h, minRest] = time.split(':');
    let minute = parseInt(minRest);
    let hour = parseInt(h);
    if (time.toLowerCase().includes('pm') && hour < 12) hour += 12;
    if (time.toLowerCase().includes('am') && hour === 12) hour = 0;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  };

  const geocodePlace = async (place) => {
    if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(place.trim())) return place.trim();
    
    if (indoreLocations[place.trim()]) {
      return indoreLocations[place.trim()];
    }
    
    const url = `https://nominatim.openstreetmap.org/search?city=Indore&state=Madhya%20Pradesh&country=India&q=${encodeURIComponent(place)}&format=json&limit=1`;
    const resp = await fetch(url, {headers: { 'Accept-Language': 'en' }});
    const data = await resp.json();
    if (data && data.length > 0) {
      return `${data[0].lat},${data[0].lon}`;
    } else {
      throw new Error('Location not found: ' + place);
    }
  };

  const handleRouteRequest = async () => {
    if (!source || !destination) {
      alert("Please enter both source and destination");
      return;
    }

    setShowTrafficResult(true);
    setTrafficResult("⏳ Predicting traffic...");
    setShowAllSegments(false);

    try {
      const geocodedSource = await geocodePlace(source);
      const geocodedDestination = await geocodePlace(destination);
      const dateTimeStr = toISODateTime(date, time);
      
      const body = {
        source: geocodedSource,
        destination: geocodedDestination,
        date_time: dateTimeStr,
        travel_mode: selectedTransport
      };
      
      console.log("Sending to backend:", body);
      
      const response = await fetch("/api/routes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      console.log("Backend response:", data);
      
      if (!response.ok) {
        setTrafficResult(`Error: ${data.error || 'Error fetching route'}`);
        return;
      }

      const best = data.find(r => r.recommended) || data[0];
      setRouteData(best);
      
      setTrafficResult(''); // We'll render the result below
      
    } catch (err) {
      setTrafficResult(`Error: ${err.message}`);
    }
  };

  // Render segments with show more/less
  const renderSegments = (segments) => {
    if (!segments || segments.length === 0) return <div>No segments found.</div>;
    const visibleSegments = showAllSegments ? segments : segments.slice(0, 10);
    return (
      <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '0.5rem 0' }}>
        <ul style={{ paddingLeft: 20 }}>
          {visibleSegments.map((seg, idx) => (
            <li key={idx} style={{ color: seg.congestion_level === 'red' ? 'red' : seg.congestion_level === 'yellow' ? '#ffb300' : 'limegreen' }}>
              {seg.congestion_level.toUpperCase()} | {seg.length_m}m | {seg.speed_kmh} km/h
            </li>
          ))}
        </ul>
        {segments.length > 10 && (
          <button style={{ marginTop: 8 }} onClick={() => setShowAllSegments(!showAllSegments)}>
            {showAllSegments ? 'Show less' : `Show all (${segments.length})`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div id="mainContent">
      <header>TRAFFIC FORECASTING - INDORE</header>
      
      <div className="form-container">
        <div className="input-group">
          <label htmlFor="source">Source</label>
          <input
            type="text"
            id="source"
            list="places-list"
            placeholder="e.g., Vijay Nagar"
            autoComplete="off"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="destination">Destination</label>
          <input
            type="text"
            id="destination"
            list="places-list"
            placeholder="e.g., Rajwada"
            autoComplete="off"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="date">Date</label>
          <input
            type="text"
            id="date"
            className="flatpickr"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="time">Time</label>
          <input
            type="text"
            id="time"
            className="flatpickr"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <datalist id="places-list">
        <option value="Vijay Nagar" />
        <option value="Rajwada" />
        <option value="Palasia" />
        <option value="Bhawarkua" />
        <option value="Nipania" />
        <option value="Chhoti Gwaltoli" />
        <option value="Bengali Square" />
        <option value="Geeta Bhawan" />
        <option value="LIG Square" />
        <option value="MG Road" />
        <option value="Khandwa Road" />
        <option value="AB Road" />
        <option value="Ring Road" />
        <option value="MR 10" />
        <option value="MR 9" />
        <option value="MR 8" />
        <option value="MR 7" />
        <option value="MR 6" />
        <option value="MR 5" />
        <option value="MR 4" />
        <option value="MR 3" />
        <option value="MR 2" />
        <option value="MR 1" />
        <option value="Treasure Island Mall" />
        <option value="C21 Mall" />
        <option value="Phoenix Citadel Mall" />
        <option value="Central Mall" />
        <option value="Malhar Mega Mall" />
        <option value="Prestige Mall" />
        <option value="Sapna Sangeeta Mall" />
        <option value="Rajendra Nagar Mall" />
        <option value="MY Hospital" />
        <option value="Choithram Hospital" />
        <option value="Bombay Hospital" />
        <option value="Apollo Hospital" />
        <option value="Medanta Hospital" />
        <option value="Sri Aurobindo Hospital" />
        <option value="Kokilaben Hospital" />
        <option value="Life Care Hospital" />
        <option value="Shri Krishna Hospital" />
        <option value="City Hospital" />
        <option value="Khajrana Temple" />
        <option value="Sarafa Bazaar" />
        <option value="Rajwada Palace" />
        <option value="Lalbagh Palace" />
        <option value="Kanch Mandir" />
        <option value="Gomatgiri" />
        <option value="Patalpani" />
        <option value="Tincha Falls" />
        <option value="Ralamandal" />
        <option value="Choral Dam" />
        <option value="Indore Airport" />
        <option value="Railway Station" />
        <option value="Bus Stand" />
        <option value="Devi Ahilya Bai Holkar Airport" />
        <option value="Indore Junction" />
        <option value="Rajendra Nagar Station" />
        <option value="Lakshmibai Nagar Station" />
        <option value="IIT Indore" />
        <option value="IIM Indore" />
        <option value="DAVV University" />
        <option value="IPS Academy" />
        <option value="SGSITS" />
        <option value="Medicaps University" />
        <option value="Acropolis Institute" />
        <option value="Vikram University" />
        <option value="Rajwada Market" />
        <option value="Sarafa Market" />
        <option value="Chappan Dukaan" />
        <option value="56 Dukaan" />
        <option value="Khatipura Market" />
        <option value="Vijay Nagar Market" />
        <option value="Palasia Market" />
        <option value="Bhawarkua Market" />
        <option value="Nehru Park" />
        <option value="Kamla Nehru Park" />
        <option value="Regional Park" />
        <option value="Indore Zoo" />
        <option value="Patalpani Waterfall" />
        <option value="Tincha Waterfall" />
        <option value="Collector Office" />
        <option value="Municipal Corporation" />
        <option value="Police Station" />
        <option value="District Court" />
        <option value="High Court" />
        <option value="Passport Office" />
        <option value="RTO Office" />
        <option value="Gurudwara" />
        <option value="Masjid" />
        <option value="Church" />
        <option value="Jain Temple" />
        <option value="Hanuman Temple" />
        <option value="Ganesh Temple" />
        <option value="Shiv Temple" />
        <option value="Durga Temple" />
      </datalist>

      <div className="transport-section">
        <div className="transport-options">
          <button 
            className={selectedTransport === 'bike' ? 'active' : ''}
            onClick={() => handleTransportChange('bike')}
          >
            🚲 Bike
          </button>
          <button 
            className={selectedTransport === 'car' ? 'active' : ''}
            onClick={() => handleTransportChange('car')}
          >
            🚗 Car
          </button>
          <button 
            className={selectedTransport === 'walk' ? 'active' : ''}
            onClick={() => handleTransportChange('walk')}
          >
            🚶 Walk
          </button>
        </div>
        <button id="routeBtn" onClick={handleRouteRequest}>
          Show Best Route
        </button>
      </div>

      {showTrafficResult && (
        <div id="trafficResult" style={{ display: 'block' }}>
          {trafficResult && <div dangerouslySetInnerHTML={{ __html: trafficResult }} />}
          {routeData && (
            <div>
              <div><b>{routeData.route_name}</b></div>
              <div>Total Distance: {routeData.total_distance_km} km</div>
              <div>Estimated Time: {routeData.total_time_min} min</div>
              <div>Segments:</div>
              {renderSegments(routeData.segments)}
            </div>
          )}
        </div>
      )}

      <TrafficMap routeData={routeData} />

      <footer>🌍 Made with ❤️ for Indore | Demo UI</footer>

      {showPermissionDialog && (
        <PermissionDialog onPermission={handlePermission} />
      )}
    </div>
  );
};

export default MainContent; 
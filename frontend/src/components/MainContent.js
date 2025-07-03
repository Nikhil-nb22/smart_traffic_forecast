import React, { useState, useEffect } from 'react';
import TrafficMap from './TrafficMap';
import PermissionDialog from './PermissionDialog';
import { indoreLocations } from '../utils/locations';
import flatpickr from 'flatpickr';

const MainContent = () => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [activeField, setActiveField] = useState('source'); // Track which field is active

  const now = new Date();


  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // convert to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
  };
  const [date, setDate] = useState(formatDate(now));
  const [time, setTime] = useState(formatTime(now));
  
  const [selectedTransport, setSelectedTransport] = useState('bike');
  const [trafficResult, setTrafficResult] = useState('');
  const [showTrafficResult, setShowTrafficResult] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [showLocationPopup, setShowLocationPopup] = useState(false);

  useEffect(() => {
    setShowPermissionDialog(true);
    
    // Initialize flatpickr for date and time inputs
    flatpickr("#date", {
      dateFormat: "d-m-Y",
      onChange: (selectedDates, dateStr) => {
        setDate(dateStr.toString());
      }
    });

    flatpickr("#time", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "h:i K",
      time_24hr: false,
      onChange: (selectedDates, timeStr) => {
        setTime(timeStr); // Update state when time changes
      }
    });
  }, []);

  const handlePermission = (allowed, placeName) => {
    setShowPermissionDialog(false);
    if (allowed) {
      if (placeName) setSource(placeName);
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
    // If already coordinates, return as is
    if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(place.trim())) return place.trim();

    // If in indoreLocations, return coordinates
    if (indoreLocations[place.trim()]) {
      return indoreLocations[place.trim()];
    }

    // Try to geocode online
    const url = `https://nominatim.openstreetmap.org/search?city=Indore&state=Madhya%20Pradesh&country=India&q=${encodeURIComponent(place)}&format=json&limit=1`;
    const resp = await fetch(url, {headers: { 'Accept-Language': 'en' }});
    const data = await resp.json();
    if (data && data.length > 0) {
      return `${data[0].lat},${data[0].lon}`;
    } else {
      // If not found, try to use browser geolocation as fallback
      return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve(`${position.coords.latitude},${position.coords.longitude}`);
            },
            () => {
              reject(new Error('Location not found and unable to get current position.'));
            }
          );
        } else {
          reject(new Error('Location not found: ' + place));
        }
      });
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
      const response = await fetch(`/api/routes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        setTrafficResult(`Error: ${data.error || 'Error fetching route'}`);
        return;
      }
      setRoutes(data);
      const bestIdx = data.findIndex(r => r.recommended) !== -1 ? data.findIndex(r => r.recommended) : 0;
      setSelectedRouteIdx(bestIdx);
      setRouteData(data[bestIdx]);
      setTrafficResult('');
    } catch (err) {
      setTrafficResult(`Error: ${err.message}`);
    }
  };

  const handleMapClick = (locationName) => {
    if (activeField === 'source') {
      setSource(locationName);
    } else if (activeField === 'destination') {
      setDestination(locationName);
    }
    // Add visual feedback
    const sourceInput = document.getElementById('source');
    const destinationInput = document.getElementById('destination');
    if (sourceInput) {
      sourceInput.style.backgroundColor = '#e8f5e8';
      sourceInput.style.borderColor = '#4CAF50';
      setTimeout(() => {
        sourceInput.style.backgroundColor = '#f0f0f0';
        sourceInput.style.borderColor = '#ccc';
      }, 2000);
    }
    if (destinationInput) {
      destinationInput.style.backgroundColor = '#e8f5e8';
      destinationInput.style.borderColor = '#4CAF50';
      setTimeout(() => {
        destinationInput.style.backgroundColor = '#f0f0f0';
        destinationInput.style.borderColor = '#ccc';
      }, 2000);
    }
  };

  // Helper to reverse geocode lat/lng to a place name
  const getPlaceName = async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `${lat},${lng}`;
      }
    } catch {
      return `${lat},${lng}`;
    }
  };

  const handleUseCurrentLocation = async () => {
    setShowLocationPopup(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const placeName = await getPlaceName(latitude, longitude);
        // Use the name only if it's in indoreLocations, otherwise use coordinates
        const nameOrCoords = indoreLocations[placeName] ? placeName : `${latitude},${longitude}`;
        setSource(nameOrCoords);
      }, () => {
        alert('Unable to retrieve your location.');
      }, { enableHighAccuracy: true });
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  console.log({date, time});

  function getTrafficPercentage(route) {
    if (!route || !route.segments || route.segments.length === 0) return "0%";
    const congested = route.segments.filter(
      seg => seg.congestion_level === "red" || seg.congestion_level === "yellow"
    ).length;
    return `${Math.round((congested / route.segments.length) * 100)}%`;
  }

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
            style={{ background: '#f0f0f0', color: '#000' }}
            onFocus={() => setActiveField('source')}
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
            style={{ background: '#f0f0f0', color: '#000' }}
            onFocus={() => setActiveField('destination')}
          />
        </div>
        <div className="input-group">
          <label htmlFor="date">Date</label>
          <input
            type="text"
            id="date"
            className="flatpickr"
            value={date}
            // onChange={(e) => setDate(e.target.value)}
            style={{ background: '#f0f0f0', color: '#000' }}
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
            style={{ background: '#f0f0f0', color: '#000' }}
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
            Bike
          </button>
          <button 
            className={selectedTransport === 'car' ? 'active' : ''}
            onClick={() => handleTransportChange('car')}
          >
            Car
          </button>
          <button 
            className={selectedTransport === 'walk' ? 'active' : ''}
            onClick={() => handleTransportChange('walk')}
          >
            Walk
          </button>
        </div>
        <button id="routeBtn" onClick={handleRouteRequest}>
          Show Best Route
        </button>
      </div>

      {routes.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 2px 8px #aaa',
          padding: '1rem',
          zIndex: 1000,
          minWidth: '200px',
          maxHeight: '60vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'stretch',
          fontFamily: 'Segoe UI, Arial, sans-serif',
        }}>
          <div style={{
            color: '#000',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            marginBottom: '0.5rem',
            fontFamily: 'inherit'
          }}>
            Available Routes
          </div>
          {routes.map((r, idx) => (
            <button
              key={idx}
              style={{
                fontWeight: idx === selectedRouteIdx ? 'bold' : 'normal',
                color: '#111',
                border: idx === selectedRouteIdx ? '2px solid #888' : '1px solid #ccc',
                background: idx === selectedRouteIdx ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
                borderRadius: 6,
                padding: '0.5rem 1rem',
                margin: 0,
                minWidth: '160px',
                textAlign: 'center',
                boxShadow: idx === selectedRouteIdx ? '0 2px 8px #ccc' : 'none',
                fontFamily: 'inherit',
                fontSize: '1rem',
                transition: 'background 0.2s, border 0.2s',
              }}
              onClick={() => {
                setSelectedRouteIdx(idx);
                setRouteData(routes[idx]);
              }}
            >
              {r.route_name} <br/>({r.total_distance_km} km, {r.total_time_min} min){r.recommended ? ' [Fastest]' : ''}
              <span style={{ display: 'block', color: '#1976d2', fontSize: '1rem', fontWeight: 500 }}>
                Traffic: {getTrafficPercentage(r)}
              </span>
            </button>
          ))}
        </div>
      )}

      {showTrafficResult && (
        <div id="trafficResult" style={{ display: 'block' }}>
          {trafficResult && <div dangerouslySetInnerHTML={{ __html: trafficResult }} />}
          {routeData && (
            <div>
              Predicted results.
            </div>
          )}
        </div>
      )}

      <TrafficMap 
        routeData={routeData} 
        routes={routes}
        selectedRouteIdx={selectedRouteIdx}
        onRouteClick={(idx) => {
          setSelectedRouteIdx(idx);
          setRouteData(routes[idx]);
        }}
        onMapClick={handleMapClick} 
      />

      <footer>🌍 Made with ❤️ for Indore | Demo UI</footer>

      {showPermissionDialog && (
        <PermissionDialog onPermission={handlePermission} />
      )}
    </div>
  );
};

export default MainContent; 
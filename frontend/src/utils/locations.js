export const indoreLocations = {
  // Major Areas
  "Vijay Nagar": "22.7519,75.8937",
  "Rajwada": "22.7196,75.8577",
  "Palasia": "22.7193,75.8800",
  "Bhawarkua": "22.6986,75.8647",
  "Nipania": "22.7177,75.9121",
  "Chhoti Gwaltoli": "22.7205,75.8642",
  "Bengali Square": "22.7198,75.9042",
  "Geeta Bhawan": "22.7190,75.8730",
  "LIG Square": "22.7372,75.8896",
  "MG Road": "22.7192,75.8577",
  "Khandwa Road": "22.7177,75.9121",
  "AB Road": "22.7193,75.8800",
  "Ring Road": "22.6986,75.8647",
  "MR 10": "22.7205,75.8642",
  "MR 9": "22.7198,75.9042",
  "MR 8": "22.7190,75.8730",
  "MR 7": "22.7372,75.8896",
  "MR 6": "22.7192,75.8577",
  "MR 5": "22.7177,75.9121",
  "MR 4": "22.7193,75.8800",
  "MR 3": "22.6986,75.8647",
  "MR 2": "22.7205,75.8642",
  "MR 1": "22.7198,75.9042",
  "Mahalaxmi Nagar Main Road": "22.7597,75.9111",
  
  // Malls and Shopping Centers
  "Treasure Island Mall": "22.7376,75.8892",
  "C21 Mall": "22.7376,75.8892",
  "Phoenix Citadel Mall": "22.7376,75.8892",
  "Central Mall": "22.7196,75.8577",
  "Malhar Mega Mall": "22.7196,75.8577",
  "Prestige Mall": "22.7196,75.8577",
  "Sapna Sangeeta Mall": "22.7196,75.8577",
  "Rajendra Nagar Mall": "22.7196,75.8577",
  
  // Hospitals
  "MY Hospital": "22.7196,75.8577",
  "Choithram Hospital": "22.7196,75.8577",
  "Bombay Hospital": "22.7196,75.8577",
  "Apollo Hospital": "22.7196,75.8577",
  "Medanta Hospital": "22.7196,75.8577",
  "Sri Aurobindo Hospital": "22.7196,75.8577",
  "Kokilaben Hospital": "22.7196,75.8577",
  "Life Care Hospital": "22.7196,75.8577",
  "Shri Krishna Hospital": "22.7196,75.8577",
  "City Hospital": "22.7196,75.8577",
  
  // Landmarks and Temples
  "Khajrana Temple": "22.7342,75.9180",
  "Sarafa Bazaar": "22.7197,75.8555",
  "Rajwada Palace": "22.7196,75.8577",
  "Lalbagh Palace": "22.7196,75.8577",
  "Kanch Mandir": "22.7196,75.8577",
  "Gomatgiri": "22.7196,75.8577",
  "Patalpani": "22.7196,75.8577",
  "Tincha Falls": "22.7196,75.8577",
  "Ralamandal": "22.7196,75.8577",
  "Choral Dam": "22.7196,75.8577",
  
  // Transport Hubs
  "Indore Airport": "22.7280,75.8011",
  "Railway Station": "22.7206,75.8648",
  "Bus Stand": "22.7196,75.8577",
  "Devi Ahilya Bai Holkar Airport": "22.7280,75.8011",
  "Indore Junction": "22.7206,75.8648",
  "Rajendra Nagar Station": "22.7196,75.8577",
  "Lakshmibai Nagar Station": "22.7196,75.8577",
  
  // Educational Institutions
  "IIT Indore": "22.7196,75.8577",
  "IIM Indore": "22.7196,75.8577",
  "DAVV University": "22.7196,75.8577",
  "IPS Academy": "22.7196,75.8577",
  "SGSITS": "22.7196,75.8577",
  "Medicaps University": "22.7196,75.8577",
  "Acropolis Institute": "22.7196,75.8577",
  "Vikram University": "22.7196,75.8577",
  
  // Markets and Commercial Areas
  "Rajwada Market": "22.7196,75.8577",
  "Sarafa Market": "22.7197,75.8555",
  "Chappan Dukaan": "22.7196,75.8577",
  "56 Dukaan": "22.7196,75.8577",
  "Khatipura Market": "22.7196,75.8577",
  "Vijay Nagar Market": "22.7519,75.8937",
  "Palasia Market": "22.7193,75.8800",
  "Bhawarkua Market": "22.6986,75.8647",
  
  // Parks and Recreation
  "Nehru Park": "22.7196,75.8577",
  "Kamla Nehru Park": "22.7196,75.8577",
  "Regional Park": "22.7196,75.8577",
  "Indore Zoo": "22.7196,75.8577",
  "Patalpani Waterfall": "22.7196,75.8577",
  "Tincha Waterfall": "22.7196,75.8577",
  
  // Government Offices
  "Collector Office": "22.7196,75.8577",
  "Municipal Corporation": "22.7196,75.8577",
  "Police Station": "22.7196,75.8577",
  "District Court": "22.7196,75.8577",
  "High Court": "22.7196,75.8577",
  "Passport Office": "22.7196,75.8577",
  "RTO Office": "22.7196,75.8577",
  
  // Religious Places
  "Gurudwara": "22.7196,75.8577",
  "Masjid": "22.7196,75.8577",
  "Church": "22.7196,75.8577",
  "Jain Temple": "22.7196,75.8577",
  "Hanuman Temple": "22.7196,75.8577",
  "Ganesh Temple": "22.7196,75.8577",
  "Shiv Temple": "22.7196,75.8577",
  "Durga Temple": "22.7196,75.8577"
};

// Function to find the nearest location to given coordinates
export const findNearestLocation = (lat, lng) => {
  let nearestLocation = null;
  let minDistance = Infinity;
  
  for (const [locationName, coordinates] of Object.entries(indoreLocations)) {
    const [locLat, locLng] = coordinates.split(',').map(Number);
    const distance = Math.sqrt(
      Math.pow(lat - locLat, 2) + Math.pow(lng - locLng, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = locationName;
    }
  }
  
  // Only return if the distance is reasonable (within ~2km)
  const maxReasonableDistance = 0.02; // approximately 2km in degrees
  return minDistance <= maxReasonableDistance ? nearestLocation : null;
}; 
import { Alert } from 'react-native';

const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Function to geocode coordinates to address
export const geocodeCoordinates = async (latitude, longitude) => {
  try {
    console.log(`🌍 Geocoding coordinates: ${latitude}, ${longitude}`);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('❌ Geocoding error:', data.status, data.error_message);
      throw new Error(`Geocoding failed: ${data.status}`);
    }
    
    if (!data.results || data.results.length === 0) {
      console.log('📭 No geocoding results found');
      return null;
    }
    
    const result = data.results[0];
    const addressComponents = result.address_components;
    
    // Extract city and state/province
    let city = '';
    let state = '';
    
    for (const component of addressComponents) {
      if (component.types.includes('locality') || component.types.includes('sublocality')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
    }
    
    const locationString = city && state ? `${city}, ${state}` : result.formatted_address;
    
    console.log(`✅ Geocoded location: ${locationString}`);
    return {
      city,
      state,
      fullAddress: result.formatted_address,
      locationString
    };
    
  } catch (error) {
    console.error('❌ Error in geocodeCoordinates:', error);
    throw error;
  }
};

// Function to reverse geocode address to coordinates
export const reverseGeocodeAddress = async (address) => {
  try {
    console.log(`🔍 Reverse geocoding address: ${address}`);
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('❌ Reverse geocoding error:', data.status, data.error_message);
      throw new Error(`Reverse geocoding failed: ${data.status}`);
    }
    
    if (!data.results || data.results.length === 0) {
      console.log('📭 No reverse geocoding results found');
      return null;
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    console.log(`✅ Reverse geocoded coordinates: ${location.lat}, ${location.lng}`);
    return {
      latitude: location.lat,
      longitude: location.lng,
      coordinates: [location.lat, location.lng]
    };
    
  } catch (error) {
    console.error('❌ Error in reverseGeocodeAddress:', error);
    throw error;
  }
};

// Function to validate Google Maps API key
export const validateGoogleMapsKey = () => {
  if (!key) {
    console.error('❌ Google Maps API key not found');
    Alert.alert(
      'Configuration Error',
      'Google Maps API key is not configured. Please check your environment variables.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

// Function to get static map URL for preview
export const getStaticMapUrl = (latitude, longitude, zoom = 12, size = '400x300') => {
  if (!validateGoogleMapsKey()) return null;
  
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&markers=color:red%7C${latitude},${longitude}&key=${key}`;
};

// Function to search cities using Google Places Autocomplete API
export const searchCities = async (query) => {
  try {
    if (!query.trim() || query.length < 1) {
      return [];
    }

    if (!validateGoogleMapsKey()) {
      return [];
    }

    console.log(`🔍 Searching cities for: ${query}`);
    
    // Use the Places Autocomplete API which is better for city searches
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.predictions) {
      const cityPredictions = data.predictions
        .filter(prediction => 
          prediction.types && (
            prediction.types.includes('locality') || 
            prediction.types.includes('administrative_area_level_1') ||
            prediction.types.includes('sublocality')
          )
        )
        .map(prediction => ({
          id: prediction.place_id,
          description: prediction.description || '',
          mainText: prediction.structured_formatting?.main_text || prediction.description || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        }));
      
      console.log(`✅ Found ${cityPredictions.length} city predictions`);
      return cityPredictions;
    } else {
      console.error('❌ Places Autocomplete API error:', data.status, data.error_message);
      console.log('Response data:', JSON.stringify(data, null, 2));
      return [];
    }
  } catch (error) {
    console.error('❌ Error searching cities:', error);
    return [];
  }
};

// Function to get place details for a selected city using Google Places API
export const getPlaceDetails = async (placeId) => {
  try {
    if (!validateGoogleMapsKey()) {
      return null;
    }

    console.log(`📍 Getting place details for: ${placeId}`);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      console.log(`✅ Retrieved place details: ${data.result.formatted_address}`);
      return {
        name: data.result.name || '',
        formattedAddress: data.result.formatted_address || ''
      };
    } else {
      console.error('❌ Place details error:', data.status, data.error_message);
      console.log('Response data:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting place details:', error);
    return null;
  }
};

// Function to calculate distance between two addresses using coordinates (geolocation-based)
export const calculateAddressDistance = async (originAddress, destinationAddress) => {
  try {
    if (!validateGoogleMapsKey()) {
      return null;
    }

    console.log(`📍 Calculating distance between: ${originAddress} and ${destinationAddress}`);
    
    // First, try to geocode both addresses to get coordinates
    const originCoords = await reverseGeocodeAddress(originAddress);
    const destCoords = await reverseGeocodeAddress(destinationAddress);
    
    if (!originCoords || !destCoords) {
      console.error('❌ Failed to geocode one or both addresses');
      return null;
    }
    
    // Calculate straight-line distance using coordinates (geolocation-based)
    const distance = calculateStraightLineDistance(
      originCoords.latitude, originCoords.longitude,
      destCoords.latitude, destCoords.longitude
    );
    
    console.log(`✅ Distance calculated: ${distance} miles`);
    return distance;
  } catch (error) {
    console.error('❌ Error calculating address distance:', error);
    return null;
  }
};

// Helper function to calculate straight-line distance between two coordinates
const calculateStraightLineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance);
};

// Function to calculate distance between two coordinate pairs (geolocation-based)
export const calculateCoordinateDistance = (lat1, lon1, lat2, lon2) => {
  try {
    console.log(`📍 Calculating distance between coordinates: (${lat1}, ${lon1}) and (${lat2}, ${lon2})`);
    
    const distance = calculateStraightLineDistance(lat1, lon1, lat2, lon2);
    
    console.log(`✅ Distance calculated: ${distance} miles`);
    return distance;
    
  } catch (error) {
    console.error('❌ Error calculating coordinate distance:', error);
    return null;
  }
};
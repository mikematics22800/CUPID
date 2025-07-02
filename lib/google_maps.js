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
    
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&types=(cities)&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      const cityPredictions = data.predictions
        .filter(prediction => 
          prediction.types.includes('locality') || 
          prediction.types.includes('administrative_area_level_1')
        )
        .map(prediction => ({
          id: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        }));
      
      console.log(`✅ Found ${cityPredictions.length} city predictions`);
      return cityPredictions;
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('📭 No city predictions found');
      return [];
    } else {
      console.error('❌ Places API error:', data.status, data.error_message);
      return [];
    }
  } catch (error) {
    console.error('❌ Error searching cities:', error);
    return [];
  }
};

// Function to get place details for a selected city
export const getPlaceDetails = async (placeId) => {
  try {
    if (!validateGoogleMapsKey()) {
      return null;
    }

    console.log(`📍 Getting place details for: ${placeId}`);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      const placeDetails = data.result;
      console.log(`✅ Retrieved place details: ${placeDetails.formatted_address}`);
      return {
        name: placeDetails.name,
        formattedAddress: placeDetails.formatted_address
      };
    } else {
      console.error('❌ Place details error:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting place details:', error);
    return null;
  }
};

// Function to calculate distance between two addresses using Google Maps Distance Matrix API
export const calculateAddressDistance = async (originAddress, destinationAddress) => {
  try {
    if (!validateGoogleMapsKey()) {
      return null;
    }

    console.log(`📍 Calculating distance between: ${originAddress} and ${destinationAddress}`);
    
    const encodedOrigin = encodeURIComponent(originAddress);
    const encodedDestination = encodeURIComponent(destinationAddress);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedOrigin}&destinations=${encodedDestination}&units=imperial&key=${key}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows && data.rows.length > 0) {
      const element = data.rows[0].elements[0];
      
      if (element.status === 'OK') {
        // Convert distance from meters to miles
        const distanceInMiles = element.distance.value * 0.000621371;
        console.log(`✅ Distance calculated: ${distanceInMiles.toFixed(1)} miles`);
        return Math.round(distanceInMiles);
      } else {
        console.error('❌ Distance calculation failed:', element.status);
        return null;
      }
    } else {
      console.error('❌ Distance matrix API error:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error calculating address distance:', error);
    return null;
  }
};
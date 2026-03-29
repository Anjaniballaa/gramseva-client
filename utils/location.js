import * as Location from 'expo-location';

const GEOAPIFY_KEY = '7c25a098a803468c883e2ea98c9ea57b';

export const getLocationName = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${GEOAPIFY_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log('Geoapify result:', JSON.stringify(result));

      const name =
        result.suburb ||
        result.quarter ||
        result.neighbourhood ||
        result.village ||
        result.hamlet ||
        result.district ||
        result.county ||
        result.city ||
        result.state_district ||
        result.state ||
        'Unknown';

      console.log('Location name detected:', name);
      return name;
    }
  } catch (error) {
    console.log('Geoapify error, falling back to expo:', error.message);
  }

  // Fallback to expo-location
  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode.length > 0) {
      const place = geocode[0];
      const name =
        place.subregion ||
        place.district ||
        place.city ||
        place.region ||
        'Unknown';
      console.log('Expo fallback result:', name);
      return name;
    }
  } catch (e) {
    console.log('Expo geocode also failed:', e.message);
  }

  return 'Unknown';
};

export const getLiveLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    const { latitude, longitude } = location.coords;
    console.log('GPS coords:', latitude, longitude);

    const name = await getLocationName(latitude, longitude);

    return { latitude, longitude, name };
  } catch (error) {
    console.log('getLiveLocation error:', error.message);
    return null;
  }
};
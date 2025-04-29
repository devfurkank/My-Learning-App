import AsyncStorage from '@react-native-async-storage/async-storage';

export const JOURNEYS_KEY = 'learning_journeys'; // Yolculuklar listesi (her biri: {id, title, url})
export const PROGRESS_PREFIX = 'learning_journey_progress_'; // Her yolculuk için ayrı anahtar

// Yolculuklar
export async function saveJourneys(journeys) {
  try {
    await AsyncStorage.setItem(JOURNEYS_KEY, JSON.stringify(journeys));
  } catch (e) {}
}

export async function loadJourneys() {
  try {
    const value = await AsyncStorage.getItem(JOURNEYS_KEY);
    return value ? JSON.parse(value) : [];
  } catch (e) {
    return [];
  }
}

export async function addJourney(journey) {
  const journeys = await loadJourneys();
  journeys.push(journey);
  await saveJourneys(journeys);
}

export async function removeJourney(journeyId) {
  const journeys = await loadJourneys();
  const filtered = journeys.filter(j => j.id !== journeyId);
  await saveJourneys(filtered);
  await clearProgress(journeyId);
}

// Progress (her yolculuk için ayrı)
export async function saveProgress(journeyId, progress) {
  try {
    await AsyncStorage.setItem(PROGRESS_PREFIX + journeyId, JSON.stringify(progress));
  } catch (e) {}
}

export async function loadProgress(journeyId) {
  try {
    const value = await AsyncStorage.getItem(PROGRESS_PREFIX + journeyId);
    return value ? JSON.parse(value) : {};
  } catch (e) {
    return {};
  }
}

export async function clearProgress(journeyId) {
  try {
    await AsyncStorage.removeItem(PROGRESS_PREFIX + journeyId);
  } catch (e) {}
}

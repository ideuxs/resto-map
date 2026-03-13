export type TravelTimes = {
  driving: string | null;
  transit: string | null;
};

const NAVITIA_BASE_URL = process.env.EXPO_PUBLIC_IDFM_NAVITIA_BASE_URL || 'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia';

function getNavitiaToken(): string | undefined {
  return process.env.EXPO_PUBLIC_IDFM_NAVITIA_TOKEN;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`;
}

async function fetchNavitiaDuration(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode: 'car' | 'public_transport';
  signal: AbortSignal;
}): Promise<string | null> {
  const token = getNavitiaToken();
  if (!token) return null;

  const { originLat, originLng, destLat, destLng, mode, signal } = params;
  const from = `${originLng};${originLat}`;
  const to = `${destLng};${destLat}`;

  const url = new URL(`${NAVITIA_BASE_URL}/journeys`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('max_nb_journeys', '1');
  url.searchParams.set('data_freshness', 'realtime');

  if (mode === 'car') {
    url.searchParams.set('direct_path', 'only');
    url.searchParams.append('direct_path_mode[]', 'car');
  } else {
    url.searchParams.set('direct_path', 'none');
    url.searchParams.append('first_section_mode[]', 'walking');
    url.searchParams.append('last_section_mode[]', 'walking');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal,
    headers: {
      apikey: token,
    },
  });
  if (!response.ok) return null;

  const json = await response.json();
  const journey = json?.journeys?.[0];
  const durationSeconds = typeof journey?.duration === 'number' ? journey.duration : null;
  if (!durationSeconds) return null;

  return formatDuration(durationSeconds);
}

export async function getTravelTimesFromCurrentPosition(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}): Promise<TravelTimes> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const [driving, transit] = await Promise.all([
      fetchNavitiaDuration({ ...params, mode: 'car', signal: controller.signal }),
      fetchNavitiaDuration({ ...params, mode: 'public_transport', signal: controller.signal }),
    ]);

    return { driving, transit };
  } catch {
    return { driving: null, transit: null };
  } finally {
    clearTimeout(timeout);
  }
}

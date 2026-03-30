export interface NationalPark {
  id: string;
  name: string;
  state: string;
  /** Approximate center latitude */
  lat: number;
  /** Approximate center longitude */
  lng: number;
  /**
   * Approximate match radius in km. Activities whose start point falls within
   * this radius of the park center are considered "in" this park.
   */
  radiusKm: number;
  npsCode: string;
}

/** All 63 US National Parks with center coordinates and approximate match radius. */
export const PARKS: NationalPark[] = [
  { id: '1',  name: 'Acadia',               state: 'ME', lat: 44.35,  lng: -68.21,  radiusKm: 50,  npsCode: 'acad' },
  { id: '2',  name: 'American Samoa',        state: 'AS', lat: -14.25, lng: -170.68, radiusKm: 40,  npsCode: 'npsa' },
  { id: '3',  name: 'Arches',               state: 'UT', lat: 38.68,  lng: -109.57, radiusKm: 40,  npsCode: 'arch' },
  { id: '4',  name: 'Badlands',             state: 'SD', lat: 43.85,  lng: -102.34, radiusKm: 60,  npsCode: 'badl' },
  { id: '5',  name: 'Big Bend',             state: 'TX', lat: 29.25,  lng: -103.25, radiusKm: 80,  npsCode: 'bibe' },
  { id: '6',  name: 'Biscayne',             state: 'FL', lat: 25.65,  lng: -80.08,  radiusKm: 50,  npsCode: 'bisc' },
  { id: '7',  name: 'Black Canyon of the Gunnison', state: 'CO', lat: 38.57, lng: -107.72, radiusKm: 35, npsCode: 'blca' },
  { id: '8',  name: 'Bryce Canyon',         state: 'UT', lat: 37.57,  lng: -112.18, radiusKm: 35,  npsCode: 'brca' },
  { id: '9',  name: 'Canyonlands',          state: 'UT', lat: 38.20,  lng: -109.93, radiusKm: 65,  npsCode: 'cany' },
  { id: '10', name: 'Capitol Reef',         state: 'UT', lat: 38.09,  lng: -111.15, radiusKm: 55,  npsCode: 'care' },
  { id: '11', name: 'Carlsbad Caverns',     state: 'NM', lat: 32.24,  lng: -104.55, radiusKm: 35,  npsCode: 'cave' },
  { id: '12', name: 'Channel Islands',      state: 'CA', lat: 34.01,  lng: -119.42, radiusKm: 60,  npsCode: 'chis' },
  { id: '13', name: 'Congaree',             state: 'SC', lat: 33.79,  lng: -80.78,  radiusKm: 30,  npsCode: 'cong' },
  { id: '14', name: 'Crater Lake',          state: 'OR', lat: 42.94,  lng: -122.10, radiusKm: 45,  npsCode: 'crla' },
  { id: '15', name: 'Cuyahoga Valley',      state: 'OH', lat: 41.24,  lng: -81.55,  radiusKm: 30,  npsCode: 'cuva' },
  { id: '16', name: 'Death Valley',         state: 'CA', lat: 36.24,  lng: -116.82, radiusKm: 110, npsCode: 'deva' },
  { id: '17', name: 'Denali',               state: 'AK', lat: 63.33,  lng: -150.50, radiusKm: 150, npsCode: 'dena' },
  { id: '18', name: 'Dry Tortugas',         state: 'FL', lat: 24.63,  lng: -82.87,  radiusKm: 30,  npsCode: 'drto' },
  { id: '19', name: 'Everglades',           state: 'FL', lat: 25.39,  lng: -80.93,  radiusKm: 80,  npsCode: 'ever' },
  { id: '20', name: 'Gates of the Arctic',  state: 'AK', lat: 67.78,  lng: -153.30, radiusKm: 200, npsCode: 'gaar' },
  { id: '21', name: 'Gateway Arch',         state: 'MO', lat: 38.63,  lng: -90.19,  radiusKm: 5,   npsCode: 'jeff' },
  { id: '22', name: 'Glacier',              state: 'MT', lat: 48.60,  lng: -113.80, radiusKm: 80,  npsCode: 'glac' },
  { id: '23', name: 'Glacier Bay',          state: 'AK', lat: 58.66,  lng: -136.00, radiusKm: 130, npsCode: 'glba' },
  { id: '24', name: 'Grand Canyon',         state: 'AZ', lat: 36.06,  lng: -112.14, radiusKm: 80,  npsCode: 'grca' },
  { id: '25', name: 'Grand Teton',          state: 'WY', lat: 43.79,  lng: -110.68, radiusKm: 55,  npsCode: 'grte' },
  { id: '26', name: 'Great Basin',          state: 'NV', lat: 38.98,  lng: -114.30, radiusKm: 50,  npsCode: 'grba' },
  { id: '27', name: 'Great Sand Dunes',     state: 'CO', lat: 37.73,  lng: -105.51, radiusKm: 40,  npsCode: 'grsa' },
  { id: '28', name: 'Great Smoky Mountains',state: 'TN', lat: 35.61,  lng: -83.53,  radiusKm: 65,  npsCode: 'grsm' },
  { id: '29', name: 'Guadalupe Mountains',  state: 'TX', lat: 31.92,  lng: -104.87, radiusKm: 40,  npsCode: 'gumo' },
  { id: '30', name: 'Haleakalā',            state: 'HI', lat: 20.72,  lng: -156.17, radiusKm: 40,  npsCode: 'hale' },
  { id: '31', name: 'Hawaiʻi Volcanoes',    state: 'HI', lat: 19.38,  lng: -155.20, radiusKm: 55,  npsCode: 'havo' },
  { id: '32', name: 'Hot Springs',          state: 'AR', lat: 34.51,  lng: -93.05,  radiusKm: 25,  npsCode: 'hosp' },
  { id: '33', name: 'Indiana Dunes',        state: 'IN', lat: 41.65,  lng: -87.05,  radiusKm: 25,  npsCode: 'indu' },
  { id: '34', name: 'Isle Royale',          state: 'MI', lat: 48.10,  lng: -88.55,  radiusKm: 50,  npsCode: 'isro' },
  { id: '35', name: 'Joshua Tree',          state: 'CA', lat: 33.88,  lng: -115.90, radiusKm: 70,  npsCode: 'jotr' },
  { id: '36', name: 'Katmai',               state: 'AK', lat: 58.50,  lng: -154.97, radiusKm: 130, npsCode: 'katm' },
  { id: '37', name: 'Kenai Fjords',         state: 'AK', lat: 59.92,  lng: -150.18, radiusKm: 80,  npsCode: 'kefj' },
  { id: '38', name: 'Kings Canyon',         state: 'CA', lat: 36.88,  lng: -118.55, radiusKm: 65,  npsCode: 'kica' },
  { id: '39', name: 'Kobuk Valley',         state: 'AK', lat: 67.55,  lng: -159.13, radiusKm: 100, npsCode: 'kova' },
  { id: '40', name: 'Lake Clark',           state: 'AK', lat: 60.97,  lng: -153.42, radiusKm: 130, npsCode: 'lacl' },
  { id: '41', name: 'Lassen Volcanic',      state: 'CA', lat: 40.49,  lng: -121.51, radiusKm: 45,  npsCode: 'lavo' },
  { id: '42', name: 'Mammoth Cave',         state: 'KY', lat: 37.19,  lng: -86.10,  radiusKm: 30,  npsCode: 'maca' },
  { id: '43', name: 'Mesa Verde',           state: 'CO', lat: 37.18,  lng: -108.49, radiusKm: 35,  npsCode: 'meve' },
  { id: '44', name: 'Mount Rainier',        state: 'WA', lat: 46.85,  lng: -121.75, radiusKm: 55,  npsCode: 'mora' },
  { id: '45', name: 'New River Gorge',      state: 'WV', lat: 37.87,  lng: -81.08,  radiusKm: 50,  npsCode: 'neri' },
  { id: '46', name: 'North Cascades',       state: 'WA', lat: 48.70,  lng: -121.20, radiusKm: 70,  npsCode: 'noca' },
  { id: '47', name: 'Olympic',              state: 'WA', lat: 47.97,  lng: -123.50, radiusKm: 90,  npsCode: 'olym' },
  { id: '48', name: 'Petrified Forest',     state: 'AZ', lat: 34.98,  lng: -109.78, radiusKm: 50,  npsCode: 'pefo' },
  { id: '49', name: 'Pinnacles',            state: 'CA', lat: 36.49,  lng: -121.16, radiusKm: 30,  npsCode: 'pinn' },
  { id: '50', name: 'Redwood',              state: 'CA', lat: 41.30,  lng: -124.00, radiusKm: 55,  npsCode: 'redw' },
  { id: '51', name: 'Rocky Mountain',       state: 'CO', lat: 40.40,  lng: -105.58, radiusKm: 60,  npsCode: 'romo' },
  { id: '52', name: 'Saguaro',              state: 'AZ', lat: 32.25,  lng: -110.50, radiusKm: 40,  npsCode: 'sagu' },
  { id: '53', name: 'Sequoia',              state: 'CA', lat: 36.43,  lng: -118.68, radiusKm: 65,  npsCode: 'sequ' },
  { id: '54', name: 'Shenandoah',           state: 'VA', lat: 38.49,  lng: -78.35,  radiusKm: 80,  npsCode: 'shen' },
  { id: '55', name: 'Theodore Roosevelt',   state: 'ND', lat: 46.98,  lng: -103.45, radiusKm: 50,  npsCode: 'thro' },
  { id: '56', name: 'Virgin Islands',       state: 'VI', lat: 18.33,  lng: -64.73,  radiusKm: 30,  npsCode: 'viis' },
  { id: '57', name: 'Voyageurs',            state: 'MN', lat: 48.48,  lng: -92.84,  radiusKm: 55,  npsCode: 'voya' },
  { id: '58', name: 'White Sands',          state: 'NM', lat: 32.78,  lng: -106.17, radiusKm: 40,  npsCode: 'whsa' },
  { id: '59', name: 'Wind Cave',            state: 'SD', lat: 43.57,  lng: -103.48, radiusKm: 30,  npsCode: 'wica' },
  { id: '60', name: 'Wrangell–St. Elias',   state: 'AK', lat: 61.70,  lng: -142.99, radiusKm: 250, npsCode: 'wrst' },
  { id: '61', name: 'Yellowstone',          state: 'WY', lat: 44.42,  lng: -110.59, radiusKm: 80,  npsCode: 'yell' },
  { id: '62', name: 'Yosemite',             state: 'CA', lat: 37.87,  lng: -119.55, radiusKm: 70,  npsCode: 'yose' },
  { id: '63', name: 'Zion',                 state: 'UT', lat: 37.30,  lng: -113.00, radiusKm: 45,  npsCode: 'zion' },
];

/**
 * Notable / popular trails per national park.
 * Keyed by npsCode (matches PARKS[].npsCode from parksData.ts).
 * Parks without entries default to free-text trail input in LogOutingSheet.
 */
export const PARK_TRAILS: Record<string, string[]> = {
  // Acadia
  acad: [
    'Cadillac Mountain South Ridge Trail',
    'Ocean Path',
    'Precipice Trail',
    'Jordan Pond Path',
    'The Beehive Trail',
    'Acadia Mountain Trail',
    'Great Head Trail',
  ],
  // Arches
  arch: [
    'Delicate Arch Trail',
    'Devils Garden Trail',
    'Landscape Arch Trail',
    'Sand Dune Arch Trail',
    'Broken Arch Trail',
    'Windows Loop Trail',
    'Park Avenue Trail',
  ],
  // Bryce Canyon
  brca: [
    'Navajo Loop Trail',
    'Queens Garden Trail',
    'Rim Trail',
    'Fairyland Loop Trail',
    'Under-the-Rim Trail',
    'Peekaboo Loop Trail',
    'Figure 8 Trail',
  ],
  // Canyonlands
  cany: [
    'Mesa Arch Trail',
    'Grand View Point Trail',
    'Chesler Park Loop',
    'Upheaval Dome Trail',
    'Syncline Loop Trail',
    'Island in the Sky Trails',
  ],
  // Capitol Reef
  care: [
    'Cassidy Arch Trail',
    'Chimney Rock Loop',
    'Cohab Canyon Trail',
    'Grand Wash Trail',
    'Hickman Bridge Trail',
    'Rim Overlook Trail',
  ],
  // Grand Canyon (South Rim)
  grca: [
    'Bright Angel Trail',
    'South Kaibab Trail',
    'North Kaibab Trail',
    'Rim Trail',
    'Hermit Trail',
    'Grandview Trail',
    'Tonto Trail',
  ],
  // Grand Teton
  grte: [
    'Jenny Lake Loop',
    'Inspiration Point Trail',
    'Cascade Canyon Trail',
    'Taggart Lake Trail',
    'Hidden Falls Trail',
    'Lake Solitude Trail',
    'Death Canyon Trail',
  ],
  // Great Smoky Mountains
  grsm: [
    'Alum Cave Trail',
    'Laurel Falls Trail',
    'Chimney Tops Trail',
    'Andrews Bald Trail',
    'Appalachian Trail (Park Section)',
    'Ramsey Cascades Trail',
    'Gregory Bald Trail',
  ],
  // Joshua Tree
  jotr: [
    'Hidden Valley Loop Trail',
    'Ryan Mountain Trail',
    'Boy Scout Trail',
    'Barker Dam Loop Trail',
    'Skull Rock Nature Trail',
    'Cholla Cactus Garden Trail',
    'Lost Horse Mine Loop',
  ],
  // Mount Rainier
  mora: [
    'Skyline Trail',
    'Wonderland Trail',
    'Alta Vista Loop',
    'Paradise Glacier Trail',
    'Spray Park Trail',
    'Carbon Glacier Trail',
    'Camp Muir Trail',
  ],
  // Olympic
  olym: [
    'Hurricane Ridge Trail',
    'Hoh Rain Forest Loop',
    'Sol Duc Falls Trail',
    'Quinault Rain Forest Loop',
    'Rialto Beach',
    'High Divide Loop',
    'Hall of Mosses Trail',
  ],
  // Rocky Mountain
  romo: [
    'Emerald Lake Trail',
    'Bear Lake Loop',
    'Alberta Falls Trail',
    'Chasm Lake Trail',
    'Sky Pond Trail',
    'Hallett Peak Trail',
    'Twin Sisters Trail',
  ],
  // Sequoia
  sequ: [
    'Congress Trail',
    'General Sherman Tree Trail',
    'Big Trees Trail',
    'Alta Peak Trail',
    'Moro Rock Trail',
    'Tokopah Falls Trail',
    'Heather Lake Trail',
  ],
  // Shenandoah
  shen: [
    'Old Rag Mountain',
    'Hawksbill Summit Trail',
    'Dark Hollow Falls Trail',
    'Stony Man Trail',
    'Bearfence Mountain Trail',
    'Whiteoak Canyon Trail',
    'Appalachian Trail (AT)',
  ],
  // Yellowstone
  yell: [
    'Grand Prismatic Overlook Trail',
    'Fairy Falls Trail',
    'Norris Geyser Basin Trail',
    'Mystic Falls Trail',
    'Lone Star Geyser Trail',
    'Lamar Valley Trail',
    'Mount Washburn Trail',
  ],
  // Yosemite
  yose: [
    'Mist Trail to Vernal Fall',
    'Half Dome Trail',
    "Angel's Landing (Zion — see zion)",
    'Valley Floor Loop Trail',
    'Mirror Lake Loop',
    'Sentinel Dome Trail',
    'Glacier Point Trail',
    'Yosemite Falls Trail',
  ],
  // Zion
  zion: [
    "Angel's Landing",
    'The Narrows',
    'Emerald Pools Trail',
    'Canyon Overlook Trail',
    'Observation Point Trail',
    'Riverside Walk',
    'Watchman Trail',
  ],
  // Glacier
  glac: [
    'Grinnell Glacier Trail',
    'Highline Trail',
    'Avalanche Lake Trail',
    'Hidden Lake Trail',
    'Iceberg Lake Trail',
    'Ptarmigan Tunnel Trail',
    'Running Eagle Falls Trail',
  ],
  // Death Valley
  deva: [
    'Golden Canyon Trail',
    'Mosaic Canyon Trail',
    'Darwin Falls Trail',
    'Badwater Salt Flat Walk',
    "Zabriskie Point Trail",
    'Natural Bridge Canyon Trail',
  ],
  // Crater Lake
  crla: [
    'Rim Drive',
    'Cleetwood Cove Trail',
    'Watchman Peak Trail',
    'Garfield Peak Trail',
    'Sun Notch Trail',
    'Discovery Point Trail',
  ],
  // Everglades
  ever: [
    'Anhinga Trail',
    'Gumbo Limbo Trail',
    'Long Pine Key Trail',
    'Pa-hay-okee Overlook Trail',
    'Mahogany Hammock Trail',
    'Bear Lake Canoe Trail',
  ],
  // Kings Canyon
  kica: [
    'Roper Lake Trail',
    'Mist Falls Trail',
    'Zumwalt Meadow Loop',
    'Hotel Creek Loop',
    'Don Cecil Trail',
    'Panoramic Point Trail',
  ],
  // Pinnacles
  pinn: [
    'High Peaks Trail',
    'Bear Gulch Cave Trail',
    'Balconies Cave Trail',
    'Condor Gulch Trail',
    'North Wilderness Trail',
  ],
  // Redwood
  redw: [
    'Fern Canyon Loop',
    'James Irvine Trail',
    'Enderts Beach Trail',
    'Prairie Creek Trail',
    'Mill Creek Trail',
    'Coastal Trail',
  ],
  // Channel Islands
  chis: [
    'Cavern Point Loop',
    'Potato Harbor Trail',
    'Scorpion Canyon Loop',
    'Pelican Bay Trail',
    'Smugglers Cove Trail',
  ],
  // Denali
  dena: [
    'Mount Healy Overlook Trail',
    'Triple Lakes Trail',
    'Horseshoe Lake Trail',
    'Rock Creek Trail',
    'Savage Alpine Trail',
  ],
  // Hawaii Volcanoes
  havo: [
    'Kilauea Iki Trail',
    'Crater Rim Trail',
    'Thurston Lava Tube Trail',
    'Chain of Craters Road Walks',
    'Mauna Loa Trail',
  ],
  // Haleakala
  hale: [
    'Sliding Sands Trail',
    'Halemaumau Trail',
    'Crater Trail',
    'Hosmer Grove Trail',
    'Pipiwai Trail',
  ],
  // Kenai Fjords
  kefj: [
    'Exit Glacier Trail',
    'Harding Icefield Trail',
    'Coastal Walk',
  ],
  // Voyageurs
  voya: [
    'Kabetogama Lake Overlook Trail',
    'Cruiser Lake Trail',
    'Beaver Pond Trail',
    'Locator Lake Trail',
  ],
  // Wind Cave
  wica: [
    'Rankin Ridge Trail',
    'Lookout Point Trail',
    'Wind Cave Canyon Trail',
    'Centennial Trail',
  ],
  // Badlands
  badl: [
    'Notch Trail',
    'Door Trail',
    'Window Trail',
    'Saddle Pass Trail',
    'Castle Trail',
  ],
  // Theodore Roosevelt
  thro: [
    'South Unit Petrified Forest Trail',
    'Wind Canyon Trail',
    'Ridgeline Trail',
    'Buck Hill Trail',
  ],
  // Cuyahoga Valley
  cuva: [
    'Ohio & Erie Canal Towpath',
    'Brandywine Falls Trail',
    'Ledges Trail',
    'Blue Hen Falls Trail',
    'Plateau Trail',
  ],
  // Saguaro
  sagu: [
    'Valley View Overlook Trail',
    'Signal Hill Trail',
    'Douglas Spring Trail',
    'Tanque Verde Ridge Trail',
    'Rincon Peak Trail',
  ],
  // Guadalupe Mountains
  gumo: [
    'Guadalupe Peak Trail',
    'El Capitan Trail',
    'Pine Springs Canyon Trail',
    'Bush Mountain Trail',
  ],
  // Big Bend
  bibe: [
    'Lost Mine Trail',
    'Santa Elena Canyon Trail',
    'Chisos Basin Loop',
    'Boquillas Canyon Trail',
    'Emory Peak Trail',
  ],
  // Petrified Forest
  pefo: [
    'Blue Mesa Trail',
    'Crystal Forest Trail',
    'Giant Logs Trail',
    'Painted Desert Rim Trail',
    'Long Logs Trail',
  ],
  // Mesa Verde
  meve: [
    'Petroglyph Point Trail',
    'Spruce Canyon Trail',
    'Knife Edge Trail',
    'Soda Canyon Overlook Trail',
  ],
  // Black Canyon
  blca: [
    'Rim Rock Nature Trail',
    'Cedar Point Nature Trail',
    'Warner Point Nature Trail',
    'Chasm View Nature Trail',
    'Painted Wall View Trail',
  ],
  // Great Sand Dunes
  grsa: [
    'High Dune Trail',
    'Mosca Pass Trail',
    'Montville Nature Trail',
    'Sand Ramp Trail',
  ],
  // White Sands
  whsa: [
    'Alkali Flat Trail',
    'Backcountry Camping Loop',
    'Playa Trail',
    'Interdune Boardwalk',
  ],
};

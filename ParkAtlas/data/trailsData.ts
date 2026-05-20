/**
 * Notable / popular trails per national park with estimated distances.
 * Keyed by npsCode (matches PARKS[].npsCode from parksData.ts).
 * Parks without entries default to free-text trail input in LogOutingSheet.
 */
export interface Trail {
  name: string;
  miles: number;
}

export const PARK_TRAILS: Record<string, Trail[]> = {
  // Acadia
  acad: [
    { name: 'Cadillac Mountain South Ridge Trail', miles: 7.4 },
    { name: 'Ocean Path', miles: 4.2 },
    { name: 'Precipice Trail', miles: 3.3 },
    { name: 'Jordan Pond Path', miles: 3.3 },
    { name: 'The Beehive Trail', miles: 1.8 },
    { name: 'Acadia Mountain Trail', miles: 4.8 },
    { name: 'Great Head Trail', miles: 1.8 },
  ],
  // Arches
  arch: [
    { name: 'Delicate Arch Trail', miles: 3.0 },
    { name: 'Devils Garden Trail', miles: 7.2 },
    { name: 'Landscape Arch Trail', miles: 7.6 },
    { name: 'Sand Dune Arch Trail', miles: 2.4 },
    { name: 'Broken Arch Trail', miles: 3.2 },
    { name: 'Windows Loop Trail', miles: 1.0 },
    { name: 'Park Avenue Trail', miles: 3.9 },
  ],
  // Bryce Canyon
  brca: [
    { name: 'Navajo Loop Trail', miles: 1.9 },
    { name: 'Queens Garden Trail', miles: 1.4 },
    { name: 'Rim Trail', miles: 5.5 },
    { name: 'Fairyland Loop Trail', miles: 8.0 },
    { name: 'Under-the-Rim Trail', miles: 23.0 },
    { name: 'Peekaboo Loop Trail', miles: 5.5 },
    { name: 'Figure 8 Trail', miles: 11.0 },
  ],
  // Canyonlands
  cany: [
    { name: 'Mesa Arch Trail', miles: 6.0 },
    { name: 'Grand View Point Trail', miles: 3.1 },
    { name: 'Chesler Park Loop', miles: 10.4 },
    { name: 'Upheaval Dome Trail', miles: 4.6 },
    { name: 'Syncline Loop Trail', miles: 8.3 },
    { name: 'Island in the Sky Trails', miles: 2.0 },
  ],
  // Capitol Reef
  care: [
    { name: 'Cassidy Arch Trail', miles: 6.4 },
    { name: 'Chimney Rock Loop', miles: 3.6 },
    { name: 'Cohab Canyon Trail', miles: 3.5 },
    { name: 'Grand Wash Trail', miles: 4.4 },
    { name: 'Hickman Bridge Trail', miles: 2.0 },
    { name: 'Rim Overlook Trail', miles: 4.4 },
  ],
  // Grand Canyon (South Rim)
  grca: [
    { name: 'Bright Angel Trail', miles: 19.4 },
    { name: 'South Kaibab Trail', miles: 14.5 },
    { name: 'North Kaibab Trail', miles: 28.7 },
    { name: 'Rim Trail', miles: 13.0 },
    { name: 'Hermit Trail', miles: 15.0 },
    { name: 'Grandview Trail', miles: 9.8 },
    { name: 'Tonto Trail', miles: 29.8 },
  ],
  // Grand Teton
  grte: [
    { name: 'Jenny Lake Loop', miles: 7.3 },
    { name: 'Inspiration Point Trail', miles: 2.0 },
    { name: 'Cascade Canyon Trail', miles: 7.4 },
    { name: 'Taggart Lake Trail', miles: 3.1 },
    { name: 'Hidden Falls Trail', miles: 2.0 },
    { name: 'Lake Solitude Trail', miles: 9.4 },
    { name: 'Death Canyon Trail', miles: 15.0 },
  ],
  // Great Smoky Mountains
  grsm: [
    { name: 'Alum Cave Trail', miles: 5.0 },
    { name: 'Laurel Falls Trail', miles: 2.6 },
    { name: 'Chimney Tops Trail', miles: 3.4 },
    { name: 'Andrews Bald Trail', miles: 3.6 },
    { name: 'Appalachian Trail (Park Section)', miles: 72.0 },
    { name: 'Ramsey Cascades Trail', miles: 8.0 },
    { name: 'Gregory Bald Trail', miles: 11.0 },
  ],
  // Joshua Tree
  jotr: [
    { name: 'Hidden Valley Loop Trail', miles: 1.0 },
    { name: 'Ryan Mountain Trail', miles: 3.0 },
    { name: 'Boy Scout Trail', miles: 16.4 },
    { name: 'Barker Dam Loop Trail', miles: 1.4 },
    { name: 'Skull Rock Nature Trail', miles: 1.8 },
    { name: 'Cholla Cactus Garden Trail', miles: 0.25 },
    { name: 'Lost Horse Mine Loop', miles: 4.2 },
  ],
  // Mount Rainier
  mora: [
    { name: 'Skyline Trail', miles: 7.0 },
    { name: 'Wonderland Trail', miles: 93.0 },
    { name: 'Alta Vista Loop', miles: 1.6 },
    { name: 'Paradise Glacier Trail', miles: 5.0 },
    { name: 'Spray Park Trail', miles: 4.1 },
    { name: 'Carbon Glacier Trail', miles: 6.0 },
    { name: 'Camp Muir Trail', miles: 9.0 },
  ],
  // Olympic
  olym: [
    { name: 'Hurricane Ridge Trail', miles: 3.0 },
    { name: 'Hoh Rain Forest Loop', miles: 0.8 },
    { name: 'Sol Duc Falls Trail', miles: 1.6 },
    { name: 'Quinault Rain Forest Loop', miles: 0.4 },
    { name: 'Rialto Beach', miles: 2.0 },
    { name: 'High Divide Loop', miles: 9.3 },
    { name: 'Hall of Mosses Trail', miles: 1.3 },
  ],
  // Rocky Mountain
  romo: [
    { name: 'Emerald Lake Trail', miles: 1.7 },
    { name: 'Bear Lake Loop', miles: 0.7 },
    { name: 'Alberta Falls Trail', miles: 1.6 },
    { name: 'Chasm Lake Trail', miles: 4.2 },
    { name: 'Sky Pond Trail', miles: 7.4 },
    { name: 'Hallett Peak Trail', miles: 4.5 },
    { name: 'Twin Sisters Trail', miles: 7.2 },
  ],
  // Sequoia
  sequ: [
    { name: 'Congress Trail', miles: 2.0 },
    { name: 'General Sherman Tree Trail', miles: 0.4 },
    { name: 'Big Trees Trail', miles: 1.4 },
    { name: 'Alta Peak Trail', miles: 6.0 },
    { name: 'Moro Rock Trail', miles: 5.0 },
    { name: 'Tokopah Falls Trail', miles: 3.6 },
    { name: 'Heather Lake Trail', miles: 3.6 },
  ],
  // Shenandoah
  shen: [
    { name: 'Old Rag Mountain', miles: 9.2 },
    { name: 'Hawksbill Summit Trail', miles: 2.1 },
    { name: 'Dark Hollow Falls Trail', miles: 1.4 },
    { name: 'Stony Man Trail', miles: 1.6 },
    { name: 'Bearfence Mountain Trail', miles: 1.3 },
    { name: 'Whiteoak Canyon Trail', miles: 4.7 },
    { name: 'Appalachian Trail (AT)', miles: 101.0 },
  ],
  // Yellowstone
  yell: [
    { name: 'Grand Prismatic Overlook Trail', miles: 1.8 },
    { name: 'Fairy Falls Trail', miles: 4.8 },
    { name: 'Norris Geyser Basin Trail', miles: 1.5 },
    { name: 'Mystic Falls Trail', miles: 1.0 },
    { name: 'Lone Star Geyser Trail', miles: 4.8 },
    { name: 'Lamar Valley Trail', miles: 5.0 },
    { name: 'Mount Washburn Trail', miles: 6.4 },
  ],
  // Yosemite
  yose: [
    { name: 'Mist Trail to Vernal Fall', miles: 5.5 },
    { name: 'Half Dome Trail', miles: 17.0 },
    { name: 'Valley Floor Loop Trail', miles: 7.2 },
    { name: 'Mirror Lake Loop', miles: 5.0 },
    { name: 'Sentinel Dome Trail', miles: 2.2 },
    { name: 'Glacier Point Trail', miles: 6.8 },
    { name: 'Yosemite Falls Trail', miles: 7.6 },
  ],
  // Zion
  zion: [
    { name: "Angel's Landing", miles: 5.4 },
    { name: 'The Narrows', miles: 9.4 },
    { name: 'Emerald Pools Trail', miles: 3.0 },
    { name: 'Canyon Overlook Trail', miles: 1.0 },
    { name: 'Observation Point Trail', miles: 8.4 },
    { name: 'Riverside Walk', miles: 2.0 },
    { name: 'Watchman Trail', miles: 3.3 },
  ],
  // Glacier
  glac: [
    { name: 'Grinnell Glacier Trail', miles: 10.6 },
    { name: 'Highline Trail', miles: 12.0 },
    { name: 'Avalanche Lake Trail', miles: 4.0 },
    { name: 'Hidden Lake Trail', miles: 3.0 },
    { name: 'Iceberg Lake Trail', miles: 9.7 },
    { name: 'Ptarmigan Tunnel Trail', miles: 8.8 },
    { name: 'Running Eagle Falls Trail', miles: 0.6 },
  ],
  // Death Valley
  deva: [
    { name: 'Golden Canyon Trail', miles: 6.4 },
    { name: 'Mosaic Canyon Trail', miles: 4.0 },
    { name: 'Darwin Falls Trail', miles: 2.6 },
    { name: 'Badwater Salt Flat Walk', miles: 0.6 },
    { name: 'Zabriskie Point Trail', miles: 1.4 },
    { name: 'Natural Bridge Canyon Trail', miles: 2.0 },
  ],
  // Crater Lake
  crla: [
    { name: 'Rim Drive', miles: 33.0 },
    { name: 'Cleetwood Cove Trail', miles: 2.2 },
    { name: 'Watchman Peak Trail', miles: 1.5 },
    { name: 'Garfield Peak Trail', miles: 3.4 },
    { name: 'Sun Notch Trail', miles: 0.8 },
    { name: 'Discovery Point Trail', miles: 0.8 },
  ],
  // Everglades
  ever: [
    { name: 'Anhinga Trail', miles: 0.8 },
    { name: 'Gumbo Limbo Trail', miles: 0.5 },
    { name: 'Long Pine Key Trail', miles: 1.2 },
    { name: 'Pa-hay-okee Overlook Trail', miles: 0.2 },
    { name: 'Mahogany Hammock Trail', miles: 0.5 },
    { name: 'Bear Lake Canoe Trail', miles: 1.5 },
  ],
  // Kings Canyon
  kica: [
    { name: 'Roper Lake Trail', miles: 4.9 },
    { name: 'Mist Falls Trail', miles: 4.6 },
    { name: 'Zumwalt Meadow Loop', miles: 1.5 },
    { name: 'Hotel Creek Loop', miles: 4.8 },
    { name: 'Don Cecil Trail', miles: 4.7 },
    { name: 'Panoramic Point Trail', miles: 2.2 },
  ],
  // Pinnacles
  pinn: [
    { name: 'High Peaks Trail', miles: 5.5 },
    { name: 'Bear Gulch Cave Trail', miles: 2.4 },
    { name: 'Balconies Cave Trail', miles: 2.4 },
    { name: 'Condor Gulch Trail', miles: 4.8 },
    { name: 'North Wilderness Trail', miles: 4.4 },
  ],
  // Redwood
  redw: [
    { name: 'Fern Canyon Loop', miles: 1.4 },
    { name: 'James Irvine Trail', miles: 4.4 },
    { name: 'Enderts Beach Trail', miles: 1.8 },
    { name: 'Prairie Creek Trail', miles: 7.0 },
    { name: 'Mill Creek Trail', miles: 2.5 },
    { name: 'Coastal Trail', miles: 2.0 },
  ],
  // Channel Islands
  chis: [
    { name: 'Cavern Point Loop', miles: 2.3 },
    { name: 'Potato Harbor Trail', miles: 4.5 },
    { name: 'Scorpion Canyon Loop', miles: 6.5 },
    { name: 'Pelican Bay Trail', miles: 2.2 },
    { name: 'Smugglers Cove Trail', miles: 3.5 },
  ],
  // Denali
  dena: [
    { name: 'Mount Healy Overlook Trail', miles: 4.7 },
    { name: 'Triple Lakes Trail', miles: 8.9 },
    { name: 'Horseshoe Lake Trail', miles: 3.0 },
    { name: 'Rock Creek Trail', miles: 2.0 },
    { name: 'Savage Alpine Trail', miles: 7.9 },
  ],
  // Hawaii Volcanoes
  havo: [
    { name: 'Kilauea Iki Trail', miles: 4.0 },
    { name: 'Crater Rim Trail', miles: 11.6 },
    { name: 'Thurston Lava Tube Trail', miles: 0.5 },
    { name: 'Chain of Craters Road Walks', miles: 2.0 },
    { name: 'Mauna Loa Trail', miles: 18.0 },
  ],
  // Haleakala
  hale: [
    { name: 'Sliding Sands Trail', miles: 11.0 },
    { name: 'Halemaumau Trail', miles: 2.0 },
    { name: 'Crater Trail', miles: 2.2 },
    { name: 'Hosmer Grove Trail', miles: 0.5 },
    { name: 'Pipiwai Trail', miles: 4.0 },
  ],
  // Kenai Fjords
  kefj: [
    { name: 'Exit Glacier Trail', miles: 3.5 },
    { name: 'Harding Icefield Trail', miles: 8.2 },
    { name: 'Coastal Walk', miles: 2.0 },
  ],
  // Voyageurs
  voya: [
    { name: 'Kabetogama Lake Overlook Trail', miles: 1.7 },
    { name: 'Cruiser Lake Trail', miles: 1.5 },
    { name: 'Beaver Pond Trail', miles: 0.3 },
    { name: 'Locator Lake Trail', miles: 1.5 },
  ],
  // Wind Cave
  wica: [
    { name: 'Rankin Ridge Trail', miles: 3.0 },
    { name: 'Lookout Point Trail', miles: 0.1 },
    { name: 'Wind Cave Canyon Trail', miles: 0.5 },
    { name: 'Centennial Trail', miles: 0.8 },
  ],
  // Badlands
  badl: [
    { name: 'Notch Trail', miles: 1.5 },
    { name: 'Door Trail', miles: 0.8 },
    { name: 'Window Trail', miles: 0.3 },
    { name: 'Saddle Pass Trail', miles: 0.3 },
    { name: 'Castle Trail', miles: 5.2 },
  ],
  // Theodore Roosevelt
  thro: [
    { name: 'South Unit Petrified Forest Trail', miles: 4.2 },
    { name: 'Wind Canyon Trail', miles: 0.4 },
    { name: 'Ridgeline Trail', miles: 0.8 },
    { name: 'Buck Hill Trail', miles: 0.5 },
  ],
  // Cuyahoga Valley
  cuva: [
    { name: 'Ohio & Erie Canal Towpath', miles: 20.3 },
    { name: 'Brandywine Falls Trail', miles: 1.8 },
    { name: 'Ledges Trail', miles: 2.0 },
    { name: 'Blue Hen Falls Trail', miles: 1.2 },
    { name: 'Plateau Trail', miles: 1.8 },
  ],
  // Saguaro
  sagu: [
    { name: 'Valley View Overlook Trail', miles: 0.5 },
    { name: 'Signal Hill Trail', miles: 1.0 },
    { name: 'Douglas Spring Trail', miles: 2.8 },
    { name: 'Tanque Verde Ridge Trail', miles: 6.5 },
    { name: 'Rincon Peak Trail', miles: 6.0 },
  ],
  // Guadalupe Mountains
  gumo: [
    { name: 'Guadalupe Peak Trail', miles: 8.4 },
    { name: 'El Capitan Trail', miles: 5.4 },
    { name: 'Pine Springs Canyon Trail', miles: 3.0 },
    { name: 'Bush Mountain Trail', miles: 8.0 },
  ],
  // Big Bend
  bibe: [
    { name: 'Lost Mine Trail', miles: 4.8 },
    { name: 'Santa Elena Canyon Trail', miles: 1.6 },
    { name: 'Chisos Basin Loop', miles: 5.0 },
    { name: 'Boquillas Canyon Trail', miles: 1.4 },
    { name: 'Emory Peak Trail', miles: 10.2 },
  ],
  // Petrified Forest
  pefo: [
    { name: 'Blue Mesa Trail', miles: 1.0 },
    { name: 'Crystal Forest Trail', miles: 0.8 },
    { name: 'Giant Logs Trail', miles: 0.4 },
    { name: 'Painted Desert Rim Trail', miles: 0.8 },
    { name: 'Long Logs Trail', miles: 0.4 },
  ],
  // Mesa Verde
  meve: [
    { name: 'Petroglyph Point Trail', miles: 2.8 },
    { name: 'Spruce Canyon Trail', miles: 2.1 },
    { name: 'Knife Edge Trail', miles: 0.8 },
    { name: 'Soda Canyon Overlook Trail', miles: 1.8 },
  ],
  // Black Canyon
  blca: [
    { name: 'Rim Rock Nature Trail', miles: 1.0 },
    { name: 'Cedar Point Nature Trail', miles: 0.3 },
    { name: 'Warner Point Nature Trail', miles: 1.5 },
    { name: 'Chasm View Nature Trail', miles: 0.3 },
    { name: 'Painted Wall View Trail', miles: 0.3 },
  ],
  // Great Sand Dunes
  grsa: [
    { name: 'High Dune Trail', miles: 0.6 },
    { name: 'Mosca Pass Trail', miles: 3.6 },
    { name: 'Montville Nature Trail', miles: 0.5 },
    { name: 'Sand Ramp Trail', miles: 0.6 },
  ],
  // White Sands
  whsa: [
    { name: 'Alkali Flat Trail', miles: 5.0 },
    { name: 'Backcountry Camping Loop', miles: 8.0 },
    { name: 'Playa Trail', miles: 2.5 },
    { name: 'Interdune Boardwalk', miles: 0.5 },
  ],
  // State Parks
  // Gulf State Park, AL
  sp_al_1: [
    { name: 'Beach Trail', miles: 2.5 },
    { name: 'Pine Trail', miles: 1.8 },
    { name: 'Lake Trail', miles: 3.2 },
  ],
  // Cheaha State Park, AL
  sp_al_2: [
    { name: 'Cheaha Summit Trail', miles: 0.8 },
    { name: 'Bunker Loop Trail', miles: 3.0 },
    { name: 'Waterfall Trail', miles: 1.5 },
  ],
  // Chugach State Park, AK
  sp_ak_1: [
    { name: 'Flattop Mountain Trail', miles: 3.0 },
    { name: 'Eagle River Trail', miles: 12.0 },
    { name: 'Disappointment Peak Trail', miles: 5.6 },
  ],
  // Kachemak Bay State Park, AK
  sp_ak_2: [
    { name: 'Grewingk Glacier Trail', miles: 3.0 },
    { name: 'Saddle Trail', miles: 6.0 },
    { name: 'China Poot Lake Trail', miles: 5.0 },
  ],
  // Slide Rock State Park, AZ
  sp_az_1: [
    { name: 'Slide Rock Trail', miles: 0.8 },
    { name: 'Canyon Loop Trail', miles: 2.5 },
    { name: 'Upstream Walk', miles: 1.2 },
  ],
  // Kartchner Caverns State Park, AZ
  sp_az_2: [
    { name: 'Cavern Discovery Trail', miles: 0.5 },
    { name: 'Rotunda Room Trail', miles: 0.6 },
  ],
  // Petit Jean State Park, AR
  sp_ar_1: [
    { name: 'Hawksbill Crag Trail', miles: 2.0 },
    { name: 'Seven Hollows Trail', miles: 3.5 },
    { name: 'Ridgeline Trail', miles: 4.2 },
  ],
  // Devil's Den State Park, AR
  sp_ar_2: [
    { name: 'Butterfield Nature Trail', miles: 0.4 },
    { name: 'Butterfield Scenic Trail', miles: 1.0 },
    { name: 'Lee\'s Arch Trail', miles: 1.5 },
  ],
  // Big Basin Redwoods State Park, CA
  sp_ca_1: [
    { name: 'Redwood Trail', miles: 2.8 },
    { name: 'Berry Creek Falls Trail', miles: 11.0 },
    { name: 'Sunset Trail', miles: 5.6 },
  ],
  // Point Reyes State Park, CA
  sp_ca_2: [
    { name: 'Alamere Falls Trail', miles: 10.8 },
    { name: 'Five Brooks Trail', miles: 6.0 },
    { name: 'Wildcat Beach Trail', miles: 4.2 },
  ],
  // Anza-Borrego Desert State Park, CA
  sp_ca_3: [
    { name: 'Borrego Palm Canyon Trail', miles: 3.0 },
    { name: 'Visitor Center Loop', miles: 0.5 },
    { name: 'Slot Canyon Trail', miles: 2.5 },
  ],
  // Roxborough State Park, CO
  sp_co_1: [
    { name: 'Roxborough Park Trail', miles: 2.3 },
    { name: 'Walnut Canyon Trail', miles: 1.5 },
    { name: 'Willow Creek Trail', miles: 3.0 },
  ],
  // Eldorado Canyon State Park, CO
  sp_co_2: [
    { name: 'Eldorado Canyon Trail', miles: 4.0 },
    { name: 'Bastille Crags Trail', miles: 2.0 },
    { name: 'Streamside Trail', miles: 1.5 },
  ],
  // Sleeping Giant State Park, CT
  sp_ct_1: [
    { name: 'Sleeping Giant Summit Trail', miles: 2.0 },
    { name: 'Tower Trail', miles: 0.8 },
    { name: 'Red Trail', miles: 3.0 },
  ],
  // Hammonasset Beach State Park, CT
  sp_ct_2: [
    { name: 'Meigs Point Trail', miles: 1.2 },
    { name: 'Beach Walk', miles: 2.0 },
  ],
  // Cape Henlopen State Park, DE
  sp_de_1: [
    { name: 'Seaside Nature Trail', miles: 1.5 },
    { name: 'Lighthouse Loop', miles: 0.8 },
    { name: 'Beach Trail', miles: 2.0 },
  ],
  // Bahia Honda State Park, FL
  sp_fl_1: [
    { name: 'Sandspur Beach Trail', miles: 0.8 },
    { name: 'Beach Loop', miles: 2.2 },
    { name: 'Butterfly Trail', miles: 1.0 },
  ],
  // Ichetucknee Springs State Park, FL
  sp_fl_2: [
    { name: 'Ichetucknee Springs Trail', miles: 0.6 },
    { name: 'Blue Hole Trail', miles: 1.2 },
  ],
  // Myakka River State Park, FL
  sp_fl_3: [
    { name: 'Upper Myakka Lake Trail', miles: 8.5 },
    { name: 'Oak Hammock Trail', miles: 3.0 },
    { name: 'Deer Prairie Slough Trail', miles: 2.0 },
  ],
  // Amicalola Falls State Park, GA
  sp_ga_1: [
    { name: 'Amicalola Falls Trail', miles: 1.1 },
    { name: 'Appalachian Trail Access', miles: 0.3 },
    { name: 'Sunrise Trail', miles: 2.0 },
  ],
  // Cloudland Canyon State Park, GA
  sp_ga_2: [
    { name: 'Cloudland Canyon Trail', miles: 1.8 },
    { name: 'Waterfall Trail', miles: 2.5 },
    { name: 'Sitton Gulch Trail', miles: 3.0 },
  ],
  // Nā Pali Coast State Wilderness Park, HI
  sp_hi_1: [
    { name: 'Kalalau Trail', miles: 11.0 },
    { name: 'Hanapape Valley Trail', miles: 1.5 },
    { name: 'Awaawapuhi Trail', miles: 3.0 },
  ],
  // Waimea Canyon State Park, HI
  sp_hi_2: [
    { name: 'Waimea Canyon Trail', miles: 3.6 },
    { name: 'Koaie Canyon Trail', miles: 8.0 },
    { name: 'Iliau Nature Loop', miles: 0.3 },
  ],
  // Harriman State Park, ID
  sp_id_1: [
    { name: 'Island Park Trail', miles: 4.0 },
    { name: 'Henry\'s Fork Trail', miles: 6.0 },
    { name: 'Mountain Ash Creek Trail', miles: 3.5 },
  ],
  // Hells Gate State Park, ID
  sp_id_2: [
    { name: 'Precipice Trail', miles: 1.2 },
    { name: 'Swallow Cliff Trail', miles: 2.8 },
    { name: 'Snake River Vista Trail', miles: 0.8 },
  ],
  // Starved Rock State Park, IL
  sp_il_1: [
    { name: 'Starved Rock Summit Trail', miles: 1.5 },
    { name: 'French Canyon Trail', miles: 1.8 },
    { name: 'Eagle Canyon Trail', miles: 2.0 },
  ],
  // Shawnee National Forest State Rec, IL
  sp_il_2: [
    { name: 'Garden of the Gods Trail', miles: 2.0 },
    { name: 'Pharaoh Ridge Trail', miles: 3.5 },
    { name: 'Devil\'s Kitchen Trail', miles: 1.2 },
  ],
  // Brown County State Park, IN
  sp_in_1: [
    { name: 'Oaks Trail', miles: 2.0 },
    { name: 'Paved Loop Trail', miles: 1.5 },
    { name: 'Big Sink Trail', miles: 1.8 },
  ],
  // Turkey Run State Park, IN
  sp_in_2: [
    { name: 'Canyon Trail', miles: 1.5 },
    { name: 'Sugar Bowl Trail', miles: 0.7 },
    { name: 'Ridge Trail', miles: 2.0 },
  ],
  // Backbone State Park, IA
  sp_ia_1: [
    { name: 'Main Trail', miles: 2.0 },
    { name: 'Quarry Hill Trail', miles: 1.5 },
    { name: 'Backbone Vista Trail', miles: 1.8 },
  ],
  // Pikes Peak State Park, IA
  sp_ia_2: [
    { name: 'Pikes Peak Summit Trail', miles: 1.0 },
    { name: 'Bridal Veil Falls Trail', miles: 0.6 },
  ],
  // Tallgrass Prairie State Preserve, KS
  sp_ks_1: [
    { name: 'Tallgrass Trail', miles: 0.8 },
    { name: 'Big Bluestem Trail', miles: 1.2 },
  ],
  // Mushroom Rock State Park, KS
  sp_ks_2: [
    { name: 'Mushroom Rock Trail', miles: 0.3 },
  ],
  // Natural Bridge State Resort Park, KY
  sp_ky_1: [
    { name: 'Natural Bridge Trail', miles: 1.0 },
    { name: 'Laurel Branch Trail', miles: 2.5 },
    { name: 'Hemlock Trail', miles: 1.5 },
  ],
  // Cumberland Falls State Resort Park, KY
  sp_ky_2: [
    { name: 'Cumberland Falls Trail', miles: 0.8 },
    { name: 'Moonbow Trail', miles: 1.2 },
    { name: 'Raven Run Trail', miles: 3.0 },
  ],
  // Fontainebleau State Park, LA
  sp_la_1: [
    { name: 'Live Oak Trail', miles: 1.5 },
    { name: 'Levee Trail', miles: 2.0 },
  ],
  // Chicot State Park, LA
  sp_la_2: [
    { name: 'Lakeside Trail', miles: 2.5 },
    { name: 'Nature Trail', miles: 1.0 },
  ],
  // Baxter State Park, ME
  sp_me_1: [
    { name: 'Mount Katahdin Trail', miles: 10.0 },
    { name: 'Kidney Pond Trail', miles: 3.2 },
    { name: 'Sandy Stream Pond Trail', miles: 2.5 },
  ],
  // Sebago Lake State Park, ME
  sp_me_2: [
    { name: 'Sebago Lake Trail', miles: 1.0 },
    { name: 'Outlet Stream Trail', miles: 2.0 },
  ],
  // Assateague State Park, MD
  sp_md_1: [
    { name: 'Bayside Loop Trail', miles: 1.5 },
    { name: 'Life of Maryland Trail', miles: 0.8 },
    { name: 'Beach Trail', miles: 2.0 },
  ],
  // Cunningham Falls State Park, MD
  sp_md_2: [
    { name: 'Cunningham Falls Trail', miles: 0.8 },
    { name: 'Burp Trail', miles: 2.0 },
    { name: 'Chimney Rock Trail', miles: 1.5 },
  ],
  // Mount Greylock State Reservation, MA
  sp_ma_1: [
    { name: 'Mount Greylock Summit Trail', miles: 3.8 },
    { name: 'Bellows Pipe Trail', miles: 4.0 },
    { name: 'War Veterans Memorial Tower Trail', miles: 1.0 },
  ],
  // Walden Pond State Reservation, MA
  sp_ma_2: [
    { name: 'Pond Loop Trail', miles: 1.7 },
  ],
  // Pictured Rocks National Lakeshore State, MI
  sp_mi_1: [
    { name: 'Chapel Loop Trail', miles: 2.0 },
    { name: 'Miners Castle Trail', miles: 2.4 },
    { name: 'Chapel Beach Trail', miles: 4.0 },
  ],
  // Sleeping Bear Dunes, MI
  sp_mi_2: [
    { name: 'Dune Climb Trail', miles: 3.5 },
    { name: 'Sleeping Bear Heritage Trail', miles: 1.4 },
    { name: 'Platte River Foot Trail', miles: 2.5 },
  ],
  // Tahquamenon Falls State Park, MI
  sp_mi_3: [
    { name: 'Upper Falls Trail', miles: 0.5 },
    { name: 'Lower Falls Loop', miles: 1.5 },
    { name: 'Tahquamenon River Trail', miles: 2.0 },
  ],
  // Itasca State Park, MN
  sp_mn_1: [
    { name: 'Mississippi River Source Trail', miles: 1.5 },
    { name: 'Schoolcraft Trail', miles: 2.6 },
    { name: 'Headwaters Trail', miles: 2.0 },
  ],
  // Representative sampling of additional state parks across remaining states
  sp_mo_1: [
    { name: 'Lost Valley Trail', miles: 1.4 },
    { name: 'Hawksbill Crag Access', miles: 2.5 },
  ],
  sp_mt_1: [
    { name: 'Upper Green Lake Trail', miles: 6.0 },
    { name: 'Emerald Falls Trail', miles: 1.5 },
  ],
  sp_ne_1: [
    { name: 'Chimney Rock Trail', miles: 1.2 },
  ],
  sp_nv_1: [
    { name: 'Cathedral Rock Trail', miles: 2.5 },
    { name: 'Sand Hollow Trail', miles: 3.0 },
  ],
  sp_nh_1: [
    { name: 'Mount Monadnock Trail', miles: 3.3 },
    { name: 'Lost Lake Trail', miles: 2.0 },
  ],
  sp_nj_1: [
    { name: 'Delaware Water Gap Trail', miles: 3.0 },
    { name: 'Sunfish Pond Trail', miles: 1.5 },
  ],
  sp_nm_1: [
    { name: 'Kasha-Katuwe Trail', miles: 2.0 },
    { name: 'Peralta Canyon Trail', miles: 1.5 },
  ],
  sp_ny_1: [
    { name: 'Letchworth Gorge Trail', miles: 3.5 },
    { name: 'Falls Trail', miles: 1.5 },
  ],
  sp_nc_1: [
    { name: 'Table Rock Trail', miles: 3.2 },
    { name: 'Linville Falls Trail', miles: 1.0 },
  ],
  sp_nd_1: [
    { name: 'Missouri River Vista Trail', miles: 0.8 },
  ],
  sp_oh_1: [
    { name: 'Old Man\'s Cave Trail', miles: 1.5 },
    { name: 'Ash Cave Trail', miles: 1.2 },
  ],
  sp_ok_1: [
    { name: 'Chickasaw Trail', miles: 1.5 },
    { name: 'Travertine Nature Trail', miles: 0.6 },
  ],
  sp_or_1: [
    { name: 'Smith and Bybee Wetlands Trail', miles: 2.0 },
    { name: 'Oregon Caves Trail', miles: 0.8 },
  ],
  sp_pa_1: [
    { name: 'Laurel Highlands Hiking Trail', miles: 20.0 },
    { name: 'Ohiopyle Falls Trail', miles: 1.5 },
  ],
  sp_ri_1: [
    { name: 'Arcadia Trail', miles: 2.7 },
  ],
  sp_sc_1: [
    { name: 'Table Rock Trail', miles: 3.5 },
    { name: 'Pinnacle Trail', miles: 1.2 },
  ],
  sp_sd_1: [
    { name: 'Sylvan Lake Trail', miles: 1.5 },
    { name: 'Cathedral Spires Trail', miles: 2.0 },
  ],
  sp_tn_1: [
    { name: 'Fall Creek Falls Trail', miles: 1.6 },
    { name: 'Waterfall Trail', miles: 0.8 },
  ],
  sp_tx_1: [
    { name: 'Garner State Park Loop', miles: 2.5 },
    { name: 'Frio River Trail', miles: 1.8 },
  ],
  sp_ut_1: [
    { name: 'Dead Horse Point Trail', miles: 2.0 },
    { name: 'Canyon Rim Trail', miles: 3.5 },
  ],
  sp_vt_1: [
    { name: 'Mount Mansfield Trail', miles: 4.2 },
    { name: 'Sunset Ridge Trail', miles: 3.0 },
  ],
  sp_va_1: [
    { name: 'Grayson Highlands Trail', miles: 3.0 },
    { name: 'Mount Rogers Trail', miles: 8.5 },
  ],
  sp_wa_1: [
    { name: 'Rattlesnake Ledge Trail', miles: 4.0 },
    { name: 'Mailbox Peak Trail', miles: 4.0 },
  ],
  sp_wv_1: [
    { name: 'New River Gorge Trail', miles: 2.5 },
    { name: 'Grandview Trail', miles: 1.5 },
  ],
  sp_wi_1: [
    { name: 'Devil\'s Lake Loop', miles: 2.4 },
    { name: 'East Bluff Trail', miles: 1.5 },
  ],
  sp_wy_1: [
    { name: 'Tower Fall Trail', miles: 0.6 },
    { name: 'Lost Lake Trail', miles: 3.0 },
  ],
  sp_dc_1: [
    { name: 'Rock Creek Park Trail', miles: 1.5 },
  ],
};

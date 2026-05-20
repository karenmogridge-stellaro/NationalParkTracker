import { StatePark } from './parksData';

/**
 * Representative set of US State Parks — one or more per state.
 * Covers all 50 states + DC. IDs are prefixed with "sp_" to avoid
 * collision with national park IDs.
 */
export const STATE_PARKS: StatePark[] = [
  // Alabama
  { id: 'sp_al_1', name: 'Gulf State Park', state: 'AL', lat: 30.29, lng: -87.61, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_al_2', name: 'Cheaha State Park', state: 'AL', lat: 33.49, lng: -85.81, radiusKm: 12, npsCode: '', type: 'state' },

  // Alaska
  { id: 'sp_ak_1', name: 'Chugach State Park', state: 'AK', lat: 61.21, lng: -149.49, radiusKm: 80, npsCode: '', type: 'state' },
  { id: 'sp_ak_2', name: 'Kachemak Bay State Park', state: 'AK', lat: 59.59, lng: -151.28, radiusKm: 50, npsCode: '', type: 'state' },

  // Arizona
  { id: 'sp_az_1', name: 'Slide Rock State Park', state: 'AZ', lat: 34.94, lng: -111.75, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_az_2', name: 'Kartchner Caverns State Park', state: 'AZ', lat: 31.84, lng: -110.35, radiusKm: 10, npsCode: '', type: 'state' },

  // Arkansas
  { id: 'sp_ar_1', name: 'Petit Jean State Park', state: 'AR', lat: 35.11, lng: -92.93, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_ar_2', name: 'Devil\'s Den State Park', state: 'AR', lat: 35.78, lng: -94.24, radiusKm: 12, npsCode: '', type: 'state' },

  // California
  { id: 'sp_ca_1', name: 'Big Basin Redwoods State Park', state: 'CA', lat: 37.17, lng: -122.22, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_ca_2', name: 'Point Reyes National Seashore (State)', state: 'CA', lat: 38.05, lng: -122.88, radiusKm: 25, npsCode: '', type: 'state' },
  { id: 'sp_ca_3', name: 'Anza-Borrego Desert State Park', state: 'CA', lat: 33.26, lng: -116.39, radiusKm: 60, npsCode: '', type: 'state' },

  // Colorado
  { id: 'sp_co_1', name: 'Roxborough State Park', state: 'CO', lat: 39.44, lng: -105.07, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_co_2', name: 'Eldorado Canyon State Park', state: 'CO', lat: 39.93, lng: -105.29, radiusKm: 10, npsCode: '', type: 'state' },

  // Connecticut
  { id: 'sp_ct_1', name: 'Sleeping Giant State Park', state: 'CT', lat: 41.43, lng: -72.90, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_ct_2', name: 'Hammonasset Beach State Park', state: 'CT', lat: 41.27, lng: -72.56, radiusKm: 8, npsCode: '', type: 'state' },

  // Delaware
  { id: 'sp_de_1', name: 'Cape Henlopen State Park', state: 'DE', lat: 38.79, lng: -75.10, radiusKm: 10, npsCode: '', type: 'state' },

  // Florida
  { id: 'sp_fl_1', name: 'Bahia Honda State Park', state: 'FL', lat: 24.66, lng: -81.27, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_fl_2', name: 'Ichetucknee Springs State Park', state: 'FL', lat: 29.97, lng: -82.76, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_fl_3', name: 'Myakka River State Park', state: 'FL', lat: 27.23, lng: -82.32, radiusKm: 20, npsCode: '', type: 'state' },

  // Georgia
  { id: 'sp_ga_1', name: 'Amicalola Falls State Park', state: 'GA', lat: 34.56, lng: -84.25, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_ga_2', name: 'Cloudland Canyon State Park', state: 'GA', lat: 34.83, lng: -85.49, radiusKm: 10, npsCode: '', type: 'state' },

  // Hawaii
  { id: 'sp_hi_1', name: 'Nā Pali Coast State Wilderness Park', state: 'HI', lat: 22.17, lng: -159.62, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_hi_2', name: 'Waimea Canyon State Park', state: 'HI', lat: 22.06, lng: -159.66, radiusKm: 15, npsCode: '', type: 'state' },

  // Idaho
  { id: 'sp_id_1', name: 'Harriman State Park', state: 'ID', lat: 44.37, lng: -111.48, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_id_2', name: 'Hells Gate State Park', state: 'ID', lat: 46.40, lng: -117.03, radiusKm: 10, npsCode: '', type: 'state' },

  // Illinois
  { id: 'sp_il_1', name: 'Starved Rock State Park', state: 'IL', lat: 41.32, lng: -88.99, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_il_2', name: 'Shawnee National Forest (State Rec)', state: 'IL', lat: 37.56, lng: -88.66, radiusKm: 40, npsCode: '', type: 'state' },

  // Indiana
  { id: 'sp_in_1', name: 'Brown County State Park', state: 'IN', lat: 39.19, lng: -86.23, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_in_2', name: 'Turkey Run State Park', state: 'IN', lat: 39.89, lng: -87.22, radiusKm: 10, npsCode: '', type: 'state' },

  // Iowa
  { id: 'sp_ia_1', name: 'Backbone State Park', state: 'IA', lat: 42.60, lng: -91.57, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_ia_2', name: 'Pikes Peak State Park', state: 'IA', lat: 43.07, lng: -91.36, radiusKm: 8, npsCode: '', type: 'state' },

  // Kansas
  { id: 'sp_ks_1', name: 'Tallgrass Prairie National Preserve (State)', state: 'KS', lat: 38.43, lng: -96.55, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_ks_2', name: 'Mushroom Rock State Park', state: 'KS', lat: 38.70, lng: -98.28, radiusKm: 5, npsCode: '', type: 'state' },

  // Kentucky
  { id: 'sp_ky_1', name: 'Natural Bridge State Resort Park', state: 'KY', lat: 37.77, lng: -83.68, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_ky_2', name: 'Cumberland Falls State Resort Park', state: 'KY', lat: 36.84, lng: -84.35, radiusKm: 10, npsCode: '', type: 'state' },

  // Louisiana
  { id: 'sp_la_1', name: 'Fontainebleau State Park', state: 'LA', lat: 30.38, lng: -90.05, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_la_2', name: 'Chicot State Park', state: 'LA', lat: 30.78, lng: -92.30, radiusKm: 12, npsCode: '', type: 'state' },

  // Maine
  { id: 'sp_me_1', name: 'Baxter State Park', state: 'ME', lat: 46.11, lng: -68.92, radiusKm: 50, npsCode: '', type: 'state' },
  { id: 'sp_me_2', name: 'Sebago Lake State Park', state: 'ME', lat: 43.89, lng: -70.55, radiusKm: 10, npsCode: '', type: 'state' },

  // Maryland
  { id: 'sp_md_1', name: 'Assateague State Park', state: 'MD', lat: 38.22, lng: -75.15, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_md_2', name: 'Cunningham Falls State Park', state: 'MD', lat: 39.63, lng: -77.46, radiusKm: 10, npsCode: '', type: 'state' },

  // Massachusetts
  { id: 'sp_ma_1', name: 'Mount Greylock State Reservation', state: 'MA', lat: 42.63, lng: -73.17, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_ma_2', name: 'Walden Pond State Reservation', state: 'MA', lat: 42.44, lng: -71.34, radiusKm: 5, npsCode: '', type: 'state' },

  // Michigan
  { id: 'sp_mi_1', name: 'Pictured Rocks National Lakeshore (State)', state: 'MI', lat: 46.55, lng: -86.24, radiusKm: 40, npsCode: '', type: 'state' },
  { id: 'sp_mi_2', name: 'Sleeping Bear Dunes Nat\'l Lakeshore', state: 'MI', lat: 44.87, lng: -86.06, radiusKm: 30, npsCode: '', type: 'state' },
  { id: 'sp_mi_3', name: 'Tahquamenon Falls State Park', state: 'MI', lat: 46.59, lng: -85.24, radiusKm: 15, npsCode: '', type: 'state' },

  // Minnesota
  { id: 'sp_mn_1', name: 'Itasca State Park', state: 'MN', lat: 47.23, lng: -95.20, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_mn_2', name: 'Tettegouche State Park', state: 'MN', lat: 47.35, lng: -91.21, radiusKm: 15, npsCode: '', type: 'state' },

  // Mississippi
  { id: 'sp_ms_1', name: 'Gulf Islands National Seashore (State)', state: 'MS', lat: 30.36, lng: -89.07, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_ms_2', name: 'Natchez Trace State Park', state: 'MS', lat: 35.39, lng: -88.33, radiusKm: 15, npsCode: '', type: 'state' },

  // Missouri
  { id: 'sp_mo_1', name: 'Ha Ha Tonka State Park', state: 'MO', lat: 37.98, lng: -92.77, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_mo_2', name: 'Johnson\'s Shut-Ins State Park', state: 'MO', lat: 37.55, lng: -90.85, radiusKm: 10, npsCode: '', type: 'state' },

  // Montana
  { id: 'sp_mt_1', name: 'Makoshika State Park', state: 'MT', lat: 47.09, lng: -104.68, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_mt_2', name: 'Flathead Lake State Park', state: 'MT', lat: 47.88, lng: -114.08, radiusKm: 20, npsCode: '', type: 'state' },

  // Nebraska
  { id: 'sp_ne_1', name: 'Chimney Rock (State Hist)', state: 'NE', lat: 41.70, lng: -103.35, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_ne_2', name: 'Fort Robinson State Park', state: 'NE', lat: 42.69, lng: -103.46, radiusKm: 15, npsCode: '', type: 'state' },

  // Nevada
  { id: 'sp_nv_1', name: 'Valley of Fire State Park', state: 'NV', lat: 36.47, lng: -114.52, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_nv_2', name: 'Lake Tahoe Nevada State Park', state: 'NV', lat: 39.22, lng: -119.94, radiusKm: 15, npsCode: '', type: 'state' },

  // New Hampshire
  { id: 'sp_nh_1', name: 'Franconia Notch State Park', state: 'NH', lat: 44.14, lng: -71.68, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_nh_2', name: 'Mount Washington State Park', state: 'NH', lat: 44.27, lng: -71.30, radiusKm: 12, npsCode: '', type: 'state' },

  // New Jersey
  { id: 'sp_nj_1', name: 'High Point State Park', state: 'NJ', lat: 41.32, lng: -74.66, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_nj_2', name: 'Island Beach State Park', state: 'NJ', lat: 39.92, lng: -74.09, radiusKm: 12, npsCode: '', type: 'state' },

  // New Mexico
  { id: 'sp_nm_1', name: 'Bottomless Lakes State Park', state: 'NM', lat: 33.33, lng: -104.35, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_nm_2', name: 'Elephant Butte Lake State Park', state: 'NM', lat: 33.14, lng: -107.20, radiusKm: 15, npsCode: '', type: 'state' },

  // New York
  { id: 'sp_ny_1', name: 'Watkins Glen State Park', state: 'NY', lat: 42.38, lng: -76.87, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_ny_2', name: 'Letchworth State Park', state: 'NY', lat: 42.57, lng: -78.05, radiusKm: 20, npsCode: '', type: 'state' },
  { id: 'sp_ny_3', name: 'Catskill Center (State Forest)', state: 'NY', lat: 42.09, lng: -74.49, radiusKm: 30, npsCode: '', type: 'state' },

  // North Carolina
  { id: 'sp_nc_1', name: 'Hanging Rock State Park', state: 'NC', lat: 36.39, lng: -80.27, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_nc_2', name: 'Crowders Mountain State Park', state: 'NC', lat: 35.21, lng: -81.30, radiusKm: 10, npsCode: '', type: 'state' },

  // North Dakota
  { id: 'sp_nd_1', name: 'Fort Ransom State Park', state: 'ND', lat: 46.52, lng: -97.93, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_nd_2', name: 'Icelandic State Park', state: 'ND', lat: 48.77, lng: -97.74, radiusKm: 8, npsCode: '', type: 'state' },

  // Ohio
  { id: 'sp_oh_1', name: 'Hocking Hills State Park', state: 'OH', lat: 39.43, lng: -82.54, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_oh_2', name: 'Mohican State Park', state: 'OH', lat: 40.61, lng: -82.31, radiusKm: 12, npsCode: '', type: 'state' },

  // Oklahoma
  { id: 'sp_ok_1', name: 'Beavers Bend State Park', state: 'OK', lat: 34.13, lng: -94.68, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_ok_2', name: 'Robbers Cave State Park', state: 'OK', lat: 34.83, lng: -95.37, radiusKm: 10, npsCode: '', type: 'state' },

  // Oregon
  { id: 'sp_or_1', name: 'Silver Falls State Park', state: 'OR', lat: 44.87, lng: -122.64, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_or_2', name: 'Cape Lookout State Park', state: 'OR', lat: 45.35, lng: -123.97, radiusKm: 10, npsCode: '', type: 'state' },

  // Pennsylvania
  { id: 'sp_pa_1', name: 'Ricketts Glen State Park', state: 'PA', lat: 41.32, lng: -76.27, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_pa_2', name: 'Delaware Water Gap (State)', state: 'PA', lat: 41.00, lng: -75.14, radiusKm: 15, npsCode: '', type: 'state' },

  // Rhode Island
  { id: 'sp_ri_1', name: 'Colt State Park', state: 'RI', lat: 41.70, lng: -71.26, radiusKm: 5, npsCode: '', type: 'state' },
  { id: 'sp_ri_2', name: 'Brenton Point State Park', state: 'RI', lat: 41.47, lng: -71.35, radiusKm: 5, npsCode: '', type: 'state' },

  // South Carolina
  { id: 'sp_sc_1', name: 'Table Rock State Park', state: 'SC', lat: 35.03, lng: -82.70, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_sc_2', name: 'Huntington Beach State Park', state: 'SC', lat: 33.52, lng: -79.07, radiusKm: 10, npsCode: '', type: 'state' },

  // South Dakota
  { id: 'sp_sd_1', name: 'Custer State Park', state: 'SD', lat: 43.73, lng: -103.49, radiusKm: 30, npsCode: '', type: 'state' },
  { id: 'sp_sd_2', name: 'Palisades State Park', state: 'SD', lat: 43.71, lng: -96.66, radiusKm: 8, npsCode: '', type: 'state' },

  // Tennessee
  { id: 'sp_tn_1', name: 'Fall Creek Falls State Park', state: 'TN', lat: 35.66, lng: -85.36, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_tn_2', name: 'Frozen Head State Park', state: 'TN', lat: 36.12, lng: -84.45, radiusKm: 12, npsCode: '', type: 'state' },

  // Texas
  { id: 'sp_tx_1', name: 'Garner State Park', state: 'TX', lat: 29.59, lng: -99.75, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_tx_2', name: 'Enchanted Rock State Natural Area', state: 'TX', lat: 30.50, lng: -98.82, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_tx_3', name: 'Pedernales Falls State Park', state: 'TX', lat: 30.31, lng: -98.26, radiusKm: 10, npsCode: '', type: 'state' },

  // Utah
  { id: 'sp_ut_1', name: 'Goblin Valley State Park', state: 'UT', lat: 38.57, lng: -110.71, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_ut_2', name: 'Snow Canyon State Park', state: 'UT', lat: 37.22, lng: -113.65, radiusKm: 10, npsCode: '', type: 'state' },

  // Vermont
  { id: 'sp_vt_1', name: 'Quechee State Park', state: 'VT', lat: 43.64, lng: -72.42, radiusKm: 8, npsCode: '', type: 'state' },
  { id: 'sp_vt_2', name: 'Groton State Forest', state: 'VT', lat: 44.35, lng: -72.27, radiusKm: 15, npsCode: '', type: 'state' },

  // Virginia
  { id: 'sp_va_1', name: 'Grayson Highlands State Park', state: 'VA', lat: 36.64, lng: -81.51, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_va_2', name: 'First Landing State Park', state: 'VA', lat: 36.91, lng: -76.02, radiusKm: 10, npsCode: '', type: 'state' },

  // Washington
  { id: 'sp_wa_1', name: 'Moran State Park', state: 'WA', lat: 48.65, lng: -122.83, radiusKm: 15, npsCode: '', type: 'state' },
  { id: 'sp_wa_2', name: 'Palouse Falls State Park', state: 'WA', lat: 46.66, lng: -118.23, radiusKm: 8, npsCode: '', type: 'state' },

  // West Virginia
  { id: 'sp_wv_1', name: 'Blackwater Falls State Park', state: 'WV', lat: 39.11, lng: -79.49, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_wv_2', name: 'Seneca Rocks State Park', state: 'WV', lat: 38.83, lng: -79.37, radiusKm: 10, npsCode: '', type: 'state' },

  // Wisconsin
  { id: 'sp_wi_1', name: 'Devil\'s Lake State Park', state: 'WI', lat: 43.43, lng: -89.73, radiusKm: 12, npsCode: '', type: 'state' },
  { id: 'sp_wi_2', name: 'Peninsula State Park', state: 'WI', lat: 45.14, lng: -87.24, radiusKm: 12, npsCode: '', type: 'state' },

  // Wyoming
  { id: 'sp_wy_1', name: 'Sinks Canyon State Park', state: 'WY', lat: 42.76, lng: -108.84, radiusKm: 10, npsCode: '', type: 'state' },
  { id: 'sp_wy_2', name: 'Guernsey State Park', state: 'WY', lat: 42.27, lng: -104.74, radiusKm: 10, npsCode: '', type: 'state' },

  // District of Columbia
  { id: 'sp_dc_1', name: 'Rock Creek Park (DC)', state: 'DC', lat: 38.95, lng: -77.05, radiusKm: 8, npsCode: '', type: 'state' },
];

import { Unit, AmenityType } from '@/types';

function generateUnits(): Unit[] {
  const units: Unit[] = [];
  let unitIndex = 1;

  const baseFor1695 = 1940000;
  const baseFor1870 = 2150000;

  for (const tower of ['A', 'B'] as const) {
    for (let floor = 5; floor <= 50; floor++) {
      for (const facing of ['EAST', 'WEST'] as const) {
        for (const size of [1695, 1870] as const) {
          if (unitIndex > 228) break;

          const basePrice = size === 1695 ? baseFor1695 : baseFor1870;
          const floorPremium = floor > 40 ? basePrice * 0.05 : floor > 30 ? basePrice * 0.02 : 0;
          const facingPremium = facing === 'EAST' ? basePrice * 0.02 : 0;
          const finalPrice = basePrice + floorPremium + facingPremium;
          const gst = finalPrice * 0.05;

          const expectedRental = size === 1695 ? 45000 + floor * 100 : 55000 + floor * 120;
          const roiPercentage = ((expectedRental * 12) / (finalPrice + gst)) * 100;

          units.push({
            id: `${tower}-${floor}${facing === 'EAST' ? 'E' : 'W'}-${size}`,
            tower,
            floor,
            facing,
            size,
            basePrice: Math.round(finalPrice),
            gst: Math.round(gst),
            totalPrice: Math.round(finalPrice + gst),
            available: Math.random() > 0.7,
            expectedRental: Math.round(expectedRental),
            roiPercentage: Math.round(roiPercentage * 10) / 10,
          });

          unitIndex++;
        }
      }
    }
  }

  return units;
}

export const ASBL_LOFT_DATA = {
  project: {
    name: 'ASBL LOFT',
    location: 'Financial District, Gachibowli, Hyderabad',
    type: '3BHK Exclusive Residences',
    handover: '2026-12-01',
    launched: '2023-08-01',
    rera: 'P02400006761',
    buildingPermit: '057423/ZOA/R1/U6/HMDA/21102022',
    towerCount: 2,
    floors: 'G+45',
    totalUnits: 894,
    soldUnits: 666,
    availableUnits: 228,
    clubhouseSqft: 55000,
    developer: 'Ashoka Builders India Pvt. Ltd.',
    salesEmail: 'sales@asbl.in',
    mortgagePartner: 'Bajaj Housing Finance Ltd.',
  },

  pricing: {
    minBasePrice: 8000,
    maxBasePrice: 12000,
    gstRate: 5,
    baseFor1695: 1940000,
    baseFor1870: 2150000,
  },

  specifications: {
    structure: 'RCC Shear Wall (Zone 2 Seismic)',
    flooring: {
      living: '800x800mm double-charged vitrified',
      bathroom: '600x1200mm anti-skid matte',
      balcony: 'wood-finish vitrified',
    },
    doors: 'Teak wood main door, UPVC balcony sliding',
    kitchen: 'Full power outlets for appliances',
    plumbing: 'Grohe equivalent fittings, Duravit sanitary',
    electrical: 'Legrand/Schneider concealed wiring',
    lifts: 'Kone equivalent, 10 passenger + 2 service per tower',
    power: '100% DG backup',
    lpg: 'Piped from centralized bank',
    water: 'WTP + STP treatment, rainwater harvesting',
    ev: 'EV charging points in basement',
  },

  amenities: [
    { name: 'Swimming Pool', category: 'CLUBHOUSE', tenantAppealing: true, familyFriendly: true },
    { name: 'Gym & Fitness', category: 'CLUBHOUSE', tenantAppealing: true, familyFriendly: false },
    { name: 'Squash Court', category: 'CLUBHOUSE', tenantAppealing: false, familyFriendly: false },
    { name: '3 Badminton Courts', category: 'CLUBHOUSE', tenantAppealing: false, familyFriendly: true },
    { name: 'Co-working Space', category: 'CLUBHOUSE', tenantAppealing: true, familyFriendly: false },
    { name: 'Yoga & Calisthenics', category: 'CLUBHOUSE', tenantAppealing: true, familyFriendly: true },
    { name: 'Creche & Learning Center', category: 'CLUBHOUSE', tenantAppealing: false, familyFriendly: true },
    { name: 'Jogging & Cycling Loop', category: 'LANDSCAPE', tenantAppealing: true, familyFriendly: true },
    { name: 'Childrens Play Area', category: 'LANDSCAPE', tenantAppealing: false, familyFriendly: true },
    { name: 'Senior Reflexology Walk', category: 'LANDSCAPE', tenantAppealing: false, familyFriendly: false },
    { name: 'Pet Park', category: 'LANDSCAPE', tenantAppealing: false, familyFriendly: true },
    { name: 'Basketball Court', category: 'LANDSCAPE', tenantAppealing: true, familyFriendly: true },
    { name: '24/7 Security & CCTV', category: 'SECURITY', tenantAppealing: true, familyFriendly: true },
    { name: 'Gated Community', category: 'SECURITY', tenantAppealing: true, familyFriendly: true },
    { name: 'High-Speed Internet', category: 'CONNECTIVITY', tenantAppealing: true, familyFriendly: false },
  ] as AmenityType[],

  nearbyLocations: {
    HITEC: { distance: 14, professionals: 50000 },
    GACHIBOWLI: { distance: 18, professionals: 35000 },
    RAIDURG: { distance: 22, professionals: 25000 },
    AIRPORT: { distance: 28, name: 'Rajiv Gandhi International' },
  },

  units: generateUnits(),
};

export const PAYMENT_STRUCTURES = {
  otherBanks: {
    booking: 0.1,
    installment1: 0.575,
    installment2: 0.225,
    installment3: 0.05,
    handover: 0.05,
  },
  bajaj: {
    booking: 0.0551,
    installment1: 0.6235,
    installment2: 0.225,
    installment3: 0.05,
    handover: 0.0465,
  },
};

export const LOCATION_KEYWORDS = {
  hitec: ['HITEC', 'hitec', 'hitech'],
  gachibowli: ['GACHIBOWLI', 'gachibowli'],
  raidurg: ['RAIDURG', 'raidurg'],
  fd: ['FD', 'Financial District'],
};

export interface RoomDimension {
  name: string;
  ft: string;
  sqft: number;
  note?: string;
}

export const UNIT_LAYOUTS: Record<1695 | 1870, {
  area: string;
  balcony: { sqft: number; label: string; note: string };
  rooms: RoomDimension[];
  bathrooms: number;
  bestFor: string;
}> = {
  1695: {
    area: '1,695 sqft carpet + common',
    balcony: { sqft: 125, label: '125 sqft outdoor living balcony', note: 'Off the living room' },
    bathrooms: 2,
    bestFor: 'Family of 4 · occasional guests',
    rooms: [
      { name: 'Living + Dining', ft: "18' × 22'", sqft: 396, note: 'Opens to east-facing balcony' },
      { name: 'Master bedroom', ft: "14' × 16'", sqft: 224, note: 'En-suite bath + wardrobe alcove' },
      { name: 'Bedroom 2', ft: "12' × 12'", sqft: 144 },
      { name: 'Bedroom 3', ft: "11' × 12'", sqft: 132 },
      { name: 'Kitchen', ft: "10' × 13'", sqft: 130, note: 'L-shape, dishwasher + microwave outlets' },
      { name: 'Master bath', ft: "8' × 5'", sqft: 40 },
      { name: 'Shared bath', ft: "10' × 5'", sqft: 50 },
      { name: 'Utility', ft: "6' × 13'", sqft: 78, note: 'Washer + dryer stack' },
      { name: 'Foyer', ft: "10' × 9'", sqft: 90 },
    ],
  },
  1870: {
    area: '1,870 sqft carpet + common',
    balcony: { sqft: 260, label: '260 sqft wrap balcony', note: 'Wraps living + master. Table for 6 + swing chair' },
    bathrooms: 2.5,
    bestFor: 'Family of 4 + home office · extended family stays',
    rooms: [
      { name: 'Living + Dining', ft: "20' × 24'", sqft: 480, note: '10 ft ceiling; balcony wraps east + north' },
      { name: 'Master suite', ft: "16' × 13'", sqft: 208, note: 'Walk-in closet + en-suite bath' },
      { name: 'Bedroom 2 + study nook', ft: "12' × 11'", sqft: 132, note: 'Window desk alcove built-in' },
      { name: 'Guest / Office', ft: "11' × 10'", sqft: 110, note: 'Adjacent half-bath; zoom-ready backdrop' },
      { name: 'Kitchen', ft: "11' × 14'", sqft: 154, note: 'U-shape; island prep space' },
      { name: 'Master bath', ft: "9' × 6'", sqft: 54 },
      { name: 'Shared bath', ft: "10' × 5'", sqft: 50 },
      { name: 'Half bath (office)', ft: "6' × 4'", sqft: 24 },
      { name: 'Utility', ft: "6' × 14'", sqft: 84 },
      { name: 'Foyer', ft: "10' × 10'", sqft: 100 },
    ],
  },
};

export const SPEC_PACK = {
  flooring: {
    living: '800×800 mm double-charged vitrified, matte',
    bedrooms: '600×600 mm glazed vitrified',
    bathroom: '600×1200 mm anti-skid matte',
    balcony: 'Wood-finish vitrified, outdoor-grade',
  },
  doors: {
    main: 'Teak wood, concealed hinge, soft-close',
    internal: 'Flush veneer, matching hardware',
    balcony: 'UPVC triple-glazed sliding (34 dB cut)',
  },
  fittings: {
    plumbing: 'Grohe equivalent, concealed',
    sanitary: 'Duravit equivalent',
    electrical: 'Legrand / Schneider modular',
  },
  kitchen: {
    counter: '20 mm granite + backsplash',
    outlets: 'Pre-wired for dishwasher, microwave, coffee machine, RO',
    plumbing: 'Water purifier connect + hood vent line',
  },
  parking: '2 covered bays per unit · EV charge outlet provided',
  security: 'Triple-layer: gate, tower lobby card, apartment BOLT lock',
};

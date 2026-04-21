import { getDb, hasMongo } from './mongo';
import { COLLECTIONS, UnitDoc } from './schemas';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';
import type { Unit } from '@/types';

export interface UnitQuery {
  tower?: 'A' | 'B';
  facing?: 'EAST' | 'WEST';
  size?: 1695 | 1870;
  minFloor?: number;
  maxFloor?: number;
  availableOnly?: boolean;
  limit?: number;
  sort?: 'yield' | 'rent' | 'price' | 'floor';
}

function docToUnit(d: UnitDoc): Unit {
  return {
    id: d.unitId,
    tower: d.tower,
    floor: d.floor,
    facing: d.facing,
    size: d.size,
    basePrice: d.basePrice,
    gst: d.gst,
    totalPrice: d.totalPrice,
    available: d.available,
    expectedRental: d.expectedRental,
    roiPercentage: d.roiPercentage,
  };
}

function applyQuery(units: Unit[], q: UnitQuery): Unit[] {
  let r = units.slice();
  if (q.tower) r = r.filter((u) => u.tower === q.tower);
  if (q.facing) r = r.filter((u) => u.facing === q.facing);
  if (q.size) r = r.filter((u) => u.size === q.size);
  if (q.minFloor != null) r = r.filter((u) => u.floor >= q.minFloor!);
  if (q.maxFloor != null) r = r.filter((u) => u.floor <= q.maxFloor!);
  if (q.availableOnly) r = r.filter((u) => u.available);
  r.sort((a, b) => {
    if (q.sort === 'yield') return b.roiPercentage - a.roiPercentage;
    if (q.sort === 'rent') return b.expectedRental - a.expectedRental;
    if (q.sort === 'price') return a.totalPrice - b.totalPrice;
    return b.floor - a.floor;
  });
  if (q.limit) r = r.slice(0, q.limit);
  return r;
}

export async function findUnits(q: UnitQuery = {}): Promise<Unit[]> {
  if (!hasMongo()) return applyQuery(ASBL_LOFT_DATA.units, q);

  try {
    const db = await getDb();
    const docs = await db
      .collection<UnitDoc>(COLLECTIONS.units)
      .find({})
      .toArray();
    if (docs.length === 0) return applyQuery(ASBL_LOFT_DATA.units, q);
    return applyQuery(docs.map(docToUnit), q);
  } catch (err) {
    console.error('[db/units] fallback to in-memory:', err);
    return applyQuery(ASBL_LOFT_DATA.units, q);
  }
}

export async function findUnitById(unitId: string): Promise<Unit | null> {
  if (hasMongo()) {
    try {
      const db = await getDb();
      const doc = await db
        .collection<UnitDoc>(COLLECTIONS.units)
        .findOne({ unitId });
      if (doc) return docToUnit(doc);
    } catch (err) {
      console.error('[db/units] fallback to in-memory:', err);
    }
  }
  return ASBL_LOFT_DATA.units.find((u) => u.id === unitId) ?? null;
}

export async function countAvailable(): Promise<number> {
  if (!hasMongo()) {
    return ASBL_LOFT_DATA.units.filter((u) => u.available).length;
  }
  try {
    const db = await getDb();
    return await db
      .collection<UnitDoc>(COLLECTIONS.units)
      .countDocuments({ available: true });
  } catch {
    return ASBL_LOFT_DATA.units.filter((u) => u.available).length;
  }
}

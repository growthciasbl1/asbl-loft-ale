export interface SearchIntent {
  rawQuery: string;
  size?: string;
  budget?: string;
  purpose?: string;
  location?: string;
  features: string[];
  facing?: string;
  timeline?: string;
}

export interface ConfidenceScores {
  size: number;
  budget: number;
  purpose: number;
  location: number;
  features: number;
  overall: number;
}

export interface ExtractedData {
  searchIntent: SearchIntent;
  confidence: ConfidenceScores;
  primaryPath: 'INVESTOR' | 'END_USER' | 'NEUTRAL';
  moduleOrder: string[];
}

export interface BehaviorEvent {
  type: 'PLAN_VIEW' | 'SLIDER_MOVE' | 'SPEC_READ' | 'UNIT_SAVE' | 'EXIT_INTENT';
  timestamp: number;
  data: any;
}

export interface LeadScore {
  w2bScore: number;
  r2bScore: number;
  quadrant: 'HW-HR' | 'HW-LR' | 'LW-HR' | 'LW-LR';
  recommendedAction: string;
}

export interface Unit {
  id: string;
  tower: 'A' | 'B';
  floor: number;
  facing: 'EAST' | 'WEST';
  size: 1695 | 1870;
  basePrice: number;
  gst: number;
  totalPrice: number;
  available: boolean;
  expectedRental: number;
  roiPercentage: number;
}

export interface AmenityType {
  name: string;
  category: 'CLUBHOUSE' | 'LANDSCAPE' | 'SECURITY' | 'CONNECTIVITY';
  tenantAppealing: boolean;
  familyFriendly: boolean;
  description?: string;
}

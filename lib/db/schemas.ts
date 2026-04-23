import type { ObjectId } from 'mongodb';

export interface UnitDoc {
  _id?: ObjectId;
  unitId: string;
  tower: 'A' | 'B';
  floor: number;
  facing: 'EAST' | 'WEST';
  size: 1695 | 1870;
  basePrice: number;
  gst: number;
  totalPrice: number;
  available: boolean;
  heldFor?: string | null;
  expectedRental: number;
  roiPercentage: number;
  updatedAt: Date;
}

export interface MediaDoc {
  _id?: ObjectId;
  mediaId: string;
  kind: 'image' | 'video' | 'pdf' | 'embed' | 'audio';
  title: string;
  caption?: string;
  gridFsId?: ObjectId;
  externalUrl?: string;
  mimeType?: string;
  aspect?: string;
  intentTags: string[];
  audienceTags?: string[];
  leadGated?: boolean;
  uploadedAt: Date;
}

export interface LeadBooking {
  type: 'site_visit' | 'call_back';
  slotIsoLocal: string;
  timezone: string;
  timezoneDetected: string;
  timezoneUserOverridden: boolean;
}

export interface LeadGeo {
  lat: number;
  lng: number;
  accuracy: number;
  timezone?: string;
}

export interface LeadDoc {
  _id?: ObjectId;
  name: string;
  phone: string;
  email?: string;
  reason?: string;
  initialQuery?: string;
  currentQuery?: string;
  // Attribution — reconciled across form input, client tracker, and the
  // visitors collection's first-touch/last-touch record
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPath?: string;
  firstPageVisited?: string;
  lastPageVisited?: string;
  totalPageViews?: number;
  timeSpentMinutes?: number;
  preferredChannel?: 'whatsapp' | 'call';
  booking?: LeadBooking | null;
  geo?: LeadGeo | null;
  pinnedUnitIds?: string[];
  conversationId?: string;
  visitorId?: string;
  globalId?: string | null;
  otpVerified?: boolean;
  crmPushedAt?: Date;
  crmResponse?: unknown;
  createdAt: Date;
}

export interface ConversationDoc {
  _id?: ObjectId;
  conversationId: string;
  campaign?: string;
  utmSource?: string;
  messages: {
    role: 'user' | 'bot';
    text: string;
    artifact?: string;
    artifactLabel?: string;
    unitId?: string;
    mediaIds?: string[];
    at: Date;
  }[];
  leadId?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventDoc {
  _id?: ObjectId;
  sessionId: string;
  type: 'view' | 'read' | 'click' | 'submit' | 'focus' | 'error' | 'system';
  name: string;
  props?: Record<string, unknown>;
  path?: string;
  referer?: string;
  utmCampaign?: string | null;
  userAgent?: string;
  ip?: string;
  clientAt: Date;
  serverAt: Date;
}

export const COLLECTIONS = {
  units: 'units',
  media: 'media',
  leads: 'leads',
  conversations: 'conversations',
  events: 'events',
} as const;

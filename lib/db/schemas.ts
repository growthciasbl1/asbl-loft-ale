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

export interface LeadDoc {
  _id?: ObjectId;
  name: string;
  phone: string;
  email?: string;
  reason?: string;
  initialQuery?: string;
  currentQuery?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  pinnedUnitIds?: string[];
  conversationId?: string;
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

export const COLLECTIONS = {
  units: 'units',
  media: 'media',
  leads: 'leads',
  conversations: 'conversations',
} as const;

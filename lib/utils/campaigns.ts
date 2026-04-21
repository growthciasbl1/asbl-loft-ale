export type CampaignKey = 'yield' | 'life' | 'trends' | 'why_fd' | 'inventory' | 'default';

export interface CampaignMeta {
  key: CampaignKey;
  source: string;
  medium: string;
  campaign: string;
  pill: string;
  shortLabel: string;
  prefilledQuery: string;
}

export const CAMPAIGNS: Record<CampaignKey, CampaignMeta> = {
  yield: {
    key: 'yield',
    source: 'google',
    medium: 'cpc',
    campaign: 'rental_yield_fd',
    pill: 'From Google Ads · Rental Yield campaign',
    shortLabel: 'Rental Yield · Google Ads',
    prefilledQuery: "What's the rental yield I can expect on a 3BHK at ASBL Loft?",
  },
  life: {
    key: 'life',
    source: 'instagram',
    medium: 'paid_social',
    campaign: 'life_mornings',
    pill: 'From Instagram · Mornings at Loft reel',
    shortLabel: 'Life at Loft · Instagram',
    prefilledQuery: 'Show me what life at ASBL Loft actually looks like.',
  },
  trends: {
    key: 'trends',
    source: 'email',
    medium: 'crm',
    campaign: 'price_trends_q4',
    pill: 'From Email · Q4 Price Watchlist',
    shortLabel: 'Price Trends · Email',
    prefilledQuery: 'How have 3BHK prices in Financial District moved over the last 3 years?',
  },
  why_fd: {
    key: 'why_fd',
    source: 'google',
    medium: 'organic',
    campaign: 'why_financial_district',
    pill: 'From Organic search · FD vs Gachibowli',
    shortLabel: 'Why FD · Organic',
    prefilledQuery: 'Why should I buy in Financial District instead of Gachibowli or Kokapet?',
  },
  inventory: {
    key: 'inventory',
    source: 'direct',
    medium: 'referral',
    campaign: 'inventory_live',
    pill: 'From WhatsApp · Live inventory update',
    shortLabel: 'Live Inventory',
    prefilledQuery: 'Show me available units with east-facing on higher floors.',
  },
  default: {
    key: 'default',
    source: '',
    medium: '',
    campaign: '',
    pill: 'ASBL Loft · Financial District, Hyderabad',
    shortLabel: 'Session',
    prefilledQuery: '',
  },
};

export function campaignFromParams(params: URLSearchParams): CampaignMeta {
  const c = params.get('utm_campaign');
  if (!c) return CAMPAIGNS.default;

  if (c.includes('yield') || c.includes('rental')) return CAMPAIGNS.yield;
  if (c.includes('life') || c.includes('morning')) return CAMPAIGNS.life;
  if (c.includes('trend') || c.includes('price')) return CAMPAIGNS.trends;
  if (c.includes('financial_district') || c.includes('why_fd')) return CAMPAIGNS.why_fd;
  if (c.includes('inventory')) return CAMPAIGNS.inventory;
  return CAMPAIGNS.default;
}

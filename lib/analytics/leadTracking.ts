/**
 * Read the ASBL web-tracker's localStorage blob so we can forward it to our
 * /api/webhook which in turn hands it to Zoho CRM. The tracker script is
 * loaded globally from https://asbl-crm-api.vercel.app/tracker.js via <head>
 * and writes under the key `asbl_track`.
 *
 * Shape (all optional — tracker fills blanks as the visitor moves):
 *   {
 *     utm_source, utm_medium, utm_campaign, utm_content, utm_term,
 *     first_page_visited, last_page_visited, total_page_views,
 *     referrer_url, time_spent_minutes
 *   }
 */

export interface WebTrackerPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_page_visited?: string;
  last_page_visited?: string;
  total_page_views?: number;
  referrer_url?: string;
  time_spent_minutes?: number;
}

const STORAGE_KEY = 'asbl_track';

export function readWebTracker(): WebTrackerPayload {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as WebTrackerPayload;
  } catch {
    return {};
  }
}

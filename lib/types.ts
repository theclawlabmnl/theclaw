export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  service_variations?: ServiceVariation[];
};
export type ServiceVariation = {
  id: string;
  service_id?: string;
  name: string;
  price_delta: number;
  duration_delta_minutes: number;
  active: boolean;
  sort_order: number;
};
export type BookingItem = {
  service_id: string;
  service_name: string;
  variation_id?: string;
  variation_name?: string;
  price: number;
  duration_minutes: number;
};
export type BookingDraft = {
  customer_name: string;
  mobile_number: string;
  social_handle: string;
  preferred_date: string;
  preferred_time: string;
  removal: string;
  promo_id?: string;
  notes: string;
  terms_accepted: boolean;
  inspiration_files: string[];
  services: BookingItem[];
};

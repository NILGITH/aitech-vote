export type Role = "super_admin" | "organizer" | "jury";
export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  organization_name: string | null;
  role: Role;
  status: "pending" | "active" | "suspended";
  created_at: string;
};

export type Mode = "paid" | "free" | "jury" | "election" | "live";
export type EventStatus = "draft" | "pending_review" | "published" | "closed" | "archived";
export type Pack = { votes: number; bonus: number };

export type EventRow = {
  id: string;
  organizer_id: string;
  slug: string;
  short_code: string | null;
  title: string;
  description: string | null;
  event_type: "awards" | "beauty" | "talent" | "election" | "other";
  cover_url: string | null;
  location: string | null;
  starts_at: string | null;
  vote_opens_at: string | null;
  vote_closes_at: string | null;
  status: EventStatus;
  modes: Mode[];
  jury_weight: number;
  price_per_vote_xof: number;
  packs: Pack[];
  require_otp: boolean;
  free_votes_per_day: number;
  max_paid_votes_per_hour: number;
  show_live_results: boolean;
  primary_color: string | null;
  created_at: string;
};

export type Category = { id: string; event_id: string; name: string; description: string | null; max_choices: number; position: number };

export type ConsentStatus = "not_sent" | "pending" | "accepted" | "refused" | "bounced" | "withdrawn";
export type Candidate = {
  id: string;
  event_id: string;
  category_id: string;
  code: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  video_url: string | null;
  social: Record<string, string>;
  position: number;
  consent_status: ConsentStatus;
  is_published: boolean;
};

export type CandidateStat = { candidate_id: string; event_id: string; category_id: string; paid_votes: number; free_votes: number; total_votes: number };

export type Theme = { primary: string; accent: string; ink: string; headingFont: string; radius: number; animation: "none" | "soft" | "dynamic" };
export type HomeSection = { key: string; label: string; visible: boolean };
export type SiteSettings = {
  theme: Theme;
  home_sections: HomeSection[];
  modules: Record<string, boolean>;
  payment_methods: Record<string, boolean>;
  content: { heroTitle?: string; heroHighlight?: string; heroText?: string; [k: string]: unknown };
};

export type Plan = {
  id: string;
  slug: string;
  name: string;
  price_xof: number;
  commission_pct: number;
  max_events_month: number;
  max_candidates: number;
  features: string[];
  is_visible: boolean;
  display_order: number;
};

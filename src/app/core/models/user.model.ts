export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number; // timestamp ms
}

export interface StripeSubscription {
  id: string;
  status: SubscriptionStatus;
  priceId: string;
  productId: string;
  currentPeriodStart: number; // timestamp seconds
  currentPeriodEnd: number;   // timestamp seconds
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
}

export interface StripeProduct {
  id: string;
  active: boolean;
  name: string;
  description: string;
  metadata: Record<string, string>;
  images: string[];
}

export interface StripePrice {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  type: string;
  interval: 'month' | 'year';
  interval_count: number;
  product: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number; // timestamp seconds
}

export interface CheckoutSession {
  id?: string;
  price: string;
  success_url: string;
  cancel_url: string;
  allow_promotion_codes?: boolean;
  trial_from_plan?: boolean;
  metadata?: Record<string, unknown>;
  // Escritos por la extensión Stripe
  sessionId?: string;
  url?: string;
  error?: { message: string };
  cancelled?: boolean;
}

export interface UserProfile {
  id: number;
  mocha_user_id: string;
  cpf: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Affiliate {
  id: number;
  full_name: string;
  email: string;
  cpf: string;
  phone: string;
  referral_code: string;
  sponsor_referral_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  created_at: string;
}

export interface CashMaisUser {
  id: number;
  full_name: string;
  email: string;
  cpf: string;
  role: string;
}
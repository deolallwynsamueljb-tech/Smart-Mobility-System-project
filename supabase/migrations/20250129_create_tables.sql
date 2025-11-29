-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin_coords JSONB,
  destination_coords JSONB,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('metro', 'bus', 'train', 'mixed')),
  duration TEXT NOT NULL,
  distance NUMERIC,
  fare NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'upcoming')),
  route_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create saved_places table
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'work', 'favorite')),
  coordinates JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create wallet table
CREATE TABLE IF NOT EXISTS public.wallet (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0 NOT NULL CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallet(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount TEXT NOT NULL,
  discount_amount NUMERIC,
  discount_percentage NUMERIC,
  valid_until DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('metro', 'bus', 'train', 'all')),
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notifications BOOLEAN DEFAULT true,
  email_updates BOOLEAN DEFAULT false,
  sms_alerts BOOLEAN DEFAULT true,
  location_tracking BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  auto_refresh BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card', 'upi', 'netbanking')),
  last_four TEXT,
  card_type TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON public.bookings
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for saved_places
CREATE POLICY "Users can view own saved places" ON public.saved_places
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved places" ON public.saved_places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved places" ON public.saved_places
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved places" ON public.saved_places
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for wallet
CREATE POLICY "Users can view own wallet" ON public.wallet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallet
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.wallet
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for wallet_transactions
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for offers (all users can view active offers)
CREATE POLICY "Anyone can view active offers" ON public.offers
  FOR SELECT USING (is_active = true);

-- Create policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for payment_methods
CREATE POLICY "Users can view own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON public.payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_date ON public.bookings(date DESC);
CREATE INDEX idx_saved_places_user_id ON public.saved_places(user_id);
CREATE INDEX idx_wallet_user_id ON public.wallet(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_offers_valid_until ON public.offers(valid_until);
CREATE INDEX idx_offers_is_active ON public.offers(is_active);

-- Create function to automatically create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallet (user_id, balance)
  VALUES (NEW.id, 0);

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample offers
INSERT INTO public.offers (title, description, code, discount, discount_percentage, valid_until, type, is_active, max_uses)
VALUES
  ('Metro Monday', 'Get 20% off on all metro rides every Monday', 'METRO20', '20% OFF', 20, '2025-12-31', 'metro', true, 1000),
  ('First Ride Free', 'Get your first bus ride free with Chennai Transit', 'FIRST100', '100% OFF', 100, '2025-12-15', 'bus', true, 500),
  ('Wallet Bonus', 'Add ₹500 or more and get ₹50 cashback', 'WALLET50', '₹50 Cashback', 50, '2025-12-25', 'all', true, 2000),
  ('Weekend Special', 'Get 15% off on all rides during weekends', 'WEEKEND15', '15% OFF', 15, '2025-12-31', 'all', true, null)
ON CONFLICT (code) DO NOTHING;

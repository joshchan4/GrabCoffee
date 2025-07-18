# Payment Methods Database Setup

To enable payment method management in your app, you need to create a `payment_methods` table in your Supabase database.

## Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard
   - Go to "SQL Editor" in the left sidebar

2. **Create the payment_methods table**
   - Run the following SQL command:

```sql
-- Create payment_methods table
CREATE TABLE payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'paypal', 'apple_pay')),
  name TEXT NOT NULL,
  last4 TEXT,
  brand TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_methods_updated_at 
  BEFORE UPDATE ON payment_methods 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

3. **Verify the setup**
   - Go to "Table Editor" in the left sidebar
   - You should see the `payment_methods` table
   - Check that RLS is enabled (should show "RLS enabled" badge)

## Table Structure:

- `id`: Unique identifier for each payment method
- `user_id`: Links to the authenticated user
- `type`: Payment method type ('card', 'paypal', 'apple_pay')
- `name`: User-friendly name for the payment method
- `last4`: Last 4 digits of the card (for cards only)
- `brand`: Card brand (Visa, Mastercard, etc.)
- `is_default`: Whether this is the user's default payment method
- `created_at`: When the payment method was added
- `updated_at`: When the payment method was last modified

## Security Features:

- **Row Level Security (RLS)**: Users can only access their own payment methods
- **Cascade Delete**: When a user is deleted, their payment methods are automatically removed
- **Type Validation**: Only valid payment method types are allowed
- **Automatic Timestamps**: Created and updated timestamps are managed automatically

## Usage in App:

Once this table is created, users can:
- Add new payment methods
- Set default payment methods
- Delete payment methods
- View all their saved payment methods

The PaymentInfoScreen will automatically work with this table structure.

## Testing:

After setup, you can test by:
1. Creating a user account
2. Going to Profile → Payment Methods
3. Adding a test payment method
4. Verifying it appears in the list
5. Testing the set default and delete functionality 
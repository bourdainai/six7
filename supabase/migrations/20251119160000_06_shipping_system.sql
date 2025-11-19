-- Create shipping_labels table
CREATE TABLE IF NOT EXISTS shipping_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  carrier VARCHAR(50) NOT NULL,
  service_level VARCHAR(100),
  tracking_number VARCHAR(255) UNIQUE,
  label_url TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipping_events table
CREATE TABLE IF NOT EXISTS shipping_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID REFERENCES shipping_labels(id) NOT NULL,
  status VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see shipping for their orders


-- Create tables
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cuisine_type VARCHAR(100),
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    rating DECIMAL(3,2),
    onboarding_date DATE DEFAULT CURRENT_DATE,
    operating_hours JSONB,  -- Store opening hours for each day
    commission_rate DECIMAL(4,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    registration_date DATE DEFAULT CURRENT_DATE,
    last_order_date DATE,
    total_orders INT DEFAULT 0,
    customer_segment VARCHAR(50) DEFAULT 'new',  -- 'new', 'regular', 'vip', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50),
    joining_date DATE DEFAULT CURRENT_DATE,
    rating DECIMAL(3,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_status_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    restaurant_id INT REFERENCES restaurants(id),
    driver_id INT REFERENCES drivers(id),
    order_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_datetime TIMESTAMP,
    status VARCHAR(50) DEFAULT 'placed',  -- 'placed', 'accepted', 'preparing', 'picked_up', 'delivered', 'cancelled'
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(6,2),
    restaurant_earnings DECIMAL(10,2),
    driver_earnings DECIMAL(6,2),
    platform_fee DECIMAL(6,2),
    payment_method VARCHAR(50),
    rating_restaurant DECIMAL(3,2),
    rating_driver DECIMAL(3,2),
    rating_overall DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_tracking (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    driver_id INT REFERENCES drivers(id),
    status VARCHAR(50) NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL,  -- 'percentage', 'fixed_amount'
    discount_value DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    usage_count INT DEFAULT 0,
    max_usage INT,
    min_order_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_promotions (
    order_id INT REFERENCES orders(id),
    promotion_id INT REFERENCES promotions(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, promotion_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_driver_id ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_datetime ON orders(order_datetime);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_delivery_tracking_order_id ON delivery_tracking(order_id);
CREATE INDEX idx_delivery_tracking_driver_id ON delivery_tracking(driver_id);
CREATE INDEX idx_restaurants_cuisine_type ON restaurants(cuisine_type);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_drivers_is_active ON drivers(is_active);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments on tables
COMMENT ON TABLE restaurants IS 'Stores restaurant information including location and performance metrics';
COMMENT ON TABLE customers IS 'Customer profiles with location and segmentation';
COMMENT ON TABLE drivers IS 'Driver information with real-time location tracking';
COMMENT ON TABLE orders IS 'Central order information with all financial details';
COMMENT ON TABLE order_items IS 'Individual items within each order';
COMMENT ON TABLE delivery_tracking IS 'Tracks driver movement during deliveries';
COMMENT ON TABLE promotions IS 'Promotional campaigns configuration';
COMMENT ON TABLE order_promotions IS 'Links between orders and applied promotions';
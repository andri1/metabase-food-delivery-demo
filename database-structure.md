**Food delivery database schema**

```sql
-- Core Tables
restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    cuisine_type VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    rating DECIMAL(3,2),
    onboarding_date DATE,
    operating_hours JSONB,  -- Store opening hours for each day
    commission_rate DECIMAL(4,2),
    is_active BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    registration_date DATE,
    last_order_date DATE,
    total_orders INT,
    customer_segment VARCHAR(50),  -- 'new', 'regular', 'vip', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    vehicle_type VARCHAR(50),
    joining_date DATE,
    rating DECIMAL(3,2),
    is_active BOOLEAN,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_status_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Transaction Tables
orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    restaurant_id INT REFERENCES restaurants(id),
    driver_id INT REFERENCES drivers(id),
    order_datetime TIMESTAMP,
    delivery_datetime TIMESTAMP,
    status VARCHAR(50),  -- 'placed', 'accepted', 'preparing', 'picked_up', 'delivered', 'cancelled'
    total_amount DECIMAL(10,2),
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
)

order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    item_name VARCHAR(255),
    quantity INT,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Operational Tables
delivery_tracking (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    driver_id INT REFERENCES drivers(id),
    status VARCHAR(50),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timestamp TIMESTAMP
)

promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50),
    discount_type VARCHAR(50),  -- 'percentage', 'fixed_amount'
    discount_value DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    usage_count INT,
    max_usage INT,
    min_order_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

order_promotions (
    order_id INT REFERENCES orders(id),
    promotion_id INT REFERENCES promotions(id),
    discount_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, promotion_id)
)
```

**Structure Explanation:**

1. **Core Tables:**

   - `restaurants`: Stores restaurant information including location and performance metrics
   - `customers`: Customer profiles with location and segmentation
   - `drivers`: Driver information with real-time location tracking

2. **Transaction Tables:**
   - `orders`: Central order information with all financial details
   - `order_items`: Individual items within each order
3. **Operational Tables:**
   - `delivery_tracking`: Tracks driver movement during deliveries
   - `promotions` & `order_promotions`: Manages promotional campaigns

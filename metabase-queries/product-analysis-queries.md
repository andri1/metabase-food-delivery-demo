# Product Analysis Queries
These queries focus on user experience, order flow analysis, feature adoption, and app usage patterns.

## User Experience & Journey Analysis

### 1. Order Flow Analysis
Purpose: Analyze the progression of orders through various statuses.
Key columns: order_datetime, status (placed, accepted, preparing, picked_up, delivered, cancelled)
```sql
WITH order_funnel AS (
    SELECT 
        DATE_TRUNC('day', order_datetime) as order_date,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'placed' THEN 1 END) as placed,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing,
        COUNT(CASE WHEN status = 'picked_up' THEN 1 END) as picked_up,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
    FROM orders
    WHERE order_datetime >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', order_datetime)
)
SELECT 
    order_date,
    total_orders,
    ROUND((delivered::float / NULLIF(placed, 0)) * 100, 2) as completion_rate,
    ROUND((cancelled::float / NULLIF(placed, 0)) * 100, 2) as cancellation_rate,
    ROUND((accepted::float / NULLIF(placed, 0)) * 100, 2) as acceptance_rate,
    ROUND(AVG(picked_up::float / NULLIF(accepted, 0)) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) * 100, 2) as pickup_rate_7day_avg
FROM order_funnel
ORDER BY order_date DESC;
```
This query tracks order progression through different statuses, calculating conversion rates at each stage.

### 2. User Rating Analysis
Purpose: Analyze factors influencing user ratings.
Key columns: rating_overall, delivery_time_mins, total_amount, delivery_fee
```sql
WITH rating_breakdown AS (
    SELECT 
        o.id as order_id,
        o.customer_id,
        o.restaurant_id,
        o.driver_id,
        o.rating_restaurant,
        o.rating_driver,
        o.rating_overall,
        o.total_amount,
        o.delivery_fee,
        EXTRACT(EPOCH FROM (o.delivery_datetime - o.order_datetime))/60 as delivery_time_mins
    FROM orders o
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
    ROUND(rating_overall) as rating_bucket,
    COUNT(*) as order_count,
    ROUND(AVG(delivery_time_mins), 2) as avg_delivery_time,
    ROUND(AVG(total_amount), 2) as avg_order_value,
    ROUND(AVG(delivery_fee), 2) as avg_delivery_fee,
    ROUND(AVG(rating_restaurant), 2) as avg_restaurant_rating,
    ROUND(AVG(rating_driver), 2) as avg_driver_rating,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(DISTINCT restaurant_id) as unique_restaurants,
    COUNT(DISTINCT driver_id) as unique_drivers
FROM rating_breakdown
GROUP BY ROUND(rating_overall)
ORDER BY rating_bucket;
```
This query examines how various factors (delivery time, order value, etc.) correlate with overall user ratings.

### 3. User Session Analysis
Purpose: Analyze user engagement patterns and session frequency.
Key columns: order_datetime, next_order_datetime, total_amount
```sql
WITH order_sessions AS (
    SELECT 
        customer_id,
        order_datetime,
        LEAD(order_datetime) OVER (
            PARTITION BY customer_id 
            ORDER BY order_datetime
        ) as next_order_datetime,
        total_amount,
        status
    FROM orders
    WHERE order_datetime >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
    CASE 
        WHEN EXTRACT(EPOCH FROM (next_order_datetime - order_datetime))/3600 <= 24 THEN 'Same Day'
        WHEN EXTRACT(EPOCH FROM (next_order_datetime - order_datetime))/3600 <= 168 THEN 'Same Week'
        WHEN EXTRACT(EPOCH FROM (next_order_datetime - order_datetime))/3600 <= 720 THEN 'Same Month'
        ELSE 'More Than Month'
    END as reorder_interval,
    COUNT(*) as session_count,
    ROUND(AVG(total_amount), 2) as avg_order_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM order_sessions
WHERE next_order_datetime IS NOT NULL
GROUP BY CASE 
    WHEN EXTRACT(EPOCH FROM (next_order_datetime - order_datetime))/3600 <= 24 THEN 'Same Day'
    WHEN EXTRACT(EPOCH FROM (next_order_datetime - order_datetime))/3600 <= 168 THEN 'Same Week'
    WHEN EXTRACT(EPOCH FROM (next_order_datetime - order_datetime))/3600 <= 720 THEN 'Same Month'
    ELSE 'More Than Month'
END
ORDER BY session_count DESC;
```
This query categorizes the time between user orders to understand engagement frequency and patterns.

### 4. Feature Adoption Analysis
Purpose: Track the adoption and usage of different payment methods.
Key columns: payment_method, usage_count, unique_users, total_processed
```sql
WITH payment_methods AS (
    SELECT 
        DATE_TRUNC('month', order_datetime) as month,
        payment_method,
        COUNT(*) as usage_count,
        COUNT(DISTINCT customer_id) as unique_users,
        SUM(total_amount) as total_processed
    FROM orders
    WHERE status = 'delivered'
    GROUP BY DATE_TRUNC('month', order_datetime), payment_method
),
monthly_totals AS (
    SELECT 
        month,
        SUM(usage_count) as total_orders,
        SUM(unique_users) as total_users
    FROM payment_methods
    GROUP BY month
)
SELECT 
    pm.month,
    pm.payment_method,
    pm.usage_count,
    pm.unique_users,
    ROUND(pm.total_processed, 2) as total_processed,
    ROUND((pm.usage_count::float / mt.total_orders) * 100, 2) as usage_percentage,
    ROUND((pm.unique_users::float / mt.total_users) * 100, 2) as user_adoption_rate
FROM payment_methods pm
JOIN monthly_totals mt ON pm.month = mt.month
ORDER BY pm.month DESC, usage_count DESC;
```
This query analyzes the adoption and usage trends of various payment methods over time.

### 5. User Feedback Analysis
Purpose: Identify and categorize common issues in user experience.
Key columns: rating_restaurant, rating_driver, delivery_datetime, status
```sql
WITH order_issues AS (
    SELECT 
        o.id as order_id,
        o.customer_id,
        o.restaurant_id,
        o.driver_id,
        CASE 
            WHEN o.rating_restaurant < 3 THEN 'Low Restaurant Rating'
            WHEN o.rating_driver < 3 THEN 'Low Driver Rating'
            WHEN (o.delivery_datetime - o.order_datetime) > INTERVAL '1 hour' THEN 'Long Delivery Time'
            WHEN o.status = 'cancelled' THEN 'Cancelled Order'
            ELSE 'No Issues'
        END as issue_type,
        o.total_amount,
        o.order_datetime
    FROM orders o
    WHERE o.order_datetime >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    issue_type,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT customer_id) as affected_customers,
    COUNT(DISTINCT restaurant_id) as affected_restaurants,
    COUNT(DISTINCT driver_id) as affected_drivers,
    ROUND(AVG(total_amount), 2) as avg_order_value,
    ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM order_issues)) * 100, 2) as issue_percentage
FROM order_issues
GROUP BY issue_type
ORDER BY occurrence_count DESC;
```
This query categorizes and quantifies different types of issues users experience, such as low ratings or long delivery times.

## Implementation Notes:
1. These queries focus on:
   - Order flow optimization
   - User experience metrics
   - Feature adoption tracking
   - Issue identification
   - Session analysis

2. Consider creating alerts for:
   - Sudden drops in completion rate
   - Unusual spikes in cancellations
   - Low rating patterns
   - Payment method failures

## Recommended Metabase Dashboards:

1. **User Journey Dashboard:**
   - Order funnel visualization
   - Time-based conversion rates
   - Drop-off points analysis
   - Session patterns

2. **Feature Usage Dashboard:**
   - Payment method adoption
   - User engagement metrics
   - Feature popularity trends
   - New feature impact analysis

3. **User Experience Dashboard:**
   - Rating distribution
   - Issue tracking
   - Delivery time analysis
   - Customer satisfaction trends

4. **Real-time Monitoring Dashboard:**
   - Current order status distribution
   - Live completion rates
   - Active user sessions
   - Immediate issue alerts
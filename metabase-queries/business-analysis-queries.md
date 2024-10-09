# Business Analysis Queries
These queries focus on key business metrics and performance indicators for the food delivery service.

## Revenue Analysis

### 1. Overall Revenue Trends
Purpose: Track monthly revenue trends and key financial metrics.
Key columns: order_datetime, total_amount, platform_fee, restaurant_earnings, driver_earnings
```sql
SELECT 
    DATE_TRUNC('month', order_datetime) as month,
    COUNT(id) as total_orders,
    SUM(total_amount) as gross_revenue,
    SUM(platform_fee) as platform_revenue,
    SUM(restaurant_earnings) as restaurant_earnings,
    SUM(driver_earnings) as driver_earnings,
    ROUND(AVG(total_amount), 2) as average_order_value
FROM orders
WHERE status = 'delivered'
GROUP BY DATE_TRUNC('month', order_datetime)
ORDER BY month DESC;
```
This query provides a monthly breakdown of orders, revenue, and earnings for different stakeholders.

### 2. Restaurant Performance Analysis
Purpose: Evaluate and rank restaurant performance based on various metrics.
Key columns: total_orders, gross_revenue, avg_rating, unique_customers, avg_order_value
```sql
WITH restaurant_metrics AS (
    SELECT 
        r.id,
        r.name,
        r.cuisine_type,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as gross_revenue,
        AVG(o.rating_restaurant) as avg_rating,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        SUM(o.total_amount) / COUNT(o.id) as avg_order_value
    FROM restaurants r
    LEFT JOIN orders o ON r.id = o.restaurant_id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY r.id, r.name, r.cuisine_type
)
SELECT 
    *,
    RANK() OVER (ORDER BY gross_revenue DESC) as revenue_rank,
    RANK() OVER (ORDER BY avg_rating DESC) as rating_rank
FROM restaurant_metrics
ORDER BY gross_revenue DESC;
```
This query calculates key performance indicators for each restaurant and ranks them based on revenue and ratings.

### 3. Profitability Analysis
Purpose: Analyze platform profitability and customer acquisition costs.
Key columns: platform_fee, delivery_fee, customer_id, promotional_costs
```sql
SELECT 
    DATE_TRUNC('month', order_datetime) as month,
    SUM(platform_fee) as platform_revenue,
    SUM(delivery_fee) as delivery_revenue,
    COUNT(DISTINCT customer_id) as active_customers,
    SUM(platform_fee) / COUNT(DISTINCT customer_id) as revenue_per_customer,
    SUM(CASE 
        WHEN op.discount_amount IS NOT NULL THEN op.discount_amount 
        ELSE 0 
    END) as promotional_costs
FROM orders o
LEFT JOIN order_promotions op ON o.id = op.order_id
WHERE status = 'delivered'
GROUP BY DATE_TRUNC('month', order_datetime)
ORDER BY month DESC;
```
This query examines monthly platform revenue, active customers, and promotional costs to assess profitability.

### 4. Customer Lifetime Value Analysis
Purpose: Calculate and compare customer lifetime value across different segments.
Key columns: customer_segment, total_spent, order_count, active_months
```sql
WITH customer_orders AS (
    SELECT 
        c.id,
        c.customer_segment,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        MAX(o.order_datetime) as last_order_date,
        MIN(o.order_datetime) as first_order_date,
        COUNT(DISTINCT DATE_TRUNC('month', o.order_datetime)) as active_months
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    WHERE o.status = 'delivered'
    GROUP BY c.id, c.customer_segment
)
SELECT 
    customer_segment,
    COUNT(*) as customer_count,
    ROUND(AVG(total_spent), 2) as avg_lifetime_value,
    ROUND(AVG(total_spent / GREATEST(active_months, 1)), 2) as avg_monthly_value,
    ROUND(AVG(order_count), 1) as avg_orders_per_customer
FROM customer_orders
GROUP BY customer_segment
ORDER BY avg_lifetime_value DESC;
```
This query segments customers and calculates average lifetime value, monthly value, and order frequency for each segment.

### 5. Commission Structure Analysis
Purpose: Evaluate the effectiveness of different commission rates.
Key columns: commission_rate, total_orders, gross_revenue, restaurant_earnings, platform_earnings
```sql
WITH restaurant_commission AS (
    SELECT 
        r.id,
        r.name,
        r.commission_rate,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as gross_revenue,
        SUM(o.restaurant_earnings) as restaurant_earnings,
        SUM(o.platform_fee) as platform_earnings
    FROM restaurants r
    JOIN orders o ON r.id = o.restaurant_id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY r.id, r.name, r.commission_rate
)
SELECT 
    commission_rate,
    COUNT(id) as restaurant_count,
    ROUND(AVG(total_orders), 1) as avg_orders_per_restaurant,
    ROUND(AVG(gross_revenue), 2) as avg_revenue_per_restaurant,
    ROUND(SUM(platform_earnings), 2) as total_platform_earnings
FROM restaurant_commission
GROUP BY commission_rate
ORDER BY commission_rate;
```
This query analyzes restaurant performance and platform earnings across different commission rate tiers.

## Implementation Notes:
1. All queries include status filtering to focus on completed deliveries
2. Time periods can be adjusted based on needs (currently set to last 30-90 days)
3. Results can be easily visualized in Metabase using:
   - Line charts for revenue trends
   - Bar charts for restaurant performance
   - Pie charts for revenue distribution
   - Tables for detailed analysis

## Recommended Dashboards:
1. **Executive Overview:**
   - Monthly revenue trends
   - Top performing restaurants
   - Customer LTV by segment

2. **Financial Performance:**
   - Profitability analysis
   - Commission structure effectiveness
   - Promotional impact on revenue

3. **Restaurant Partnership:**
   - Individual restaurant performance
   - Commission tier analysis
   - Restaurant ranking by various metrics

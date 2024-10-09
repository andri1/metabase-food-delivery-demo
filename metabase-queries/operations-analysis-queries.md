# Operations Analysis Queries
These queries focus on operational efficiency, delivery performance, and driver management.

## Delivery Performance Analysis

### 1. Delivery Time Analysis
Purpose: Analyze delivery times across different restaurants.
Key columns: order_datetime, delivery_datetime, restaurant_id, total_delivery_time
```sql
WITH delivery_times AS (
    SELECT 
        o.id as order_id,
        o.order_datetime,
        o.delivery_datetime,
        o.restaurant_id,
        o.driver_id,
        EXTRACT(EPOCH FROM (o.delivery_datetime - o.order_datetime))/60 as total_delivery_time,
        r.name as restaurant_name
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    restaurant_name,
    COUNT(*) as total_deliveries,
    ROUND(AVG(total_delivery_time), 2) as avg_delivery_time_mins,
    ROUND(MIN(total_delivery_time), 2) as min_delivery_time_mins,
    ROUND(MAX(total_delivery_time), 2) as max_delivery_time_mins,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_delivery_time), 2) as p95_delivery_time_mins
FROM delivery_times
GROUP BY restaurant_name
ORDER BY avg_delivery_time_mins DESC;
```
This query calculates average, minimum, and maximum delivery times for each restaurant, helping identify efficiency patterns.

### 2. Driver Performance Metrics
Purpose: Evaluate individual driver performance based on various metrics.
Key columns: total_deliveries, avg_rating, cancelled_orders, avg_delivery_time, total_earnings
```sql
WITH driver_metrics AS (
    SELECT 
        d.id as driver_id,
        d.name as driver_name,
        COUNT(o.id) as total_deliveries,
        ROUND(AVG(o.rating_driver), 2) as avg_rating,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivery_datetime - o.order_datetime))/60), 2) as avg_delivery_time,
        SUM(o.driver_earnings) as total_earnings
    FROM drivers d
    LEFT JOIN orders o ON d.id = o.driver_id
    WHERE o.order_datetime >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY d.id, d.name
)
SELECT 
    *,
    ROUND((cancelled_orders::float / NULLIF(total_deliveries, 0)) * 100, 2) as cancellation_rate,
    ROUND(total_earnings / NULLIF(total_deliveries, 0), 2) as earning_per_delivery
FROM driver_metrics
ORDER BY total_deliveries DESC;
```
This query provides a comprehensive view of each driver's performance, including delivery counts, ratings, and earnings.

### 3. Peak Hours Analysis
Purpose: Identify peak operational hours and analyze performance during these times.
Key columns: order_datetime, total_orders, active_drivers, avg_delivery_time_mins
```sql
SELECT 
    DATE_TRUNC('hour', order_datetime) as hour_slot,
    COUNT(*) as total_orders,
    COUNT(DISTINCT driver_id) as active_drivers,
    ROUND(COUNT(*)::float / NULLIF(COUNT(DISTINCT driver_id), 0), 2) as orders_per_driver,
    ROUND(AVG(EXTRACT(EPOCH FROM (delivery_datetime - order_datetime))/60), 2) as avg_delivery_time_mins
FROM orders
WHERE order_datetime >= CURRENT_DATE - INTERVAL '7 days'
AND status = 'delivered'
GROUP BY DATE_TRUNC('hour', order_datetime)
ORDER BY total_orders DESC;
```
This query breaks down order volume, driver activity, and delivery times by hour to highlight peak operational periods.

### 4. Delivery Status Progression
Purpose: Analyze the time spent in each stage of the delivery process.
Key columns: status, timestamp, order_id
```sql
WITH status_changes AS (
    SELECT 
        order_id,
        status,
        timestamp,
        LAG(timestamp) OVER (PARTITION BY order_id ORDER BY timestamp) as prev_timestamp
    FROM delivery_tracking
    WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    status,
    COUNT(*) as total_occurrences,
    ROUND(AVG(EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/60), 2) as avg_time_in_status_mins,
    ROUND(MIN(EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/60), 2) as min_time_mins,
    ROUND(MAX(EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/60), 2) as max_time_mins
FROM status_changes
WHERE prev_timestamp IS NOT NULL
GROUP BY status
ORDER BY status;
```
This query examines the average time spent in each delivery status, helping identify bottlenecks in the delivery process.

### 5. Driver Utilization and Efficiency
Purpose: Analyze driver shift patterns and efficiency.
Key columns: shift_start, shift_end, deliveries_completed
```sql
WITH driver_shifts AS (
    SELECT 
        driver_id,
        DATE_TRUNC('day', timestamp) as work_day,
        MIN(timestamp) as shift_start,
        MAX(timestamp) as shift_end,
        COUNT(DISTINCT order_id) as deliveries_completed
    FROM delivery_tracking
    WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY driver_id, DATE_TRUNC('day', timestamp)
)
SELECT 
    d.name as driver_name,
    ROUND(AVG(EXTRACT(EPOCH FROM (shift_end - shift_start))/3600), 2) as avg_shift_hours,
    ROUND(AVG(deliveries_completed), 2) as avg_deliveries_per_shift,
    ROUND(AVG(deliveries_completed / EXTRACT(EPOCH FROM (shift_end - shift_start))*3600), 2) as deliveries_per_hour
FROM driver_shifts ds
JOIN drivers d ON ds.driver_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_deliveries_per_shift DESC;
```
This query calculates metrics like average shift duration, deliveries per shift, and deliveries per hour for each driver.

## Implementation Notes:
1. Queries focus on key operational metrics:
   - Delivery times
   - Driver performance
   - Peak hour analysis
   - Status progression
   - Driver utilization

2. Time periods can be adjusted based on needs:
   - Daily analysis for immediate operations
   - Weekly for trend analysis
   - Monthly for strategic planning

## Recommended Metabase Dashboards:

1. **Real-time Operations Dashboard:**
   - Current active orders
   - Driver availability
   - Average delivery times
   - Order status distribution

2. **Driver Performance Dashboard:**
   - Individual driver metrics
   - Fleet utilization
   - Earnings analysis
   - Rating trends

3. **Operational Efficiency Dashboard:**
   - Peak hours analysis
   - Restaurant preparation times
   - Delivery time breakdown
   - Status progression metrics
# Geospatial Analysis Queries
These queries focus on spatial patterns, delivery zones, clustering, and location-based optimization.

## Spatial Analysis & Optimization

### 1. Delivery Zone Performance Analysis
Purpose: Analyze delivery performance based on distance ranges.
Key columns: delivery_distance_km, delivery_time_mins, total_amount
```sql
WITH delivery_zones AS (
    SELECT 
        o.id as order_id,
        o.restaurant_id,
        o.customer_id,
        o.driver_id,
        r.latitude as restaurant_lat,
        r.longitude as restaurant_long,
        c.latitude as customer_lat,
        c.longitude as customer_long,
        o.total_amount,
        EXTRACT(EPOCH FROM (o.delivery_datetime - o.order_datetime))/60 as delivery_time_mins,
        -- Calculate distance using Haversine formula
        6371 * 2 * ASIN(SQRT(
            POWER(SIN((c.latitude - r.latitude) * pi()/180/2), 2) +
            COS(r.latitude * pi()/180) * COS(c.latitude * pi()/180) *
            POWER(SIN((c.longitude - r.longitude) * pi()/180/2), 2)
        )) as delivery_distance_km
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    CASE 
        WHEN delivery_distance_km <= 1 THEN '0-1 km'
        WHEN delivery_distance_km <= 3 THEN '1-3 km'
        WHEN delivery_distance_km <= 5 THEN '3-5 km'
        WHEN delivery_distance_km <= 10 THEN '5-10 km'
        ELSE '10+ km'
    END as distance_range,
    COUNT(*) as total_deliveries,
    ROUND(AVG(delivery_time_mins)::numeric, 2) as avg_delivery_time,
    ROUND(AVG(total_amount)::numeric, 2) as avg_order_value,
    COUNT(DISTINCT restaurant_id) as unique_restaurants,
    COUNT(DISTINCT driver_id) as unique_drivers,
    ROUND(AVG(delivery_distance_km)::numeric, 2) as avg_distance
FROM delivery_zones
GROUP BY CASE 
    WHEN delivery_distance_km <= 1 THEN '0-1 km'
    WHEN delivery_distance_km <= 3 THEN '1-3 km'
    WHEN delivery_distance_km <= 5 THEN '3-5 km'
    WHEN delivery_distance_km <= 10 THEN '5-10 km'
    ELSE '10+ km'
END
ORDER BY avg_distance;
```
This query categorizes deliveries into distance ranges and calculates metrics like average delivery time, order value, and unique restaurants/drivers for each range.

### 2. Restaurant Cluster Analysis
Purpose: Identify clusters of restaurants and analyze their performance.
Key columns: latitude, longitude, total_orders, total_revenue, avg_rating
```sql
WITH restaurant_metrics AS (
    SELECT 
        r.id,
        r.name,
        r.latitude,
        r.longitude,
        r.cuisine_type,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.rating_restaurant) as avg_rating,
        -- Create grid cells for clustering
        FLOOR(r.latitude * 100)/100 as lat_grid,
        FLOOR(r.longitude * 100)/100 as long_grid
    FROM restaurants r
    LEFT JOIN orders o ON r.id = o.restaurant_id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY r.id, r.name, r.latitude, r.longitude, r.cuisine_type
)
SELECT 
    lat_grid,
    long_grid,
    COUNT(*) as restaurants_in_cell,
    ROUND(AVG(total_orders), 2) as avg_orders_per_restaurant,
    ROUND(AVG(total_revenue), 2) as avg_revenue_per_restaurant,
    ROUND(AVG(avg_rating), 2) as avg_cluster_rating,
    STRING_AGG(DISTINCT cuisine_type, ', ') as cuisine_types
FROM restaurant_metrics
GROUP BY lat_grid, long_grid
HAVING COUNT(*) > 1
ORDER BY restaurants_in_cell DESC;
```
This query groups restaurants into grid cells based on their location and provides insights on order volume, revenue, and ratings for each cluster.

### 3. Driver Coverage Analysis
Purpose: Analyze driver distribution and utilization across different times and vehicle types.
Key columns: current_latitude, current_longitude, vehicle_type, active_orders
```sql
WITH driver_locations AS (
    SELECT 
        d.id as driver_id,
        d.current_latitude,
        d.current_longitude,
        d.vehicle_type,
        d.last_status_update,
        COUNT(o.id) as active_orders,
        -- Create time-based bins
        EXTRACT(HOUR FROM d.last_status_update) as hour_of_day
    FROM drivers d
    LEFT JOIN orders o ON d.id = o.driver_id 
        AND o.status IN ('accepted', 'picked_up')
    WHERE d.is_active = true
    AND d.last_status_update >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
    GROUP BY d.id, d.current_latitude, d.current_longitude, 
             d.vehicle_type, d.last_status_update
)
SELECT 
    hour_of_day,
    vehicle_type,
    COUNT(*) as active_drivers,
    ROUND(AVG(active_orders), 2) as avg_orders_per_driver,
    COUNT(CASE WHEN active_orders > 0 THEN 1 END) as busy_drivers,
    ROUND(COUNT(CASE WHEN active_orders > 0 THEN 1 END)::float / 
          NULLIF(COUNT(*), 0) * 100, 2) as utilization_rate
FROM driver_locations
GROUP BY hour_of_day, vehicle_type
ORDER BY hour_of_day, vehicle_type;
```
This query examines driver activity patterns, including the number of active drivers, average orders per driver, and utilization rates.

### 4. Demand Hotspot Analysis
Purpose: Identify areas with high order demand.
Key columns: latitude, longitude, order_count, total_revenue
```sql
WITH order_locations AS (
    SELECT 
        DATE_TRUNC('hour', o.order_datetime) as time_slot,
        c.latitude,
        c.longitude,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_revenue,
        -- Create grid cells for hotspot analysis
        FLOOR(c.latitude * 100)/100 as lat_grid,
        FLOOR(c.longitude * 100)/100 as long_grid
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.order_datetime >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('hour', o.order_datetime), 
             c.latitude, c.longitude,
             FLOOR(c.latitude * 100)/100,
             FLOOR(c.longitude * 100)/100
)
SELECT 
    lat_grid,
    long_grid,
    COUNT(DISTINCT time_slot) as active_hours,
    SUM(order_count) as total_orders,
    ROUND(AVG(order_count), 2) as avg_orders_per_hour,
    ROUND(SUM(total_revenue), 2) as total_revenue,
    ROUND(SUM(total_revenue)/SUM(order_count), 2) as avg_order_value
FROM order_locations
GROUP BY lat_grid, long_grid
HAVING COUNT(DISTINCT time_slot) > 24
ORDER BY total_orders DESC;
```
This query creates a grid of order locations and analyzes order frequency, revenue, and average order value for each cell.

### 5. Delivery Route Optimization Analysis
Purpose: Analyze the time spent in different stages of the delivery process.
Key columns: tracking_status, timestamp, driver_id
```sql
WITH delivery_routes AS (
    SELECT 
        o.id as order_id,
        o.driver_id,
        o.restaurant_id,
        o.customer_id,
        dt.latitude as tracking_lat,
        dt.longitude as tracking_long,
        dt.timestamp as tracking_time,
        dt.status as tracking_status,
        LEAD(dt.timestamp) OVER (
            PARTITION BY o.id 
            ORDER BY dt.timestamp
        ) as next_timestamp,
        LEAD(dt.status) OVER (
            PARTITION BY o.id 
            ORDER BY dt.timestamp
        ) as next_status
    FROM orders o
    JOIN delivery_tracking dt ON o.id = dt.order_id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    tracking_status,
    next_status,
    COUNT(*) as transition_count,
    ROUND(AVG(
        EXTRACT(EPOCH FROM (next_timestamp - tracking_time))/60
    ), 2) as avg_transition_time_mins,
    COUNT(DISTINCT driver_id) as unique_drivers,
    COUNT(DISTINCT order_id) as affected_orders
FROM delivery_routes
WHERE next_timestamp IS NOT NULL
GROUP BY tracking_status, next_status
ORDER BY tracking_status, avg_transition_time_mins DESC;
```
This query examines the transitions between different delivery statuses, calculating average transition times and affected orders/drivers.

## Implementation Notes:
1. Distance calculations use the Haversine formula for accuracy
2. Grid-based clustering helps identify patterns
3. Time-based analysis captures temporal patterns
4. Consider adjusting grid size based on city density

## Recommended Metabase Dashboards:

1. **Delivery Zone Dashboard:**
   - Heat map of order density
   - Distance vs. delivery time analysis
   - Zone performance metrics
   - Coverage gaps visualization

2. **Restaurant Clustering Dashboard:**
   - Restaurant density maps
   - Cuisine type distribution
   - Performance by cluster
   - Competition analysis

3. **Driver Distribution Dashboard:**
   - Real-time driver locations
   - Coverage area analysis
   - Utilization patterns
   - Route efficiency metrics

4. **Demand Analysis Dashboard:**
   - Hotspot visualization
   - Temporal demand patterns
   - Revenue heat maps
   - Underserved areas identification

## Visualization Tips:
1. Use Metabase's map visualization for:
   - Restaurant clusters
   - Delivery heat maps
   - Driver coverage
   - Demand hotspots

2. Consider adding layers for:
   - Traffic patterns
   - Weather conditions
   - Special events
   - Temporal variations

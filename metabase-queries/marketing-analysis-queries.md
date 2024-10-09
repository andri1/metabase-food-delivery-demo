# Marketing Analysis Queries
These queries focus on customer behavior, segmentation, promotional effectiveness, and targeting opportunities.

## Customer Behavior & Segmentation

### 1. Customer Cohort Analysis
Purpose: Analyze customer retention and behavior over time.
Key columns: registration_date, order_datetime, revenue
```sql
WITH cohort_orders AS (
    SELECT 
        c.id as customer_id,
        DATE_TRUNC('month', c.registration_date) as cohort_month,
        DATE_TRUNC('month', o.order_datetime) as order_month,
        SUM(o.total_amount) as revenue
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE o.status = 'delivered'
    GROUP BY c.id, DATE_TRUNC('month', c.registration_date), DATE_TRUNC('month', o.order_datetime)
)
SELECT 
    cohort_month,
    COUNT(DISTINCT customer_id) as cohort_size,
    COUNT(DISTINCT CASE WHEN order_month = cohort_month THEN customer_id END) as month_0_retained,
    COUNT(DISTINCT CASE WHEN order_month = cohort_month + INTERVAL '1 month' THEN customer_id END) as month_1_retained,
    COUNT(DISTINCT CASE WHEN order_month = cohort_month + INTERVAL '2 month' THEN customer_id END) as month_2_retained,
    COUNT(DISTINCT CASE WHEN order_month = cohort_month + INTERVAL '3 month' THEN customer_id END) as month_3_retained
FROM cohort_orders
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

### 2. Customer Segmentation by Order Patterns
Purpose: Segment customers based on their ordering behavior and preferences.
Key columns: order_count, total_spent, avg_order_value, cuisine_variety, favorite_cuisine
```sql
WITH customer_metrics AS (
    SELECT 
        c.id,
        c.name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        MAX(o.order_datetime) as last_order_date,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT r.cuisine_type) as cuisine_variety,
        MODE() WITHIN GROUP (ORDER BY r.cuisine_type) as favorite_cuisine
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.status = 'delivered'
    AND o.order_datetime >= CURRENT_DATE - INTERVAL '180 days'
    GROUP BY c.id, c.name
)
SELECT 
    CASE 
        WHEN order_count >= 12 AND total_spent >= 1000 THEN 'VIP'
        WHEN order_count >= 6 THEN 'Regular'
        WHEN order_count >= 2 THEN 'Occasional'
        ELSE 'New'
    END as customer_segment,
    COUNT(*) as segment_size,
    ROUND(AVG(total_spent), 2) as avg_customer_spend,
    ROUND(AVG(avg_order_value), 2) as avg_order_value,
    ROUND(AVG(cuisine_variety), 1) as avg_cuisine_variety,
    MODE() WITHIN GROUP (ORDER BY favorite_cuisine) as popular_cuisine
FROM customer_metrics
GROUP BY 
    CASE 
        WHEN order_count >= 12 AND total_spent >= 1000 THEN 'VIP'
        WHEN order_count >= 6 THEN 'Regular'
        WHEN order_count >= 2 THEN 'Occasional'
        ELSE 'New'
    END
ORDER BY avg_customer_spend DESC;
```

### 3. Promotional Campaign Analysis
Purpose: Evaluate the effectiveness of different promotional campaigns.
Key columns: discount_type, discount_value, times_used, unique_customers, total_discount_amount
```sql
WITH promotion_metrics AS (
    SELECT 
        p.id as promotion_id,
        p.code,
        p.discount_type,
        p.discount_value,
        COUNT(DISTINCT op.order_id) as times_used,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        SUM(o.total_amount + op.discount_amount) as gross_order_value,
        SUM(op.discount_amount) as total_discount_amount,
        SUM(o.total_amount) as net_order_value
    FROM promotions p
    LEFT JOIN order_promotions op ON p.id = op.promotion_id
    LEFT JOIN orders o ON op.order_id = o.id
    WHERE p.start_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY p.id, p.code, p.discount_type, p.discount_value
)
SELECT 
    code,
    discount_type,
    discount_value,
    times_used,
    unique_customers,
    ROUND(total_discount_amount, 2) as total_discount_given,
    ROUND(total_discount_amount / NULLIF(times_used, 0), 2) as avg_discount_per_use,
    ROUND((net_order_value / NULLIF(gross_order_value, 0)) * 100, 2) as discount_percentage,
    ROUND(net_order_value / NULLIF(times_used, 0), 2) as avg_order_value_after_discount
FROM promotion_metrics
ORDER BY times_used DESC;
```

### 4. Customer Reactivation Analysis
Purpose: Identify and analyze customers at risk of churning.
Key columns: last_order_date, total_orders, total_spent, time_since_last_order
```sql
WITH inactive_customers AS (
    SELECT 
        c.id,
        c.name,
        c.email,
        MAX(o.order_datetime) as last_order_date,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        NOW() - MAX(o.order_datetime) as time_since_last_order
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.id, c.name, c.email
    HAVING MAX(o.order_datetime) < CURRENT_DATE - INTERVAL '30 days'
    AND MAX(o.order_datetime) >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
    CASE 
        WHEN time_since_last_order <= INTERVAL '60 days' THEN 'At Risk'
        WHEN time_since_last_order <= INTERVAL '90 days' THEN 'Churning'
        ELSE 'Lost'
    END as customer_status,
    COUNT(*) as customer_count,
    ROUND(AVG(total_orders), 1) as avg_past_orders,
    ROUND(AVG(total_spent), 2) as avg_past_spent,
    ROUND(AVG(total_spent/total_orders), 2) as avg_order_value
FROM inactive_customers
GROUP BY 
    CASE 
        WHEN time_since_last_order <= INTERVAL '60 days' THEN 'At Risk'
        WHEN time_since_last_order <= INTERVAL '90 days' THEN 'Churning'
        ELSE 'Lost'
    END
ORDER BY customer_count DESC;
```

### 5. Customer Acquisition Channel Analysis
Purpose: Compare the performance of different customer acquisition channels.
Key columns: first_order_date, total_orders, total_spent, acquisition_channel
```sql
WITH first_orders AS (
    SELECT 
        c.id as customer_id,
        MIN(o.order_datetime) as first_order_date,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        CASE 
            WHEN op.promotion_id IS NOT NULL THEN 'Promotion'
            ELSE 'Organic'
        END as acquisition_channel
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    LEFT JOIN order_promotions op ON o.id = op.order_id
    WHERE o.status = 'delivered'
    GROUP BY 
        c.id,
        CASE 
            WHEN op.promotion_id IS NOT NULL THEN 'Promotion'
            ELSE 'Organic'
        END
)
SELECT 
    acquisition_channel,
    COUNT(*) as customer_count,
    ROUND(AVG(total_orders), 1) as avg_orders_per_customer,
    ROUND(AVG(total_spent), 2) as avg_customer_value,
    ROUND(AVG(total_spent/total_orders), 2) as avg_order_value
FROM first_orders
GROUP BY acquisition_channel
ORDER BY customer_count DESC;
```

## Implementation Notes:
1. Customize time periods based on your marketing cycles
2. Adjust segmentation thresholds based on your business model
3. Consider seasonality when analyzing promotional effectiveness

## Recommended Metabase Dashboards:

1. **Customer Insights Dashboard:**
   - Cohort analysis visualization
   - Customer segment distribution
   - Lifetime value trends
   - Cuisine preferences by segment

2. **Promotional Performance Dashboard:**
   - Campaign effectiveness
   - Discount impact analysis
   - Customer acquisition costs
   - ROI by promotion type

3. **Customer Retention Dashboard:**
   - Churn risk indicators
   - Reactivation opportunities
   - Customer engagement metrics
   - Acquisition channel performance
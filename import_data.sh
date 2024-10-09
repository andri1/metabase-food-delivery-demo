#!/bin/bash

# Import the database schema first
echo "Importing database-schema.sql..."
docker exec -i delivery_db psql -U delivery_user -d delivery_food_db < "./database-schema.sql"

# Array of generated SQL files in the order they should be imported
generated_sql_files=(
    "customers.sql"
    "restaurants.sql"
    "drivers.sql"
    "orders.sql"
    "promotions.sql"
    "order_promotions.sql"
)

# Loop through the generated SQL files and import them
for file in "${generated_sql_files[@]}"; do
    echo "Importing $file..."
    docker exec -i delivery_db psql -U delivery_user -d delivery_food_db < "./results/$file"
done

echo "Data import completed!"
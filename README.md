# Metabase Demo with Food Delivery Data 🍔📊

Welcome to the Metabase Demo project! This repository provides a comprehensive setup for demonstrating Metabase's capabilities using a food delivery platform dataset. It includes sample data generation, database setup, and a collection of pre-written queries for analysis.

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/andri1/metabase-food-delivery-demo.git
   cd metabase-food-delivery-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create necessary directories:
   ```bash
   mkdir -p delivery-db-data metabase-db-data
   ```

4. Generate the sample data:
   ```bash
   npm run generate
   ```

5. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

### Importing Data

After generating the data and starting the Docker containers:

1. Make the import script executable:
   ```bash
   chmod +x import_data.sh
   ```

2. Run the import script:
   ```bash
   ./import_data.sh
   ```

This script will import the database schema and the generated SQL files into the `delivery_db` container's database.

## 📊 Metabase Queries

In the `metabase-queries` folder, you'll find a collection of SQL queries organized by analysis type:

- `business-analysis-queries.md`
- `geospatial-analysis-queries.md`
- `marketing-analysis-queries.md`
- `operations-analysis-queries.md`
- `product-analysis-queries.md`

These queries are designed to showcase Metabase's analytical capabilities across various aspects of the food delivery business. You can use these queries within Metabase to create insightful dashboards and reports.

## 🖥️ Accessing Metabase

Once the setup is complete, you can access Metabase at:

```
http://localhost:3000
```

Use these queries to explore the data, create visualizations, and build comprehensive dashboards that demonstrate Metabase's features.

## 📚 Next Steps

1. Log into Metabase and connect it to the `delivery_db` database.
2. Explore the pre-written queries in the `metabase-queries` folder.
3. Create custom visualizations and dashboards using the sample data.
4. Experiment with Metabase's features like alerts, pulses, etc.

Enjoy exploring Metabase with this food delivery dataset!

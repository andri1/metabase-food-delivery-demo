import { writeFile, mkdir } from 'fs/promises';
import { faker } from '@faker-js/faker';

// Types
interface Restaurant {
    id: number;
    name: string;
    cuisine_type: string;
    address: string;
    latitude: number;
    longitude: number;
    rating: number;
    onboarding_date: string;
    operating_hours: string;
    commission_rate: number;
    is_active: boolean;
}

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
    registration_date: string;
    last_order_date: string;
    total_orders: number;
    customer_segment: string;
}

interface Driver {
    id: number;
    name: string;
    email: string;
    phone: string;
    vehicle_type: string;
    joining_date: string;
    rating: number;
    is_active: boolean;
    current_latitude: number;
    current_longitude: number;
    last_status_update: string;
}

interface Order {
    id: number;
    customer_id: number;
    restaurant_id: number;
    driver_id: number;
    order_datetime: string;
    delivery_datetime: string | null;
    status: string;
    total_amount: number;
    delivery_fee: number;
    restaurant_earnings: number;
    driver_earnings: number;
    platform_fee: number;
    payment_method: string;
    rating_restaurant: number | null;
    rating_driver: number | null;
    rating_overall: number | null;
}

interface OrderItem {
    id: number;
    order_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions: string | null;
}

interface DeliveryTracking {
    id: number;
    order_id: number;
    driver_id: number;
    status: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface Promotion {
    id: number;
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    start_date: string;
    end_date: string;
    usage_count: number;
    max_usage: number;
    min_order_value: number;
}

interface OrderPromotion {
    order_id: number;
    promotion_id: number;
    discount_amount: number;
}

// Configuration
const CONFIG = {
    START_DATE: new Date('2023-01-01'),
    END_DATE: new Date('2024-03-31'),
    NUM_RESTAURANTS: 50,
    NUM_CUSTOMERS: 1000,
    NUM_DRIVERS: 100,
    NUM_ORDERS: 5000,
    SG_BOUNDS: {
        min_lat: 1.290270,
        max_lat: 1.390270,
        min_lng: 103.704566,
        max_lng: 103.904566
    }
} as const;

// Utility functions
const randomFloat = (min: number, max: number): number => {
    return Number((Math.random() * (max - min) + min).toFixed(6));
};

const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateOperatingHours = (): string => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours: Record<string, string> = {};
    
    days.forEach(day => {
        if (Math.random() < 0.1) {
            hours[day] = 'CLOSED';
        } else {
            const openHour = randomInt(7, 11);
            const closeHour = randomInt(20, 23);
            hours[day] = `${openHour.toString().padStart(2, '0')}:00-${closeHour.toString().padStart(2, '0')}:00`;
        }
    });

    return JSON.stringify(hours);
};

// Data generation functions
const generateRestaurants = (): Restaurant[] => {
    const cuisines = ['Chinese', 'Japanese', 'Korean', 'Thai', 'Indian', 'Western', 'Italian', 'Fast Food'];
    return Array.from({ length: CONFIG.NUM_RESTAURANTS }, (_, id) => ({
        id,
        name: `${faker.company.name()} ${faker.helpers.arrayElement(['Restaurant', 'Eatery', 'Kitchen', 'Cafe'])}`,
        cuisine_type: faker.helpers.arrayElement(cuisines),
        address: faker.location.streetAddress(),
        latitude: randomFloat(CONFIG.SG_BOUNDS.min_lat, CONFIG.SG_BOUNDS.max_lat),
        longitude: randomFloat(CONFIG.SG_BOUNDS.min_lng, CONFIG.SG_BOUNDS.max_lng),
        rating: Number(randomFloat(3.5, 5.0).toFixed(2)),
        onboarding_date: faker.date.between({ from: CONFIG.START_DATE, to: CONFIG.END_DATE }).toISOString().split('T')[0],
        operating_hours: generateOperatingHours(),
        commission_rate: Number(randomFloat(15, 25).toFixed(2)),
        is_active: Math.random() < 0.9
    }));
};

const generateCustomers = (): Customer[] => {
    const segments = ['new', 'regular', 'vip'];
    return Array.from({ length: CONFIG.NUM_CUSTOMERS }, (_, id) => {
        const registration_date = faker.date.between({ from: CONFIG.START_DATE, to: CONFIG.END_DATE });
        const total_orders = randomInt(1, 50);
        
        return {
            id,
            name: faker.person.fullName(),
            email: faker.internet.email(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            latitude: randomFloat(CONFIG.SG_BOUNDS.min_lat, CONFIG.SG_BOUNDS.max_lat),
            longitude: randomFloat(CONFIG.SG_BOUNDS.min_lng, CONFIG.SG_BOUNDS.max_lng),
            registration_date: registration_date.toISOString().split('T')[0],
            last_order_date: faker.date.between({ 
                from: registration_date, 
                to: CONFIG.END_DATE 
            }).toISOString().split('T')[0],
            total_orders,
            customer_segment: segments[Math.min(Math.floor(total_orders / 20), 2)]
        };
    });
};

// New functions to be added:

const generateDrivers = (): Driver[] => {
    const vehicleTypes = ['Motorcycle', 'Car', 'Bicycle', 'Van'];
    return Array.from({ length: CONFIG.NUM_DRIVERS }, (_, id) => ({
        id,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        vehicle_type: faker.helpers.arrayElement(vehicleTypes),
        joining_date: faker.date.between({ from: CONFIG.START_DATE, to: CONFIG.END_DATE }).toISOString().split('T')[0],
        rating: Number(randomFloat(3.5, 5.0).toFixed(2)),
        is_active: Math.random() < 0.9,
        current_latitude: randomFloat(CONFIG.SG_BOUNDS.min_lat, CONFIG.SG_BOUNDS.max_lat),
        current_longitude: randomFloat(CONFIG.SG_BOUNDS.min_lng, CONFIG.SG_BOUNDS.max_lng),
        last_status_update: faker.date.recent({ days: 1 }).toISOString()
    }));
};

const generateOrders = (customers: Customer[], restaurants: Restaurant[], drivers: Driver[]): Order[] => {
    const orderStatuses = ['placed', 'accepted', 'preparing', 'picked_up', 'delivered', 'cancelled'];
    const paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'Digital Wallet'];

    return Array.from({ length: CONFIG.NUM_ORDERS }, (_, id) => {
        const customer = faker.helpers.arrayElement(customers);
        const restaurant = faker.helpers.arrayElement(restaurants);
        const driver = faker.helpers.arrayElement(drivers);
        const orderDateTime = faker.date.between({ from: CONFIG.START_DATE, to: CONFIG.END_DATE });
        const status = faker.helpers.arrayElement(orderStatuses);
        const totalAmount = Number(randomFloat(10, 100).toFixed(2));
        const deliveryFee = Number(randomFloat(2, 8).toFixed(2));
        const platformFee = Number((totalAmount * 0.15).toFixed(2));
        const restaurantEarnings = Number((totalAmount * 0.7).toFixed(2));
        const driverEarnings = Number((deliveryFee * 0.8).toFixed(2));

        return {
            id,
            customer_id: customer.id,
            restaurant_id: restaurant.id,
            driver_id: driver.id,
            order_datetime: orderDateTime.toISOString(),
            delivery_datetime: status === 'delivered' ? faker.date.soon({ days: 1, refDate: orderDateTime }).toISOString() : null,
            status,
            total_amount: totalAmount,
            delivery_fee: deliveryFee,
            restaurant_earnings: restaurantEarnings,
            driver_earnings: driverEarnings,
            platform_fee: platformFee,
            payment_method: faker.helpers.arrayElement(paymentMethods),
            rating_restaurant: status === 'delivered' ? randomInt(1, 5) : null,
            rating_driver: status === 'delivered' ? randomInt(1, 5) : null,
            rating_overall: status === 'delivered' ? randomInt(1, 5) : null
        };
    });
};

const generatePromotions = (): Promotion[] => {
    return Array.from({ length: 20 }, (_, id) => {
        const startDate = faker.date.between({ from: CONFIG.START_DATE, to: CONFIG.END_DATE });
        const endDate = faker.date.soon({ days: 30, refDate: startDate });
        const discountType = faker.helpers.arrayElement(['percentage', 'fixed_amount'] as const);

        return {
            id,
            code: faker.string.alphanumeric(8).toUpperCase(),
            discount_type: discountType,
            discount_value: discountType === 'percentage' ? randomInt(5, 30) : randomInt(5, 20),
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            usage_count: randomInt(0, 1000),
            max_usage: randomInt(1000, 5000),
            min_order_value: randomInt(10, 50)
        };
    });
};

const generateOrderPromotions = (orders: Order[], promotions: Promotion[]): OrderPromotion[] => {
    return orders
        .filter(() => Math.random() < 0.2) // Apply promotions to 20% of orders
        .map(order => {
            const promotion = faker.helpers.arrayElement(promotions);
            const discountAmount = promotion.discount_type === 'percentage'
                ? Number((order.total_amount * (promotion.discount_value / 100)).toFixed(2))
                : Math.min(promotion.discount_value, order.total_amount);

            return {
                order_id: order.id,
                promotion_id: promotion.id,
                discount_amount: discountAmount
            };
        });
};

// Main data generation and save function
async function generateAndSaveData() {
    try {
        const restaurants = generateRestaurants();
        const customers = generateCustomers();
        const drivers = generateDrivers();
        const orders = generateOrders(customers, restaurants, drivers);
        const promotions = generatePromotions();
        const orderPromotions = generateOrderPromotions(orders, promotions);

        const datasets = {
            'restaurants.sql': generateRestaurantSQL(restaurants),
            'customers.sql': generateCustomerSQL(customers),
            'drivers.sql': generateDriverSQL(drivers),
            'orders.sql': generateOrderSQL(orders),
            'promotions.sql': generatePromotionSQL(promotions),
            'order_promotions.sql': generateOrderPromotionSQL(orderPromotions)
        };

        // Create 'results' directory if it doesn't exist
        await mkdir('results', { recursive: true });

        for (const [filename, data] of Object.entries(datasets)) {
            await writeFile(`results/${filename}`, data);
            console.log(`Generated results/${filename}`);
        }

    } catch (error) {
        console.error('Error generating data:', error);
    }
}

// Helper functions to generate SQL INSERT statements
function generateRestaurantSQL(restaurants: Restaurant[]): string {
    return `INSERT INTO restaurants (id, name, cuisine_type, address, latitude, longitude, rating, onboarding_date, operating_hours, commission_rate, is_active)
VALUES
${restaurants.map(r => `(${r.id}, '${r.name.replace(/'/g, "''")}', '${r.cuisine_type}', '${r.address.replace(/'/g, "''")}', ${r.latitude}, ${r.longitude}, ${r.rating}, '${r.onboarding_date}', '${r.operating_hours.replace(/'/g, "''")}', ${r.commission_rate}, ${r.is_active})`).join(',\n')};
`;
}

function generateCustomerSQL(customers: Customer[]): string {
    return `INSERT INTO customers (id, name, email, phone, address, latitude, longitude, registration_date, last_order_date, total_orders, customer_segment)
VALUES
${customers.map(c => `(${c.id}, '${c.name.replace(/'/g, "''")}', '${c.email}', '${c.phone}', '${c.address.replace(/'/g, "''")}', ${c.latitude}, ${c.longitude}, '${c.registration_date}', '${c.last_order_date}', ${c.total_orders}, '${c.customer_segment}')`).join(',\n')};
`;
}

function generateDriverSQL(drivers: Driver[]): string {
    return `INSERT INTO drivers (id, name, email, phone, vehicle_type, joining_date, rating, is_active, current_latitude, current_longitude, last_status_update)
VALUES
${drivers.map(d => `(${d.id}, '${d.name.replace(/'/g, "''")}', '${d.email}', '${d.phone}', '${d.vehicle_type}', '${d.joining_date}', ${d.rating}, ${d.is_active}, ${d.current_latitude}, ${d.current_longitude}, '${d.last_status_update}')`).join(',\n')};
`;
}

function generateOrderSQL(orders: Order[]): string {
    return `INSERT INTO orders (id, customer_id, restaurant_id, driver_id, order_datetime, delivery_datetime, status, total_amount, delivery_fee, restaurant_earnings, driver_earnings, platform_fee, payment_method, rating_restaurant, rating_driver, rating_overall)
VALUES
${orders.map(o => `(${o.id}, ${o.customer_id}, ${o.restaurant_id}, ${o.driver_id}, '${o.order_datetime}', ${o.delivery_datetime ? `'${o.delivery_datetime}'` : 'NULL'}, '${o.status}', ${o.total_amount}, ${o.delivery_fee}, ${o.restaurant_earnings}, ${o.driver_earnings}, ${o.platform_fee}, '${o.payment_method}', ${o.rating_restaurant !== null ? o.rating_restaurant : 'NULL'}, ${o.rating_driver !== null ? o.rating_driver : 'NULL'}, ${o.rating_overall !== null ? o.rating_overall : 'NULL'})`).join(',\n')};
`;
}

function generatePromotionSQL(promotions: Promotion[]): string {
    return `INSERT INTO promotions (id, code, discount_type, discount_value, start_date, end_date, usage_count, max_usage, min_order_value)
VALUES
${promotions.map(p => `(${p.id}, '${p.code}', '${p.discount_type}', ${p.discount_value}, '${p.start_date}', '${p.end_date}', ${p.usage_count}, ${p.max_usage}, ${p.min_order_value})`).join(',\n')};
`;
}

function generateOrderPromotionSQL(orderPromotions: OrderPromotion[]): string {
    return `INSERT INTO order_promotions (order_id, promotion_id, discount_amount)
VALUES
${orderPromotions.map(op => `(${op.order_id}, ${op.promotion_id}, ${op.discount_amount})`).join(',\n')};
`;
}

// Run the generator
generateAndSaveData().catch(console.error);
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    # Aiven MySQL connection details (typically provided via Vercel integration)
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor,
        ssl={'ssl': {}}
    )

def setup_db():
    print("Setting up Aiven MySQL Database Schema...")
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create raw_deals table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS raw_deals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_url VARCHAR(768) UNIQUE NOT NULL,
            title TEXT,
            raw_content TEXT,
            published_at VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_processed BOOLEAN DEFAULT FALSE
        )
    ''')

    # Create normalized_deals table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS normalized_deals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            raw_deal_id INT UNIQUE,
            title TEXT,
            brand VARCHAR(255),
            original_price DECIMAL(10, 2),
            discount_price DECIMAL(10, 2),
            discount_percentage DECIMAL(5, 2),
            url VARCHAR(2048),
            image_url VARCHAR(2048),
            confidence_score DECIMAL(3, 2),
            status ENUM('pending', 'approved', 'rejected', 'published') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(raw_deal_id) REFERENCES raw_deals(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Aiven MySQL Database tables created successfully.")

if __name__ == '__main__':
    setup_db()

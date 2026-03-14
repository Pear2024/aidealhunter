import pymysql
import feedparser
import json
import os
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load env variables (assumes you have GEMINI_API_KEY in .env)
load_dotenv()

DB_PATH = 'ai_deal_hunter.db'
# Using Slickdeals Frontpage RSS as a free, high-volume deal source
RSS_URL = 'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1'

# Initialize Gemini Client
client = genai.Client()

def get_db_connection():
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor,
        ssl={'ssl': {}}
    )

def fetch_rss_deals():
    print(f"Fetching RSS from {RSS_URL}...")
    feed = feedparser.parse(RSS_URL)
    deals = []
    for entry in feed.entries[:10]:  # Limit to 10 for testing
        deal = {
            'title': entry.title,
            'link': entry.link,
            'published': entry.get('published', ''),
            'description': entry.get('description', '')
        }
        deals.append(deal)
    print(f"Fetched {len(deals)} deals.")
    return deals

def insert_raw_deal(cursor, deal):
    try:
        cursor.execute('''
            INSERT INTO raw_deals (source_url, title, raw_content, published_at)
            VALUES (%s, %s, %s, %s)
        ''', (deal['link'], deal['title'], deal['description'], deal['published']))
        
        # In PyMySQL we need to execute a separate query to get the last insert ID
        cursor.execute('SELECT LAST_INSERT_ID() AS id')
        result = cursor.fetchone()
        return result['id'] if result else None
    except pymysql.err.IntegrityError:
        # Deal already exists
        return None

def extract_deal_info_with_gemini(raw_text):
    prompt = f"""
    You are an AI Deal extraction agent. Extract the following deal information from the raw text provided.
    Return ONLY a valid JSON object matching the requested schema. Do not include markdown formatting or extra text.
    
    Raw text:
    {raw_text}
    
    Required JSON Schema:
    {{
        "brand": "The brand of the product (string, e.g. 'Apple', or 'Unknown')",
        "original_price": "The original undiscounted price (number, e.g. 100.00). Use null if unknown.",
        "discount_price": "The current deal price (number, e.g. 50.00). Run regex/extract numbers.",
        "discount_percentage": "The percentage off (number, e.g. 50.00). Calculate if possible, or null.",
        "image_url": "Extract the primary image URL from the HTML description if it exists, otherwise null.",
        "confidence_score": "Your confidence in the extracted data from 0.0 to 1.0 (number)"
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        # Strip potential markdown formatting
        text_response = response.text.strip()
        if text_response.startswith('```json'):
            text_response = text_response[7:-3]
        elif text_response.startswith('```'):
            text_response = text_response[3:-3]
            
        return json.loads(text_response)
    except Exception as e:
        print(f"Failed to extract with Gemini: {e}")
        return None

def process_deals():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    deals = fetch_rss_deals()
    
    new_deals_count = 0
    extracted_count = 0
    
    for deal in deals:
        raw_id = insert_raw_deal(cursor, deal)
        
        if raw_id:
            new_deals_count += 1
            print(f"Processing New Deal: {deal['title'][:50]}...")
            
            # Use regex to extract image before relying purely on LLM
            image_match = re.search(r'<img[^>]+src="([^">]+)"', deal['description'])
            pre_extracted_image = image_match.group(1) if image_match else None

            # Combine title and description for context
            text_to_analyze = f"Title: {deal['title']}\nDescription: {deal['description']}"
            
            extracted_json = extract_deal_info_with_gemini(text_to_analyze)
            
            if extracted_json:
                cursor.execute('''
                    INSERT INTO normalized_deals (
                        raw_deal_id, title, brand, original_price, discount_price, 
                        discount_percentage, url, image_url, confidence_score, status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                ''', (
                    raw_id,
                    deal['title'],
                    extracted_json.get('brand', 'Unknown'),
                    extracted_json.get('original_price'),
                    extracted_json.get('discount_price'),
                    extracted_json.get('discount_percentage'),
                    deal['link'],
                    pre_extracted_image or extracted_json.get('image_url'),
                    extracted_json.get('confidence_score', 0.5)
                ))
                extracted_count += 1
            
            # Mark raw text as processed
            cursor.execute('UPDATE raw_deals SET is_processed = TRUE WHERE id = %s', (raw_id,))
            conn.commit()
            
    conn.close()
    print(f"\n✅ Processing Complete: Found {new_deals_count} new deals, successfully extracted {extracted_count}.")

if __name__ == '__main__':
    # Ensure DB exists
    import mysql_setup
    mysql_setup.setup_db()
        
    process_deals()

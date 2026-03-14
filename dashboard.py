import streamlit as st
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(page_title="AI Deal Hunter - Review Dashboard", layout="wide")

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

def fetch_pending_deals():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM normalized_deals WHERE status = 'pending' ORDER BY created_at DESC")
    deals = cursor.fetchall()
    conn.close()
    return deals

def update_deal_status(deal_id, status, new_data=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if new_data:
        cursor.execute('''
            UPDATE normalized_deals 
            SET title=%s, brand=%s, original_price=%s, discount_price=%s, status=%s 
            WHERE id=%s
        ''', (new_data['title'], new_data['brand'], new_data['original_price'], new_data['discount_price'], status, deal_id))
    else:
        cursor.execute("UPDATE normalized_deals SET status = %s WHERE id = %s", (status, deal_id))
        
    conn.commit()
    conn.close()

st.title("🎯 AI Deal Hunter - Admin Dashboard")

deals = fetch_pending_deals()

if not deals:
    st.success("No pending deals to review. Great job!")
else:
    st.write(f"Showing **{len(deals)}** deals pending review.")
    
    for deal in deals:
        with st.expander(f"🔹 {deal['title']} (Score: {deal['confidence_score']})", expanded=False):
            col1, col2 = st.columns([1, 2])
            
            with col1:
                if deal['image_url']:
                    st.image(deal['image_url'], width=200)
                else:
                    st.write("No Image")
                st.markdown(f"[🔗 View Original Source]({deal['url']})")
                
            with col2:
                with st.form(key=f"form_{deal['id']}"):
                    title = st.text_input("Title", value=deal['title'])
                    brand = st.text_input("Brand", value=deal['brand'])
                    
                    col3, col4 = st.columns(2)
                    orig_price = col3.number_input("Original Price ($)", value=float(deal['original_price'] or 0.0), format="%.2f")
                    disc_price = col4.number_input("Discount Price ($)", value=float(deal['discount_price'] or 0.0), format="%.2f")
                    
                    btn_approve = st.form_submit_button("✅ Approve Post")
                    btn_reject = st.form_submit_button("❌ Reject Deal")
                    
                    if btn_approve:
                        update_deal_status(deal['id'], 'approved', {
                            'title': title,
                            'brand': brand,
                            'original_price': orig_price if orig_price > 0 else None,
                            'discount_price': disc_price if disc_price > 0 else None,
                        })
                        st.rerun()
                    
                    if btn_reject:
                        update_deal_status(deal['id'], 'rejected')
                        st.rerun()

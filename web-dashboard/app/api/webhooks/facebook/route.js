import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { sendTelegramAlert } from '@/lib/failsafe';

export const dynamic = 'force-dynamic';

// GET endpoint for Facebook Webhook Verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Facebook Webhook Verified.');
      return new NextResponse(challenge, { status: 200 }); // Must return raw challenge string
    } else {
      console.error('❌ Verification failed: Tokens do not match.');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// POST endpoint to receive Leadgen events and orchestrate Agent 9
export async function POST(request) {
  let connection;
  try {
    const body = await request.json();
    
    // Facebook verify signature checking could be added here for extra security

    if (body.object === 'page') {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadData = change.value;
            const leadId = leadData.leadgen_id;
            const pageId = leadData.page_id;
            const formId = leadData.form_id;

            console.log(`🧲 Webhook Received Lead! ID: ${leadId}`);

            // Skip processing if this is a test lead from FB tester tool
            // (FB may send test data without a form_id depending on testing method, but usually it's fine to process if Graph API returns info)
            
            // --- AGENT 9 (Lead Magnet) Execution ---
            // 1. Fetch Lead Details from Graph API
            const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
            const graphUrl = `https://graph.facebook.com/v19.0/${leadId}?access_token=${accessToken}`;
            
            const fbResponse = await fetch(graphUrl);
            const fbResult = await fbResponse.json();

            if (fbResult.error) {
               console.error('Agent 9 Graph API Error:', fbResult.error);
               await sendTelegramAlert(`❌ *Agent 9 (Leadgen) Error*\nFailed to fetch Lead details for ID: ${leadId}\nError: ${fbResult.error.message}`);
               continue;
            }

            // 2. Parse field data
            let email = null;
            let fullName = null;
            
            if (fbResult.field_data) {
                fbResult.field_data.forEach(field => {
                    if (field.name === 'email') email = field.values[0];
                    if (field.name === 'full_name') fullName = field.values[0];
                });
            }

            if (!email) {
                console.log(`⚠️ Agent 9: No email found in Lead ${leadId}. Skipping DB Insert.`);
                continue;
            }

            // 3. Save to Database
            connection = await getConnection();
            
            // Note: form_id or campaign info could be fetched with extra API calls if needed, using formId here for simplicity
            try {
               await connection.execute(
                  `INSERT IGNORE INTO leads (lead_id, email, full_name, campaign_name) VALUES (?, ?, ?, ?)`,
                  [leadId, email, fullName || 'Unknown', \`Form \${formId}\`]
               );
               console.log(`✅ Agent 9 Captured Lead: ${email}`);
               await sendTelegramAlert(`🧲 *New Lead Captured!* (Agent 9)\n\n👤 Name: ${fullName}\n📧 Email: \`${email}\``);
            } catch (dbErr) {
               console.error('Agent 9 DB Insert Error:', dbErr);
            }
          }
        }
      }
      // Respond to Meta quickly to acknowledge receipt
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not a page event', { status: 404 });
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
     if (connection) {
         try { await connection.end(); } catch (e) {}
     }
  }
}

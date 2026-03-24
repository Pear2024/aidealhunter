import { NextResponse } from 'next/server';
import { verifyAmazonIntegrity } from '@/lib/verifier';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { url, expectedPrice } = await request.json();
        const verification = await verifyAmazonIntegrity(url, expectedPrice);
        
        if (!verification.success) {
            return NextResponse.json({ error: verification.reason || 'Verification failed' }, { status: 400 });
        }

        return NextResponse.json(verification);

    } catch (error) {
        console.error('Verification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

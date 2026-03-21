'use client';
import { useEffect } from 'react';

export default function AdBanner({ dataAdSlot = 'auto', dataAdFormat = 'auto', dataFullWidthResponsive = true }) {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error('AdSense push error:', err);
        }
    }, []);

    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

    if (!clientId) {
        return (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', textAlign: 'center', color: '#888', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', margin: '2rem 0' }}>
                <p style={{ fontWeight: 'bold', color: '#ccc' }}>Google AdSense Placeholder</p>
                <small>Add <code>NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxx</code> to Vercel Environment Variables to activate.</small>
            </div>
        );
    }

    return (
        <div style={{ overflow: 'hidden', margin: '2rem 0', display: 'flex', justifyContent: 'center', width: '100%', minHeight: '90px', background: 'rgba(0,0,0,0.1)' }}>
            <ins className="adsbygoogle"
                style={{ display: 'block', width: '100%' }}
                data-ad-client={clientId}
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                data-full-width-responsive={dataFullWidthResponsive.toString()}></ins>
        </div>
    );
}

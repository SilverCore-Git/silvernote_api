import { Router, Request, Response } from 'express';
import { fetch } from '../assets/ts/db/db.silvernote.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import nodeFetch from 'node-fetch';


const router = Router();


router.get('/test', async (req: Request, res: Response) => {
    res.json({ test: true });
})


router.get('/db/length', async (req: Request, res: Response) => {
    
    const notesLength = await fetch('/notes/length');
    const tagsLength = await fetch('/tags/length');

    res.json({
        notes: notesLength,
        tags: tagsLength
    });

})


router.get('/clerk/users/length', async (req: Request, res: Response) => {

    const data = await clerkClient.users.getCount()

    res.json({
        users: data || null
    });

});



router.get('/status/sites', async (req: Request, res: Response) => {

    try {

        const apiKey = process.env.CRONITOR_API_KEY;

        if (!apiKey) {
            throw new Error('Missing CRONITOR_API_KEY in environment');
        }

        const auth = Buffer.from(`${apiKey}:`).toString('base64');

        const response = await nodeFetch('https://cronitor.io/api/monitors', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Cronitor API responded with ${response.status}`);
        }

        const data = await response.json();

        const sites = data.monitors.map((m: any) => {

            const latest = m.latest_event || {};
            const ssl = m.attributes?.site?.ssl || {};
            
            return {
                
                key: m.key,
                name: m.name.replace(/\(.*\)/, '').trim(),
                url: m.request?.url,
                is_online: m.passing && !m.paused,
                status: m.paused ? 'paused' : (m.passing ? 'operational' : 'degraded'),
                
                // Métriques de performance
                metrics: {
                    latency: latest.metrics?.duration ? Math.round(latest.metrics.duration * 1000) : null, // ms
                    last_check_region: latest.host || 'N/A',
                    last_check_at: m.latest_event?.stamp ? new Date(m.latest_event.stamp * 1000).toISOString() : null
                },

                // Sécurité (Très utile pour prévenir plutôt que guérir)
                ssl: {
                    expires_at: ssl.expires_at || null,
                    is_valid: ssl.expires_at ? new Date(ssl.expires_at) > new Date() : false,
                    provider: ssl.issued_by || 'Unknown'
                },

                // Configuration
                schedule: m.schedule,
                badge: m.public_badge_url

            };

        });

        res.json({
            success: true,
            data: sites
        });

    } catch (error: any) {
        console.error('Error fetching Cronitor status:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }

});


export default router;

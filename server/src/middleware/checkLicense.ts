import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { subscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const checkLicense = async (req: Request, res: Response, next: NextFunction) => {
    const { user_uid } = req.body; // Assuming user_uid is passed in body for now, or headers. 
    // In a real app, this might come from a decoded token (req.user). 
    // For this task, I'll check both body and headers.

    const uid = user_uid || req.headers['x-user-uid'];

    if (!uid) {
        return res.status(400).json({ error: 'User UID is required' });
    }

    try {
        const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.user_uid, uid as string),
        });

        if (!sub) {
            // If no subscription found, assume trial or no access. 
            // For this task, let's block.
            return res.status(403).json({ error: 'No subscription found.' });
        }

        if (sub.status === 'expired' || sub.status === 'suspended') {
            return res.status(403).json({
                error: 'Subscription expired. Access restricted. Please renew in GSM Control.'
            });
        }

        const now = new Date();
        if (sub.expires_at < now) {
            // Update status to expired if not already
            if (sub.status !== 'expired') {
                await db.update(subscriptions)
                    .set({ status: 'expired' })
                    .where(eq(subscriptions.id, sub.id));
            }
            return res.status(403).json({
                error: 'Subscription expired. Access restricted. Please renew in GSM Control.'
            });
        }

        next();
    } catch (error) {
        console.error('License check error:', error);
        res.status(500).json({ error: 'Internal server error during license check' });
    }
};

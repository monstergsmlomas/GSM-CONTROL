// Important: The 'export' keyword here is what fixes the crash
export type Subscription = {
    id: string;
    shopName: string;
    email: string;
    plan: 'Monthly' | 'Yearly';
    status: 'active' | 'trial' | 'expired';
    expiresAt: string;
};

export const mockSubscriptions: Subscription[] = [
    {
        id: '1',
        shopName: 'TechFix Centro',
        email: 'contacto@techfix.com',
        plan: 'Monthly',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 15).toISOString(),
    },
    {
        id: '2',
        shopName: 'MobiRepair',
        email: 'admin@mobirepair.net',
        plan: 'Yearly',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 300).toISOString(),
    },
    {
        id: '3',
        shopName: 'GSM Express',
        email: 'jorge@gsmexpress.ar',
        plan: 'Monthly',
        status: 'expired',
        expiresAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
];

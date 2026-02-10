import { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Search, RotateCw, ShieldCheck, Plus, Trash2, MessageCircle,
    AlertCircle, Ban, Download, History, BarChart3, Monitor, Laptop,
    Eye, XCircle, Pencil // Fixed: Added Pencil import
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type Subscription = {
    id: string;
    shopName: string;
    email: string;
    whatsapp: string;
    plan: 'Monthly' | 'Yearly';
    status: 'active' | 'trial' | 'expired' | 'banned';
    expiresAt: string;
    hwid?: string;
    max_devices?: number;
};

type Device = { id: string; name: string; last_seen: string; };

const Dashboard = () => {
    const [data, setData] = useState<Subscription[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog States
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [daysToAdd, setDaysToAdd] = useState<number>(30);
    const [devicesLimit, setDevicesLimit] = useState<number>(4);

    // Payment States
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentRef, setPaymentRef] = useState('');

    const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [currentUserDevices, setCurrentUserDevices] = useState<Device[]>([]);
    const [currentUserForDevices, setCurrentUserForDevices] = useState<string | null>(null);

    const [newUser, setNewUser] = useState({ shopName: '', email: '', whatsapp: '', plan: 'Monthly', max_devices: 4 });
    const [editingUser, setEditingUser] = useState<Subscription | null>(null);

    const loadData = () => {
        fetch('http://localhost:3001/api/subscriptions').then(res => res.json()).then(setData).catch(console.error);
    };

    useEffect(() => { loadData(); }, []);

    const getDevices = (hwidString?: string): Device[] => {
        try { return JSON.parse(hwidString || '[]'); } catch { return []; }
    };

    // --- ACTIONS ---

    const handleBackup = () => window.open('http://localhost:3001/api/backup', '_blank');

    const handleToggleBan = async (id: string, currentStatus: string) => {
        await fetch('http://localhost:3001/api/toggle-ban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, currentStatus })
        });
        loadData();
    };

    const handleRemoveDevice = async (deviceId: string) => {
        if (!currentUserForDevices) return;
        await fetch('http://localhost:3001/api/remove-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserForDevices, deviceId })
        });
        const updated = currentUserDevices.filter(d => d.id !== deviceId);
        setCurrentUserDevices(updated);
        loadData();
    };

    const openDeviceManager = (user: Subscription) => {
        setCurrentUserForDevices(user.id);
        setCurrentUserDevices(getDevices(user.hwid));
        setIsDeviceDialogOpen(true);
    };

    const openRenewDialog = (user: Subscription) => {
        setSelectedUser(user.id);
        setDevicesLimit(user.max_devices || 4);
        setDaysToAdd(30);
        setPaymentMethod('');
        setPaymentRef('');
        setIsRenewDialogOpen(true);
    };

    const openEditDialog = (user: Subscription) => {
        setEditingUser(user);
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        await fetch(`http://localhost:3001/api/subscriptions/${editingUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingUser)
        });
        setIsEditDialogOpen(false);
        loadData();
    };

    const handleRenewal = async () => {
        if (!selectedUser) return;
        const user = data.find(u => u.id === selectedUser);
        if (!user) return;

        const currentExpiry = new Date(user.expiresAt);
        const now = new Date();
        const baseDate = currentExpiry < now ? now : currentExpiry;
        baseDate.setDate(baseDate.getDate() + Number(daysToAdd));

        await fetch(`http://localhost:3001/api/subscriptions/${selectedUser}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'active',
                expiresAt: baseDate.toISOString(),
                paymentMethod,
                paymentRef
            })
        });

        await fetch(`http://localhost:3001/api/subscriptions/${selectedUser}/limit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_devices: Number(devicesLimit) })
        });

        setIsRenewDialogOpen(false);
        loadData();
    };

    const handleAddUser = async () => {
        if (!newUser.shopName || !newUser.email) return;
        const subscription = {
            ...newUser,
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000 * (newUser.plan === 'Monthly' ? 30 : 365)).toISOString(),
            paymentMethod,
            paymentRef
        };
        await fetch('http://localhost:3001/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        setNewUser({ shopName: '', email: '', whatsapp: '', plan: 'Monthly', max_devices: 4 });
        setPaymentMethod('');
        setPaymentRef('');
        setIsAddDialogOpen(false);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar usuario permanentemente?")) {
            await fetch(`http://localhost:3001/api/subscriptions/${id}`, { method: 'DELETE' });
            loadData();
        }
    };

    const openWhatsApp = (number: string) => {
        const cleanNumber = number.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
    };

    const filterData = (category: string) => {
        let filtered = data;
        if (category === 'active') filtered = data.filter(u => u.status === 'active' || u.status === 'trial');
        if (category === 'inactive') filtered = data.filter(u => u.status === 'expired' || u.status === 'banned');
        return filtered.filter(u => u.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">Activo</Badge>;
            case 'banned': return <Badge className="bg-red-600/20 text-red-500 border-red-600/50 border">BLOQUEADO</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const UserTable = ({ users }: { users: Subscription[] }) => (
        <Table>
            <TableHeader className="bg-zinc-950/30">
                <TableRow className="hover:bg-transparent border-zinc-800">
                    <TableHead className="text-zinc-500">Local</TableHead>
                    <TableHead className="text-zinc-500">Dispositivos</TableHead>
                    <TableHead className="text-zinc-500">Estado</TableHead>
                    <TableHead className="text-zinc-500">Vencimiento</TableHead>
                    <TableHead className="text-right text-zinc-500">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => {
                    const devices = getDevices(user.hwid);
                    const isFull = devices.length >= (user.max_devices || 4);
                    return (
                        <TableRow key={user.id} className={cn("border-zinc-800/50 hover:bg-zinc-800/30", user.status === 'banned' && "bg-red-950/10")}>
                            <TableCell className="font-medium text-zinc-300">
                                <div>{user.shopName}</div>
                                <div className="text-xs text-zinc-500">{user.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn("border-zinc-700 font-mono cursor-pointer hover:bg-zinc-800", isFull ? "text-amber-500" : "text-zinc-400")} onClick={() => openDeviceManager(user)}>
                                    <Laptop className="w-3 h-3 mr-1" /> {devices.length} / {user.max_devices || 4}
                                </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(user.status)}</TableCell>
                            <TableCell className="text-zinc-400 text-xs font-mono">{new Date(user.expiresAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleToggleBan(user.id, user.status)} className={cn("h-8 w-8 p-0", user.status === 'banned' ? "text-red-500" : "text-zinc-500")} title={user.status === 'banned' ? "Desbloquear" : "Bloquear"}><Ban className="h-4 w-4" /></Button>

                                    <Button variant="ghost" size="sm" onClick={() => openDeviceManager(user)} className="text-zinc-500 hover:text-blue-400 h-8 w-8 p-0" title="Gestionar Dispositivos"><Eye className="h-4 w-4" /></Button>

                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)} className="text-zinc-500 hover:text-indigo-400 h-8 w-8 p-0" title="Editar Datos"><Pencil className="h-4 w-4" /></Button>

                                    {user.whatsapp && <Button variant="ghost" size="sm" onClick={() => openWhatsApp(user.whatsapp)} className="text-zinc-500 hover:text-green-400 h-8 w-8 p-0" title="WhatsApp"><MessageCircle className="h-4 w-4" /></Button>}

                                    <Button variant="ghost" size="sm" onClick={() => openRenewDialog(user)} className="text-zinc-500 hover:text-emerald-400 h-8 w-8 p-0" title="Renovar"><RotateCw className="h-4 w-4" /></Button>

                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="text-zinc-500 hover:text-red-400 h-8 w-8 p-0" title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-800 pb-6 gap-4">
                    <div><h1 className="text-3xl font-bold tracking-tight text-white mb-2">GSM Control</h1><p className="text-zinc-400">Métricas y gestión de usuarios.</p></div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={handleBackup} className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800" title="Descargar Backup"><Download className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => window.location.href = '/activity'} className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800" title="Historial de Cambios"><History className="w-4 h-4" /></Button>
                        <Button variant="outline" onClick={() => window.location.href = '/metrics'} className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"><BarChart3 className="w-4 h-4 mr-2" /> Reportes</Button>
                        <Button onClick={() => { setIsAddDialogOpen(true); setPaymentMethod(''); setPaymentRef(''); }} className="bg-emerald-600 hover:bg-emerald-500 text-white"><Plus className="w-4 h-4 mr-2" /> Nueva</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard title="Total Usuarios" value={data.length.toString()} icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} color="emerald" />
                    <MetricCard title="Bloqueados" value={data.filter(u => u.status === 'banned').length.toString()} icon={<Ban className="w-5 h-5 text-rose-500" />} color="rose" />
                    <MetricCard title="Vencen Pronto" value={data.filter(u => new Date(u.expiresAt) < new Date(Date.now() + 86400000 * 7) && u.status === 'active').length.toString()} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} color="amber" />
                </div>

                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-xl">
                    <CardHeader className="border-b border-zinc-800/50 px-6 py-4 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <CardTitle className="text-lg font-medium text-zinc-200">Clientes</CardTitle>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input placeholder="Buscar..." className="pl-9 bg-zinc-950/50 border-zinc-800 text-zinc-200 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border border-zinc-800">
                                <TabsTrigger value="all">Todos</TabsTrigger>
                                <TabsTrigger value="active" className="data-[state=active]:bg-emerald-950 data-[state=active]:text-emerald-400">Activos</TabsTrigger>
                                <TabsTrigger value="inactive" className="data-[state=active]:bg-rose-950 data-[state=active]:text-rose-400">Inactivos</TabsTrigger>
                                <TabsTrigger value="banned" className="data-[state=active]:bg-red-950 data-[state=active]:text-red-400">Bloqueados</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all" className="mt-4"><UserTable users={filterData('all')} /></TabsContent>
                            <TabsContent value="active" className="mt-4"><UserTable users={filterData('active')} /></TabsContent>
                            <TabsContent value="inactive" className="mt-4"><UserTable users={filterData('inactive')} /></TabsContent>
                            <TabsContent value="banned" className="mt-4"><UserTable users={data.filter(u => u.status === 'banned')} /></TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* EDIT USER DIALOG */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="glass-card sm:max-w-[425px] border-zinc-700 bg-zinc-900 text-zinc-100">
                    <DialogHeader><DialogTitle>Editar Datos</DialogTitle><DialogDescription>Modificar información sin renovar.</DialogDescription></DialogHeader>
                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2"><label className="text-sm text-zinc-300">Local</label><Input value={editingUser.shopName} onChange={(e) => setEditingUser({ ...editingUser, shopName: e.target.value })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                            <div className="space-y-2"><label className="text-sm text-zinc-300">Email</label><Input value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                            <div className="space-y-2"><label className="text-sm text-zinc-300">WhatsApp</label><Input value={editingUser.whatsapp} onChange={(e) => setEditingUser({ ...editingUser, whatsapp: e.target.value })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                            <div className="space-y-2"><label className="text-sm text-zinc-300">Cupo Dispositivos</label><Input type="number" value={editingUser.max_devices} onChange={(e) => setEditingUser({ ...editingUser, max_devices: Number(e.target.value) })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                        </div>
                    )}
                    <DialogFooter><Button onClick={handleSaveEdit} className="bg-indigo-600 hover:bg-indigo-500 text-white">Guardar Cambios</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DEVICE MANAGER */}
            <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
                <DialogContent className="glass-card sm:max-w-[550px] border-zinc-700 bg-zinc-900 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Monitor className="w-5 h-5 text-blue-500" /> Gestión de Dispositivos</DialogTitle>
                        <DialogDescription className="text-zinc-400">Equipos vinculados. Cupo: {currentUserDevices.length} / {data.find(u => u.id === currentUserForDevices)?.max_devices || 4}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {currentUserDevices.length === 0 ? <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-md">Sin dispositivos.</div> :
                            <div className="space-y-2">{currentUserDevices.map((device, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg group hover:border-zinc-700"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-full"><Monitor className="w-4 h-4 text-blue-400" /></div><div><p className="text-sm font-medium text-zinc-200">{device.name}</p><p className="text-xs text-zinc-500">{new Date(device.last_seen).toLocaleString()}</p></div></div><Button variant="ghost" size="sm" onClick={() => handleRemoveDevice(device.id)} className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100"><XCircle className="w-5 h-5" /></Button></div>
                            ))}</div>
                        }
                    </div>
                    <DialogFooter><Button onClick={() => setIsDeviceDialogOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white">Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ADD DIALOG */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="glass-card sm:max-w-[425px] border-zinc-700 bg-zinc-900 text-zinc-100">
                    <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2"><label className="text-sm text-zinc-300">Local</label><Input value={newUser.shopName} onChange={(e) => setNewUser({ ...newUser, shopName: e.target.value })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                        <div className="space-y-2"><label className="text-sm text-zinc-300">Email</label><Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                        <div className="space-y-2"><label className="text-sm text-zinc-300">Cupo Dispositivos</label><Input type="number" value={newUser.max_devices} onChange={(e) => setNewUser({ ...newUser, max_devices: Number(e.target.value) })} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-300">Método Pago</label>
                                <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem><SelectItem value="MercadoPago">MercadoPago</SelectItem><SelectItem value="USDT">USDT</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><label className="text-sm text-zinc-300">Referencia</label><Input placeholder="#ID Transacción" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white" /></div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleAddUser} className="bg-emerald-600 hover:bg-emerald-500 text-white">Registrar Pago y Crear</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RENEW DIALOG */}
            <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
                <DialogContent className="glass-card sm:max-w-[425px] border-zinc-700 bg-zinc-900 text-zinc-100">
                    <DialogHeader><DialogTitle>Renovación y Pago</DialogTitle></DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm text-zinc-300">Días +</label><Input type="number" value={daysToAdd} onChange={(e) => setDaysToAdd(Number(e.target.value))} className="col-span-3 bg-zinc-950 border-zinc-700 text-white" /></div>

                        <div className="col-span-4 border-t border-zinc-800 pt-4 mt-2">
                            <p className="text-sm font-medium text-emerald-400 mb-3">Registrar Pago (Opcional)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white"><SelectValue placeholder="Método" /></SelectTrigger>
                                    <SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem><SelectItem value="MercadoPago">MercadoPago</SelectItem><SelectItem value="USDT">USDT</SelectItem></SelectContent>
                                </Select>
                                <Input placeholder="Ref / Nota" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleRenewal} className="bg-emerald-600 hover:bg-emerald-500 text-white">Confirmar Renovación</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const MetricCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: 'emerald' | 'amber' | 'rose' }) => {
    const colors = { emerald: 'border-t-emerald-500', amber: 'border-t-amber-500', rose: 'border-t-rose-500' };
    return (
        <Card className={cn("bg-zinc-900/50 backdrop-blur-sm border-zinc-800 border-t-2 shadow-lg", colors[color])}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400 flex justify-between items-center">{title} {icon}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-white">{value}</div></CardContent>
        </Card>
    )
}

export default Dashboard;

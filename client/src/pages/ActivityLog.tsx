import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, History, PlusCircle, Edit3, Trash2, Clock, User } from 'lucide-react';

type Log = {
    id: number;
    action: string;
    details: string;
    user: string;
    timestamp: string;
};

const ActivityLog = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<Log[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/logs')
            .then(res => res.json())
            .then(data => setLogs(data))
            .catch(err => console.error("Error fetching logs:", err));
    }, []);

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <PlusCircle className="w-5 h-5 text-emerald-500" />;
            case 'UPDATE': return <Edit3 className="w-5 h-5 text-blue-500" />;
            case 'DELETE': return <Trash2 className="w-5 h-5 text-rose-500" />;
            default: return <History className="w-5 h-5 text-zinc-500" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'UPDATE': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'DELETE': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="hover:bg-zinc-900">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <History className="w-6 h-6 text-indigo-500" /> Historial de Cambios
                            </h1>
                            <p className="text-zinc-400 text-sm">Registro de actividad y auditoría del sistema.</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        Últimos 50 eventos
                    </Badge>
                </div>

                {/* Logs List */}
                <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl">
                    <CardHeader className="pb-3 border-b border-zinc-800/50">
                        <CardTitle className="text-sm font-medium text-zinc-400">Línea de Tiempo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px]">
                            <div className="divide-y divide-zinc-800/50">
                                {logs.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-500">
                                        No hay actividad registrada aún.
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-zinc-800/20 transition-colors">
                                            <div className={`p-2 rounded-full border ${getActionColor(log.action)} bg-opacity-10`}>
                                                {getActionIcon(log.action)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-zinc-200">
                                                        {log.action === 'CREATE' && 'Nueva Suscripción'}
                                                        {log.action === 'UPDATE' && 'Actualización'}
                                                        {log.action === 'DELETE' && 'Eliminación'}
                                                    </p>
                                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-400">{log.details}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="secondary" className="bg-zinc-900 text-zinc-500 text-[10px] hover:bg-zinc-900 h-5">
                                                        <User className="w-3 h-3 mr-1" /> {log.user}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ActivityLog;

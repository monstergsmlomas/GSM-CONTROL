import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Subscription {
    id: number;
    user_uid: string;
    status: 'active' | 'trial' | 'expired' | 'suspended';
    plan_type: string;
    expires_at: string;
}

const SuperAdmin = () => {
    const [users, setUsers] = useState<Subscription[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [daysToAdd, setDaysToAdd] = useState<number>(30);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleRenewal = async () => {
        if (!selectedUser) return;

        try {
            await axios.post('http://localhost:3000/api/admin/renew', {
                user_uid: selectedUser,
                days: daysToAdd,
            });
            setIsDialogOpen(false);
            fetchUsers(); // Refresh list
        } catch (error) {
            console.error('Error renewing subscription:', error);
            alert('Failed to renew subscription');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'default'; // primary
            case 'trial':
                return 'secondary';
            case 'expired':
                return 'destructive';
            case 'suspended':
                return 'destructive'; // or maybe yellow/orange if available, but destructive is fine
            default:
                return 'outline';
        }
    };

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">GSM Control Panel</h1>
                <Button onClick={() => fetchUsers()}>Refresh</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User UID</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expires At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.user_uid}</TableCell>
                                    <TableCell>{user.plan_type}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusColor(user.status)}>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.expires_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog open={isDialogOpen && selectedUser === user.user_uid} onOpenChange={(open) => {
                                            setIsDialogOpen(open);
                                            if (open) setSelectedUser(user.user_uid);
                                            else setSelectedUser(null);
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    setSelectedUser(user.user_uid);
                                                    setIsDialogOpen(true);
                                                }}>
                                                    Renew
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Manual Renewal</DialogTitle>
                                                    <DialogDescription>
                                                        Add days to the subscription for {user.user_uid}.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <label htmlFor="days" className="text-right text-sm font-medium">
                                                            Days
                                                        </label>
                                                        <Input
                                                            id="days"
                                                            type="number"
                                                            value={daysToAdd}
                                                            onChange={(e) => setDaysToAdd(Number(e.target.value))}
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="button" onClick={handleRenewal}>
                                                        Confirm Renewal
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No subscriptions found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SuperAdmin;

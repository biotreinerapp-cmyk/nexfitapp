import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { useAuth } from "@/hooks/useAuth";

export function StoreNotificationCenter() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const {
        notifications,
        notificationsLoading,
        unreadCount,
        markAsRead,
        markAllAsRead,
    } = useUserNotifications(user?.id ?? null);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="relative h-10 w-10 text-muted-foreground hover:bg-white/5 hover:text-white"
                    aria-label="Central de notificações"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-black">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md border border-white/10 bg-black/90 backdrop-blur-2xl text-foreground sm:rounded-3xl">
                <DialogHeader className="pb-4 border-b border-white/5">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Central de Notificações
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Acompanhe avisos e comunicados importantes do sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-white">Últimas Mensagens</p>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/10"
                                disabled={unreadCount === 0 || markAllAsRead.isPending}
                                onClick={() => markAllAsRead.mutate()}
                            >
                                Marcar tudo como lido
                            </Button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {notificationsLoading ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <p className="text-[10px] text-muted-foreground">Carregando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-50">
                                    <Bell className="h-6 w-6 text-muted-foreground" />
                                    <p className="text-[11px] text-muted-foreground">Nenhuma notificação ainda.</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {notifications.map((n) => {
                                        const unread = !n.read_at;
                                        return (
                                            <li
                                                key={n.id}
                                                className={`rounded-xl border p-3 transition-colors ${unread ? "border-primary/20 bg-primary/5" : "border-white/5 bg-transparent hover:bg-white/5"}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            {unread && <span className="flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                                                            <p className={`truncate text-xs ${unread ? 'font-bold text-white' : 'font-medium text-muted-foreground'}`}>{n.title}</p>
                                                        </div>
                                                        {n.body && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{n.body}</p>}
                                                        <p className="mt-2 text-[10px] font-medium text-white/20">
                                                            {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 flex-col gap-1">
                                                        {unread && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 px-2 text-[9px] text-primary hover:bg-primary/10 hover:text-primary"
                                                                onClick={() => markAsRead.mutate(n.id)}
                                                                disabled={markAsRead.isPending}
                                                            >
                                                                Marcar lido
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

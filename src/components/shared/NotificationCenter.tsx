import { useState } from "react";
import { ChevronDown, ChevronUp, Bell } from "lucide-react";
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

export function NotificationCenter() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

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

            <DialogContent className="max-w-md border border-white/10 bg-black/90 backdrop-blur-2xl text-foreground sm:rounded-3xl z-[100] max-h-[85vh] flex flex-col">
                <DialogHeader className="pb-4 border-b border-white/5 shrink-0">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Central de Notificações
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Acompanhe avisos e comunicados importantes do sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-2 py-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/50">Últimas Mensagens</p>
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

                    <div className="max-h-[350px] overflow-y-auto px-1 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                            <ul className="space-y-3">
                                {notifications.map((n) => {
                                    const unread = !n.read_at;
                                    const isExpanded = expandedId === n.id;

                                    return (
                                        <li
                                            key={n.id}
                                            className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 cursor-pointer group ${unread ? "border-primary/30 bg-primary/5 shadow-[0_0_15px_rgba(34,197,94,0.05)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}
                                            onClick={() => setExpandedId(isExpanded ? null : n.id)}
                                        >
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="flex items-start gap-2 pt-0.5">
                                                        {unread && (
                                                            <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_5px_rgba(34,197,94,0.5)]" aria-hidden />
                                                        )}
                                                        <p className={`text-sm ${unread ? 'font-bold text-white' : 'font-semibold text-white/80'}`}>{n.title}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center justify-center h-6 w-6 rounded-full bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white transition-colors">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </div>
                                                </div>

                                                {n.body && (
                                                    <div className={`mt-1 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-10 opacity-80'}`}>
                                                        <p className={`text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                                            {n.body}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="mt-3 flex items-center justify-between">
                                                    <p className="text-[10px] font-medium text-white/30">
                                                        {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}
                                                    </p>
                                                    {unread && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 px-2 text-[10px] font-semibold text-primary/80 hover:bg-primary/20 hover:text-primary z-10 relative"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead.mutate(n.id);
                                                            }}
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
            </DialogContent>
        </Dialog>
    );
}

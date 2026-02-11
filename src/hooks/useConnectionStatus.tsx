import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ConnectionStatusOptions = {
  /**
   * Quando true, não exibe toast persistente nem solicita permissão de notificação.
   * Útil para páginas que só precisam do booleano (badge).
   */
  silent?: boolean;
};

export function useConnectionStatus(options: ConnectionStatusOptions = {}) {
  const { silent = false } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[ConnectionStatus] Online');

      // Ao voltar online, removemos qualquer toast de offline.
      if (!silent) {
        toast.dismiss('offline-status');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[ConnectionStatus] Offline');

      if (silent) return;

      // Toast persistente estilizado
      toast.info(
        'Você está offline, mas fica tranquilo! Seus dados serão salvos e atualizados assim que você se conectar à internet.',
        {
          duration: Infinity,
          id: 'offline-status',
          classNames: {
            toast: 'bg-gradient-to-r from-emerald-900/95 to-emerald-800/95 border-emerald-700',
            title: 'text-emerald-100 font-semibold',
            description: 'text-emerald-200',
          },
        }
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verifica status inicial
    if (!navigator.onLine) {
      handleOffline();
    }

    // Solicita permissão para notificações (apenas no gerenciador global)
    if (!silent && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('[ConnectionStatus] Permissão de notificação:', permission);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (!silent) {
        toast.dismiss('offline-status');
      }
    };
  }, [silent]);

  return { isOnline };
}

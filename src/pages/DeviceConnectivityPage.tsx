import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Watch, Bluetooth, RefreshCw, Smartphone, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";

interface ConnectedDeviceInfo {
  id: string;
  name: string;
}

const DeviceConnectivityPage = () => {
  const navigate = useNavigate();

  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<ConnectedDeviceInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">(
    "disconnected",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bluetoothDevice, setBluetoothDevice] = useState<any | null>(null);

  useEffect(() => {
    setIsSupported(typeof navigator !== "undefined" && !!(navigator as any).bluetooth);
  }, []);

  const handleConnectClick = async () => {
    if (!isSupported) {
      setErrorMessage("Bluetooth não é suportado neste dispositivo ou navegador.");
      return;
    }

    setErrorMessage(null);
    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: false,
        filters: [
          { services: [0x180d] }, // Heart Rate Service
          { services: [0x1826] }, // Fitness Machine Service
        ],
      });

      if (!device) {
        setConnectionStatus("disconnected");
        return;
      }

      setBluetoothDevice(device);
      setConnectedDevice({ id: device.id, name: device.name || "Dispositivo desconhecido" });
      setConnectionStatus("connected");
    } catch (error: any) {
      if (error?.name === "NotFoundError") {
        setConnectionStatus("disconnected");
      } else {
        console.error("Erro ao conectar via Web Bluetooth", error);
        setErrorMessage("Não foi possível conectar ao dispositivo. Tente novamente.");
        setConnectionStatus("disconnected");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectClick = async () => {
    try {
      if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
      }
    } catch (error) {
      console.error("Erro ao desconectar dispositivo Bluetooth", error);
    } finally {
      setBluetoothDevice(null);
      setConnectedDevice(null);
      setConnectionStatus("disconnected");
    }
  };

  const hasDeviceConnected = connectedDevice != null && connectionStatus === "connected";

  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-32 pt-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-64 w-64 rounded-full bg-accent/5 blur-[100px]" />

      <header className="mb-6 flex items-center gap-3 relative z-10">
        <BackIconButton to="/aluno/dashboard" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Configuração</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-black uppercase tracking-tighter leading-none">Conectividade</h1>
        </div>
      </header>

      {!isSupported && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-destructive" />
            <p className="text-xs font-medium text-destructive">
              Bluetooth não suportado neste dispositivo.
            </p>
          </div>
        </div>
      )}

      <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {!hasDeviceConnected ? (
          <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <Watch className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black uppercase tracking-tight">Nenhum Dispositivo</h2>
                <p className="text-xs text-muted-foreground font-medium max-w-[200px] mx-auto">
                  Conecte seu smartwatch ou sensor cardíaco para monitoramento real-time.
                </p>
              </div>

              <div className="w-full pt-2">
                <Button
                  variant="premium"
                  className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/10"
                  onClick={handleConnectClick}
                  disabled={isConnecting || !isSupported}
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="mr-2 h-4 w-4" />
                      Conectar Dispositivo
                    </>
                  )}
                </Button>
                {errorMessage && (
                  <p className="mt-3 text-[10px] font-bold text-destructive uppercase tracking-wide">{errorMessage}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-primary/5 p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Bluetooth className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-black uppercase tracking-tight text-primary">{connectedDevice.name}</h2>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Conectado</span>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground font-medium max-w-[240px] mx-auto">
                Dispositivo pronto para transmitir dados de frequência cardíaca e treino.
              </p>

              <div className="w-full pt-4 grid gap-3">
                <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 w-full" disabled>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ver Dados (Em Breve)</span>
                </Button>

                <Button
                  variant="ghost"
                  className="h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px] font-black uppercase tracking-widest"
                  onClick={handleDisconnectClick}
                >
                  Desconectar
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <FloatingNavIsland />
    </main>
  );
};

export default DeviceConnectivityPage;

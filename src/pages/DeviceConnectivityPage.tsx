import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Watch, Bluetooth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackIconButton } from "@/components/navigation/BackIconButton";

interface ConnectedDeviceInfo {
  id: string;
  name: string;
}

const DeviceConnectivityPage = () => {
  const navigate = useNavigate();

  const [isSupported, setIsSupported] = useState(
    typeof navigator !== "undefined" && !!(navigator as any).bluetooth,
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<ConnectedDeviceInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">(
    "disconnected",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bluetoothDevice, setBluetoothDevice] = useState<any | null>(null);

  const handleConnectClick = async () => {
    if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
      setIsSupported(false);
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
        // Usuário cancelou o seletor de dispositivo
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
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      {/* Header */}
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/dashboard" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Dispositivos conectados</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Gerencie seu smartwatch e sensores de treino.
          </p>
        </div>
      </header>

      {!isSupported && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Bluetooth não é suportado neste dispositivo ou navegador.
        </div>
      )}

      <section className="space-y-3">
        {!hasDeviceConnected ? (
          <Card className="border border-accent/40 bg-card/80">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/60 bg-background/80">
                <Watch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Nenhum dispositivo conectado</CardTitle>
                <CardDescription className="text-[11px]">
                  Conecte seu smartwatch ou sensor de frequência cardíaca.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-1">
              <Button
                type="button"
                className="w-full"
                onClick={handleConnectClick}
                disabled={isConnecting || !isSupported}
              >
                <Bluetooth className="mr-2 h-4 w-4" />
                {isConnecting ? "Conectando..." : "Conectar dispositivo"}
              </Button>
              {errorMessage && (
                <p className="mt-2 text-[11px] text-destructive">{errorMessage}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-primary/60 bg-card/80">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/70 bg-primary/10">
                <Bluetooth className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">{connectedDevice.name}</CardTitle>
                <CardDescription className="text-[11px] text-primary">
                  Conectado
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-1 text-xs">
              <p className="text-[11px] text-muted-foreground">
                Seu dispositivo está conectado via Bluetooth. Transmissão de dados em tempo real e métricas
                avançadas estarão disponíveis em uma atualização futura.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleDisconnectClick}
                >
                  Desconectar dispositivo
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
                  Ver dados em tempo real (em breve)
                </Button>
              </div>
              {errorMessage && (
                <p className="mt-1 text-[11px] text-destructive">{errorMessage}</p>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
};

export default DeviceConnectivityPage;

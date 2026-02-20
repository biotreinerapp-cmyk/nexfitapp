
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ForbiddenPage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <ShieldAlert size={40} />
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Acesso Negado
            </h1>
            <p className="mb-8 max-w-md text-muted-foreground">
                Você não tem as permissões necessárias para acessar esta área do sistema.
                Se acredita que isso é um erro, entre em contato com o administrador.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                    onClick={() => navigate(-1)}
                    variant="outline"
                    className="border-white/10"
                >
                    Voltar
                </Button>
                <Button onClick={() => navigate("/")}>
                    Página Inicial
                </Button>
            </div>
        </div>
    );
}

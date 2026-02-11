import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackIconButton } from "@/components/navigation/BackIconButton";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  displayName: z.string().trim().min(2, "Informe um nome de exibição"),
  dataNascimento: z.string().optional(),
  genero: z.string().optional(),
  alturaCm: z.coerce.number().min(50).max(250).optional(),
  pesoKg: z.coerce.number().min(20).max(300).optional(),
  // Usado como "frase curta" no card de saudação.
  bio: z.string().trim().max(54, "Use no máximo 54 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

function withTimeout<T>(promise: PromiseLike<T>, ms = 15000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

const AlunoEditarPerfilPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      displayName: "",
      dataNascimento: "",
      genero: "",
      alturaCm: undefined,
      pesoKg: undefined,
      bio: "",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("nome, display_name, data_nascimento, genero, altura_cm, peso_kg, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast({
          title: "Erro ao carregar perfil",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        form.reset({
          nome: data.nome ?? "",
          displayName: data.display_name ?? "",
          dataNascimento: data.data_nascimento ?? "",
          genero: data.genero ?? "",
          alturaCm: data.altura_cm ?? undefined,
          pesoKg: data.peso_kg ?? undefined,
          bio: data.bio ?? "",
        });
        setAvatarUrl(data.avatar_url ?? null);
      }
    };

    void loadProfile();
  }, [user, form, toast]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user) return;
      const file = event.target.files?.[0];
      if (!file) return;

      if (!navigator.onLine) {
        toast({
          title: "Sem conexão",
          description: "Conecte-se à internet para enviar sua foto.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await withTimeout(
        supabase.storage.from("avatars").upload(filePath, file, { upsert: true }),
        20000
      );

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error("Não foi possível gerar a URL pública do avatar.");
      }

      setAvatarUrl(publicUrl);

      const { error: updateError } = await withTimeout(
        supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id),
        15000
      );

      if (updateError) throw updateError;

      toast({ title: "Foto atualizada" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao enviar foto",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    try {
      if (!navigator.onLine) {
        toast({
          title: "Sem conexão",
          description: "Conecte-se à internet para salvar suas alterações.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await withTimeout(
        supabase
          .from("profiles")
          .update({
            nome: values.nome,
            display_name: values.displayName,
            data_nascimento: values.dataNascimento || null,
            genero: values.genero || null,
            altura_cm: values.alturaCm ?? null,
            peso_kg: values.pesoKg ?? null,
            bio: values.bio || null,
          })
          .eq("id", user.id),
        15000
      );

      if (error) {
        console.error(error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar suas alterações.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Perfil atualizado" });
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast({
        title: "Falha de conexão",
        description: "Não foi possível salvar agora. Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const displayName =
    (form.getValues("displayName") || user?.user_metadata?.full_name || user?.email?.split("@")[0]) ?? "Aluno";

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/perfil" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Editar perfil</h1>
          <p className="mt-1 text-xs text-muted-foreground">Atualize seus dados pessoais no Nexfit.</p>
        </div>
      </header>

      <section className="mb-4">
        <Card className="border border-accent/40 bg-card/80">
          <CardContent className="flex items-center gap-4 pt-4 pb-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {avatarUrl && <AvatarImage key={avatarUrl} src={avatarUrl} alt="Foto de perfil" />}
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              >
                <Camera className="h-3 w-3" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="flex flex-col text-sm">
              <span className="font-medium text-foreground">{displayName}</span>
              <span className="text-xs text-muted-foreground">Essa é a forma como você aparece no app.</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Informações básicas</h2>
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Como está no seu documento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de exibição</FormLabel>
                  <FormControl>
                    <Input placeholder="Como você quer ser chamado(a)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="dataNascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="nao_binario">Não-binário</SelectItem>
                        <SelectItem value="trans_feminino">Mulher trans</SelectItem>
                        <SelectItem value="trans_masculino">Homem trans</SelectItem>
                        <SelectItem value="genero_fluido">Gênero fluido</SelectItem>
                        <SelectItem value="agenero">Agênero</SelectItem>
                        <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Medidas</h2>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="alturaCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" placeholder="Ex: 175" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pesoKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" placeholder="Ex: 70" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-3 pb-4">
            <h2 className="text-sm font-medium text-foreground">Frase do card</h2>
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uma frase curta (opcional)</FormLabel>
                  <FormControl>
                    <Input maxLength={54} placeholder="Ex: Foco em constância e evolução" {...field} />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">Máx. 54 caracteres — aparece abaixo do seu nome.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="sticky bottom-0 left-0 right-0 mt-auto bg-gradient-to-t from-background via-background/90 to-transparent pb-4 pt-4">
            <Button type="submit" className="h-11 w-full text-sm font-medium" loading={form.formState.isSubmitting}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </Form>
    </main>
  );
};

export default AlunoEditarPerfilPage;


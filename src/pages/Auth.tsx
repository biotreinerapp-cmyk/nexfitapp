import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff, Smartphone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import logoNexfit from "@/assets/nexfit-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeedback } from "@/hooks/useFeedback";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { mapLoginError } from "@/lib/authErrors";

const emailToDisplayName = (email?: string | null) => {
  const e = (email ?? "").trim();
  if (!e) return null;
  const prefix = e.split("@")[0]?.trim();
  return prefix ? prefix : null;
};

const schema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  // Importante: no modo "Esqueci minha senha" o campo senha não existe na UI.
  // Então tratamos string vazia como undefined para não bloquear o submit.
  password: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(6, "Mínimo de 6 caracteres").max(128, "Senha muito longa").optional(),
  ),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(6, "Mínimo de 6 caracteres").max(128, "Senha muito longa"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema> & {
  confirmPassword?: string;
};

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdatePasswordMode, setIsUpdatePasswordMode] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { withFeedback } = useFeedback();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { showInstallBanner, handleInstallClick, handleCloseBanner } = usePwaInstallPrompt();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    formState: { errors: updateErrors, isSubmitting: isUpdatingPassword },
  } = useForm<UpdatePasswordValues>({ resolver: zodResolver(updatePasswordSchema) });

  useEffect(() => {
    // Se chegou via link de recuperação (redefinição de senha), mostramos a tela de nova senha.
    // Supabase pode enviar parâmetros via hash (#...) ou via query (?...) dependendo do fluxo.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const recoveryType = hashParams.get("type") ?? searchParams.get("type");

    if (recoveryType === "recovery") {
      setIsUpdatePasswordMode(true);
      setIsResetMode(false);
      setIsLogin(true);
    }
  }, []);

  useEffect(() => {
    // Quando já há usuário logado, redireciona conforme a role, priorizando o admin master por e-mail
    // (Mas evita redirecionar durante a troca de senha)
    if (!user || roleLoading || isUpdatePasswordMode) return;

    const isMasterAdmin = user.email === "biotreinerapp@gmail.com";

    if (isMasterAdmin) {
      navigate("/admin-master", { replace: true });
      return;
    }

    // Check if user is store_owner
    const checkStoreOwner = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "store_owner")
        .maybeSingle();

      if (data) {
        navigate("/loja/dashboard", { replace: true });
      } else {
        navigate("/aluno/dashboard", { replace: true });
      }
    };

    checkStoreOwner();
  }, [user, isAdmin, roleLoading, navigate, isUpdatePasswordMode]);

  const handleResendConfirmation = async (emailOverride?: string) => {
    const email = (emailOverride ?? verifyEmail ?? watch("email"))?.trim();

    // Mensagem intencionalmente genérica (evita enumerar usuários/contas)
    const successMsg = "Se o e-mail existir e ainda não estiver confirmado, enviamos um novo link.";

    if (!email) {
      toast({ title: "Informe seu e-mail", description: "Digite o e-mail usado no cadastro.", variant: "destructive" });
      return;
    }

    // Valida o formato do email sem depender do submit do form
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast({ title: "E-mail inválido", description: "Verifique o formato do e-mail e tente novamente.", variant: "destructive" });
      return;
    }

    if (isResendingConfirmation) return;

    setIsResendingConfirmation(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await (supabase.auth as any).resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) throw error;

      toast({ title: "E-mail reenviado", description: successMsg });
    } catch (err: any) {
      toast({
        title: "Não foi possível reenviar",
        description: err?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    // No login/cadastro, senha é obrigatória (no modo reset ela não é exibida).
    if (!isResetMode && (!values.password || String(values.password).trim().length === 0)) {
      toast({ title: "Informe sua senha", description: "Digite sua senha para continuar.", variant: "destructive" });
      return;
    }

    if (isResetMode) {
      await withFeedback(
        async () => {
          const redirectUrl = `${window.location.origin}/auth`;
          const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: redirectUrl,
          });

          if (error) {
            throw error;
          }
        },
        {
          loading: "Enviando link de redefinição...",
          success: "E-mail enviado com sucesso",
          error: undefined,
        },
      ).catch((error) => {
        if (error) {
          toast({ title: "Erro ao enviar link", description: error.message, variant: "destructive" });
        }
      });

      reset({ email: values.email });
      setIsResetMode(false);
      setIsLogin(true);
      return;
    }

    if (isLogin) {
      await withFeedback(
        async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });

          if (error) throw error;

          // Valida status da conta (dados no profiles)
          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("ativo, subscription_plan, display_name")
              .eq("id", data.user.id)
              .maybeSingle();

            if (profileError) {
              // Não bloqueia login, mas registra para diagnóstico
              console.error("[auth/login] Falha ao carregar profile", { profileError });
            }

            if (profile && profile.ativo === false) {
              await supabase.auth.signOut();
              toast({
                title: "Conta inativa",
                description: "Sua conta está desativada. Entre em contato com o suporte.",
                variant: "destructive",
              });
              // lança para encerrar o fluxo e garantir que o botão volte ao normal
              throw new Error("ACCOUNT_INACTIVE");
            }

            // Garante consistência: se não houver display_name ainda, popula automaticamente pelo prefixo do e-mail.
            const candidateDisplayName = emailToDisplayName(data.user.email);
            const needsDisplayName = !profile?.display_name || String(profile.display_name).trim().length === 0;
            if (candidateDisplayName && needsDisplayName) {
              const { error: ensureErr } = await supabase
                .from("profiles")
                .upsert(
                  {
                    id: data.user.id,
                    display_name: candidateDisplayName,
                    // Mantém compatibilidade com o AdminMaster legado que lê profiles.email.
                    email: data.user.email ?? null,
                  } as any,
                  { onConflict: "id" },
                );

              if (ensureErr) {
                // Não bloqueia login; apenas log para diagnóstico.
                console.error("[auth/login] Falha ao auto-preencher display_name", { ensureErr });
              }
            }
          } catch (e) {
            if ((e as any)?.message === "ACCOUNT_INACTIVE") throw e;
            console.error("[auth/login] Erro inesperado ao validar perfil", e);
          }

          return data;
        },
        {
          loading: "Entrando...",
          success: "Bem-vindo de volta!",
          error: false,
        },
      ).catch((err) => {
        const mapped = mapLoginError(err);

        // Fluxo específico: e-mail não confirmado → mostra tela de reenvio
        if (mapped.code === "EMAIL_NOT_CONFIRMED") {
          setVerifyEmail(values.email);
        }

        // Log técnico (para debug)
        console.error("[auth/login]", {
          code: mapped.code,
          original: err,
        });

        // UX: nunca exibir genérico se houver erro conhecido
        toast({
          title: mapped.code === "INVALID_CREDENTIALS" ? "Não foi possível entrar" : "Erro ao entrar",
          description: mapped.message,
          variant: "destructive",
        });
      });

      // Após login, o listener de auth + hook de role fará o redirecionamento correto
    } else {
      await withFeedback(
        async () => {
          const redirectUrl = `${window.location.origin}/`;
          const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: { emailRedirectTo: redirectUrl },
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            await (supabase as any).from("user_roles").insert({ user_id: data.user.id, role: "aluno" });
          }
        },
        {
          loading: "Criando conta...",
          success: "Cadastro realizado com sucesso",
          error: undefined,
        },
      ).catch((error) => {
        if (error) {
          toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
        }
      });

      setVerifyEmail(values.email);
      setIsLogin(true);
    }
  };

  const onUpdatePassword = async (values: UpdatePasswordValues) => {
    await withFeedback(
      async () => {
        const { error } = await supabase.auth.updateUser({ password: values.password });
        if (error) throw error;
      },
      {
        loading: "Atualizando senha...",
        success: "Senha atualizada com sucesso",
        error: undefined,
      },
    ).catch((error) => {
      if (error) toast({ title: "Erro ao atualizar senha", description: error.message, variant: "destructive" });
    });

    // Limpa estado/URL e volta para fluxo normal
    resetUpdate({ password: "", confirmPassword: "" });
    window.history.replaceState({}, document.title, "/auth");
    setIsUpdatePasswordMode(false);
    setIsLogin(true);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 pb-16">
      <Card className="w-full max-w-sm border border-accent/40 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col items-center gap-4 pb-6">
          <img
            src={logoNexfit}
            alt="Logo Nexfit"
            className="h-40 w-auto drop-shadow-lg"
            loading="lazy"
          />
        </CardHeader>
        <CardContent>
          {isUpdatePasswordMode ? (
            <section className="space-y-4">
              <header className="space-y-1 text-center">
                <h1 className="text-lg font-semibold text-foreground">Definir nova senha</h1>
                <p className="text-xs text-muted-foreground">Digite sua nova senha para concluir a recuperação.</p>
              </header>

              <form onSubmit={handleSubmitUpdate(onUpdatePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...registerUpdate("password")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {updateErrors.password && <p className="text-xs text-destructive">{updateErrors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...registerUpdate("confirmPassword")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {updateErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{updateErrors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" loading={isUpdatingPassword}>
                  Salvar nova senha
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    resetUpdate({ password: "", confirmPassword: "" });
                    window.history.replaceState({}, document.title, "/auth");
                    setIsUpdatePasswordMode(false);
                  }}
                >
                  Cancelar
                </Button>
              </form>
            </section>
          ) : verifyEmail ? (
            <section className="space-y-4">
              <header className="space-y-1 text-center">
                <h1 className="text-lg font-semibold text-foreground">Verifique seu e-mail</h1>
                <p className="text-xs text-muted-foreground">
                  Enviamos um link de confirmação para <span className="font-medium text-foreground">{verifyEmail}</span>.
                </p>
              </header>

              <div className="space-y-2 rounded-xl border border-border bg-background/60 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Se não encontrar o e-mail:</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Confira a caixa de <strong>spam</strong> / <strong>lixo eletrônico</strong>.
                  </li>
                  <li>Pesquise por “Supabase” ou “Nexfit”.</li>
                  <li>
                    Se você usa domínio corporativo, peça para liberar/whitelist o remetente do provedor de e-mail do seu
                    projeto.
                  </li>
                </ul>
              </div>

              <Button
                type="button"
                className="w-full"
                loading={isResendingConfirmation}
                onClick={() => handleResendConfirmation(verifyEmail)}
              >
                Reenviar e-mail de confirmação
              </Button>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setVerifyEmail(null);
                    setIsLogin(true);
                    setIsResetMode(false);
                    reset({ email: verifyEmail });
                  }}
                >
                  Já confirmei, voltar para entrar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setVerifyEmail(null);
                    setIsLogin(false);
                    setIsResetMode(false);
                  }}
                >
                  Trocar e-mail / criar outra conta
                </Button>
              </div>
            </section>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                {!isResetMode && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          {...register("password")}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((prev) => !prev)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                    </div>
                    {!isLogin && (
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar senha</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            {...register("confirmPassword", {
                              validate: (value) => {
                                if (isLogin) return true;
                                if (!value) return "Confirme sua senha";
                                if (value !== watch("password")) return "As senhas não coincidem";
                                return true;
                              },
                            })}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-xs text-destructive">{errors.confirmPassword.message as string}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                <Button type="submit" className="mt-2 w-full" loading={isSubmitting}>
                  {isResetMode ? "Enviar link de redefinição" : isLogin ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <div className="mt-4 space-y-2 text-center text-xs text-muted-foreground">
                <button
                  type="button"
                  className="w-full hover:text-foreground"
                  onClick={() => {
                    setIsResetMode((prev) => !prev);
                    if (!isResetMode) {
                      setIsLogin(true);
                    }
                  }}
                >
                  {isResetMode ? "Voltar para entrar" : "Esqueci minha senha"}
                </button>
                {!isResetMode && (
                  <button type="button" className="w-full hover:text-foreground" onClick={() => setIsLogin((prev) => !prev)}>
                    {isLogin ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
                  </button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 gap-2 rounded-full px-8 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_hsl(var(--primary)/0.9)]"
        onClick={handleInstallClick}
      >
        <Smartphone className="h-5 w-5" />
        Instalar aplicativo
      </Button>

      <PwaInstallBanner showInstallBanner={showInstallBanner} onInstall={handleInstallClick} onClose={handleCloseBanner} />
    </main>
  );
};

export default AuthPage;

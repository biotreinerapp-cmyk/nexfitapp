import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff, Smartphone, Dumbbell, ArrowRight, Check, Droplets, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import logoNexfit from "@/assets/nexfit-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeedback } from "@/hooks/useFeedback";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { mapLoginError } from "@/lib/authErrors";
import { PremiumBackground } from "@/components/ui/premium-background";

import { IOSInstallModal } from "@/components/modals/IOSInstallModal";

// --- Types & Schemas ---

const emailToDisplayName = (email?: string | null) => {
  const e = (email ?? "").trim();
  if (!e) return null;
  const prefix = e.split("@")[0]?.trim();
  return prefix ? prefix : null;
};

const schema = z.object({
  email: z.string().trim().email("E-mail inválido"),
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
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdatePasswordMode, setIsUpdatePasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Background Image State
  const [bgImage, setBgImage] = useState<string>("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { withFeedback } = useFeedback();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { showInstallBanner, handleInstallClick, handleCloseBanner, isIOS, deferredPrompt } = usePwaInstallPrompt();

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

  // Load the generated background image
  useEffect(() => {
    // We try to load the artifact image if available, otherwise fallback
    // In a real scenario we might have a fixed path, for now we look for the artifact
    // This is a dynamic check during dev, you might want a static import in prod
    const loadBg = async () => {
      // Using a specific high-quality placeholder or the artifact if known
      // For now, let's use a nice gradient provided by PremiumBackground but
      // we can overlay an image if we have the URL.
      // We will rely on PremiumBackground's default for now, or inject the artifact URL if known.
    };
    loadBg();
  }, []);

  useEffect(() => {
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
    if (!user || roleLoading || isUpdatePasswordMode) return;

    const isMasterAdmin = user.email === "biotreinerapp@gmail.com";

    if (isMasterAdmin) {
      navigate("/admin", { replace: true });
      return;
    }

    const checkUserRoleAndRedirect = async () => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = roleData?.map(r => r.role) || [];

      if (roles.includes("store_owner")) {
        navigate("/loja/dashboard", { replace: true });
      } else if (roles.includes("professional")) {
        // Check if professional has completed at least the first step of onboarding (name/specialty/service)
        const { data: profData } = await supabase
          .from("professionals")
          .select("telemedicina_servico_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profData?.telemedicina_servico_id) {
          navigate("/professional/dashboard", { replace: true });
        } else {
          navigate("/professional/onboarding", { replace: true });
        }
      } else {
        navigate("/aluno/dashboard", { replace: true });
      }
    };

    checkUserRoleAndRedirect();
  }, [user, isAdmin, roleLoading, navigate, isUpdatePasswordMode]);

  const handleResendConfirmation = async (emailOverride?: string) => {
    const email = (emailOverride ?? verifyEmail ?? watch("email"))?.trim();
    const successMsg = "Se o e-mail existir e ainda não estiver confirmado, enviamos um novo link.";

    if (!email) {
      toast({ title: "Informe seu e-mail", description: "Digite o e-mail usado no cadastro.", variant: "destructive" });
      return;
    }

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
          if (error) throw error;
        },
        { loading: "Enviando link...", success: "E-mail enviado com sucesso", error: undefined }
      ).catch((error) => {
        if (error) toast({ title: "Erro ao enviar link", description: error.message, variant: "destructive" });
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

          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("ativo, subscription_plan, display_name")
              .eq("id", data.user.id)
              .maybeSingle();

            if (profileError) console.error("[auth/login] Falha ao carregar profile", { profileError });

            if (profile && profile.ativo === false) {
              await supabase.auth.signOut();
              toast({ title: "Conta inativa", description: "Entre em contato com o suporte.", variant: "destructive" });
              throw new Error("ACCOUNT_INACTIVE");
            }

            const candidateDisplayName = emailToDisplayName(data.user.email);
            const needsDisplayName = !profile?.display_name || String(profile.display_name).trim().length === 0;
            if (candidateDisplayName && needsDisplayName) {
              await supabase.from("profiles").upsert(
                {
                  id: data.user.id,
                  display_name: candidateDisplayName,
                  email: data.user.email ?? null,
                } as any,
                { onConflict: "id" }
              );
            }
          } catch (e) {
            if ((e as any)?.message === "ACCOUNT_INACTIVE") throw e;
            console.error("[auth/login] Erro inesperado ao validar perfil", e);
          }
          return data;
        },
        { loading: "Entrando...", success: "Bem-vindo de volta!", error: false }
      ).catch((err) => {
        const mapped = mapLoginError(err);
        if (mapped.code === "EMAIL_NOT_CONFIRMED") setVerifyEmail(values.email);
        console.error("[auth/login]", { code: mapped.code, original: err });
        toast({
          title: mapped.code === "INVALID_CREDENTIALS" ? "Dados incorretos" : "Erro ao entrar",
          description: mapped.message,
          variant: "destructive",
        });
      });
    } else {
      await withFeedback(
        async () => {
          const redirectUrl = `${window.location.origin}/`;
          const { data, error } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: { emailRedirectTo: redirectUrl },
          });

          if (error) throw error;
          if (data.user) {
            await (supabase as any).from("user_roles").insert({ user_id: data.user.id, role: "aluno" });
          }
        },
        { loading: "Criando conta...", success: "Cadastro realizado!", error: undefined }
      ).catch((error) => {
        if (error) toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
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
      { loading: "Atualizando...", success: "Senha atualizada!", error: undefined }
    ).catch((error) => {
      if (error) toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    });

    resetUpdate({ password: "", confirmPassword: "" });
    window.history.replaceState({}, document.title, "/auth");
    setIsUpdatePasswordMode(false);
    setIsLogin(true);
  };

  // --- Render Helpers ---

  const renderInput = (
    id: string,
    label: string,
    type: string,
    registration: any,
    error?: any,
    toggleShow?: () => void,
    showState?: boolean
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-white/80 uppercase tracking-wide ml-1">
        {label}
      </Label>
      <div className="relative group">
        <Input
          id={id}
          type={type}
          {...registration}
          className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:bg-white/10 transition-all pl-4 pr-10"
        />
        {toggleShow && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white transition-colors"
            onClick={toggleShow}
          >
            {showState ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><span className="inline-block w-1 h-1 rounded-full bg-red-500" /> {error.message}</p>}
    </div>
  );

  return (
    <PremiumBackground>
      {/* Animated Gradient Spot */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      <main className="relative z-10 w-full max-w-md px-6">
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="relative h-48 w-auto flex items-center justify-center mb-4 animate-in fade-in zoom-in-50 duration-500">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
            <img src={logoNexfit} alt="Nexfit" className="relative h-full w-auto object-contain drop-shadow-2xl scale-125 transition-transform hover:scale-130 duration-700" />
          </div>
        </div>

        {/* Card Container */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl ring-1 ring-white/5">
          {/* Top Glass Highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="p-6 sm:p-8">
            {isUpdatePasswordMode ? (
              <section className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-white">Nova Senha</h2>
                  <p className="text-xs text-zinc-400">Defina sua nova credencial de acesso.</p>
                </div>

                <form onSubmit={handleSubmitUpdate(onUpdatePassword)} className="space-y-4">
                  {renderInput("new-password", "Nova senha", showPassword ? "text" : "password", registerUpdate("password"), updateErrors.password, () => setShowPassword(!showPassword), showPassword)}
                  {renderInput("new-password-confirm", "Confirmar senha", showConfirmPassword ? "text" : "password", registerUpdate("confirmPassword"), updateErrors.confirmPassword, () => setShowConfirmPassword(!showConfirmPassword), showConfirmPassword)}

                  <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-black font-bold text-sm uppercase tracking-wider hover:bg-primary/90" loading={isUpdatingPassword}>
                    Salvar Senha
                  </Button>
                  <Button type="button" variant="ghost" className="w-full h-10 rounded-xl text-white/60 hover:text-white" onClick={() => {
                    resetUpdate({ password: "", confirmPassword: "" });
                    window.history.replaceState({}, document.title, "/auth");
                    setIsUpdatePasswordMode(false);
                  }}>
                    Cancelar
                  </Button>
                </form>
              </section>
            ) : verifyEmail ? (
              <section className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                  <Droplets className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-white">Verifique seu e-mail</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Enviamos um link para <br /><span className="font-semibold text-white">{verifyEmail}</span>
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4 text-xs text-left text-zinc-400 border border-white/5">
                  <p className="font-semibold text-zinc-300 mb-2">Não encontrou?</p>
                  <ul className="space-y-1 list-none">
                    <li className="flex gap-2 items-center"><Check className="h-3 w-3 text-primary" /> Verifique Spam/Lixo Eletrônico</li>
                    <li className="flex gap-2 items-center"><Check className="h-3 w-3 text-primary" /> Aguarde alguns minutos</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Button className="w-full h-12 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 border border-white/5" loading={isResendingConfirmation} onClick={() => handleResendConfirmation(verifyEmail)}>
                    Reenviar Email
                  </Button>
                  <Button variant="ghost" className="w-full text-white/50" onClick={() => { setVerifyEmail(null); setIsLogin(true); setIsResetMode(false); }}>
                    Voltar
                  </Button>
                </div>
              </section>
            ) : (
              <section className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                {/* Toggle Login/Signup Tabs */}
                {!isResetMode && (
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/40 border border-white/5 mb-6">
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      className={`h-9 rounded-lg text-xs font-bold transition-all ${isLogin ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
                    >
                      ENTRAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className={`h-9 rounded-lg text-xs font-bold transition-all ${!isLogin ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
                    >
                      CRIAR CONTA
                    </button>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-white">{isResetMode ? "Recuperar Senha" : isLogin ? "Acessar Conta" : "Começar Agora"}</h2>
                  <p className="text-xs text-zinc-400 mt-1">{isResetMode ? "Enviaremos um link para você." : isLogin ? "Insira suas credenciais para continuar." : "Junte-se a comunidade elite."}</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {renderInput("email", "E-mail", "email", register("email"), errors.email)}

                  {!isResetMode && (
                    <>
                      {renderInput("password", "Senha", showPassword ? "text" : "password", register("password"), errors.password, () => setShowPassword(!showPassword), showPassword)}
                      {!isLogin && renderInput("confirm-password", "Confirmar Senha", showConfirmPassword ? "text" : "password", register("confirmPassword", {
                        validate: (val) => isLogin || !val ? (isLogin ? true : "Confirme sua senha") : val === watch("password") || "Senhas não coincidem"
                      }), errors.confirmPassword, () => setShowConfirmPassword(!showConfirmPassword), showConfirmPassword)}
                    </>
                  )}

                  <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-700 text-black font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 mt-2 transition-all hover:scale-[1.02] active:scale-[0.98]" loading={isSubmitting}>
                    {isResetMode ? "Enviar Link" : isLogin ? "Acessar Plataforma" : "Criar Conta Grátis"}
                  </Button>
                </form>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    className="text-xs text-white/40 hover:text-primary transition-colors font-medium"
                    onClick={() => {
                      setIsResetMode(!isResetMode);
                      if (!isResetMode) setIsLogin(true);
                    }}
                  >
                    {isResetMode ? "Voltar para o login" : "Esqueci minha senha"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Action Buttons - Side by Side */}
        <div className="mt-8 flex justify-between items-center gap-4 px-6 max-w-md mx-auto">
          <Button
            variant="ghost"
            className="gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-6 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all backdrop-blur-md"
            onClick={() => {
              if (isIOS) {
                setShowIOSModal(true);
              } else if (deferredPrompt) {
                handleInstallClick();
              } else {
                // Fallback: show instructions or redirect to app store
                toast({
                  title: "Instalar App",
                  description: "Acesse pelo navegador do seu celular para instalar o app.",
                });
              }
            }}
          >
            <Smartphone className="h-4 w-4 text-primary" />
            Baixar App
          </Button>

          <Button
            variant="ghost"
            className="gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-6 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all backdrop-blur-md"
            onClick={() => navigate("/entrepreneur/register")}
          >
            <Briefcase className="h-4 w-4" />
            Empreender
          </Button>
        </div>


        <div className="mt-12 w-full text-center pb-8">
          <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest">
            NexFit System v2.0 • Elite Performance
          </p>
        </div>
      </main>
    </PremiumBackground>
  );
};

export default AuthPage;

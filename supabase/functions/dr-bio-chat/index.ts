import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProfileContext {
  nome: string | null;
  peso_kg: number | null;
  altura_cm: number | null;
  objetivo: string | null;
  nivel: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ===== 1) Validação manual do JWT enviado pelo frontend =====
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas");
      return new Response(JSON.stringify({ error: "Configuração de backend incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Verifica o JWT do usuário logado junto ao Auth do Supabase
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SERVICE_ROLE_KEY,
      },
    });

    if (!userResponse.ok) {
      console.error("Falha ao validar JWT do usuário:", userResponse.status, await userResponse.text());
      return new Response(JSON.stringify({ error: "JWT inválido ou expirado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== 2) Lê o corpo da requisição (histórico do chat + perfil) =====
    const { messages, profile } = (await req.json()) as {
      messages: ChatMessage[];
      profile: ProfileContext | null;
    };

    // ===== 3) Acesso às variáveis de ambiente da IA =====
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada no Supabase");
    }

    // ===== 4) Monta o resumo do perfil para manter contexto (peso/objetivo) =====
    const profileSummaryLines: string[] = [];
    if (profile) {
      if (profile.nome) profileSummaryLines.push(`Nome: ${profile.nome}`);
      if (profile.peso_kg) profileSummaryLines.push(`Peso atual: ${profile.peso_kg} kg`);
      if (profile.altura_cm) profileSummaryLines.push(`Altura: ${profile.altura_cm} cm`);
      if (profile.objetivo) profileSummaryLines.push(`Objetivo principal: ${profile.objetivo}`);
      if (profile.nivel) profileSummaryLines.push(`Nível de atividade: ${profile.nivel}`);
    }

    const profileSummary =
      profileSummaryLines.length > 0
        ? `\n\nDados do aluno (do banco):\n- ${profileSummaryLines.join("\n- ")}`
        : "";

    let configSystemContext: string | null = null;
    let configInstructionsLayer: string | null = null;

    try {
      const { data: config, error: configError } = await supabaseClient
        .from("config_ai_agents")
        .select("system_context, instructions_layer")
        .eq("agent_key", "dr_bio")
        .maybeSingle();

      if (configError) {
        console.error("Erro ao carregar config_ai_agents para Dr. Bio:", configError.message);
      } else if (config) {
        configSystemContext = (config as any).system_context ?? null;
        configInstructionsLayer = (config as any).instructions_layer ?? null;
      }
    } catch (configUnexpectedError) {
      console.error("Erro inesperado ao ler config_ai_agents:", configUnexpectedError);
    }

    const baseSystemPrompt =
      "Você é o Dr. Bio, nutricionista virtual da Nexfit." +
      " Fale sempre em português do Brasil, em tom motivador, técnico porém acessível," +
      " focado em progresso gradual e hábitos sustentáveis." +
      " Nunca dê diagnósticos médicos ou prescreva medicamentos." +
      " Foque em: dicas de alimentação básica, receitas simples e rápidas, organização de refeições" +
      " e orientações de hidratação ao longo do dia." +
      " Quando sugerir receitas, priorize ingredientes comuns e acessíveis no Brasil." +
      " Nunca invente dados do aluno: use apenas o que foi passado no contexto." +
      " Se o aluno pedir algo fora de nutrição, responda brevemente e traga o foco de volta para alimentação e hábitos." +
      "\n\n**IMPORTANTE - Estilo de resposta:**" +
      " Seja direto e papo reto, evitando rodeios." +
      " Cada resposta deve ter no MÁXIMO ~400 caracteres (cerca de 3 a 4 frases curtas)." +
      " Nunca escreva parágrafos com mais de 3 linhas." +
      " Quando listar ingredientes ou macros de qualquer API, use sempre listas com marcadores e emojis (formato escaneável)." +
      " Responda como em um chat de WhatsApp: blocos curtos, com quebras de linha entre ideias diferentes." +
      " Evite textos longos e corridos. Priorize clareza e leitura fácil no celular." +
      " Use formatação em Markdown com **negrito** para termos importantes e emojis motivadores quando fizer sentido." +
      " Termine SEMPRE a mensagem com uma pergunta curta ou incentivo para engajar (ex.: 'Partiu treino?' ou 'Dúvida sobre mais algum alimento?').";

    const systemPrompt =
      (configSystemContext ? `${configSystemContext.trim()}\n\n` : "") +
      baseSystemPrompt +
      (configInstructionsLayer
        ? `\n\nInstruções adicionais a serem seguidas:\n${configInstructionsLayer}`
        : "") +
      profileSummary;

    // Converte mensagens para o formato do Gemini
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add system instructions
    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      }
    };

    // ===== 5) Chamada à API Oficial do Gemini com SSE =====
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("Dr. Bio Gemini AI error:", aiResponse.status, text);
      return new Response(JSON.stringify({ error: "Erro ao se conectar ao Google Gemini." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar um stream transformador para emular o formato OpenAI (esperado pelo frontend)
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const textChunk = new TextDecoder().decode(chunk);

        // O Gemini retorna linhas 'data: {...}'
        const lines = textChunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;

              const data = JSON.parse(dataStr);
              // Extrai o texto gerado pelo Gemini
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

              if (text) {
                // Formata pacote como OpenAI
                const openAiFormat = {
                  choices: [{ delta: { content: text } }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAiFormat)}\n\n`));
              }
            } catch (e) {
              console.error("Erro ao fazer parse de chunk do Gemini:", e);
            }
          }
        }
      },
      flush(controller) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    return new Response(aiResponse.body?.pipeThrough(transformStream), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("dr-bio-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

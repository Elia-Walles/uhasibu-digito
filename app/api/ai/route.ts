import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/auth";
import { getStatements } from "@/lib/server/actions/statements";

// AI assistant backed by Google Gemini, grounded in the tenant's live financial statements.
// Session-authenticated; non-streaming JSON reply.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The AI assistant is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[]; language?: "en" | "sw" };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const language = body.language === "sw" ? "sw" : "en";
  const last = messages.filter((m) => m.role === "user").at(-1);
  if (!last?.content?.trim()) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  // Ground the model in the current financials.
  let grounding = "";
  try {
    const view = await getStatements("FY");
    const fmt = (n: number) => `TZS ${Math.round(n).toLocaleString()}`;
    const lines = view.incomeStatement.map((l) => `${l.label}: ${fmt(l.current)}`).join("; ");
    grounding = `Company: ${view.companyName}. Income statement (${view.currentLabel}) — ${lines}.`;
  } catch {
    grounding = "No financial summary is available yet.";
  }

  const systemInstruction =
    `You are Uhasibu Digito's AI assistant for a Tanzanian small/medium business. You help with ` +
    `accounting, cash flow, TRA tax compliance (VAT 18%, PAYE bands, NSSF, SDL, WCF), payroll, and ` +
    `general finance questions. Be concise and practical, use TZS for money, and ground answers in the ` +
    `figures below where relevant. If there is no data yet, say so plainly and explain what to record. ` +
    `Reply in ${language === "sw" ? "Kiswahili" : "English"}.\n\nLive figures: ${grounding}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(last.content);
    return NextResponse.json({ reply: result.response.text() });
  } catch (err) {
    console.error("[ai] Gemini error:", err);
    return NextResponse.json({ error: "The assistant could not respond right now." }, { status: 502 });
  }
}

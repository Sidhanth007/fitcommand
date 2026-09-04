import "server-only";

/**
 * Centralised, server-only access to environment variables.
 * Values are read lazily so that build-time evaluation never fails
 * when a key is intentionally left blank (e.g. Brevo before Phase 2 testing).
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get appUrl() {
    return optional("APP_URL", "http://localhost:3010");
  },
  get appName() {
    return optional("APP_NAME", "FitCommand");
  },
  get adminEmail() {
    return optional("ADMIN_EMAIL").trim().toLowerCase();
  },
  get brevoApiKey() {
    return optional("BREVO_API_KEY");
  },
  get brevoSenderEmail() {
    // Brevo matches the verified sender case-sensitively; normalise to lowercase.
    return optional("BREVO_SENDER_EMAIL").trim().toLowerCase();
  },
  get brevoSenderName() {
    return optional("BREVO_SENDER_NAME", "FitCommand");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  get aiProvider(): "gemini" | "groq" {
    return optional("AI_PROVIDER", "gemini").trim().toLowerCase() === "groq" ? "groq" : "gemini";
  },
  get geminiApiKey() {
    return optional("GEMINI_API_KEY").trim();
  },
  get geminiModel() {
    return optional("GEMINI_MODEL", "gemini-3.6-flash").trim();
  },
  get groqApiKey() {
    return optional("GROQ_API_KEY").trim();
  },
  get groqModel() {
    return optional("GROQ_MODEL", "llama-3.3-70b-versatile").trim();
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

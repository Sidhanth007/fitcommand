import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Chat, type UiMessage } from "@/components/assistant/chat";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isAiConfigured } from "@/lib/ai/provider";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage(props: PageProps<"/assistant">) {
  const [{ user }, sp] = await Promise.all([requireOnboarded(), props.searchParams]);
  const history = await db.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 60 });
  const initialMessages: UiMessage[] = history.map((m) => ({ id: m.id, role: m.role === "USER" ? "user" : "assistant", content: m.content }));
  const initialPrompt = typeof sp.q === "string" ? sp.q.slice(0, 500) : undefined;
  const configured = isAiConfigured();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">
            Personal suggestions based on your profile, targets, plan and logs · powered by {env.aiProvider === "gemini" ? `Gemini (${env.geminiModel})` : `Groq (${env.groqModel})`} on a free tier.
          </p>
        </div>
      </div>
      <DisclaimerBanner />
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Chat initialMessages={initialMessages} initialPrompt={initialPrompt} configured={configured} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What it knows</CardTitle>
              <CardDescription>Shared with the model on each message.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              <p>• Your profile, goal and equipment</p>
              <p>• Calorie &amp; macro targets</p>
              <p>• Today&apos;s meals, water and workout</p>
              <p>• Your active plan and last 5 workouts</p>
              <p>• Streak and active goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What it won&apos;t do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              <p>• Diagnose conditions or prescribe medication/supplement doses</p>
              <p>• Advise on medical conditions, pregnancy or eating disorders — it will point you to a professional</p>
              <p>• Recommend crash diets or unsafe calorie levels</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Limits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Free-tier quotas apply: up to 8 messages a minute and 150 a day per account. If the provider is busy you&apos;ll see a friendly retry message.</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

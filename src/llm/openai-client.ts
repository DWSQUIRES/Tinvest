import OpenAI from "openai";
import { env } from "../config/env.js";

export function createOpenAiClient(): OpenAI | undefined {
  return env.OPENAI_API_KEY
    ? new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        baseURL: env.OPENAI_BASE_URL
      })
    : undefined;
}

export async function createTextResponse(input: {
  client: OpenAI;
  system: string;
  user: unknown;
}): Promise<string | undefined> {
  if (env.OPENAI_WIRE_API === "responses") {
    const response = await input.client.responses.create({
      model: env.OPENAI_MODEL,
      store: !env.OPENAI_DISABLE_RESPONSE_STORAGE,
      ...(env.OPENAI_REASONING_EFFORT
        ? {
            reasoning: {
              effort: env.OPENAI_REASONING_EFFORT as never
            }
          }
        : {}),
      input: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: typeof input.user === "string" ? input.user : JSON.stringify(input.user)
        }
      ]
    });

    return extractResponseText(response);
  }

  const completion = await input.client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: input.system
      },
      {
        role: "user",
        content: typeof input.user === "string" ? input.user : JSON.stringify(input.user)
      }
    ]
  });

  return completion.choices[0]?.message.content?.trim();
}

export function extractResponseText(response: unknown): string | undefined {
  const candidate = response as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof candidate.output_text === "string" && candidate.output_text.trim().length > 0) {
    return candidate.output_text.trim();
  }

  const text = candidate.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .trim();

  return text || undefined;
}

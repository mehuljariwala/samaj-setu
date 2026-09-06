import { NextResponse } from 'next/server'
import { parseBiodata, normalise } from '@/lib/normalise'

/**
 * Stage 1 + 3 run deterministically and always. Stage 2 (the LLM) only runs
 * when ANTHROPIC_API_KEY is set and the deterministic pass left gaps — so the
 * app works with no API key, and we don't pay a model call for the ~90% of
 * biodatas that are already clean `label: value` lines.
 */
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'empty' }, { status: 400 })
  }

  const parsed = parseBiodata(text)

  const gaps = !parsed.fullNameGu || !parsed.dob || !parsed.fatherName
  if (gaps && process.env.ANTHROPIC_API_KEY) {
    try {
      const refined = await refineWithClaude(normalise(text), parsed)
      return NextResponse.json({ parsed: refined, refined: true })
    } catch {
      // The deterministic result is still useful; degrade rather than fail.
    }
  }

  return NextResponse.json({ parsed, refined: false })
}

type Parsed = ReturnType<typeof parseBiodata>

async function refineWithClaude(normalised: string, base: Parsed): Promise<Parsed> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0,
      system:
        'You extract fields from Gujarati/English marriage biodatas. ' +
        'Return ONLY the tool input. Never invent a value: if a field is ' +
        'absent, return null. Keep Gujarati text in Gujarati. Do not guess ' +
        'gender from a first name.',
      tools: [
        {
          name: 'biodata',
          description: 'Structured fields extracted from the biodata',
          input_schema: {
            type: 'object',
            properties: {
              fullNameGu: { type: ['string', 'null'] },
              gender: { type: ['string', 'null'], enum: ['male', 'female', null] },
              dob: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
              birthTime: { type: ['string', 'null'], description: 'HH:MM 24h' },
              birthPlaceText: { type: ['string', 'null'] },
              heightCm: { type: ['integer', 'null'] },
              educationDetail: { type: ['string', 'null'] },
              occupationDetail: { type: ['string', 'null'] },
              fatherName: { type: ['string', 'null'] },
              motherName: { type: ['string', 'null'] },
              mosalName: { type: ['string', 'null'] },
              sectRaw: { type: ['string', 'null'] },
              rashiRaw: { type: ['string', 'null'] },
              address: { type: ['string', 'null'] },
            },
            required: ['fullNameGu'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'biodata' },
      messages: [{ role: 'user', content: normalised }],
    }),
  })

  if (!res.ok) throw new Error(`anthropic ${res.status}`)

  const body = (await res.json()) as {
    content: Array<{ type: string; input?: Record<string, unknown> }>
  }
  const input = body.content.find((c) => c.type === 'tool_use')?.input
  if (!input) throw new Error('no tool_use in response')

  // The deterministic pass wins wherever it produced a value — it can't
  // hallucinate, and its derivations (height, phones, age) are already checked.
  const merged: Parsed = { ...base }
  for (const [k, v] of Object.entries(input)) {
    if (v == null) continue
    if ((merged as Record<string, unknown>)[k] == null) {
      ;(merged as Record<string, unknown>)[k] = v
    }
  }
  return merged
}

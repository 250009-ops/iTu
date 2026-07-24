import { Logger } from '@nestjs/common';

const logger = new Logger('OpenAiJson');

export async function callOpenAiJson<T>(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<T> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature ?? 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    logger.error(`Failed to parse OpenAI JSON: ${content.slice(0, 200)}`);
    throw err;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function paragraphPlain(
  paragraphs: { marker?: string; text: string }[],
): string {
  return paragraphs
    .map((p, i) => {
      const marker = p.marker?.trim() || String.fromCharCode(65 + i);
      return `[¶${marker}] ${stripHtml(p.text)}`;
    })
    .join('\n\n');
}

export function findParagraphForQuote(
  paragraphs: { marker?: string; text: string }[],
  quote: string,
): { marker: string | null; ok: boolean } {
  const q = quote.trim();
  if (!q) return { marker: null, ok: false };
  for (let i = 0; i < paragraphs.length; i++) {
    const plain = stripHtml(paragraphs[i].text);
    if (plain.includes(q)) {
      return {
        marker: paragraphs[i].marker?.trim() || String.fromCharCode(65 + i),
        ok: true,
      };
    }
  }
  return { marker: null, ok: false };
}

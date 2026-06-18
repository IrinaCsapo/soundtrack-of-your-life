import { anthropic, CLAUDE_MODEL } from './claude';
import type { Answers } from './claude';

export type ModerationVerdict =
  | 'ALLOWED'
  | 'PROFANITY'
  | 'EXPLICIT'
  | 'HARMFUL'
  | 'UNFIT';

/**
 * Rejection messages — one per category — written in the Cabinet's voice.
 * Soft, personified, never preachy. Proper sentence case.
 */
export const MODERATION_MESSAGES: Record<ModerationVerdict, string> = {
  ALLOWED: '',
  PROFANITY:
    'This cabinet keeps its voice low. Try a softer word — the music is listening.',
  EXPLICIT:
    'The cabinet was made for tender things. Find a different moment to share.',
  HARMFUL:
    "I can't make music for this one. Take a breath, then share something kinder.",
  UNFIT:
    "The cabinet couldn't quite find music in this one. Try a different moment.",
};

const MODERATION_SYSTEM_PROMPT = `You are a content moderator for "Soundtrack of Your Life" — a small art tool where people answer four poetic questions about a moment in their life (a place, a sensory detail, a whispered meaning, a musical genre) and receive a custom lo-fi/ambient soundtrack with a cover image and a poetic title.

Review the user's answers. Determine if they contain content that violates this gentle, contemplative space.

CATEGORIES:
- ALLOWED: the answers are appropriate. Allow ALL real emotional content, including: grief, sadness, anger, regret, longing, vulnerability, mention of death in normal life context, religious or spiritual feelings, mild profanity used emphatically (one or two "damn" / "shit" / "hell" / "fuck" used to emphasize feeling), complex feelings, weird poetic non-sequiturs, intimate but tasteful memories, dark moments told tenderly. Be VERY generous here — people share real lives.
- PROFANITY: heavy or repeated curse words used aggressively (not emotionally), ethnic / racial / homophobic slurs, hostile insults, language clearly meant to demean or attack.
- EXPLICIT: explicit sexual content, pornographic descriptions, ANY scatological content (poo, poop, pee, fart, shit-as-bodily-function, soiled pants, bathroom humor, "Brown poowave" or similar gross genre attempts), descriptions of bodily fluids meant to shock or disgust, intentionally gross / disgusting content, gross-out humor, body-horror content. Be STRICT here — if the answer is clearly bathroom humor or scatological trolling, classify as EXPLICIT.
- HARMFUL: graphic violence, threats against people or groups, hate speech, glorification of self-harm or harm to others, content meant to deeply disturb the reader, instructions for self-harm, "Run." or similar threatening whispers in response to the "what does this moment whisper" question.

Default to ALLOWED for genuine memories — even painful ones. Only block obvious trolling, abuse, scatological humor, or content that violates the gentle space. Emotional weight is not a reason to block — heavy memories about grief, loss, or pain are valid art subjects.

Return ONLY a JSON object, no markdown fences, no prose:
{
  "verdict": "ALLOWED" | "PROFANITY" | "EXPLICIT" | "HARMFUL"
}`;

/**
 * Ask Claude Haiku to classify the user's answers. Returns one of the four
 * verdicts. Fails open (returns ALLOWED) on any error — better to let through
 * a borderline submission than to block a legitimate user because of a
 * transient API glitch.
 */
export async function checkModeration(
  answers: Answers
): Promise<ModerationVerdict> {
  const userPrompt = [
    'Review these answers:',
    `Q1 (where / when): ${answers.q1 || '(empty)'}`,
    `Q2 (sensory detail): ${answers.q2 || '(empty)'}`,
    `Q3 (what it whispers): ${answers.q3 || '(empty)'}`,
    `Q4 (music genre): ${answers.q4 || '(empty)'}`,
    `Q5 (current mood): ${answers.q5 || '(empty)'}`,
  ].join('\n');

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 80,
      temperature: 0.1,
      system: MODERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return 'ALLOWED';

    const match = textBlock.text.match(
      /"verdict"\s*:\s*"(ALLOWED|PROFANITY|EXPLICIT|HARMFUL)"/
    );
    if (match) return match[1] as ModerationVerdict;

    // Couldn't parse — fail open
    return 'ALLOWED';
  } catch (err) {
    console.error('[moderation] error:', err);
    return 'ALLOWED'; // Fail open
  }
}

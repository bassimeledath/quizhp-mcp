import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Template,
  TemplateIndex,
  TemplateIndexEntry,
  QuestionType,
  Platform,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Root of the bundled templates directory */
const TEMPLATES_DIR = join(__dirname, "..", "..", "templates");

let cachedIndex: TemplateIndex | null = null;

async function loadIndex(): Promise<TemplateIndex> {
  if (cachedIndex) return cachedIndex;
  const raw = await readFile(join(TEMPLATES_DIR, "index.json"), "utf-8");
  cachedIndex = JSON.parse(raw) as TemplateIndex;
  return cachedIndex;
}

/**
 * Pick one random template per question type from the bundled templates,
 * matching the requested platform. Returns templates in the same order
 * as the input `types` array.
 */
export async function getTemplatesForQuestions(
  types: QuestionType[],
  platform: Platform = "web"
): Promise<Template[]> {
  const index = await loadIndex();

  // Group available entries by question type for the given platform
  const byType = new Map<string, TemplateIndexEntry[]>();
  for (const entry of index.templates) {
    if (entry.platform !== platform) continue;
    const key = entry.questionType;
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(entry);
  }

  // For each question, pick a random template of the matching type
  const results: Template[] = [];
  const usedPerType = new Map<string, Set<number>>();

  for (const qType of types) {
    const candidates = byType.get(qType) ?? [];
    if (candidates.length === 0) continue;

    if (!usedPerType.has(qType)) usedPerType.set(qType, new Set());
    const used = usedPerType.get(qType)!;

    // Reset if we've used all templates for this type
    if (used.size >= candidates.length) used.clear();

    let idx: number;
    do {
      idx = Math.floor(Math.random() * candidates.length);
    } while (used.has(idx));
    used.add(idx);

    const entry = candidates[idx];
    const code = await readFile(join(TEMPLATES_DIR, entry.path), "utf-8");

    results.push({
      id: entry.name,
      name: entry.name,
      code,
      game_controls: entry.controls,
      game_instructions: entry.instructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      supported_question_type: entry.questionType,
      is_active: true,
      platform: entry.platform,
    });
  }

  return results;
}

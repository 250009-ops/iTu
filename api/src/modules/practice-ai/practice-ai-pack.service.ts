import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExamSkill, PracticeAiPackStatus, Prisma } from '@prisma/client';
import {
  areAiFeaturesEnabled,
  assertAiFeaturesEnabled,
} from '../../common/ai/ai-features';
import { PrismaService } from '../../prisma/prisma.service';
import {
  callOpenAiJson,
  findParagraphForQuote,
  paragraphPlain,
  stripHtml,
} from './openai-json';
import {
  AiPackSectionKey,
  GlossaryEntry,
  ParaphraseDrill,
  QuestionInsight,
  ReadingPassageLike,
  ScanTask,
  SectionStatus,
  SkimTask,
  StrategyPlaybook,
  TRAP_TAXONOMY,
  VocabItem,
} from './practice-ai.types';
import { listStrategyTemplates } from './strategy-templates';

type SectionStatusMap = Partial<Record<AiPackSectionKey, SectionStatus>>;

@Injectable()
export class PracticeAiPackService {
  private readonly logger = new Logger(PracticeAiPackService.name);
  private readonly generating = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return (
      areAiFeaturesEnabled() &&
      Boolean(this.config.get<string>('OPENAI_API_KEY')?.trim())
    );
  }

  async getPackStatus(unitId: string) {
    const pack = await this.prisma.practiceUnitAiPack.findUnique({
      where: { unitId },
    });
    if (!pack) {
      return {
        unitId,
        status: 'missing',
        version: 0,
        sectionStatus: {},
        generatedAt: null,
        errorMessage: null,
      };
    }
    return {
      unitId,
      status: pack.status.toLowerCase(),
      version: pack.version,
      model: pack.model,
      sectionStatus: pack.sectionStatus,
      generatedAt: pack.generatedAt,
      errorMessage: pack.errorMessage,
      hasInsights: Boolean(pack.questionInsights),
      hasGlossary: Boolean(pack.glossary),
      hasVocab: Boolean(pack.vocabPack),
      hasDrills: Boolean(pack.paraphraseDrills),
      hasSkimScan: Boolean(pack.skimScanTasks),
      hasPlaybook: Boolean(pack.strategyPlaybook),
    };
  }

  async getPackPreview(unitId: string) {
    const pack = await this.prisma.practiceUnitAiPack.findUnique({
      where: { unitId },
    });
    if (!pack) throw new NotFoundException('AI pack not found');
    return {
      status: pack.status.toLowerCase(),
      version: pack.version,
      sectionStatus: pack.sectionStatus,
      questionInsights: pack.questionInsights,
      glossary: pack.glossary,
      vocabPack: pack.vocabPack,
      paraphraseDrills: pack.paraphraseDrills,
      skimScanTasks: pack.skimScanTasks,
      strategyPlaybook: pack.strategyPlaybook,
      strategyTemplates: listStrategyTemplates(),
    };
  }

  /** Fire-and-forget generation after publish. */
  enqueueGeneration(unitId: string) {
    if (!areAiFeaturesEnabled()) {
      this.logger.log(
        `Skipping AI pack generation for ${unitId} (AI_FEATURES_ENABLED=false)`,
      );
      return;
    }
    void this.generateForUnit(unitId).catch((err) => {
      this.logger.error(
        `AI pack generation failed for ${unitId}: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  async regenerate(unitId: string) {
    assertAiFeaturesEnabled('AI pack generation');
    const unit = await this.prisma.practiceUnit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });
    if (!unit) throw new NotFoundException('Practice unit not found');

    await this.prisma.practiceUnitAiPack.upsert({
      where: { unitId },
      create: {
        unitId,
        status: PracticeAiPackStatus.GENERATING,
        sectionStatus: this.emptySections('pending'),
      },
      update: {
        status: PracticeAiPackStatus.GENERATING,
        errorMessage: null,
        sectionStatus: this.emptySections('pending'),
      },
    });

    this.enqueueGeneration(unitId);
    return this.getPackStatus(unitId);
  }

  async generateForUnit(unitId: string) {
    if (!areAiFeaturesEnabled()) {
      return this.getPackStatus(unitId);
    }
    if (this.generating.has(unitId)) {
      return this.getPackStatus(unitId);
    }
    this.generating.add(unitId);
    try {
      const unit = await this.prisma.practiceUnit.findUnique({
        where: { id: unitId },
      });
      if (!unit) throw new NotFoundException('Practice unit not found');
      if (unit.skill !== ExamSkill.READING) {
        // Listening packs can be added later — create empty READY stub.
        await this.prisma.practiceUnitAiPack.upsert({
          where: { unitId },
          create: {
            unitId,
            status: PracticeAiPackStatus.READY,
            sectionStatus: {},
            generatedAt: new Date(),
            model: 'n/a',
          },
          update: {
            status: PracticeAiPackStatus.READY,
            generatedAt: new Date(),
            errorMessage: null,
          },
        });
        return this.getPackStatus(unitId);
      }

      const existing = await this.prisma.practiceUnitAiPack.findUnique({
        where: { unitId },
      });
      const nextVersion = (existing?.version ?? 0) + 1;

      await this.prisma.practiceUnitAiPack.upsert({
        where: { unitId },
        create: {
          unitId,
          status: PracticeAiPackStatus.GENERATING,
          version: nextVersion,
          sectionStatus: this.emptySections('pending'),
        },
        update: {
          status: PracticeAiPackStatus.GENERATING,
          version: nextVersion,
          errorMessage: null,
          sectionStatus: this.emptySections('pending'),
        },
      });

      const content = unit.content as { passages?: ReadingPassageLike[] };
      const passage = content.passages?.[0];
      if (!passage?.paragraphs?.length) {
        await this.failPack(unitId, 'Unit has no reading passage content');
        return this.getPackStatus(unitId);
      }

      const answerKey = (unit.answerKey ?? {}) as Record<
        string,
        string | string[]
      >;
      const model =
        this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
      const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

      const sectionStatus: SectionStatusMap = this.emptySections('pending');
      let questionInsights: QuestionInsight[] = [];
      let glossary: GlossaryEntry[] = [];
      let vocabPack: VocabItem[] = [];
      let paraphraseDrills: ParaphraseDrill[] = [];
      let skimScanTasks: { skim: SkimTask[]; scan: ScanTask[] } = {
        skim: [],
        scan: [],
      };
      let strategyPlaybook: StrategyPlaybook = {
        groupOrder: [],
        specializations: [],
      };

      try {
        questionInsights = await this.generateInsights(
          passage,
          answerKey,
          apiKey,
          model,
        );
        sectionStatus.insights = questionInsights.some((q) => q.degraded)
          ? 'degraded'
          : 'ready';
      } catch (err) {
        this.logger.warn(`insights failed: ${String(err)}`);
        sectionStatus.insights = 'failed';
        questionInsights = this.mockInsights(passage, answerKey);
      }

      try {
        glossary = await this.generateGlossary(passage, apiKey, model);
        sectionStatus.glossary = glossary.length ? 'ready' : 'degraded';
      } catch (err) {
        this.logger.warn(`glossary failed: ${String(err)}`);
        sectionStatus.glossary = 'failed';
        glossary = this.mockGlossary(passage);
      }

      try {
        vocabPack = await this.generateVocab(passage, glossary, apiKey, model);
        sectionStatus.vocab = vocabPack.length ? 'ready' : 'degraded';
      } catch (err) {
        this.logger.warn(`vocab failed: ${String(err)}`);
        sectionStatus.vocab = 'failed';
        vocabPack = this.mockVocab(passage);
      }

      try {
        paraphraseDrills = await this.generateDrills(
          passage,
          answerKey,
          questionInsights,
          apiKey,
          model,
        );
        sectionStatus.drills = paraphraseDrills.length ? 'ready' : 'degraded';
      } catch (err) {
        this.logger.warn(`drills failed: ${String(err)}`);
        sectionStatus.drills = 'failed';
        paraphraseDrills = this.mockDrills(answerKey);
      }

      try {
        skimScanTasks = await this.generateSkimScan(passage, apiKey, model);
        sectionStatus.skimScan =
          skimScanTasks.skim.length || skimScanTasks.scan.length
            ? 'ready'
            : 'degraded';
      } catch (err) {
        this.logger.warn(`skimScan failed: ${String(err)}`);
        sectionStatus.skimScan = 'failed';
        skimScanTasks = this.mockSkimScan(passage);
      }

      try {
        strategyPlaybook = await this.generatePlaybook(
          passage,
          questionInsights,
          apiKey,
          model,
        );
        sectionStatus.playbook = 'ready';
      } catch (err) {
        this.logger.warn(`playbook failed: ${String(err)}`);
        sectionStatus.playbook = 'failed';
        strategyPlaybook = this.mockPlaybook(passage, questionInsights);
      }

      const anyReady = Object.values(sectionStatus).some(
        (s) => s === 'ready' || s === 'degraded',
      );

      await this.prisma.practiceUnitAiPack.update({
        where: { unitId },
        data: {
          status: anyReady
            ? PracticeAiPackStatus.READY
            : PracticeAiPackStatus.FAILED,
          model: apiKey ? model : 'mock',
          generatedAt: new Date(),
          errorMessage: anyReady ? null : 'All AI pack sections failed',
          sectionStatus: sectionStatus as Prisma.InputJsonValue,
          questionInsights: questionInsights as unknown as Prisma.InputJsonValue,
          glossary: glossary as unknown as Prisma.InputJsonValue,
          vocabPack: vocabPack as unknown as Prisma.InputJsonValue,
          paraphraseDrills: paraphraseDrills as unknown as Prisma.InputJsonValue,
          skimScanTasks: skimScanTasks as unknown as Prisma.InputJsonValue,
          strategyPlaybook: strategyPlaybook as unknown as Prisma.InputJsonValue,
        },
      });

      return this.getPackStatus(unitId);
    } finally {
      this.generating.delete(unitId);
    }
  }

  /** Pre-submit safe pack slice (no answer leakage). */
  async getStudentInAttemptPack(unitId: string) {
    if (!areAiFeaturesEnabled()) {
      return {
        status: 'disabled',
        glossary: [] as GlossaryEntry[],
        skimScanTasks: null,
        strategyTemplates: [],
        strategyPlaybook: null,
      };
    }
    const pack = await this.prisma.practiceUnitAiPack.findUnique({
      where: { unitId },
    });
    if (!pack || pack.status !== PracticeAiPackStatus.READY) {
      return {
        status: pack?.status.toLowerCase() ?? 'missing',
        glossary: [] as GlossaryEntry[],
        skimScanTasks: pack?.skimScanTasks ?? null,
        strategyTemplates: listStrategyTemplates(),
        strategyPlaybook: pack?.strategyPlaybook ?? null,
      };
    }
    return {
      status: 'ready',
      glossary: pack.glossary,
      skimScanTasks: pack.skimScanTasks,
      strategyTemplates: listStrategyTemplates(),
      strategyPlaybook: pack.strategyPlaybook,
    };
  }

  private emptySections(status: SectionStatus): SectionStatusMap {
    return {
      insights: status,
      glossary: status,
      vocab: status,
      drills: status,
      skimScan: status,
      playbook: status,
    };
  }

  private async failPack(unitId: string, message: string) {
    await this.prisma.practiceUnitAiPack.update({
      where: { unitId },
      data: {
        status: PracticeAiPackStatus.FAILED,
        errorMessage: message,
      },
    });
  }

  private async generateInsights(
    passage: ReadingPassageLike,
    answerKey: Record<string, string | string[]>,
    apiKey: string | undefined,
    model: string,
  ): Promise<QuestionInsight[]> {
    if (!apiKey) return this.mockInsights(passage, answerKey);

    const groups = passage.groups ?? [];
    const all: QuestionInsight[] = [];

    for (const group of groups) {
      const qs = group.questions ?? [];
      if (!qs.length) continue;
      const parsed = await callOpenAiJson<{ insights?: QuestionInsight[] }>({
        apiKey,
        model,
        system: `You are an IELTS Reading examiner-teacher. Return JSON only.
Trap enum (pick one or null): ${TRAP_TAXONOMY.join(', ')}.
evidence.sentenceQuote MUST be a verbatim substring of the passage paragraph (no paraphrase).
rationale ≤ 50 words. Include paraphraseMap pairs and keywords.`,
        user: JSON.stringify({
          passage: paragraphPlain(passage.paragraphs),
          questionType: group.type,
          questions: qs,
          answerKeySlice: Object.fromEntries(
            qs.map((q) => [String(q.n), answerKey[String(q.n)]]),
          ),
          instruction:
            'For each question return {n, rationale, evidence:{paragraphMarker,sentenceQuote}, trap, paraphraseMap:[{question,passage}], keywords, options?}.',
        }),
      });

      for (const raw of parsed.insights ?? []) {
        all.push(this.validateInsight(raw, passage, group.type));
      }
    }

    if (!all.length) return this.mockInsights(passage, answerKey);
    return all;
  }

  private validateInsight(
    raw: Partial<QuestionInsight>,
    passage: ReadingPassageLike,
    questionType: string,
  ): QuestionInsight {
    const quote = (raw.evidence?.sentenceQuote ?? '').trim();
    const found = findParagraphForQuote(passage.paragraphs, quote);
    const degraded = !found.ok;
    return {
      n: Number(raw.n),
      questionType,
      rationale: raw.rationale?.trim() || 'Review the evidence in the passage.',
      evidence: {
        paragraphMarker: found.ok
          ? found.marker
          : raw.evidence?.paragraphMarker ?? null,
        sentenceQuote: found.ok ? quote : '',
        degraded,
      },
      trap:
        raw.trap && (TRAP_TAXONOMY as readonly string[]).includes(raw.trap)
          ? raw.trap
          : null,
      paraphraseMap: Array.isArray(raw.paraphraseMap) ? raw.paraphraseMap : [],
      keywords: raw.keywords ?? [],
      typeExtras: raw.typeExtras,
      options: raw.options,
      degraded,
    };
  }

  private async generateGlossary(
    passage: ReadingPassageLike,
    apiKey: string | undefined,
    model: string,
  ): Promise<GlossaryEntry[]> {
    if (!apiKey) return this.mockGlossary(passage);

    const en = await callOpenAiJson<{ entries?: GlossaryEntry[] }>({
      apiKey,
      model,
      system: `You extract IELTS reading glossary spans. Return JSON {entries:[...]}.
Each entry: paragraphMarker, span (verbatim), kind (word|phrase|idiom|collocation), sense:{en}, pos?, level (B1-C2).
Only the sense used IN THIS PASSAGE. Max ~12 per paragraph. Idioms/phrases required when present.`,
      user: paragraphPlain(passage.paragraphs),
    });

    const entries = (en.entries ?? [])
      .map((e) => {
        const found = findParagraphForQuote(passage.paragraphs, e.span ?? '');
        if (!found.ok) return null;
        return {
          paragraphMarker: found.marker,
          span: e.span.trim(),
          kind: e.kind ?? 'word',
          sense: { en: e.sense?.en ?? e.sense?.en ?? '—' },
          pos: e.pos,
          level: e.level,
        } as GlossaryEntry;
      })
      .filter(Boolean) as GlossaryEntry[];

    // Translate senses to UZ/RU in one batch
    if (entries.length) {
      try {
        const translated = await callOpenAiJson<{
          items?: { span: string; uz: string; ru: string }[];
        }>({
          apiKey,
          model,
          system:
            'Translate each English sense into Uzbek (Latin) and Russian. Return JSON {items:[{span,uz,ru}]}. Keep short glossary style.',
          user: JSON.stringify(
            entries.map((e) => ({ span: e.span, en: e.sense.en })),
          ),
        });
        const map = new Map(
          (translated.items ?? []).map((i) => [i.span, i] as const),
        );
        for (const e of entries) {
          const t = map.get(e.span);
          if (t) {
            e.sense.uz = t.uz;
            e.sense.ru = t.ru;
          }
        }
      } catch {
        // keep English only
      }
    }

    return this.dedupeGlossary(entries);
  }

  private dedupeGlossary(entries: GlossaryEntry[]): GlossaryEntry[] {
    const byKey = new Map<string, GlossaryEntry>();
    for (const e of entries) {
      const key = `${e.paragraphMarker ?? ''}|${e.span.toLowerCase()}`;
      const prev = byKey.get(key);
      if (!prev || e.span.length > prev.span.length) byKey.set(key, e);
    }
    return [...byKey.values()];
  }

  private async generateVocab(
    passage: ReadingPassageLike,
    glossary: GlossaryEntry[],
    apiKey: string | undefined,
    model: string,
  ): Promise<VocabItem[]> {
    if (!apiKey) return this.mockVocab(passage);
    const parsed = await callOpenAiJson<{ items?: VocabItem[] }>({
      apiKey,
      model,
      system: `Build an IELTS academic vocabulary pack from the passage. Return JSON {items:[...]}.
Each item: word, contextMeaning, collocations[], wordFamily[], ieltsParaphrases[], occurrenceAnchor:{paragraphMarker,sentenceQuote}.
sentenceQuote must be verbatim.`,
      user: JSON.stringify({
        passage: paragraphPlain(passage.paragraphs),
        glossarySpans: glossary.map((g) => g.span).slice(0, 40),
      }),
    });
    return (parsed.items ?? [])
      .map((item) => {
        const found = findParagraphForQuote(
          passage.paragraphs,
          item.occurrenceAnchor?.sentenceQuote ?? item.word,
        );
        if (!found.ok && !stripHtml(
          passage.paragraphs.map((p) => p.text).join(' '),
        ).toLowerCase().includes(item.word.toLowerCase())) {
          return null;
        }
        return {
          ...item,
          collocations: item.collocations ?? [],
          wordFamily: item.wordFamily ?? [],
          ieltsParaphrases: item.ieltsParaphrases ?? [],
          occurrenceAnchor: {
            paragraphMarker: found.marker,
            sentenceQuote: item.occurrenceAnchor?.sentenceQuote ?? item.word,
            degraded: !found.ok,
          },
        } as VocabItem;
      })
      .filter(Boolean) as VocabItem[];
  }

  private async generateDrills(
    passage: ReadingPassageLike,
    answerKey: Record<string, string | string[]>,
    insights: QuestionInsight[],
    apiKey: string | undefined,
    model: string,
  ): Promise<ParaphraseDrill[]> {
    if (!apiKey) return this.mockDrills(answerKey);
    const pairs = Object.entries(answerKey)
      .filter(([k]) => !k.startsWith('$set$'))
      .slice(0, 20)
      .map(([n, ans]) => ({
        n: Number(n),
        answer: ans,
        insight: insights.find((i) => i.n === Number(n)),
      }));

    const parsed = await callOpenAiJson<{ drills?: ParaphraseDrill[] }>({
      apiKey,
      model,
      system: `Create paraphrase gym drills for IELTS Reading Q–A pairs. Academic register only.
Return JSON {drills:[{n,type:synonym-swap|restructure|academic-register,prompt,acceptedAnswers[],explanation}]}.
2–3 drills per pair max. acceptedAnswers should be generous.`,
      user: JSON.stringify({
        passage: paragraphPlain(passage.paragraphs).slice(0, 6000),
        pairs,
      }),
    });
    return parsed.drills ?? this.mockDrills(answerKey);
  }

  private async generateSkimScan(
    passage: ReadingPassageLike,
    apiKey: string | undefined,
    model: string,
  ): Promise<{ skim: SkimTask[]; scan: ScanTask[] }> {
    if (!apiKey) return this.mockSkimScan(passage);
    const parsed = await callOpenAiJson<{
      skim?: SkimTask[];
      scan?: ScanTask[];
    }>({
      apiKey,
      model,
      system: `Create skim and scan trainer tasks for this IELTS passage. Return JSON {skim,scan}.
skim: per paragraph {paragraphMarker, mainIdeaQuestion, options:[3], correct:index} — one true theme + two detail distractors.
scan: 6–10 tasks {id,prompt,targetQuote,paragraphMarker,expectedSeconds}. targetQuote MUST be verbatim.`,
      user: paragraphPlain(passage.paragraphs),
    });

    const skim = (parsed.skim ?? []).filter((t) =>
      Array.isArray(t.options) && t.options.length >= 2,
    );
    const scan = (parsed.scan ?? [])
      .map((t, i) => {
        const found = findParagraphForQuote(
          passage.paragraphs,
          t.targetQuote ?? '',
        );
        if (!found.ok) return null;
        return {
          id: t.id || `scan-${i + 1}`,
          prompt: t.prompt,
          targetQuote: t.targetQuote.trim(),
          paragraphMarker: found.marker,
          expectedSeconds: t.expectedSeconds || 20,
        } as ScanTask;
      })
      .filter(Boolean) as ScanTask[];

    return { skim, scan };
  }

  private async generatePlaybook(
    passage: ReadingPassageLike,
    insights: QuestionInsight[],
    apiKey: string | undefined,
    model: string,
  ): Promise<StrategyPlaybook> {
    if (!apiKey) return this.mockPlaybook(passage, insights);
    const types = [
      ...new Set((passage.groups ?? []).map((g) => g.type).filter(Boolean)),
    ];
    const parsed = await callOpenAiJson<StrategyPlaybook>({
      apiKey,
      model,
      system: `You specialize an IELTS Reading strategy playbook for THIS passage only.
Do NOT invent teaching methodology. Return JSON {groupOrder:string[], specializations:[{questionType, orderOfAttackReason?, questions:[{n, keywords?, tapTargets?:[{paragraphMarker,sentenceQuote}], distractorNotes?, extras?}]}]}.
tapTargets.sentenceQuote must be verbatim.`,
      user: JSON.stringify({
        passage: paragraphPlain(passage.paragraphs),
        questionTypes: types,
        insights: insights.map((i) => ({
          n: i.n,
          questionType: i.questionType,
          keywords: i.keywords,
          evidence: i.evidence,
        })),
      }),
    });
    return {
      groupOrder: parsed.groupOrder?.length ? parsed.groupOrder : types,
      specializations: parsed.specializations ?? [],
    };
  }

  // ─── Mock fallbacks (local / no API key) ─────────────────────────────────

  private mockInsights(
    passage: ReadingPassageLike,
    answerKey: Record<string, string | string[]>,
  ): QuestionInsight[] {
    const first = passage.paragraphs[0];
    const sentence = stripHtml(first?.text ?? '').split(/[.!?]/)[0] ?? '';
    const marker =
      (typeof first?.marker === 'string' && first.marker.trim()) || 'A';
    const out: QuestionInsight[] = [];
    for (const [k, v] of Object.entries(answerKey)) {
      if (k.startsWith('$set$')) continue;
      const n = Number(k);
      if (!Number.isFinite(n)) continue;
      const groupType =
        passage.groups?.find((g) =>
          g.questions?.some((q) => q.n === n),
        )?.type ?? 'tfng';
      out.push({
        n,
        questionType: groupType,
        rationale: `Correct answer is ${Array.isArray(v) ? v.join(', ') : v}. Compare the statement with the evidence sentence.`,
        evidence: {
          paragraphMarker: marker,
          sentenceQuote: sentence.slice(0, 180),
          degraded: !sentence,
        },
        trap: 'paraphrase-miss',
        paraphraseMap: [],
        keywords: [],
        degraded: true,
      });
    }
    return out;
  }

  private mockGlossary(passage: ReadingPassageLike): GlossaryEntry[] {
    const entries: GlossaryEntry[] = [];
    for (let i = 0; i < Math.min(passage.paragraphs.length, 3); i++) {
      const p = passage.paragraphs[i];
      const words = stripHtml(p.text)
        .split(/\s+/)
        .filter((w) => w.length > 7)
        .slice(0, 3);
      for (const w of words) {
        entries.push({
          paragraphMarker:
            (typeof p.marker === 'string' && p.marker.trim()) ||
            String.fromCharCode(65 + i),
          span: w.replace(/[^a-zA-Z-]/g, ''),
          kind: 'word',
          sense: {
            en: 'Academic word used in this paragraph (mock glossary — configure OPENAI_API_KEY for full pack).',
            uz: 'Ushbu paragrafdagi akademik so‘z (namuna).',
            ru: 'Академическое слово в этом абзаце (пример).',
          },
          level: 'B2',
        });
      }
    }
    return entries.filter((e) => e.span.length > 3);
  }

  private mockVocab(passage: ReadingPassageLike): VocabItem[] {
    return this.mockGlossary(passage)
      .slice(0, 8)
      .map((g) => ({
        word: g.span,
        contextMeaning: g.sense.en,
        collocations: [],
        wordFamily: [g.span],
        ieltsParaphrases: [],
        occurrenceAnchor: {
          paragraphMarker: g.paragraphMarker,
          sentenceQuote: g.span,
          degraded: true,
        },
      }));
  }

  private mockDrills(
    answerKey: Record<string, string | string[]>,
  ): ParaphraseDrill[] {
    return Object.keys(answerKey)
      .filter((k) => !k.startsWith('$set$'))
      .slice(0, 5)
      .map((k) => ({
        n: Number(k),
        type: 'synonym-swap' as const,
        prompt: `Rewrite the idea of Q${k} using a synonym for a key academic word.`,
        acceptedAnswers: ['ok', 'done'],
        explanation: 'Mock drill — regenerate AI pack with OpenAI configured.',
      }));
  }

  private mockSkimScan(passage: ReadingPassageLike): {
    skim: SkimTask[];
    scan: ScanTask[];
  } {
    const skim: SkimTask[] = passage.paragraphs.slice(0, 4).map((p, i) => {
      const marker =
        (typeof p.marker === 'string' && p.marker.trim()) ||
        String.fromCharCode(65 + i);
      return {
        paragraphMarker: marker,
        mainIdeaQuestion: `What is the main idea of paragraph ${marker}?`,
        options: [
          'The paragraph’s overall theme',
          'A minor detail mentioned once',
          'An unrelated example',
        ],
        correct: 0,
      };
    });
    const scan: ScanTask[] = passage.paragraphs.slice(0, 3).map((p, i) => {
      const quote = stripHtml(p.text).slice(0, 40).trim();
      const marker =
        (typeof p.marker === 'string' && p.marker.trim()) ||
        String.fromCharCode(65 + i);
      return {
        id: `scan-${i + 1}`,
        prompt: `Find this phrase in the passage`,
        targetQuote: quote,
        paragraphMarker: marker,
        expectedSeconds: 20,
      };
    });
    return { skim, scan };
  }

  private mockPlaybook(
    passage: ReadingPassageLike,
    insights: QuestionInsight[],
  ): StrategyPlaybook {
    const types = [
      ...new Set((passage.groups ?? []).map((g) => g.type).filter(Boolean)),
    ];
    return {
      groupOrder: types,
      specializations: types.map((questionType) => ({
        questionType,
        orderOfAttackReason: `Practise ${questionType} using the standard IELTS approach.`,
        questions: insights
          .filter((i) => i.questionType === questionType)
          .map((i) => ({
            n: i.n,
            keywords: i.keywords ?? [],
            tapTargets: i.evidence.sentenceQuote
              ? [i.evidence]
              : [],
          })),
      })),
    };
  }
}

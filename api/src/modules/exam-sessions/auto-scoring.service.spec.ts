import { ExamSkill } from '@prisma/client';
import { AutoScoringService } from './auto-scoring.service';

/**
 * Regression tests for case-insensitive Listening/Reading auto-scoring.
 * The student exam UI may submit answers in any case ("paris" vs "Paris",
 * "b" vs "B"); scoring must normalize both sides before comparing.
 */
describe('AutoScoringService.scoreListeningOrReading', () => {
  function makeService() {
    const prismaStub = {
      bandConversionTable: {
        // Band == rawScore for deterministic assertions.
        findFirst: ({ where }: { where: { rawScore?: number } }) =>
          Promise.resolve({ band: where.rawScore ?? 0 }),
      },
    };
    return new AutoScoringService(prismaStub as never);
  }

  it('matches gap-fill answers regardless of case/whitespace', async () => {
    const service = makeService();
    const { rawScore } = await service.scoreListeningOrReading(
      ExamSkill.LISTENING,
      [
        { questionNumber: 1, value: 'PARIS' },
        { questionNumber: 2, value: '  london ' },
        { questionNumber: 3, value: 'New York' },
      ],
      { '1': 'paris', '2': 'London', '3': 'new york' },
    );
    expect(rawScore).toBe(3);
  });

  it('matches single-letter MCQ answers regardless of case', async () => {
    const service = makeService();
    const { rawScore } = await service.scoreListeningOrReading(
      ExamSkill.READING,
      [
        { questionNumber: 1, value: 'b' },
        { questionNumber: 2, value: 'C' },
      ],
      { '1': 'B', '2': 'c' },
    );
    expect(rawScore).toBe(2);
  });

  it('matches $set$ range answers (any order, any case)', async () => {
    const service = makeService();
    const { rawScore } = await service.scoreListeningOrReading(
      ExamSkill.READING,
      [
        { questionNumber: 5, value: 'c' },
        { questionNumber: 6, value: 'A' },
      ],
      { '$set$5-6': 'A,C' },
    );
    expect(rawScore).toBe(2);
  });

  it('does not award marks for wrong answers', async () => {
    const service = makeService();
    const { rawScore } = await service.scoreListeningOrReading(
      ExamSkill.LISTENING,
      [{ questionNumber: 1, value: 'Berlin' }],
      { '1': 'Paris' },
    );
    expect(rawScore).toBe(0);
  });
});

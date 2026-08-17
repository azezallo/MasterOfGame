import { DatabaseRepository } from '../../persistence/database_repository';
import { AgenticLoopRepository } from '../../repositories/agentic_loop.repository';
import { ILLMProvider } from '../../providers/llm/llm_provider.interface';
import { CompressionResult } from '../../types/agentic_loop.types';

export class CompressionService {
  private repo: DatabaseRepository;
  private agenticLoopRepo: AgenticLoopRepository;
  private llmProvider?: ILLMProvider | undefined;

  constructor(repo: DatabaseRepository, llmProvider?: ILLMProvider) {
    this.repo = repo;
    this.agenticLoopRepo = repo.getAgenticLoopRepository();
    this.llmProvider = llmProvider;
  }

  public async compressSessionContext(sessionId: string, forceManual: boolean = false): Promise<CompressionResult> {
    const uncompressedLogs = this.agenticLoopRepo.getUncompressedShortLogs(sessionId);
    if (uncompressedLogs.length === 0) {
      return {
        success: true,
        summary: 'Немає нових нестиснених логів для створення Саммарі.',
        compressedLogsCount: 0,
      };
    }

    // 80/20 Rule: Compress oldest 80%, leave newest 20%
    const logsToCompressCount = forceManual
      ? uncompressedLogs.length
      : Math.max(1, Math.floor(uncompressedLogs.length * 0.8));

    const logsToCompress = uncompressedLogs.slice(0, logsToCompressCount);
    const logIdsToMark = logsToCompress.map((l) => l.id!).filter(Boolean);

    const latestSummaryRow = this.agenticLoopRepo.getLatestSummary(sessionId);
    const existingSummary = latestSummaryRow ? latestSummaryRow.summary_text : 'Початкова техніка історії.';
    const textToSummarize = logsToCompress.map((l) => `- ${l.content}`).join('\n');

    let newSummaryText = '';
    if (this.llmProvider) {
      try {
        const response = await this.llmProvider.generate({ model: "default",
          messages: [
            {
              role: 'system',
              content: 'Ви — аналітик подій гри. Об’єднайте попередній підсумок гри та список нових сухих логів у єдине стисле, ємне Саммарі (Summary) українською мовою.',
            },
            {
              role: 'user',
              content: `ПОПЕРЕДНІЙ ПІДСУМОК:\n${existingSummary}\n\nНОВІ ПОДІЇ СЦЕНИ:\n${textToSummarize}\n\nСформуйте підсумкове Саммарі:`,
            },
          ],
          temperature: 0.3,
        });
        newSummaryText = (response.content || '').trim();
      } catch {
        newSummaryText = `Саммарі сесії: ${logsToCompress.map((l) => l.content).join('; ')}`;
      }
    } else {
      newSummaryText = `Главу завершено: ${logsToCompress.map((l) => l.content).join('; ')}`;
    }

    const lastTurnNumber = logsToCompress[logsToCompress.length - 1].turn_number;

    // Execute summary insertion and short logs status update within an atomic SQLite transaction
    this.repo.runTransaction(() => {
      this.agenticLoopRepo.saveSessionSummary(sessionId, newSummaryText, lastTurnNumber);
      this.agenticLoopRepo.markShortLogsCompressed(logIdsToMark);
    });

    return {
      success: true,
      summary: newSummaryText,
      compressedLogsCount: logsToCompress.length,
    };
  }
}

import { DatabaseRepository } from '../../persistence/database_repository';
import { AgenticLoopRepository } from '../../repositories/agentic_loop.repository';
import { SemanticMemoryService } from '../semantic_memory.service';
import { getMasterSystemPromptTemplate } from '../../config';

export class ContextAssemblyService {
  private agenticLoopRepo: AgenticLoopRepository;
  private memoryService?: SemanticMemoryService;

  constructor(repo: DatabaseRepository, memoryService?: SemanticMemoryService) {
    this.agenticLoopRepo = repo.getAgenticLoopRepository();
    this.memoryService = memoryService;
  }

  public async assembleMasterSystemPrompt(sessionId: string, playerAction: string): Promise<string> {
    // 1. Master System Persona & Rules from Config Template File
    const masterSystemPromptTemplate = getMasterSystemPromptTemplate();

    // 2. Latest Session Summary
    const summaryRow = this.agenticLoopRepo.getLatestSummary(sessionId);
    const summaryText = summaryRow ? summaryRow.summary_text : 'Гра тільки розпочалася. Останніх подій немає.';

    // 3. Pre-fetch Vector Memory RAG (F017)
    let ragText = 'Релевантних спогадів з минулого не знайдено.';
    if (this.memoryService) {
      try {
        const ragResults = this.memoryService.preFetchContext(sessionId, playerAction, 3);
        if (ragResults.length > 0) {
          ragText = ragResults
            .map((r) => `[Хід ${r.turn} | ${r.role}]: ${r.content}`)
            .join('\n');
        }
      } catch {
        ragText = 'Не вдалося підтягнути спогади пам’яті.';
      }
    }

    // 4. Uncompressed Short Context (Facts)
    const shortLogs = this.agenticLoopRepo.getUncompressedShortLogs(sessionId);
    const shortLogsText = shortLogs.length > 0
      ? shortLogs.map((l) => `- ${l.content}`).join('\n')
      : 'Нових нестиснених фактів немає.';

    // 5. Latest 2-3 Long Context Messages (Narrative style)
    const longContext = this.agenticLoopRepo.getRecentLongContext(sessionId, 3);
    const longContextText = longContext.length > 0
      ? longContext.map((m) => `${m.role === 'player' ? 'Гравець' : 'Майстер'}: ${m.content}`).join('\n')
      : 'Немає попередньої літературної історії.';

    return `${masterSystemPromptTemplate}

ПОТОЧНИЙ КОНТЕКСТ СЕСІЇ:
=== ГЛОБАЛЬНЕ САММАРІ СЕСІЇ ===
${summaryText}

=== РЕЛЕВАНТНІ СПОГАДИ З МИНУЛОГО (RAG F017) ===
${ragText}

=== ПОТОЧНІ СУХІ ФАКТИ (SHORT LOGS) ===
${shortLogsText}

=== ОСТАННЯ ЛІТЕРАТУРНА ОПОВІДЬ (LONG CONTEXT) ===
${longContextText}
`;
  }
}

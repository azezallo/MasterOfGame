
import { DatabaseRepository } from '../../persistence/database_repository';
import { AgenticLoopRepository } from '../../repositories/agentic_loop.repository';
import { ContextAssemblyService } from './context_assembly.service';
import { SubagentOrchestratorService } from './subagent_orchestrator.service';
import { CompressionService } from './compression.service';
import { SemanticMemoryService } from '../semantic_memory.service';
import { ILLMProvider } from '../../providers/llm/llm_provider.interface';
import { SubagentGroup, TurnStage } from '../../types/agentic_loop.types';
import { LLMMessage } from '../../types/ai.types';
import { logger } from '../../logger';
import { SessionStreamBroker, SSEWritable } from './session_stream_broker.service';

export class AgenticLoopService {
  private agenticLoopRepo: AgenticLoopRepository;
  private llmProvider?: ILLMProvider | undefined;
  private modelName: string;
  private memoryService?: SemanticMemoryService | undefined;
  private contextAssembly: ContextAssemblyService;
  private orchestrator: SubagentOrchestratorService;
  private compressionService: CompressionService;

  constructor(
    repo: DatabaseRepository,
    llmProvider?: ILLMProvider,
    memoryService?: SemanticMemoryService,
    modelName: string = 'Qwen2.5-7B-Instruct'
  ) {
    this.agenticLoopRepo = repo.getAgenticLoopRepository();
    this.llmProvider = llmProvider;
    this.modelName = modelName;
    this.memoryService = memoryService;
    this.contextAssembly = new ContextAssemblyService(repo, memoryService);
    this.orchestrator = new SubagentOrchestratorService(repo, memoryService, llmProvider, modelName);
    this.compressionService = new CompressionService(repo, llmProvider);
  }

  public async runStreamTurn(sessionId: string, actionText: string, res?: SSEWritable): Promise<void> {
    const turnNumber = this.agenticLoopRepo.getNextTurnNumber(sessionId);
    const broker = SessionStreamBroker.getInstance();

    logger.info('Turn Execution Started', { sessionId, turnNumber, actionText });

    // Save Player Action to Long Context immediately upon turn initialization
    this.agenticLoopRepo.saveLongContextMessage(sessionId, turnNumber, 'player', actionText);

    broker.startSession(sessionId, turnNumber, actionText);
    if (res) {
      broker.addSubscriber(sessionId, res);
    }

    const sendStatus = (stage: TurnStage, message: string, subagent?: SubagentGroup) => {
      broker.broadcastStatus(sessionId, { stage, subagent, message });
    };

    try {
      // 1. Stage: Pre-fetch & Context Assembly
      sendStatus('pre_fetch', 'Майстер шукає спогади у F017 та збирає контекст...');

      const systemPrompt = await this.contextAssembly.assembleMasterSystemPrompt(sessionId, actionText);
      logger.llm('System Prompt Assembled', { sessionId, turnNumber, promptLength: systemPrompt.length });

      // Maintain cumulative conversation transcript across Re-Act iterations
      const conversationMessages: any /*LLMMessage*/[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: actionText },
      ];

      // 2. Re-Act Loop (Max 3 iterations)
      let iteration = 0;
      const maxIterations = 3;
      let masterDecisionText = '';

      while (iteration < maxIterations) {
        iteration++;
        sendStatus(
          'master_eval',
          `Аналіз ситуації Майстром (${this.modelName}, Ітерація ${iteration}/${maxIterations})...`
        );

        if (this.llmProvider) {
          const startTime = Date.now();
          logger.llm(`Sending Prompt to LLM [${this.modelName}]`, { iteration, promptSnippet: actionText.slice(0, 100) });

          const heartbeatInterval = setInterval(() => {
            try {
              sendStatus('master_eval', `Очікування відповіді від ШІ-моделі (${this.modelName})...`);
            } catch {}
          }, 3000);

          try {
            const llmRes = await this.llmProvider.generate({
              model: this.modelName,
              messages: conversationMessages,
              temperature: 0.7,
              timeoutMs: 0, // Disable request timeout for long reasoning models
            });
            const latencyMs = Date.now() - startTime;
            masterDecisionText = (llmRes.content || '').trim();

            logger.llm('LLM Response Received', { iteration, latencyMs, rawOutputLength: masterDecisionText.length });
          } catch (llmErr: any) {
            logger.error('LLM Generate Error', { error: llmErr.message, iteration });
            masterDecisionText = `[Увага: Не вдалося отримати відповідь від ШІ-сервера (${llmErr.message}). Перевірте з'єднання у Налаштуваннях ШІ.]`;
            break;
          } finally {
            clearInterval(heartbeatInterval);
          }
        } else {
          // Fallback mock response if provider is not defined
          if (actionText.toLowerCase().includes('ману') || actionText.toLowerCase().includes('зілля')) {
            masterDecisionText = 'DELEGATE:actor:Зніми 10 мани та віднови 20 HP у гравця';
          } else {
            masterDecisionText = 'Ви уважно оглядаєтеся довкола. Все спокійно.';
          }
        }

        // Clean up reasoning/thinking tags emitted by reasoning models (e.g. Gemma 4 / DeepSeek-R1)
        masterDecisionText = masterDecisionText
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
          .trim();

        // Match all DELEGATE lines emitted in a single response (Parallel Multi-Delegation)
        const delegationMatches = Array.from(masterDecisionText.matchAll(/DELEGATE:(property|world|actor):(.*)/gi));

        if (delegationMatches.length > 0) {
          conversationMessages.push({ role: 'assistant', content: masterDecisionText });

          // Execute all subagent delegations in parallel via Promise.all
          const subagentResults = await Promise.all(
            delegationMatches.map(async (m) => {
              const group = m[1].toLowerCase() as SubagentGroup;
              const instruction = m[2].trim();

              logger.subagent('Executing Subagent Delegation', { group, instruction, iteration });

              sendStatus('subagent', `Сабагент ${group.toUpperCase()} оновлює стан: "${instruction}"`, group);

              const subagentRes = await this.orchestrator.executeSubagentInstruction(
                sessionId,
                group,
                instruction,
                (progress) => {
                  sendStatus('subagent', progress.message, progress.subagent);
                }
              );
              logger.subagent('Subagent Execution Finished', { group, success: subagentRes.success, resultData: subagentRes.data });

              return { group, instruction, subagentRes };
            })
          );

          const resultSummaries = subagentResults.map(
            (r) => `- [${r.group.toUpperCase()}]: ${r.subagentRes.message}`
          ).join('\n');

          // Push combined subagent results back to conversation messages
          conversationMessages.push({
            role: 'user',
            content: `РЕЗУЛЬТАТИ ВИКОНАННЯ САБАГЕНТАМИ:\n${resultSummaries}\n\nПочатковий запит гравця: "${actionText}". Якщо у початковому проханні є інші невиконані частини, видайте наступні команди DELEGATE:<group>:<instruction>. Якщо всі завдання виконано, видайте короткий підсумковий опис.`,
          });

          // Break loop to move to narrative generation
          break;
        } else {
          // Master generated narrative text without DELEGATE commands
          break;
        }
      }

      // 3. Stage: Master Narrative Generation
      sendStatus('master_gen', 'Наративний Майстер створює відповідь...');

      let finalNarrative = masterDecisionText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
        .replace(/DELEGATE:(property|world|actor):.*/gi, '')
        .trim();

      // If the last response was a DELEGATE command (no narrative text generated yet), generate final narrative summary via LLM!
      if (!finalNarrative && this.llmProvider) {
        try {
          conversationMessages.push({
            role: 'user',
            content: 'Усі сабагенти успішно виконали свої завдання. Сформуйте для гравця короткий підсумковий опис про результати цих дій без використання знаків DELEGATE.',
          });

          const summaryRes = await this.llmProvider.generate({
            model: this.modelName,
            messages: conversationMessages,
            temperature: 0.7,
            timeoutMs: 0,
          });

          finalNarrative = (summaryRes.content || '')
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
            .replace(/DELEGATE:(property|world|actor):.*/gi, '')
            .trim();
        } catch (summaryErr: any) {
          logger.error('Final Narrative Generation Failed', { error: summaryErr.message });
        }
      }

      if (!finalNarrative) {
        finalNarrative = 'Всі дії успішно виконано сабагентами. Стан гри оновлено.';
      }

      // Stream narrative text in chunks
      const chunkSize = 20;
      for (let i = 0; i < finalNarrative.length; i += chunkSize) {
        const delta = finalNarrative.slice(i, i + chunkSize);
        broker.broadcastChunk(sessionId, delta);
        await new Promise((r) => setTimeout(r, 15));
      }

      // 4. Stage: Finalize turn & Log updates
      this.agenticLoopRepo.saveLongContextMessage(sessionId, turnNumber, 'master', finalNarrative);

      const shortLogText = `Хід ${turnNumber}: ${actionText.slice(0, 50)}... -> ${finalNarrative.slice(0, 60)}...`;
      this.agenticLoopRepo.saveShortLog(sessionId, turnNumber, shortLogText);

      // Index in F017 Semantic Memory if available
      if (this.memoryService) {
        try {
          this.memoryService.indexRecord({
            session_id: sessionId,
            turn_number: turnNumber,
            role: 'master',
            content: finalNarrative,
          });
        } catch (memErr: any) {
          logger.error('Failed to index turn in semantic memory', { error: memErr.message });
        }
      }

      broker.broadcastDone(sessionId, {
        turnId: `turn_${turnNumber}`,
        shortLog: shortLogText,
      });

      logger.info('Turn Execution Completed Successfully', { sessionId, turnNumber });
    } catch (err: any) {
      logger.error('Turn Execution Errored', { sessionId, error: err.message });
      broker.broadcastError(sessionId, { message: err.message });
    }
  }
}

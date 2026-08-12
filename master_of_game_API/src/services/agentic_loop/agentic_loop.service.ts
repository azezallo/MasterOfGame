import { Response } from 'express';
import { DatabaseRepository } from '../../persistence/database_repository';
import { AgenticLoopRepository } from '../../repositories/agentic_loop.repository';
import { ILLMProvider } from '../../providers/llm/llm_provider.interface';
import { ContextAssemblyService } from './context_assembly.service';
import { SubagentOrchestratorService } from './subagent_orchestrator.service';
import { CompressionService } from './compression.service';
import { SemanticMemoryService } from '../semantic_memory.service';
import { SubagentGroup } from '../../types/agentic_loop.types';
import { logger } from '../../logger';

export class AgenticLoopService {
  private repo: DatabaseRepository;
  private agenticLoopRepo: AgenticLoopRepository;
  private llmProvider?: ILLMProvider;
  private modelName: string;
  private contextAssembly: ContextAssemblyService;
  private orchestrator: SubagentOrchestratorService;
  private compressionService: CompressionService;
  private memoryService?: SemanticMemoryService;

  constructor(
    repo: DatabaseRepository,
    llmProvider?: ILLMProvider,
    memoryService?: SemanticMemoryService,
    modelName: string = 'Qwen2.5-7B-Instruct'
  ) {
    this.repo = repo;
    this.agenticLoopRepo = repo.getAgenticLoopRepository();
    this.llmProvider = llmProvider;
    this.modelName = modelName;
    this.memoryService = memoryService;
    this.contextAssembly = new ContextAssemblyService(repo, memoryService);
    this.orchestrator = new SubagentOrchestratorService(repo, memoryService, llmProvider, modelName);
    this.compressionService = new CompressionService(repo, llmProvider);
  }

  public async runStreamTurn(sessionId: string, actionText: string, res: Response): Promise<void> {
    const turnNumber = this.agenticLoopRepo.getNextTurnNumber(sessionId);

    logger.info('Turn Execution Started', { sessionId, turnNumber, actionText });

    // Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSSE = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 1. Stage: Pre-fetch & Context Assembly
      sendSSE('status', {
        stage: 'pre_fetch',
        message: 'Майстер шукає спогади у F017 та збирає контекст...',
      });

      const systemPrompt = await this.contextAssembly.assembleMasterSystemPrompt(sessionId, actionText);
      logger.llm('System Prompt Assembled', { sessionId, turnNumber, promptLength: systemPrompt.length });

      // Save Player Action to Long Context
      this.agenticLoopRepo.saveLongContextMessage(sessionId, turnNumber, 'player', actionText);

      // 2. Re-Act Loop (Max 3 iterations)
      let currentInput = actionText;
      let iteration = 0;
      const maxIterations = 3;
      let masterDecisionText = '';

      while (iteration < maxIterations) {
        iteration++;
        sendSSE('status', {
          stage: 'master_eval',
          message: `Аналіз ситуації Майстром (${this.modelName}, Ітерація ${iteration}/${maxIterations})...`,
        });

        if (this.llmProvider) {
          const startTime = Date.now();
          logger.llm(`Sending Prompt to LLM [${this.modelName}]`, { iteration, promptSnippet: currentInput.slice(0, 100) });

          const heartbeatInterval = setInterval(() => {
            try {
              sendSSE('status', {
                stage: 'master_eval',
                message: `Очікування відповіді від ШІ-моделі (${this.modelName})...`,
              });
            } catch {}
          }, 3000);

          try {
            const llmRes = await this.llmProvider.generate({
              model: this.modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: currentInput },
              ],
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

        // Check if Master requests Subagent Delegation
        const delegationMatch = masterDecisionText.match(/DELEGATE:(property|world|actor):(.*)/i);
        if (delegationMatch) {
          const group = delegationMatch[1].toLowerCase() as SubagentGroup;
          const instruction = delegationMatch[2].trim();

          logger.subagent('Executing Subagent Delegation', { group, instruction, iteration });

          sendSSE('status', {
            stage: 'subagent',
            subagent: group,
            message: `Сабагент ${group.toUpperCase()} оновлює стан: "${instruction}"`,
          });

          const subagentRes = await this.orchestrator.executeSubagentInstruction(sessionId, group, instruction);
          logger.subagent('Subagent Execution Finished', { group, success: subagentRes.success, resultData: subagentRes.data });

          // Update input for next Re-Act iteration
          currentInput = `РЕЗУЛЬТАТ ВИКОНАННЯ САБАГЕНТОМ [${group.toUpperCase()}]: ${subagentRes.message}. Знайдені дані: ${JSON.stringify(subagentRes.data || {})}`;
        } else {
          // Master is ready to generate narrative
          break;
        }
      }

      // 3. Stage: Master Narrative Generation
      sendSSE('status', {
        stage: 'master_gen',
        message: 'Наративний Майстер створює відповідь...',
      });

      let finalNarrative = masterDecisionText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
        .replace(/DELEGATE:(property|world|actor):.*/gi, '')
        .trim();

      if (!finalNarrative) {
        finalNarrative = 'Ви роззираєтеся довкола, відчуваючи як атмосфера локації стає більш напруженою.';
      }

      // Stream narrative text in chunks
      const chunkSize = 20;
      for (let i = 0; i < finalNarrative.length; i += chunkSize) {
        const delta = finalNarrative.slice(i, i + chunkSize);
        sendSSE('chunk', { delta });
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
            tags: ['turn_narrative'],
          });
        } catch {}
      }

      logger.info('Turn Execution Successfully Completed', { sessionId, turnNumber, finalNarrativeLength: finalNarrative.length });

      sendSSE('done', {
        turnId: `turn_${turnNumber}`,
        shortLog: shortLogText,
      });

      res.end();
    } catch (error: any) {
      logger.error('Turn Execution Error', { sessionId, error: error.message });
      sendSSE('error', { message: error.message || 'Turn execution failed' });
      res.end();
    }
  }
}

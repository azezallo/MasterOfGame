import type { ChatMessage, GameStatus } from '../types';

// Mock initial data
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'msg_1', type: 'system', text: 'З\'єднання з сервером встановлено.' },
  { id: 'msg_2', type: 'master', text: 'Ви прокидаєтесь у тьмяно освітленій кімнаті. Холодна кам\'яна підлога неприємно холодить спину. Повітря просякнуте запахом вогкості та старої сталі. Зліва від вас дерев\'яні двері, праворуч - вузьке віконце, крізь яке пробивається бліде світло місяця.' }
];

export const mockChatApi = {
  fetchHistory: async (sessionId: string): Promise<{ messages: ChatMessage[], status: GameStatus }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      messages: [...INITIAL_MESSAGES],
      status: 'IDLE'
    };
  },

  sendMessage: async (content: string): Promise<{ success: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true };
  },

  pollGameStatus: async (currentStep: number): Promise<{ status: GameStatus, isReady: boolean, message?: string }> => {
    // Simulate the sequence of steps
    await new Promise(resolve => setTimeout(resolve, 1500)); // poll every 1.5s for demo

    switch (currentStep) {
      case 0:
        return { status: 'GATHERING_MEMORY', isReady: false };
      case 1:
        return { status: 'READING_MAP', isReady: false };
      case 2:
        return { status: 'GENERATING_NARRATIVE', isReady: false };
      default:
        return {
          status: 'IDLE',
          isReady: true,
          message: 'Майстер обдумав ваші дії і вирішив, що двері не піддаються. Вони замкнені з іншого боку. Схоже, вам доведеться шукати інший шлях.'
        };
    }
  }
};

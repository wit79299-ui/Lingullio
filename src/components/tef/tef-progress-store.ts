// ═══════════════════════════════════════════════════════════════════════════
// TEF Progress Store — Tracks session history & mock exam scores
// Uses Zustand + localStorage for persistence
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TEFSectionKey = 'CE' | 'CO' | 'EE' | 'EO';

export interface SessionRecord {
  id: string;
  date: string;          // ISO string
  type: 'training' | 'mock';
  mockExamId?: number;   // 1-5 for mock exams
  section: TEFSectionKey;
  correct: number;
  total: number;
  percentage: number;
  nclcEstimate: number;
  timeSeconds: number;
  trapsTriggered: string[];
}

export interface MockExamResult {
  examId: number;
  date: string;
  sections: Partial<Record<TEFSectionKey, {
    correct: number;
    total: number;
    percentage: number;
    nclcEstimate: number;
    timeSeconds: number;
  }>>;
  completedSections: TEFSectionKey[];
  overallNCLC: number | null;  // min of all 4, or null if incomplete
}

interface TefProgressState {
  sessions: SessionRecord[];
  mockExamResults: MockExamResult[];

  // Actions
  addSession: (session: Omit<SessionRecord, 'id' | 'date'>) => void;
  updateMockExamSection: (examId: number, section: TEFSectionKey, data: {
    correct: number; total: number; percentage: number; nclcEstimate: number; timeSeconds: number;
  }) => void;
  getRecentSessions: (limit?: number) => SessionRecord[];
  getSectionHistory: (section: TEFSectionKey) => SessionRecord[];
  getMockExamResult: (examId: number) => MockExamResult | undefined;
  getBestNCLC: (section: TEFSectionKey) => number;
  getAverageNCLC: (section: TEFSectionKey) => number;
  getTotalSessionCount: () => number;
  clearHistory: () => void;
}

export const useTefProgressStore = create<TefProgressState>()(
  persist(
    (set, get) => ({
      sessions: [],
      mockExamResults: [],

      addSession: (session) => {
        const record: SessionRecord = {
          ...session,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: new Date().toISOString(),
        };
        set((state) => ({
          sessions: [record, ...state.sessions].slice(0, 200), // keep last 200
        }));
      },

      updateMockExamSection: (examId, section, data) => {
        set((state) => {
          const existing = state.mockExamResults.find(r => r.examId === examId);
          if (existing) {
            const updated = {
              ...existing,
              date: new Date().toISOString(),
              sections: { ...existing.sections, [section]: data },
              completedSections: [...new Set([...existing.completedSections, section])],
            };
            // Calculate overall NCLC if all 4 sections completed
            const allFour: TEFSectionKey[] = ['CE', 'CO', 'EE', 'EO'];
            const allDone = allFour.every(s => updated.sections[s]);
            updated.overallNCLC = allDone
              ? Math.min(...allFour.map(s => updated.sections[s]!.nclcEstimate))
              : null;
            return {
              mockExamResults: state.mockExamResults.map(r =>
                r.examId === examId ? updated : r
              ),
            };
          } else {
            const newResult: MockExamResult = {
              examId,
              date: new Date().toISOString(),
              sections: { [section]: data },
              completedSections: [section],
              overallNCLC: null,
            };
            return { mockExamResults: [...state.mockExamResults, newResult] };
          }
        });
      },

      getRecentSessions: (limit = 20) => {
        return get().sessions.slice(0, limit);
      },

      getSectionHistory: (section) => {
        return get().sessions.filter(s => s.section === section);
      },

      getMockExamResult: (examId) => {
        return get().mockExamResults.find(r => r.examId === examId);
      },

      getBestNCLC: (section) => {
        const history = get().sessions.filter(s => s.section === section);
        if (history.length === 0) return 0;
        return Math.max(...history.map(s => s.nclcEstimate));
      },

      getAverageNCLC: (section) => {
        const history = get().sessions.filter(s => s.section === section);
        if (history.length === 0) return 0;
        const last5 = history.slice(0, 5);
        return Math.round(last5.reduce((sum, s) => sum + s.nclcEstimate, 0) / last5.length);
      },

      getTotalSessionCount: () => get().sessions.length,

      clearHistory: () => set({ sessions: [], mockExamResults: [] }),
    }),
    {
      name: 'tef-progress',
    }
  )
);

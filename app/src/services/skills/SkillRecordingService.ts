/**
 * Refactored Skill Recording Service
 * Main service that orchestrates action recording, skill management, and export
 */

import { ActionRecorder, RecordedAction } from './ActionRecorder';
import { SkillManager, RecordedSkill } from './SkillManager';
import { SkillExporter, ExportOptions } from './SkillExporter';

interface RecordingOptions {
  name: string;
  description?: string;
  category?: RecordedSkill['category'];
  tags?: string[];
  author?: string;
}

export interface RecordingState {
  isRecording: boolean;
  currentSkill: Omit<RecordedSkill, 'id' | 'createdAt' | 'updatedAt'> | null;
  actionCount: number;
  startTime: number | null;
  lastActionTime: number | null;
}

class SkillRecordingService {
  private recorder: ActionRecorder;
  private manager: SkillManager;
  private recordingState: RecordingState = {
    isRecording: false,
    currentSkill: null,
    actionCount: 0,
    startTime: null,
    lastActionTime: null,
  };

  constructor() {
    this.recorder = new ActionRecorder();
    this.manager = new SkillManager();
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    // Forward recorder events
    this.recorder.on('recording-started', () => this.emit('recording-started', this.getState()));
    this.recorder.on('recording-stopped', (actions: RecordedAction[]) => this.emit('recording-stopped', actions));
    this.recorder.on('recording-cancelled', () => this.emit('recording-cancelled'));
    this.recorder.on('action-recorded', (action: RecordedAction) => this.emit('action-recorded', action));

    // Forward manager events
    this.manager.on('skill-created', (skill: RecordedSkill) => this.emit('skill-created', skill));
    this.manager.on('skill-updated', (skill: RecordedSkill) => this.emit('skill-updated', skill));
    this.manager.on('skill-deleted', (id: string) => this.emit('skill-deleted', id));
    this.manager.on('skill-imported', (skill: RecordedSkill) => this.emit('skill-imported', skill));
  }

  // Recording methods

  startRecording(options: RecordingOptions): void {
    if (this.recordingState.isRecording) {
      console.warn('[SkillRecordingService] Already recording');
      return;
    }

    this.recordingState = {
      isRecording: true,
      currentSkill: {
        name: options.name,
        description: options.description || '',
        category: options.category || 'automation',
        author: options.author || 'user',
        tags: options.tags || [],
        version: '1.0.0',
        actions: [],
      },
      actionCount: 0,
      startTime: Date.now(),
      lastActionTime: null,
    };

    this.recorder.startRecording();
  }

  stopRecording(options?: { name?: string; description?: string }): RecordedSkill | null {
    if (!this.recordingState.isRecording) {
      console.warn('[SkillRecordingService] Not recording');
      return null;
    }

    const actions = this.recorder.stopRecording();

    if (!this.recordingState.currentSkill) {
      return null;
    }

    const skill = this.manager.createSkill({
      ...this.recordingState.currentSkill,
      name: options?.name || this.recordingState.currentSkill.name,
      description: options?.description || this.recordingState.currentSkill.description,
      actions,
    });

    this.recordingState = {
      isRecording: false,
      currentSkill: null,
      actionCount: 0,
      startTime: null,
      lastActionTime: null,
    };

    this.emit('recording-stopped', skill);
    return skill;
  }

  cancelRecording(): void {
    this.recorder.cancelRecording();
    this.recordingState = {
      isRecording: false,
      currentSkill: null,
      actionCount: 0,
      startTime: null,
      lastActionTime: null,
    };
  }

  // Manual action recording

  recordAction(action: Omit<RecordedAction, 'id' | 'timestamp' | 'description'>): void {
    this.recorder.recordAction(action);
  }

  addWaitAction(duration: number, reason?: string): void {
    this.recorder.recordAction({
      type: 'wait',
      data: { duration, reason },
    });
  }

  addScreenshotAction(name?: string): void {
    this.recorder.recordAction({
      type: 'screenshot',
      data: { name },
    });
  }

  addExtractAction(selector: string, name: string, attribute?: string): void {
    this.recorder.recordAction({
      type: 'extract',
      data: { selector, name, attribute },
    });
  }

  // Skill management methods (delegated to SkillManager)

  getAllSkills(): RecordedSkill[] {
    return this.manager.getAllSkills();
  }

  getSkill(id: string): RecordedSkill | null {
    return this.manager.getSkill(id);
  }

  updateSkill(id: string, updates: Partial<Omit<RecordedSkill, 'id' | 'createdAt'>>): RecordedSkill | null {
    return this.manager.updateSkill(id, updates);
  }

  deleteSkill(id: string): boolean {
    return this.manager.deleteSkill(id);
  }

  searchSkills(query: string): RecordedSkill[] {
    return this.manager.searchSkills(query);
  }

  filterByCategory(category: RecordedSkill['category']): RecordedSkill[] {
    return this.manager.filterByCategory(category);
  }

  getStats(): ReturnType<typeof SkillManager.prototype.getStats> {
    return this.manager.getStats();
  }

  // Export methods (delegated to SkillExporter)

  exportSkill(id: string, options?: ExportOptions): string | null {
    const skill = this.getSkill(id);
    if (!skill) return null;

    return SkillExporter.toExecutable(skill, options);
  }

  skillToExecutable(skill: RecordedSkill): string {
    return SkillExporter.toExecutable(skill, { format: 'javascript', includeComments: true });
  }

  exportSkillSummary(id: string): string | null {
    const skill = this.getSkill(id);
    if (!skill) return null;

    return SkillExporter.toSummary(skill);
  }

  importSkill(json: string): RecordedSkill | null {
    return this.manager.importSkill(json);
  }

  // State and utilities

  getState(): RecordingState {
    return { ...this.recordingState };
  }

  getRecorderState() {
    return this.recorder.getState();
  }

  toggleAutoCapture(enabled: boolean): void {
    this.recorder.toggleAutoCapture(enabled);
  }

  // EventEmitter methods (minimal implementation)
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(...args));
  }
}

// Singleton instance
export const skillRecordingService = new SkillRecordingService();

// Global access
if (typeof window !== 'undefined') {
  window.skillRecordingService = skillRecordingService;
}

// Type declaration
declare global {
  interface Window {
    skillRecordingService?: typeof skillRecordingService;
  }
}

// Re-export types
export type { RecordedAction, RecordedSkill, RecordingOptions, ExportOptions };
export { ActionRecorder, SkillManager, SkillExporter };

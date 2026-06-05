/**
 * Skill Manager Module
 * Handles skill storage, retrieval, and management
 */

import { EventEmitter } from '@/utils/EventEmitter';
import { RecordedAction } from './ActionRecorder';

export interface RecordedSkill {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'form' | 'scraping' | 'automation' | 'testing' | 'other';
  actions: RecordedAction[];
  createdAt: number;
  updatedAt: number;
  author: string;
  tags: string[];
  version: string;
}

const STORAGE_KEY = 'recorded-skills';

export class SkillManager extends EventEmitter {
  private skills: RecordedSkill[] = [];

  constructor() {
    super();
    this.loadSkills();
  }

  /**
   * Load skills from localStorage
   */
  private loadSkills(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.skills = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[SkillManager] Failed to load skills:', error);
      this.skills = [];
    }
  }

  /**
   * Save skills to localStorage
   */
  private saveSkills(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.skills));
    } catch (error) {
      console.error('[SkillManager] Failed to save skills:', error);
    }
  }

  /**
   * Create a new skill
   */
  createSkill(data: Omit<RecordedSkill, 'id' | 'createdAt' | 'updatedAt'>): RecordedSkill {
    const skill: RecordedSkill = {
      id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.skills.push(skill);
    this.saveSkills();
    this.emit('skill-created', skill);

    return skill;
  }

  /**
   * Get all skills
   */
  getAllSkills(): RecordedSkill[] {
    return [...this.skills];
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): RecordedSkill | null {
    return this.skills.find(skill => skill.id === id) || null;
  }

  /**
   * Update skill
   */
  updateSkill(id: string, updates: Partial<Omit<RecordedSkill, 'id' | 'createdAt'>>): RecordedSkill | null {
    const index = this.skills.findIndex(skill => skill.id === id);

    if (index === -1) {
      return null;
    }

    const updatedSkill = {
      ...this.skills[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.skills[index] = updatedSkill;
    this.saveSkills();
    this.emit('skill-updated', updatedSkill);

    return updatedSkill;
  }

  /**
   * Delete skill
   */
  deleteSkill(id: string): boolean {
    const index = this.skills.findIndex(skill => skill.id === id);

    if (index === -1) {
      return false;
    }

    this.skills.splice(index, 1);
    this.saveSkills();
    this.emit('skill-deleted', id);

    return true;
  }

  /**
   * Export skill as JSON
   */
  exportSkill(id: string): string | null {
    const skill = this.getSkill(id);
    if (!skill) return null;

    return JSON.stringify(skill, null, 2);
  }

  /**
   * Import skill from JSON
   */
  importSkill(json: string): RecordedSkill | null {
    try {
      const skill = JSON.parse(json);

      // Generate new ID to avoid conflicts
      skill.id = `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      skill.createdAt = Date.now();
      skill.updatedAt = Date.now();

      this.skills.push(skill);
      this.saveSkills();
      this.emit('skill-imported', skill);

      return skill;
    } catch (error) {
      console.error('[SkillManager] Failed to import skill:', error);
      return null;
    }
  }

  /**
   * Search skills by query
   */
  searchSkills(query: string): RecordedSkill[] {
    const lowerQuery = query.toLowerCase();

    return this.skills.filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Filter skills by category
   */
  filterByCategory(category: RecordedSkill['category']): RecordedSkill[] {
    return this.skills.filter(skill => skill.category === category);
  }

  /**
   * Get skill statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    averageActions: number;
  } {
    const byCategory: Record<string, number> = {};

    this.skills.forEach(skill => {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
    });

    const averageActions = this.skills.length > 0
      ? this.skills.reduce((sum, skill) => sum + skill.actions.length, 0) / this.skills.length
      : 0;

    return {
      total: this.skills.length,
      byCategory,
      averageActions: Math.round(averageActions * 10) / 10,
    };
  }
}

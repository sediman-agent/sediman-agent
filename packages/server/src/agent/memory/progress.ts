export interface Milestone {
  description: string;
  completed: boolean;
  timestamp?: string;
}

export class ProgressTracker {
  private milestones: Milestone[] = [];

  getMilestones(): Milestone[] {
    return [...this.milestones];
  }

  getProgress(): { total: number; completed: number; percentage: number } {
    const total = this.milestones.length;
    const completed = this.milestones.filter((m) => m.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percentage };
  }
}

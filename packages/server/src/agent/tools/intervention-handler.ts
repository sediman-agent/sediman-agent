/**
 * Browser Intervention Handler Module
 * Manages human intervention requests during agent execution
 */

let interventionCallback: ((message: string, id: number) => void) | null = null;
let pendingIntervention: { message: string; id: number } | null = null;

/**
 * Set callback for when intervention is requested
 */
export function setOnInterventionRequested(cb: (message: string, id: number) => void): void {
  interventionCallback = cb;
}

/**
 * Check if there's a pending intervention
 */
export function hasPendingIntervention(): boolean {
  return pendingIntervention !== null;
}

/**
 * Get the pending intervention details
 */
export function getPendingIntervention(): { message: string; id: number } | null {
  return pendingIntervention;
}

/**
 * Resolve an intervention with a result
 */
export function resolveIntervention(result: string): boolean {
  if (!pendingIntervention) {
    return false;
  }

  const { id } = pendingIntervention;
  pendingIntervention = null;

  if (interventionCallback) {
    interventionCallback(result, id);
    return true;
  }

  return false;
}

/**
 * Request human intervention
 */
export function requestIntervention(message: string): number {
  const id = Date.now();
  pendingIntervention = { message, id };

  if (interventionCallback) {
    interventionCallback(message, id);
  }

  return id;
}

/**
 * Set the project manager (needed for some operations)
 */
let projectManager: any = null;

export function setProjectManager(pm: any): void {
  projectManager = pm;
}

export function getProjectManager(): any {
  return projectManager;
}

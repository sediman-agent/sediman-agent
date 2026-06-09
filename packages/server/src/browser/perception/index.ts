/**
 * Browser Perception Module
 *
 * Exports smart DOM extraction and vision-DOM fusion capabilities
 *
 * @module browser/perception
 */

export { AccessibilityTreeExtractor, axExtractor } from './ax-extractor';
export type {
  AXNode,
  ElementMetadata,
  InteractiveElement,
  PageState,
} from './ax-extractor';

export { VisionDOMFusion, fusion } from './fusion';
export type {
  ScreenshotData,
  FusionState,
  FusionStrategy,
  FusionOptions,
} from './fusion';

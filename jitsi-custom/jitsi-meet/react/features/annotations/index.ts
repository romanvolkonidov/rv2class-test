/**
 * Annotation system exports
 */

// Import reducer to register it
import './reducer';

// Export components
export { default as AnnotationButton } from './components/AnnotationButton';
export { default as AnnotationOverlay } from './components/AnnotationOverlay';
export { default as AnnotationToolbar } from './components/AnnotationToolbar';

// Export actions
export * from './actions';
export * from './actionTypes';

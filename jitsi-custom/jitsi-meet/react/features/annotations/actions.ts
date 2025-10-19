/**
 * Actions for annotation feature
 */

import {
    TOGGLE_ANNOTATIONS,
    SET_ANNOTATION_TOOL,
    SET_ANNOTATION_COLOR,
    CLEAR_ANNOTATIONS
} from './actionTypes';

/**
 * Toggle annotations on/off
 */
export function toggleAnnotations() {
    return {
        type: TOGGLE_ANNOTATIONS
    };
}

/**
 * Set the current annotation tool
 */
export function setAnnotationTool(tool: string) {
    return {
        type: SET_ANNOTATION_TOOL,
        tool
    };
}

/**
 * Set annotation color
 */
export function setAnnotationColor(color: string) {
    return {
        type: SET_ANNOTATION_COLOR,
        color
    };
}

/**
 * Clear all annotations
 */
export function clearAnnotations() {
    return {
        type: CLEAR_ANNOTATIONS
    };
}

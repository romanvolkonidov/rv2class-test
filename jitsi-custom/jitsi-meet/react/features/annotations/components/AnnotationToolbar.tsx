/**
 * Annotation Toolbar Component
 * Renders the annotation overlay when annotations are enabled
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import AnnotationOverlay from './AnnotationOverlay';

/**
 * Component that renders the annotation toolbar/overlay.
 */
function AnnotationToolbar() {
    const annotationsState = useSelector((state: IReduxState) => (state as any)['features/annotations']);
    const annotationsEnabled = Boolean(annotationsState?.enabled);

    if (!annotationsEnabled) {
        return null;
    }

    return <AnnotationOverlay />;
}

export default AnnotationToolbar;

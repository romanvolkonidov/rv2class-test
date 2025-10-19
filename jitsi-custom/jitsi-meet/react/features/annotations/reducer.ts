/**
 * Reducer for annotations
 */

import ReducerRegistry from '../base/redux/ReducerRegistry';
import {
    TOGGLE_ANNOTATIONS,
    SET_ANNOTATION_TOOL,
    SET_ANNOTATION_COLOR,
    CLEAR_ANNOTATIONS
} from './actionTypes';

export interface IAnnotationsState {
    enabled: boolean;
    tool: string;
    color: string;
    history: any[];
    historyStep: number;
}

const DEFAULT_STATE: IAnnotationsState = {
    enabled: false,
    tool: 'pencil',
    color: '#FF0000',
    history: [],
    historyStep: 0
};

ReducerRegistry.register<IAnnotationsState>('features/annotations', (state = DEFAULT_STATE, action): IAnnotationsState => {
    switch (action.type) {
        case TOGGLE_ANNOTATIONS:
            return {
                ...state,
                enabled: !state.enabled
            };

        case SET_ANNOTATION_TOOL:
            return {
                ...state,
                tool: action.tool
            };

        case SET_ANNOTATION_COLOR:
            return {
                ...state,
                color: action.color
            };

        case CLEAR_ANNOTATIONS:
            return {
                ...state,
                history: [],
                historyStep: 0
            };

        default:
            return state;
    }
});

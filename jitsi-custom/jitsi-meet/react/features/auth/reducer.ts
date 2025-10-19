import { User } from 'firebase/auth';
import ReducerRegistry from '../base/redux/ReducerRegistry';
import { SET_AUTH_USER, SET_AUTH_LOADING, SET_AUTH_ERROR, PROCEED_TO_PREJOIN } from './actionTypes';

export interface IAuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
    shouldProceedToPrejoin: boolean;
}

const DEFAULT_STATE: IAuthState = {
    user: null,
    loading: false,
    error: null,
    shouldProceedToPrejoin: false
};

ReducerRegistry.register<IAuthState>('features/auth', (state = DEFAULT_STATE, action): IAuthState => {
    switch (action.type) {
    case SET_AUTH_USER:
        return {
            ...state,
            user: action.user
        };

    case SET_AUTH_LOADING:
        return {
            ...state,
            loading: action.loading
        };

    case SET_AUTH_ERROR:
        return {
            ...state,
            error: action.error
        };

    case PROCEED_TO_PREJOIN:
        return {
            ...state,
            shouldProceedToPrejoin: true
        };

    default:
        return state;
    }
});

import { useSyncExternalStore } from 'react';
import { getCallState, subscribeCallState, type CallState } from './callStore';

export function useCallState(): CallState {
    return useSyncExternalStore(subscribeCallState, getCallState, getCallState);
}

import { validateEvent } from './validator.js';

/**
 * Rebuilds the state of an aggregate by replaying its events.
 * @param {Array} events 
 * @param {Function} reducer (state, event) => newState
 * @param {Object} initialState 
 * @returns {Object} Final state
 */
export function projectState(events, reducer, initialState = {}) {
    let state = { ...initialState };

    for (const event of events) {
        // Validate each event before projecting it
        validateEvent(event);

        // Apply the reducer
        state = reducer(state, event);
    }

    return state;
}

/**
 * Example Page Reducer
 */
export function pageReducer(state, event) {
    if (event.eventType === 'PAGE_CREATED' || event.eventType === 'PAGE_UPDATED') {
        return {
            ...state,
            ...event.payload,
            id: event.aggregateId,
            version: event.version,
            updatedAt: event.timestamp,
            createdAt: state.createdAt || event.timestamp
        };
    }
    return state;
}

/**
 * User Reducer
 */
export function userReducer(state, event) {
    if (event.eventType === 'USER_CREATED' || event.eventType === 'USER_UPDATED') {
        return {
            ...state,
            ...event.payload,
            id: event.aggregateId,
            version: event.version,
            updatedAt: event.timestamp,
            createdAt: state.createdAt || event.timestamp
        };
    }
    return state;
}

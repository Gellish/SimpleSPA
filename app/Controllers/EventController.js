/**
 * EventController
 * 
 * Handles event store operations (CQRS/Event Sourcing)
 */

import { createContext } from '../Lib/server/http-helpers.js';
import { writeEvent, readEvents, getAllAggregates, deleteAggregate } from '../Lib/cqrs/event-store.js';
import { projectState, pageReducer, userReducer } from '../Lib/cqrs/projection.js';

export default class EventController {
    /**
     * Get events for an aggregate
     * GET /__api/events?type=page&id=123
     */
    async index(req, res) {
        const ctx = createContext(req, res);

        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const type = url.searchParams.get('type');
            const id = url.searchParams.get('id');

            const events = await readEvents(type, id);

            return ctx.response.json({ events });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }

    /**
     * Create a new event
     * POST /__api/events
     */
    async store(req, res) {
        const ctx = createContext(req, res);

        try {
            const eventData = await ctx.request.body();
            const event = await writeEvent(eventData);

            return ctx.response.json({ success: true, event });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }

    /**
     * Delete an aggregate
     * POST /__api/events/delete
     */
    async destroy(req, res) {
        const ctx = createContext(req, res);

        try {
            const { type, id } = await ctx.request.body();
            await deleteAggregate(type, id);

            return ctx.response.json({ success: true });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }

    /**
     * Get all aggregates with their current state
     * GET /__api/aggregates?type=page
     */
    async aggregates(req, res) {
        const ctx = createContext(req, res);

        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const typeFilter = url.searchParams.get('type');

            const aggregates = await getAllAggregates();
            const filtered = typeFilter
                ? aggregates.filter(a => a.type === typeFilter)
                : aggregates;

            // Project current state for each aggregate
            const results = await Promise.all(filtered.map(async (a) => {
                const events = await readEvents(a.type, a.id);
                const reducer = a.type === 'user' ? userReducer : pageReducer;
                const state = projectState(events, reducer);

                return {
                    id: a.id,
                    type: a.type,
                    state,
                    eventsCount: events.length
                };
            }));

            return ctx.response.json({ aggregates: results });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }
}

/**
 * Event Store Unit Tests
 * 
 * Tests for the Event Sourcing / CQRS event store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeEvent, readEvents, getAllAggregates, deleteAggregate } from '@app/Lib/cqrs/event-store.js';
import { uuidv4 } from '@app/Lib/cqrs/uuid.js';

describe('Event Store', () => {
    let testAggregateId;

    beforeEach(() => {
        testAggregateId = uuidv4();
    });

    afterEach(async () => {
        // Cleanup test data
        await deleteAggregate('test', testAggregateId);
    });

    it('should write an event', async () => {
        const event = await writeEvent({
            aggregateId: testAggregateId,
            aggregateType: 'test',
            eventType: 'TEST_CREATED',
            payload: { name: 'Test' },
            version: 1
        });

        expect(event).toBeDefined();
        expect(event.eventId).toBeDefined();
        expect(event.aggregateId).toBe(testAggregateId);
        expect(event.eventType).toBe('TEST_CREATED');
    });

    it('should read events for an aggregate', async () => {
        // Write multiple events
        await writeEvent({
            aggregateId: testAggregateId,
            aggregateType: 'test',
            eventType: 'TEST_CREATED',
            payload: { name: 'Test' },
            version: 1
        });

        await writeEvent({
            aggregateId: testAggregateId,
            aggregateType: 'test',
            eventType: 'TEST_UPDATED',
            payload: { name: 'Test Updated' },
            version: 2
        });

        const events = await readEvents('test', testAggregateId);

        expect(events).toHaveLength(2);
        expect(events[0].eventType).toBe('TEST_CREATED');
        expect(events[1].eventType).toBe('TEST_UPDATED');
    });

    it('should return empty array for non-existent aggregate', async () => {
        const events = await readEvents('test', 'non-existent-id');
        expect(events).toEqual([]);
    });

    it('should list all aggregates', async () => {
        await writeEvent({
            aggregateId: testAggregateId,
            aggregateType: 'test',
            eventType: 'TEST_CREATED',
            payload: { name: 'Test' },
            version: 1
        });

        const aggregates = await getAllAggregates();
        const testAggregate = aggregates.find(a => a.id === testAggregateId);

        expect(testAggregate).toBeDefined();
        expect(testAggregate.type).toBe('test');
    });

    it('should delete an aggregate', async () => {
        await writeEvent({
            aggregateId: testAggregateId,
            aggregateType: 'test',
            eventType: 'TEST_CREATED',
            payload: { name: 'Test' },
            version: 1
        });

        await deleteAggregate('test', testAggregateId);

        const events = await readEvents('test', testAggregateId);
        expect(events).toEqual([]);
    });
});

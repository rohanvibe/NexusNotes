/**
 * A simple EventBus for decoupled communication between components.
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} listener - Callback function
     * @returns {function} - Unsubscribe function
     */
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);

        return () => this.off(event, listener);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} listenerToRemove - Callback function to remove
     */
    off(event, listenerToRemove) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(
            listener => listener !== listenerToRemove
        );
    }

    /**
     * Publish an event
     * @param {string} event - Event name
     * @param {any} data - Data to pass to listeners
     */
    emit(event, data) {
        if (!this.events[event]) return;

        this.events[event].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error executing listener for event: ${event}`, error);
            }
        });
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {function} listener - Callback function
     */
    once(event, listener) {
        const remove = this.on(event, (...args) => {
            remove();
            listener(...args);
        });
    }
}

// Export a singleton instance
export const events = new EventBus();

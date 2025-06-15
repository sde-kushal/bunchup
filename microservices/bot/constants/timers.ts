export const SECS = 1;
export const MINS = 60 * SECS;
export const HOURS = 60 * MINS;
export const DAYS = 24 * HOURS;

export const TIMERS = {
    FORUM_CHANNEL: {
        RATE_LIMIT: { MIN: 10 * SECS, MAX: 6 * HOURS },
        THREAD_RATE_LIMIT: { MIN: 5 * MINS, MAX: 6 * HOURS },
    }
};
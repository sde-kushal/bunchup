
export function getUsTime(dateString: string | Date) {
    const date = new Date(dateString);

    // Format day and short month
    const dayMonth = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        timeZone: 'America/New_York'
    });

    // Format hour and minute (24-hour format)
    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
    });

    return `${dayMonth} @ ${time}`;
}
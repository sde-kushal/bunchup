export const getDate = (date?: string) => date
    ? new Date(date).toISOString()
    : new Date().toISOString();



export function getUsTime(dateString: string | Date, omitTime?: boolean) {
    const date = new Date(dateString);

    // Format day and short month
    const dayMonthYear = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/New_York'
    });

    if(omitTime) return dayMonthYear;

    // Format hour and minute (24-hour format)
    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
    });

    return `${dayMonthYear} @ ${time}`;
}
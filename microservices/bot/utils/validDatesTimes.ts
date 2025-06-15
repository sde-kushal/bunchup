export const validDate = (input: string) => {
    const validSyntax = /^\d{4}-\d{2}-\d{2}$/.test(input);
    if (!validSyntax) return false;

    // Check if it's a valid calendar date (e.g., 2025-02-30 is invalid)
    const date = new Date(input);
    const [year, month, day] = input.split('-').map(Number);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 && // JS months are 0-based
        date.getDate() === day
    );
}

export const isFutureDate = ({ defaultDate, futureDate }: { futureDate: string, defaultDate: string }) => {
    if (!validDate(futureDate) || !validDate(defaultDate))
        return false;

    const future = new Date(futureDate);
    const present = new Date(defaultDate);

    return future > present;
}

export const isPresentDate = ({ defaultDate, futureDate }: { futureDate: string, defaultDate: string }) => {
    if (!validDate(futureDate) || !validDate(defaultDate))
        return false;

    const future = new Date(futureDate);
    const present = new Date(defaultDate);

    return future >= present && future <= present;
}


export const valid24Hours = (input: string) =>
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(input);


export const isFutureHours = ({ defaultTime, futureTime }: { futureTime: string, defaultTime: string }) => {
    if (!valid24Hours(futureTime) || !valid24Hours(defaultTime))
        return false;

    const [H1, M1] = defaultTime.split(':').map(Number);
    const [H2, M2] = futureTime.split(':').map(Number);
    return H2 > H1 || (H2 === H1 && M2 > M1);
}
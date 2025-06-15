export const isNumber = (str: string | null) => str && !isNaN(parseInt(str)) ? true : false;
export const isPositiveNumber = (str: string | null) => isNumber(str) && (parseInt(str || "...") > 0) ? true : false;


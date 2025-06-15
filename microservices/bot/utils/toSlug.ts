export const toSlug = (str: string) =>
    str
        .trim()
        .toLowerCase()
        .normalize('NFKD')                 // Remove accents
        .replace(/[\u0300-\u036f]/g, '')   // Strip diacritics
        .replace(/[^a-z0-9]+/g, '-')       // Replace non-alphanumerics with dashes
        .replace(/^-+|-+$/g, '')           // Remove leading/trailing dashes
        .replace(/--+/g, '-');             // Collapse multiple dashes

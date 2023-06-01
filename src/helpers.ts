export const bool = (value: unknown): boolean => {
    return !!eval(String(value));
};

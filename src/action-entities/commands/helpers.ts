export const getCommandArguments = (string: string): string[] => {
    return string.split(' ').filter((el) => !el.includes('/'));
};

export const useDelayPromiseCaller = <T extends Array<any>, U>(
    delayTime: number,
    callback: (...args: T) => Promise<U>,
) : (...args: T) => Promise<U> => {
    let timer:NodeJS.Timeout | undefined;
    return function(...args: T) {
        if (timer) {
            clearTimeout(timer);
        }
        return new Promise(res => {
            timer = setTimeout(() => res(callback(...args)), delayTime);
        });
    };
};
/**
 * Utility functions for safe floating-point arithmetic.
 * Javascript's IEEE 754 floating point acts weird: 0.1 + 0.2 = 0.30000000000000004
 * These helpers perform operations by first converting to integers (cents).
 */

// Helper to convert to integer (cents)
const toInt = (n) => Math.round((Number(n) || 0) * 100);

/**
 * Safely adds two or more numbers
 * safeAdd(0.1, 0.2) -> 0.3
 */
export const safeAdd = (...args) => {
    const sumInt = args.reduce((acc, curr) => acc + toInt(curr), 0);
    return sumInt / 100;
};

/**
 * Safely subtracts numbers
 * safeSub(0.3, 0.1) -> 0.2
 */
export const safeSub = (a, b) => {
    return (toInt(a) - toInt(b)) / 100;
};

/**
 * Safely multiplies numbers
 * safeMult(10.25, 4) -> 41
 */
export const safeMult = (a, b) => {
    // a * 100 * b * 100 = result * 10000
    // so divide by 10000
    return (toInt(a) * toInt(b)) / 10000;
};

/**
 * Safely divides numbers
 * safeDiv(10, 3) -> 3.33333... (standard float behavior, just safe inputs)
 * Handles division by zero by returning 0
 */
export const safeDiv = (a, b) => {
    const num = Number(a) || 0;
    const den = Number(b) || 0;
    if (den === 0) return 0;
    return num / den;
};

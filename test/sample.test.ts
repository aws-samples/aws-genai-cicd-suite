import { add, subtract } from '/home/runner/work/aws-genai-cicd-suite/aws-genai-cicd-suite/debugging/sample';

describe('add', () => {
  it('should add two positive numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should add two negative numbers correctly', () => {
    expect(add(-2, -3)).toBe(-5);
  });

  it('should add a positive and a negative number correctly', () => {
    expect(add(2, -3)).toBe(-1);
  });

  it('should add zero to a number correctly', () => {
    expect(add(0, 5)).toBe(5);
    expect(add(5, 0)).toBe(5);
  });
});

describe('subtract', () => {
  it('should subtract two positive numbers correctly', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it('should subtract two negative numbers correctly', () => {
    expect(subtract(-5, -3)).toBe(-2);
  });

  it('should subtract a negative number from a positive number correctly', () => {
    expect(subtract(5, -3)).toBe(8);
  });

  it('should subtract a positive number from a negative number correctly', () => {
    expect(subtract(-5, 3)).toBe(-8);
  });

  it('should subtract zero from a number correctly', () => {
    expect(subtract(5, 0)).toBe(5);
    expect(subtract(0, 5)).toBe(-5);
  });
});

import { subtract } from '/home/runner/work/aws-genai-cicd-suite/aws-genai-cicd-suite/debugging/sample';

describe('subtract', () => {
  it('should subtract two positive numbers correctly', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it('should subtract two negative numbers correctly', () => {
    expect(subtract(-10, -5)).toBe(-5);
  });

  it('should subtract a positive number from a negative number correctly', () => {
    expect(subtract(-8, 3)).toBe(-11);
  });

  it('should subtract a negative number from a positive number correctly', () => {
    expect(subtract(10, -4)).toBe(14);
  });

  it('should return 0 when subtracting the same number', () => {
    expect(subtract(7, 7)).toBe(0);
  });

  it('should handle large numbers correctly', () => {
    expect(subtract(1000000000, 500000000)).toBe(500000000);
  });

  it('should handle floating-point numbers correctly', () => {
    expect(subtract(3.14, 1.57)).toBeCloseTo(1.57, 5);
  });
});
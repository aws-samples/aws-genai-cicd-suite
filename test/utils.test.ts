import { shouldExcludeFile } from '@/debugging/utils';

describe('shouldExcludeFile', () => {
  it('should return true if the filename matches any of the exclude patterns', () => {
    const filename = 'src/components/Button.test.tsx';
    const excludePatterns = ['**/node_modules/**', '**/dist/**', '**/*.test.*'];

    expect(shouldExcludeFile(filename, excludePatterns)).toBe(true);
  });

  it('should return false if the filename does not match any of the exclude patterns', () => {
    const filename = 'src/components/Button.tsx';
    const excludePatterns = ['**/node_modules/**', '**/dist/**'];

    expect(shouldExcludeFile(filename, excludePatterns)).toBe(false);
  });

  it('should handle wildcard patterns correctly', () => {
    const filename = 'src/utils/helpers.ts';
    const excludePatterns = ['**/node_modules/**', '**/dist/**', 'src/utils/*'];

    expect(shouldExcludeFile(filename, excludePatterns)).toBe(true);
  });

  it('should handle empty exclude patterns', () => {
    const filename = 'src/components/Button.tsx';
    const excludePatterns: string[] = [];

    expect(shouldExcludeFile(filename, excludePatterns)).toBe(false);
  });

  test.each`
    filename                      | excludePatterns                                        | expected
    ${'src/components/Button.tsx'} | ${['**/node_modules/**', '**/dist/**', '**/*.tsx']}   | ${true}
    ${'src/utils/helpers.ts'}      | ${['**/node_modules/**', '**/dist/**', 'src/utils/*']} | ${true}
    ${'src/index.tsx'}             | ${['**/node_modules/**', '**/dist/**', '**/*.test.*']} | ${false}
    ${'src/tests/Button.test.tsx'} | ${['**/node_modules/**', '**/dist/**', '**/*.test.*']} | ${true}
    ${'src/styles/global.css'}     | ${[]}                                                  | ${false}
  `('should return $expected for filename $filename and excludePatterns $excludePatterns', ({ filename, excludePatterns, expected }) => {
    expect(shouldExcludeFile(filename, excludePatterns)).toBe(expected);
  });
});
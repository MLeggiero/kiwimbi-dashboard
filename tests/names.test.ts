import { describe, expect, it } from 'vitest';
import { buildNameMap, canonicalName, cleanName, isTestName } from '../shared/names';

// All names here are invented.
describe('names', () => {
  it('normalizes spacing, punctuation and capitalization', () => {
    expect(cleanName('  jane   doe ')).toBe('Jane Doe');
    expect(cleanName('Mary Example.')).toBe('Mary Example');
    expect(cleanName("mary-jo o'example")).toBe("Mary-Jo O'Example");
    expect(cleanName(null)).toBe('');
  });

  it('maps variations to the canonical spelling from the Name Mappings tab', () => {
    const map = buildNameMap([
      ['Canonical Name', 'Variations'],
      ['Mary Example', 'mary example, Example Mary '],
      ['Sam Sample.', 'Sam Sample.'],
    ]);
    expect(canonicalName('example  mary', map)).toBe('Mary Example');
    expect(canonicalName('SAM SAMPLE', map)).toBe('Sam Sample');
    expect(canonicalName('Someone New', map)).toBe('Someone New');
    expect(canonicalName('', map)).toBe('');
  });

  it('recognizes test submissions', () => {
    expect(isTestName('Test Test')).toBe(true);
    expect(isTestName('Test 1')).toBe(true);
    expect(isTestName('test')).toBe(true);
    expect(isTestName('Testimony Example')).toBe(false);
  });
});

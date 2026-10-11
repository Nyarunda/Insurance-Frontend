import { describe, expect, it } from 'vitest';
import { csvText } from './export';

describe('Report CSV', () => {
  it('escapes delimiters, quotes and line breaks', () => {
    expect(csvText([['Branch, name', 'Say "yes"', 'two\nlines']])).toBe('\uFEFF"Branch, name","Say ""yes""","two\nlines"');
  });
  it.each(['=HYPERLINK("bad")', '+SUM(A1)', '-CMD()', '@SUM(A1)', '  =1+1', '\t=1+1'])('neutralizes formula text %s', text => {
    expect(csvText([[text]])).toContain('"\'');
  });
  it('retains exact amounts and ordinary negative decimal values', () => {
    expect(csvText([['9999999999999999.99', '-123.45', 2]])).toBe('\uFEFF"9999999999999999.99","-123.45","2"');
  });
});

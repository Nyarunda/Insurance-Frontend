import { describe, expect, it } from 'vitest';
import { AMOUNT_MESSAGES, parseAmount } from './amount';

describe('RUP1 F-8: amounts as people type them', () => {
  it.each([
    ['55000', '55000'],
    ['55,000', '55000'],
    [' 55,000 ', '55000'],
    ['1,250,000.50', '1250000.50'],
    ['100000.5', '100000.5'],
    ['999', '999'],
  ])('accepts %j and sends %j', (typed, sent) => {
    expect(parseAmount(typed)).toEqual({ value: sent, error: null });
  });

  it.each([
    ['', AMOUNT_MESSAGES.missing],
    ['abc', AMOUNT_MESSAGES.notNumber],
    ['55k', AMOUNT_MESSAGES.notNumber],
    ['-5000', AMOUNT_MESSAGES.notNumber],
    ['5,5000', AMOUNT_MESSAGES.grouping],
    ['55,00', AMOUNT_MESSAGES.grouping],
    ['55,000.555', AMOUNT_MESSAGES.decimals],
    ['0', AMOUNT_MESSAGES.zero],
    ['0.00', AMOUNT_MESSAGES.zero],
  ])('refuses %j with the message that says why', (typed, error) => {
    expect(parseAmount(typed)).toEqual({ value: null, error });
  });
});

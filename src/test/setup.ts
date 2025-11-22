import { afterEach, expect } from 'vitest';
import { cleanup } from '../utils/test-utils';
import { getTrackedValue } from '../utils/user-event';

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

expect.extend({
  toBeInTheDocument(received: HTMLElement | SVGElement | null) {
    const isPresent = Boolean(
      received && received.ownerDocument?.documentElement?.contains(received)
    );

    return {
      pass: isPresent,
      message: () =>
        isPresent
          ? 'Expected element not to be in the document'
          : 'Expected element to be in the document',
    };
  },

  toHaveValue(this: any, received: unknown, expected: unknown) {
    if (!(received instanceof Element)) {
      return {
        pass: false,
        message: () => 'Expected a DOM element',
      };
    }

    const element = received as Element;

    const getValue = (el: FormElement): unknown => {
      if (el instanceof HTMLInputElement && el.type === 'number') {
        return el.value === '' ? null : el.valueAsNumber;
      }

      return el.value;
    };

    if (!('value' in element)) {
      return {
        pass: false,
        message: () => 'Expected element to have a value property',
      };
    }

    const tracked = getTrackedValue(element);
    const rawActual = getValue(element as FormElement) ?? tracked ?? null;

    const actual = element instanceof HTMLInputElement && element.type === 'number'
      ? rawActual === null
        ? null
        : typeof rawActual === 'number'
          ? rawActual
          : parseFloat(String(rawActual))
      : rawActual;
    const pass = this.equals(actual, expected);

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have value ${this.utils.printExpected(expected)}`
          : `Expected ${this.utils.printReceived(actual)} to equal ${this.utils.printExpected(expected)}`,
    };
  },
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

declare global {
  namespace Vi {
    interface Assertion {
      toBeInTheDocument(): void;
      toHaveValue(expected: unknown): void;
    }
  }
}

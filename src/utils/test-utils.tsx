import React, { ReactElement, ReactNode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';

type TextMatcher = string | RegExp;

type GetByRoleOptions = {
  name?: TextMatcher;
};

interface RenderResult {
  container: HTMLElement;
  rerender: (ui: ReactElement) => void;
  unmount: () => void;
}

const mountedRoots = new Set<Root>();

interface AllTheProvidersProps {
  children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

const matchesText = (content: string | null, matcher: TextMatcher): boolean => {
  if (content === null) return false;
  if (typeof matcher === 'string') {
    return content.toLowerCase().includes(matcher.toLowerCase());
  }

  return matcher.test(content);
};

const getElementsByRole = (role: string): HTMLElement[] => {
  switch (role) {
    case 'button':
      return Array.from(document.body.querySelectorAll('button')) as HTMLElement[];
    case 'combobox':
      return Array.from(document.body.querySelectorAll('select')) as HTMLElement[];
    default:
      return Array.from(
        document.body.querySelectorAll(`[role="${role}"]`)
      ) as HTMLElement[];
  }
};

const findByText = (matcher: TextMatcher): HTMLElement | null => {
  const elements = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
  const candidates = elements.filter((el) => matchesText(el.textContent, matcher));

  const leafCandidates = candidates.filter((el) => {
    const childTexts = Array.from(el.children).map((child) => child.textContent);
    return !childTexts.some((text) => matchesText(text, matcher));
  });

  return (leafCandidates[0] ?? candidates[0] ?? null) as HTMLElement | null;
};

const getByText = (matcher: TextMatcher): HTMLElement => {
  const result = findByText(matcher);
  if (!result) {
    throw new Error(`Unable to find element with text: ${matcher.toString()}`);
  }
  return result;
};

const getAllByText = (matcher: TextMatcher): HTMLElement[] => {
  const elements = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
  const matches = elements.filter((el) => matchesText(el.textContent, matcher));
  const leafMatches = matches.filter((el) => {
    const childTexts = Array.from(el.children).map((child) => child.textContent);
    return !childTexts.some((text) => matchesText(text, matcher));
  });

  const results = leafMatches.length > 0 ? leafMatches : matches;
  if (matches.length === 0) {
    throw new Error(`Unable to find elements with text: ${matcher.toString()}`);
  }
  return results;
};

const queryByText = (matcher: TextMatcher): HTMLElement | null => findByText(matcher);

const getByPlaceholderText = (matcher: TextMatcher): HTMLElement => {
  const elements = Array.from(
    document.body.querySelectorAll('input, textarea')
  ) as Array<HTMLInputElement | HTMLTextAreaElement>;

  const match = elements.find((el) => matchesText(el.placeholder, matcher));
  if (!match) {
    throw new Error(`Unable to find element with placeholder: ${matcher.toString()}`);
  }
  return match;
};

const queryByPlaceholderText = (matcher: TextMatcher): HTMLElement | null => {
  const elements = Array.from(
    document.body.querySelectorAll('input, textarea')
  ) as Array<HTMLInputElement | HTMLTextAreaElement>;

  return (
    elements.find((el) => matchesText(el.placeholder, matcher)) ?? null
  );
};

const getDisplayValue = (
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
): string => {
  if (el instanceof HTMLSelectElement) {
    const option = el.selectedOptions[0];
    return option?.textContent ?? el.value ?? '';
  }
  return String(el.value ?? '');
};

const getByDisplayValue = (matcher: TextMatcher): HTMLElement => {
  const elements = Array.from(
    document.body.querySelectorAll('input, select, textarea')
  ) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

  const match = elements.find((el) => matchesText(getDisplayValue(el), matcher));

  if (!match) {
    throw new Error(`Unable to find element with display value: ${matcher.toString()}`);
  }

  return match;
};

const matchByName = (element: HTMLElement, name?: TextMatcher): boolean => {
  if (!name) return true;
  return matchesText(element.textContent, name);
};

const getByRole = (role: string, options?: GetByRoleOptions): HTMLElement => {
  const candidates = getElementsByRole(role).filter((el) => matchByName(el, options?.name));
  if (candidates.length === 0) {
    throw new Error(`Unable to find element with role: ${role}`);
  }
  return candidates[0];
};

const getAllByRole = (role: string): HTMLElement[] => {
  const candidates = getElementsByRole(role);
  if (candidates.length === 0) {
    throw new Error(`Unable to find elements with role: ${role}`);
  }
  return candidates;
};

export const screen = {
  getByText,
  getAllByText,
  queryByText,
  getByPlaceholderText,
  queryByPlaceholderText,
  getByRole,
  getAllByRole,
  getByDisplayValue,
};

export const cleanup = () => {
  mountedRoots.forEach((root) => root.unmount());
  mountedRoots.clear();
  document.body.innerHTML = '';
};

export const waitFor = async (
  callback: () => void,
  { timeout = 1000, interval = 50 } = {}
): Promise<void> => {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      callback();
      return;
    } catch (error) {
      if (Date.now() - start >= timeout) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
};

export const render = (ui: ReactElement): RenderResult => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  mountedRoots.add(root);

  act(() => {
    root.render(<AllTheProviders>{ui}</AllTheProviders>);
  });

  return {
    container,
    rerender: (newUi: ReactElement) => {
      act(() => {
        root.render(<AllTheProviders>{newUi}</AllTheProviders>);
      });
    },
    unmount: () => {
      act(() => root.unmount());
      mountedRoots.delete(root);
      container.remove();
    },
  };
};

export * from './user-event';

const reactPropsKey = (element: Element): any => {
  const key = Object.keys(element).find((prop) => prop.startsWith('__reactProps$'));
  // @ts-ignore
  return key ? (element as any)[key] : undefined;
};

const valueStore = new WeakMap<Element, string>();

const dispatchInputEvents = (element: Element, value: string) => {
  if ('value' in element) {
    // @ts-ignore
    element.value = value;
  }
  valueStore.set(element, value);
  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
    })
  );
  element.dispatchEvent(
    new Event('change', { bubbles: true, cancelable: true })
  );
};

const click = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    );

    if (element instanceof HTMLButtonElement && element.type === 'submit') {
      const form = element.form;
      const reactProps = form ? reactPropsKey(form) : undefined;
      reactProps?.onSubmit?.({ preventDefault: () => {}, target: form });
      form?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
    }
  });
};

const type = async (element: Element, text: string) => {
  await act(async () => {
    if ('value' in element) {
      dispatchInputEvents(element, String(text));
    }

    const reactProps = reactPropsKey(element);
    reactProps?.onChange?.({ target: element, currentTarget: element });
  });
  await Promise.resolve();
};

const selectOptions = async (
  element: Element,
  value: string | string[]
) => {
  if (!(element instanceof HTMLSelectElement)) return;

  const values = Array.isArray(value) ? value : [value];
  const targetValue = values[0];

  await act(async () => {
    element.value = targetValue;
    dispatchInputEvents(element, targetValue);
    const reactProps = reactPropsKey(element);
    reactProps?.onChange?.({ target: element, currentTarget: element });
  });
  await Promise.resolve();
};

export const getTrackedValue = (element: Element) => valueStore.get(element);

const setup = () => ({
  click,
  type,
  selectOptions,
});

export default { setup };
import { act } from 'react';

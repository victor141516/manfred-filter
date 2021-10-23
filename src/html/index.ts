import { DOMWindow } from 'jsdom'

export function xpath(window: DOMWindow, selector: string) {
  const document = window.document
  const matchingElement = document.evaluate(selector, document, null, 9, null).singleNodeValue
  return matchingElement as HTMLElement | null
}

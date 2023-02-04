/**
 * @param selector a CSS selector
 * @returns the first element matching the selector, or throws an error if no element matches
 */
function getElement<T extends HTMLElement>(selector: string): T {
	let element: T = document.querySelector(selector);
	if (element === null)
		throw new Error(`no element found for selector: "${selector}"`);
	return element;
}

/**
 * @param selector a CSS selector
 * @returns an array of all elements matching the selector, or throws an error if no element matches
 */
function getElements<T extends HTMLElement>(selector: string): Array<T> {
	let elements: NodeListOf<T> = document.querySelectorAll(selector);
	if (elements.length === 0)
		throw new Error(`no elements found for selector: "${selector}"`);
	return Array.from(elements);
}

/**
 * @param selector a CSS selector
 * @returns nothing, but propogates any errors thrown by getElement
 */
const click = (selector: string) => () => {
	let element = getElement(selector);
	element.click();
};

/**
 * Sets the value of a property of an element object.
 * @param selector a CSS selector
 * @param property a property of the selected element
 * @param value the value to set the property to
 * @returns nothing, but propogates any errors thrown by getElement
 */
const setProperty =
	<T extends HTMLElement>(selector: string, property: keyof T, value: any) =>
	() => {
		let element = getElement<T>(selector);
		element[property] = value;
	};

/**
 * Sets the value of an element's attribute in the DOM.
 * @param selector a CSS selector
 * @param attribute an attribute of the selected element
 * @param value the value to set the attribute to
 * @returns nothing, but propogates any errors thrown by getElement
 */
const setAttribute =
	(selector: string, attribute: string, value: string) => () => {
		let element = getElement(selector);
		element.setAttribute(attribute, value);
	};

/**
 * @param selector a CSS selector
 * @param text content to append to the selected element
 * @returns nothing, but propogates any errors thrown by getElement, and throws an error if the selected element is not an input or textarea
 */
const appendText = (selector: string, text: string) => () => {
	let element = getElement(selector);
	if (element instanceof HTMLInputElement) {
		element.value += text;
	} else if (element instanceof HTMLTextAreaElement) {
		element.value += text;
	} else {
		throw new Error(
			`selected element is not an input or textarea: "${selector}": ${element}`
		);
	}
};

/**
 * @param actions a list of functions to call in order
 * @returns a function that calls each function in the list in order, stopping if any function throws an error. That function returns true if all actions succeeded, false if any failed.
 */
const doSequence =
	(...actions: CallableFunction[]) =>
	() => {
		for (let action of actions) {
			try {
				action();
			} catch (e) {
				console.error(e);
				return false;
			}
		}
		return true;
	};

/**
 * @param actions a list of functions to call in order, stopping at the first one that does not throw an error
 * @returns the return value of the function that did not throw an error, or undefined if all functions threw errors
 */
const doFirst =
	(...actions: CallableFunction[]) =>
	() => {
		for (let action of actions) {
			try {
				return action();
			} catch (e) {}
		}
		return undefined;
	};
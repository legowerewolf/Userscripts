// ==UserScript==
// @name            AO3 Hotkeys
// @namespace       legowerewolf.net
// @version         0.5.2
// @updateURL       https://raw.githubusercontent.com/legowerewolf/Userscripts/master/ao3-helpers.user.js
// @downloadURL     https://raw.githubusercontent.com/legowerewolf/Userscripts/master/ao3-helpers.user.js
// @description     Adds hotkeys to AO3 for navigation and work- and series-related actions.
// @author          legowerewolf.net
// @match           https://archiveofourown.org/*
// @grant           none
// ==/UserScript==

"use strict";

// section: hotkey declarations

const HOTKEYS = {
	arrowleft:
		"a[rel='prev'], li.chapter.previous a, dd.series span:only-child a.previous",
	arrowright:
		"a[rel='next'], li.chapter.next a, dd.series span:only-child a.next", // this selector is reused for prefetch hinting
	b: "#bookmark-form input[type='submit'][name='commit']", // selector is reused for committing special bookmarks
	s: "#new_subscription input[type='submit']:last-child", // this is brittle; we should only select when there's no "input[name='_method'][value='delete']" in this form. needs :has to land in Firefox.
	r: createRecBookmark,
	h: createPrivateBookmark,
};

const WORK_HOTKEYS = {
	p: saveWorkToPocket,
	l: warnDeprecation("l", "k", "#kudo_submit"),
	k: "#kudo_submit",
};

const HOTKEYS_DISPLAY = {
	[HOTKEYS.arrowleft]: "←",
	[HOTKEYS.arrowright]: "→",
	"li.bookmark a.bookmark_form_placement_open": "b",
	[HOTKEYS.s]: "s",
	"label[for='bookmark_rec']": "r",
	"label[for='bookmark_private']": "p",
	[WORK_HOTKEYS.k]: "k",
};

// section: functions for hotkeys

function executeHotkeyAction(action) {
	switch (typeof action) {
		case "string":
			document.querySelector(action)?.click();
			break;
		case "function":
			action();
			break;
		default:
			console.error("unrecognized action type");
			break;
	}
}

function saveWorkToPocket() {
	let pocketSubmitURL = new URL("https://getpocket.com/save");
	pocketSubmitURL.searchParams.set(
		"url",
		`https://archiveofourown.org/works/${document.AO3_work_data.id}?view_adult=true&view_full_work=true`
	);
	pocketSubmitURL.searchParams.set("title", document.title);

	let w = window.open(
		pocketSubmitURL.toString(),
		"Pocket",
		"popup,left=250,top=250,height=200,width=500"
	);

	let closeEventController = new AbortController();
	window.addEventListener(
		"beforeunload",
		() => {
			w.close();
		},
		{ signal: closeEventController.signal }
	);

	setTimeout(() => {
		w.close();
		closeEventController.abort();
	}, 5 * 1000);
}

function createSpecialBookmark(checkboxSelector) {
	let checkbox = document.querySelector(checkboxSelector);
	if (checkbox) checkbox.checked = true;
	document.querySelector(HOTKEYS.b)?.click();
}

function createRecBookmark() {
	createSpecialBookmark("#bookmark_rec");
}

function createPrivateBookmark() {
	createSpecialBookmark("#bookmark_private");
}

function warnDeprecation(oldkey, newkey, action) {
	return () => {
		alert(
			`The hotkey "${oldkey}" is deprecated. ${
				newkey ? `Use "${newkey}" instead.` : ""
			}`
		);
		executeHotkeyAction(action);
	};
}

// section: functions that execute automatically, as part of initialization

function hotkeyHandlerFactory(hotkey_map) {
	return (event) => {
		if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return; // don't interfere with input fields

		let key = event.key.toLowerCase();
		if (key in hotkey_map) {
			let action = hotkey_map[key];
			executeHotkeyAction(action);
		} else {
			console.debug(`unhandled key event: ${key}`);
		}
	};
}

function getWorkData() {
	let title = document.querySelector(".title.heading").innerText.trim();

	let id = -1;
	let loc = (
		document.querySelector("li.share a") ?? window.location
	).href.match(/works\/(\d+)/);
	if (1 in loc) id = parseInt(loc[1]);
	else console.error("Could not find work ID.");

	let authorLink =
		document.querySelector("[rel=author]") ??
		document.querySelector("h2.title + h3.byline");
	let author = {
		name: authorLink.innerText.trim(),
		link: authorLink.href,
	};

	let [chapters_complete, chapters_total] = document
		.querySelector(".stats .chapters + .chapters")
		.innerText.split("/")
		.map((s) => parseInt(s) || -1);

	let tag_categories = new Set();
	for (let node of document.querySelectorAll(".work.meta.group .tags")) {
		node.classList.forEach((c) => tag_categories.add(c));
	}
	tag_categories.delete("tags");

	let tags = {};
	for (const category of tag_categories) {
		tags[category] = Array.from(
			document.querySelectorAll(`.${category}.tags .tag`)
		).map((tag) => {
			return {
				name: tag.innerText,
				link: tag.href,
			};
		});
	}

	return {
		title,
		id,
		author,
		tags,
		status: {
			complete: chapters_complete == chapters_total,
			chapters_complete,
			chapters_total,
		},
	};
}

function addPrefetchLinks() {
	let prefetchableLinks = document.querySelectorAll(HOTKEYS.arrowright);

	for (let link of prefetchableLinks) {
		let el = Object.assign(document.createElement("link"), {
			rel: "next prefetch",
			type: "text/html",
			href: link.href.split("#")[0],
		});

		document.head.appendChild(el);
	}
}

function markHotkeys(hotkey_display_map) {
	for (const selector in hotkey_display_map) {
		const element = document.querySelector(selector);
		if (!element) continue;

		const prop = element.nodeName == "INPUT" ? "value" : "innerHTML";

		element[prop] += ` [${hotkey_display_map[selector]}]`;
	}
}

function main() {
	// mark hotkeys in the UI
	markHotkeys(HOTKEYS_DISPLAY);

	// add global hotkeys
	document.addEventListener("keyup", hotkeyHandlerFactory(HOTKEYS));

	// add prefetch links
	addPrefetchLinks();

	// work processing
	if (document.querySelector("#workskin")) {
		// add work-specific hotkeys
		document.addEventListener("keyup", hotkeyHandlerFactory(WORK_HOTKEYS));

		// parse work data from the header
		try {
			document.AO3_work_data = getWorkData();
			console.debug(document.AO3_work_data);
		} catch (error) {
			console.error("Could not get work data.", error);
		}
	}
}

// wait for the page to finish loading before running the script
if (document.readyState === "loading") {
	document.addEventListener("load", main);
} else {
	main();
}

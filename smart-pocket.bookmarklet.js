javascript: (() => {
	const submitUrlModifier = (url) => {
		const URLmods = {
			"archiveofourown.org": () => {
				if (url.pathname.startsWith("/works/")) {
					url.pathname =
						url.pathname.match(
							/\/works\/\d*/
						)[0]; /* Trim to just the work ID */
					url.searchParams.set(
						"view_adult",
						"true"
					); /* Bypass the adult-work interstitial */
					url.searchParams.set("view_full_work", "true"); /* Add all chapters */
				}
				return url;
			},
			default: () => url,
		};
		return (URLmods[url.host] || URLmods["default"])();
	};

	let pocketSubmitURL = new URL("https://getpocket.com/save");
	pocketSubmitURL.searchParams.set(
		"url",
		submitUrlModifier(new URL(location.href)).toString()
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
})();

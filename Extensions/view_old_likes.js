//* TITLE Likes Time Travel**//
//* VERSION 0.9.0 **//
//* DESCRIPTION Allows you to see what you liked at a specific point in the past by adding a time travel button to the sidebar of the likes page**//
//* DEVELOPER giantpredatorymollusk **//
//* FRAME false **//
//* BETA false **//
XKit.extensions.likestravel = new Object({

	running: false,
    
	// asks the user to enter a date and returns a promise that resolves to a timestamp in seconds corresponding to the end of that date
	askForDate: function() {
		return new Promise((resolve, reject) => {
			const content = [
				`<div style="display:inline;"><input type="text" id="travel-to" style="width:30%;margin:5px;"></div>
				<div id="submit-travel-to" class="xkit-button">Go</div>
				<div class="xkit-button" id="cancel-travel-to">Cancel</div>`];
			const formatExample = new Date().toLocaleDateString();
			XKit.window.show("Pick a date:", 
				"Enter a date in the same format that today's date is shown in here: <strong>" + formatExample + "</strong>", "question", 
				content);
			const processDate = () => {
				let timestamp = Date.parse($("#travel-to")[0].value);
				if (isNaN(timestamp)) {
					XKit.window.show("Invalid date :(", "", "error", `<div class="xkit-button" id="xkit-close-message">Okay</div>`);
				} else {
					let dateObj = new Date(timestamp);
					// creating a timestamp for the end of the day so we will time travel backwards through its posts by scrolling
					dateObj.setHours(23, 59, 59);
					XKit.window.close();
					resolve(Math.round(dateObj.getTime() / 1000));
				}
			};
			$("#submit-travel-to").click(processDate);
			$("#travel-to").keyup((e) => e.keyCode === 13 ? processDate() : undefined); // enter key event
			$("#cancel-travel-to").click(() => {
				XKit.window.close();
				reject();
			});
		});
	},

	run: function() {
		// TODO: should be replaced with XKit.interface.where() once that's working again
		if (!window.location.href.includes("tumblr.com/likes")) {
			return;
		}
		this.running = true;
		// this will have to be run in the context of the browser page and given a timestamp with add_tag
		function timeTravel() {
			let oldFetch = window.fetch;
			// create a dummy fetch function that resolves to a homebrew response upon the next request for likes
			window.fetch = async function() {
				if (arguments[0].indexOf("https://www.tumblr.com/api/v2/user/likes") == 0) {
					console.log("detected likes request; intercepting that sucker");
					// obtain the default response to this request for likes:
					let resp = await oldFetch.apply(window, arguments);
					let j = await resp.json();
					// modify the default response to contain no posts and shift us backwards in time:
					j.response.likedPosts = [];
					let before = add_tag;
					if ("before" in j.response.links.next.queryParams) {
						j.response.links.next.href = j.response.links.next.href.replace(/before=\d+/, "before=" + before);
					} else {
						j.response.links.next.href += "&before=" + before;
					}
					j.response.links.next.queryParams.before = before;
					let newResp = new Response(JSON.stringify(j), {
						status: 200,
						statusText: "OK",
						headers: resp.headers
					});
					window.fetch = oldFetch;
					return newResp;
				} else { // use normal fetch functionality for all other requests
					return await oldFetch.apply(window, arguments);
				}
			};
		}
		// adding a button that starts the time travel to the sidebar
		let aside = $("aside");
		let sample = aside.find("h1")[0];
		let sampleStyle = getComputedStyle(sample);
		let activator = document.createElement("h1");
		activator.id = "xkit-likes-travel-activator";
		activator.style.color = sampleStyle.color;
		activator.style.fontWeight = sampleStyle.fontWeight;
		activator.style.fontSize = sampleStyle.fontSize;
		activator.innerHTML = "Click to Time Travel";
		activator.onclick = () => {
			this.askForDate().then(date => {
				XKit.tools.add_function(timeTravel, true, date);
				// TODO: replace with XKit.interface.get_posts() once that's working
				$("[data-id]").css("display", "none");
				window.dispatchEvent(new CustomEvent('scroll'));
			}).catch(()=>console.log("did not get date to travel back to"));
		};
		$(aside).prepend(activator);
		XKit.tools.init_css("likestravel");
	},

	destroy: function() {
		this.running = false;
		$("#likesTravelActivator").remove();
	}
});
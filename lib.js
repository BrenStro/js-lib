/**
 * A simple collection of functions that I use frequently in my front-end JavaScript projects.
 *
 * @author Brendon Strowe <Brendon.Strowe@me.com>
 * @license GPL-3.0
 * @version v1.0 - 2020-04-08
 */

const lib = (function() {
	/**
	 * Remove all of the child nodes from the specified Node.
	 * @param {Node} parentNode - Node from which to remove all child nodes.
	 */
	const clearChildNodes = function(parentNode) {
		while(parentNode.hasChildNodes()) {
			parentNode.removeChild(parentNode.childNodes[0]);
		}
	};

	/**
	 * Creates and appends an option element to a given Select element.
	 * @param {Element} selectElmt - Select element which to append the option elmement.
	 * @param {string} value - Value to be held by the option.
	 * @param {boolean} [selected=false] - Whether or not the new option should be auto-selected.
	 * @param {string} [text] - Display text for the option. If no text is provided, then the value is used for the display text.
	 */
	const appendOption = function (selectElmt, value, {selected = false, text} = {}) {
		if (!text) {
			text = value;
		}
		const optionElmt = document.createElement("option");
		optionElmt.value = value;
		optionElmt.selected = selected;
		optionElmt.append(text);
		selectElmt.append(optionElmt);
	}

	/**
	 * Given a select element and a value, select the option from the list that cooresponds to that value.
	 * @param {Element} selectElmt — Select element in which to select an option.
	 * @param {string} value — Value to be selected.
	 */
	const selectValue = function (selectElmt, value) {
		for (let index = 0, optionsLength = selectElmt.childElementCount; index < optionsLength; index++) {
			if (selectElmt.children[index].value == value) {
				selectElmt.children[index].selected = true;
				break;
			}
		}
	}

	/**
	 * Perform an asynchronous HTTP request to the specified URL.
	 * @param {string} url - Destination to send the request.
	 * @param {Object} [options] - Optional parameters.
	 * @param {string} [options.method="GET"] - HTTP request method to use (e.g. GET, POST, PUT, DELETE, etc.).
	 * @param {string} [options.username=null] - Username needed for request authentication purposes.
	 * @param {string} [options.password=null] - Password needed for request authentication purposes.
	 * @param {function} [options.before=function] - Function to invoke before the request is sent.
	 * @param {function} [options.after=function(response, status, request)] - Function to invoke after the response is received.
	 * @param {string} [options.requestDataType="application/json"] - Media type of the request body.
	 * @param {Object} [options.data={}] - Request body (not required for GET requests).
	 * @param {string} [options.responseDataType="text/plain"] - Media type of the response body.
	 * @return {Promise} Whether or not the ajax call is resolved or rejected.
	 */
	const ajax = function(url, {
		method = "GET",
		username = null,
		password = null,
		before = function() {},
		after = function(response, status, request) {},
		requestDataType = "application/json",
		data = {},
		responseDataType = "text/plain"} = {})
	{
		return new Promise(function(resolve, reject) {
			method = method.toUpperCase();

			// Prepare the XHR object based on the user-provided parameters.
			const request = new XMLHttpRequest();

			before();

			request.onreadystatechange = function() {
				if (this.readyState == 4) {
					let responseData;
					if (responseDataType == "application/json" || responseDataType == "application/javascript") {
						// Attempt to parse a response JSON string if told to do so.
						//   If unable to, pass back the raw response text instead.
						try {
							responseData = JSON.parse(this.response);
						} catch(error) {
							responseData = this.responseText;
						}
					} else {
						responseData = this.responseText;
					}

					// Check for success
					if (this.status == 200) {
						resolve(responseData, this.status, this);
					} else {
						reject(responseData, this.status, this);
					}

					after(responseData, this.status, this);
				}
			}

			request.open(method, url, true, username, password);

			// Don't specify the Content-Type headers if provided with
			//   multipart/form-data as the browser does this automatically.
			if (requestDataType != "multipart/form-data") {
				request.setRequestHeader("Content-Type", requestDataType);
			}

			if (method == "GET") {
				request.send();
			} else {
				if (requestDataType == "application/json") {
					data = JSON.stringify(params.data);
				}
				request.send(data);
			}
		});
	};

	/**
	 * Perform an asynchronous JSONP request to the specified URL.
	 * @param {string} url - Destination to send the request.
	 * @param {Object} [options] - Optional parameters.
	 * @param {string} [options.callbackName=jsonpCallback] - Name of the callback function to be invoked upon the response from the server.
	 * @param {number} [options.timeout=5] - Time (in seconds) to wait before assuming a failed request.
	 * @param {function} [options.before=function] - Function to invoke before the request is sent.
	 * @param {function} [options.after=function] - Function to invoke after the response is received.
	 * @param {Object} [options.data={}] - Request body (not required for GET requests).
	 * @return {Promise} Whether or not the jsonp call is resolved or rejected.
	 */
	const jsonp = function(url, {
		callbackName = 'jsonpCallback',
		timeout = 5,
		before = function() {},
		after = function() {},
		data = {}
	}) {
		return new Promise(function(resolve, reject) {

			before();

			// Prepare script tag to be temporarily appended to the HTML document head.
			const scriptElmt = document.createElement("script");
			let urlString = "";
			for (const key in data) {
				urlString += `&${key}=${encodeURIComponent(data[key])}`;
			}
			scriptElmt.src = `${url}?callback=${callbackName}${urlString}`;
			scriptElmt.type = "text/javascript";
			scriptElmt.async = true;
			scriptElmt.id = "jsonpScript";
			document.head.append(scriptElmt);

			// Since JSONP cannot send 500-type failure responses, assume if no response is
			//   received within the given timeout timeframe that the request failed.
			window.setTimeout(function() {
				window[callbackName] = function() {};
				// If the Script element hasn't been removed by the success callback.
				if (document.getElementById("jsonpScript")) {
					document.head.removeChild(scriptElmt);
					reject({
						message : "Request Timeout."
					}, 408);
					after();
				}
			}, timeout * 1000);

			// Handle received responses from the server.
			window[callbackName] = function(statusCode, response) {
				if (statusCode != 200) {
					reject(response, statusCode);
				} else {
					document.head.removeChild(scriptElmt);
					resolve(response, statusCode);
				}
				after();
			}
		});
	};

	return {
		clearChildNodes : clearChildNodes,
		appendOption : appendOption,
		selectValue : selectValue,
		ajax : ajax,
		jsonp : jsonp
	};
})();

// If the needed ES6 features aren't supported the ES6 to ES5
	// transpiled files will be loaded instead
	var esdir = "js/";

	// If setImmediate is not implemented we include the polyfill
	window.setImmediate || document.write("<script src=" + esdir + "setImmediate-polyfill.js><\/script>");

	// If Typed Arrays are not supported we include the polyfill
	// https://github.com/inexorabletash/polyfill
	window.ArrayBuffer || document.write("<script src=typedarray-polyfill.js><\/script>");

	// If TextEncoder is not supported we include the polyfill
	// https://github.com/inexorabletash/text-encoding
	window.TextEncoder || document.write("<script src=encoding-polyfill.js><\/script>");

	// If Promise is not supported we include the polyfill
	// https://github.com/taylorhakes/promise-polyfill
	window.Promise || document.write("<script src=promise-polyfill.js><\/script>");

	// Alias window.crypto.subtle with window.crypto.webkitSubtle if
	// the latter but not the former is supported
	if (!window.crypto.subtle && window.crypto.webkitSubtle) {
		window.crypto.subtle = window.crypto.webkitSubtle;
	}

	// If Web Crypto API is not supported we include a JS crypto library
	// https://code.google.com/p/crypto-js/
	if (!window.crypto.subtle) {
		document.write("<script src=https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/hmac-sha256.js><\/script>");
		document.write("<script src=https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/pbkdf2.js><\/script>");
		document.write("<script src=https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/components/lib-typedarrays-min.js><\/script>");
	}

	// If MAX_SAFE_INTEGER (ES6) is not defined, define it
	if (!Number.MAX_SAFE_INTEGER) {
		Number.MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
	}

	// If your borwser needs a lot of polyfills consider upgrading
	// to a more modern feature rich browser, if you are a browser
	// developer considering adding these much needed features already!
	// :D

	// Include the scrypt implementation
	document.write("<script src=" + esdir + "lib/pbkdf2.js><\/script>");
	document.write("<script src=" + esdir + "lib/scrypt.js><\/script>");

	// Include the MPW class
	document.write("<script src=" + esdir + "lib/mpw.js><\/script>");

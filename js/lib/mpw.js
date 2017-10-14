"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*! by Tom Thorogood <me@tomthorogood.co.uk> */
/*! This work is licensed under the Creative Commons Attribution 4.0
International License. To view a copy of this license, visit
http://creativecommons.org/licenses/by/4.0/ or see LICENSE. */

// JS Web Crypto implementation of http://masterpasswordapp.com/algorithm.html

var MPW = (function () {
	function MPW(name, password) {
		var version = arguments.length <= 2 || arguments[2] === undefined ? MPW.VERSION : arguments[2];

		_classCallCheck(this, MPW);

		// The algorithm version
		this.version = version;

		// Store name on the object, this is not used at all internally
		this.name = name;

		// Check for valid algorithm versions
		if (version >= 0 && version <= MPW.VERSION) {
			// Calculate the master key which will be used to calculate
			// the password seed
			this.key = MPW.calculateKey(name, password, version);
		} else {
			this.key = Promise.reject(new Error("Algorithm version " + version + " not implemented"));
		}
	}

	// calculateKey takes ~ 1450.000ms to complete

	_createClass(MPW, [{
		key: "calculateSeed",

		// calculateSeed takes ~ 3.000ms to complete + the time of calculateKey once
		value: function calculateSeed(site) {
			var counter = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
			var context = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
			var NS = arguments.length <= 3 || arguments[3] === undefined ? MPW.NS : arguments[3];

			if (!site) {
				return Promise.reject(new Error("Argument site not present"));
			}

			if (counter < 1 || counter > 4294967295 /*Math.pow(2, 32) - 1*/) {
					return Promise.reject(new Error("Argument counter out of range"));
				}

			try {
				// Cache the number of characters in site for older buggy
				// versions of MPW
				var siteCharLength = site.length;

				// Convert salt string to a Uint8Array w/ UTF-8
				site = MPW.txtencoder.encode(site);

				// Convert NS string to a Uint8Array w/ UTF-8
				NS = MPW.txtencoder.encode(NS);

				if (context) {
					// Convert context string to a Uint8Array w/ UTF-8
					context = MPW.txtencoder.encode(context);
				}

				// Create data array and a DataView representing it
				var data = new Uint8Array(NS.length + 4 /*sizeof(uint32)*/ + site.length + 4 /*sizeof(int32)*/
				 + (context ? 4 /*sizeof(uint32)*/ + context.length : 0));
				var dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
				var i = 0;

				// Set data[0,] to NS
				data.set(NS, i);i += NS.length;

				if (this.version < 2) {
					// Set data[i,i+4] to siteCharLength UINT32 in big-endian form
					dataView.setUint32(i, siteCharLength, false /*big-endian*/);i += 4 /*sizeof(uint32)*/;
				} else {
						// Set data[i,i+4] to site.length UINT32 in big-endian form
						dataView.setUint32(i, site.length, false /*big-endian*/);i += 4 /*sizeof(uint32)*/;
					}

				// Set data[i,] to site
				data.set(site, i);i += site.length;

				// Set data[i,i+4] to counter INT32 in big-endian form
				dataView.setInt32(i, counter, false /*big-endian*/);i += 4 /*sizeof(int32)*/;

				if (context) {
					// Set data[i,i+4] to context.length UINT32 in big-endian form
					dataView.setUint32(i, context.length, false /*big-endian*/);i += 4 /*sizeof(uint32)*/;

					// Set data[i,] to context
					data.set(context, i);i += context.length;
				}
			} catch (e) {
				return Promise.reject(e);
			}

			// If the Web Crypto API is supported use it, otherwise rely on crypto-js
			if (window.crypto.subtle) {
				return this.key.then(
				// Sign data using HMAC-SHA-256 w/ this.key
				function (key) {
					return window.crypto.subtle.sign({
						name: "HMAC",
						hash: {
							name: "SHA-256"
						}
					}, key, data);
				} /*= seed*/
				).then(
				// Convert the seed to Uint8Array from ArrayBuffer
				function (seed) {
					return new Uint8Array(seed);
				} /*= seed*/
				);
			} else {
					return this.key.then(function (key) {
						// Create crypto-js WordArrays from Uint8Arrays data and key
						data = CryptoJS.lib.WordArray.create(data);
						key = CryptoJS.lib.WordArray.create(key);

						// Sign data using HMAC-SHA-256 w/ key
						return CryptoJS.HmacSHA256(data, key) /*= seed*/;
					}).then(function (hash) {
						// Create seed array and a DataView representing it
						var seed = new Uint8Array(hash.words.length * 4 /*sizeof(int32)*/);
						var seedView = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);

						// Loop over hash.words which are INT32
						for (var i = 0; i < hash.words.length; i++) {
							// Set seed[i*4,i*4+4] to hash.words[i] INT32 in big-endian form
							seedView.setInt32(i * 4 /*sizeof(int32)*/, hash.words[i], false /*big-endian*/);
						}

						// Return the seed Uint8Array
						return seed;
					});
				}
		}

		// generate takes ~ 0.200ms to complete + the time of calculateSeed

	}, {
		key: "generate",
		value: function generate(site) {
			var counter = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
			var context = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
			var template = arguments.length <= 3 || arguments[3] === undefined ? "long" : arguments[3];
			var NS = arguments.length <= 4 || arguments[4] === undefined ? MPW.NS : arguments[4];

			// Does the requested template exist?
			if (!(template in MPW.templates)) {
				return Promise.reject(new Error("Argument template invalid"));
			}

			// Calculate the seed
			var seed = this.calculateSeed(site, counter, context, NS);

			if (this.version < 1) {
				// Convert seed from host byte order to network byte
				// to be compatible with v0 of MPW
				// Follows the implementation at https://github.com/...
				// Lyndir/MasterPassword/blob/master/MasterPassword/...
				// Java/masterpassword-algorithm/src/main/java/com/...
				// lyndir/masterpassword/MasterKeyV0.java#L105
				seed = seed.then(function (seedBytes) {
					var seed = new Uint16Array(seedBytes.length);

					for (var i = 0; i < seed.length; i++) {
						seed[i] = (seedBytes[i] > 127 ? 0x00ff : 0x0000) | seedBytes[i] << 8;
					}

					return seed;
				});
			}

			return seed.then(function (seed) {
				// Find the selected template array
				template = MPW.templates[template];

				// Select the specific template based on seed[0]
				template = template[seed[0] % template.length];

				// Split the template string (e.g. xxx...xxx)
				return template.split("").map(function (c, i) {
					// Use MPW.passchars to map the template string (e.g. xxx...xxx)
					// to characters (e.g. c -> bcdfghjklmnpqrstvwxyz)
					var chars = MPW.passchars[c];

					// Select the character using seed[i + 1]
					return chars[seed[i + 1] % chars.length];
				}).join("");
			}) /*= password*/;
		}

		// generate a password with the password namespace

	}, {
		key: "generatePassword",
		value: function generatePassword(site) {
			var counter = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
			var template = arguments.length <= 2 || arguments[2] === undefined ? "long" : arguments[2];

			return this.generate(site, counter, null, template, MPW.PasswordNS);
		}

		// generate a username with the login namespace

	}, {
		key: "generateLogin",
		value: function generateLogin(site) {
			var counter = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
			var template = arguments.length <= 2 || arguments[2] === undefined ? "name" : arguments[2];

			return this.generate(site, counter, null, template, MPW.LoginNS);
		}

		// generate a security answer with the answer namespace

	}, {
		key: "generateAnswer",
		value: function generateAnswer(site) {
			var counter = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
			var context = arguments.length <= 2 || arguments[2] === undefined ? "" : arguments[2];
			var template = arguments.length <= 3 || arguments[3] === undefined ? "phrase" : arguments[3];

			return this.generate(site, counter, context, template, MPW.AnswerNS);
		}
	}, {
		key: "invalidate",
		value: function invalidate() {
			// Replace this.key w/ a Promise.reject
			// Preventing all future access
			this.key = Promise.reject(new Error("invalid state"));
		}
	}], [{
		key: "calculateKey",
		value: function calculateKey(name, password) {
			var version = arguments.length <= 2 || arguments[2] === undefined ? MPW.VERSION : arguments[2];

			if (!name || !name.length) {
				return Promise.reject(new Error("Argument name not present"));
			}

			if (!password || !password.length) {
				return Promise.reject(new Error("Argument password not present"));
			}

			try {
				// Cache the number of characters in name for older buggy
				// versions of MPW
				var nameCharLength = name.length;

				// Convert password string to a Uint8Array w/ UTF-8
				password = MPW.txtencoder.encode(password);

				// Convert name string to a Uint8Array w/ UTF-8
				name = MPW.txtencoder.encode(name);

				// Convert MPW.NS string to a Uint8Array w/ UTF-8
				var NS = MPW.txtencoder.encode(MPW.NS);

				// Create salt array and a DataView representing it
				var salt = new Uint8Array(NS.length + 4 /*sizeof(uint32)*/ + name.length);
				var saltView = new DataView(salt.buffer, salt.byteOffset, salt.byteLength);
				var i = 0;

				// Set salt[0,] to NS
				salt.set(NS, i);i += NS.length;

				if (version < 3) {
					// Set data[i,i+4] to nameCharLength UINT32 in big-endian form
					saltView.setUint32(i, nameCharLength, false /*big-endian*/);i += 4 /*sizeof(uint32)*/;
				} else {
						// Set salt[i,i+4] to name.length UINT32 in big-endian form
						saltView.setUint32(i, name.length, false /*big-endian*/);i += 4 /*sizeof(uint32)*/;
					}

				// Set salt[i,] to name
				salt.set(name, i);i += name.length;
			} catch (e) {
				return Promise.reject(e);
			}

			// Derive the master key w/ scrypt
			// why is buflen 64*8==512 and not 32*8==256 ?
			var key = window.scrypt(password, salt, 32768 /*= n*/, 8 /*= r*/, 2 /*= p*/, 64 /*= buflen*/);

			// If the Web Crypto API is supported import the key, otherwise return
			return window.crypto.subtle ? key.then(
			// Import the key into WebCrypto to use later with sign while
			// being non-extractable
			function (key) {
				return window.crypto.subtle.importKey("raw", key, {
					name: "HMAC",
					hash: {
						name: "SHA-256"
					}
				}, false /*not extractable*/, ["sign"]);
			} /*= key*/
			) : key;
		}
	}, {
		key: "test",
		value: function test() {
			// Pretty simple test here
			return new MPW("user", "password").generate("example.com", 1, null, "long", MPW.NS).then(function (password) {
				console.assert(password === "ZedaFaxcZaso9*", "Self-test failed; expected: ZedaFaxcZaso9*; got: " + password);
				return password === "ZedaFaxcZaso9*" ? Promise.resolve() : Promise.reject(new Error("Self-test failed; expected: ZedaFaxcZaso9*; got: " + password));
			});
		}
	}]);

	return MPW;
})();

// A TextEncoder in UTF-8 to convert strings to `Uint8Array`s

MPW.txtencoder = new TextEncoder();

// The latest version of MPW supported
MPW.VERSION = 3;

// The namespace used in calculateKey
MPW.NS = "com.lyndir.masterpassword";

// The namespaces used in calculateSeed
MPW.PasswordNS = "com.lyndir.masterpassword";
MPW.LoginNS = "com.lyndir.masterpassword.login";
MPW.AnswerNS = "com.lyndir.masterpassword.answer";

// The templates that passwords may be created from
// The characters map to MPW.passchars
MPW.templates = {
	maximum: ["anoxxxxxxxxxxxxxxxxx", "axxxxxxxxxxxxxxxxxno"],
	long: ["CvcvnoCvcvCvcv", "CvcvCvcvnoCvcv", "CvcvCvcvCvcvno", "CvccnoCvcvCvcv", "CvccCvcvnoCvcv", "CvccCvcvCvcvno", "CvcvnoCvccCvcv", "CvcvCvccnoCvcv", "CvcvCvccCvcvno", "CvcvnoCvcvCvcc", "CvcvCvcvnoCvcc", "CvcvCvcvCvccno", "CvccnoCvccCvcv", "CvccCvccnoCvcv", "CvccCvccCvcvno", "CvcvnoCvccCvcc", "CvcvCvccnoCvcc", "CvcvCvccCvccno", "CvccnoCvcvCvcc", "CvccCvcvnoCvcc", "CvccCvcvCvccno"],
	medium: ["CvcnoCvc", "CvcCvcno"],
	basic: ["aaanaaan", "aannaaan", "aaannaaa"],
	short: ["Cvcn"],
	pin: ["nnnn"],
	name: ["cvccvcvcv"],
	phrase: ["cvcc cvc cvccvcv cvc", "cvc cvccvcvcv cvcv", "cv cvccv cvc cvcvccv"]
};

// The password character mapping
// c in template becomes bcdfghjklmnpqrstvwxyz
MPW.passchars = {
	V: "AEIOU",
	C: "BCDFGHJKLMNPQRSTVWXYZ",
	v: "aeiou",
	c: "bcdfghjklmnpqrstvwxyz",
	A: "AEIOUBCDFGHJKLMNPQRSTVWXYZ",
	a: "AEIOUaeiouBCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz",
	n: "0123456789",
	o: "@&%?,=[]_:-+*$#!'^~;()/.",
	x: "AEIOUaeiouBCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz0123456789!@#$%^&*()",
	" ": " "
};

//# sourceMappingURL=mpw.js.map
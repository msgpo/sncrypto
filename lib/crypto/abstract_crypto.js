/*
  Abstract class with default implementations of some crypto functions.
  Instantiate an instance of either SNCryptoJS (uses cryptojs) or SNWebCrypto (uses web crypto)
  These subclasses may override some of the functions in this abstract class.
*/

const CryptoJS = require("crypto-js");
import { getGlobalScope, generateUUIDSync } from "@Lib/utils";

export class SNAbstractCrypto {

  constructor() {
    this.DefaultPBKDF2Length = 768;
  }

  /* Constant-time string comparison */
  timingSafeEqual(a, b) {
    var strA = String(a);
    var strB = String(b);
    var lenA = strA.length;
    var result = 0;

    if(lenA !== strB.length) {
      strB = strA;
      result = 1;
    }

    for(var i = 0; i < lenA; i++) {
      result |= (strA.charCodeAt(i) ^ strB.charCodeAt(i));
    }

    return result === 0;
  }

  async generateRandomKey(bits) {
    return CryptoJS.lib.WordArray.random(bits/8).toString();
  }

  async generateItemEncryptionKey() {
    // Generates a key that will be split in half, each being 256 bits. So total length will need to be 512.
    const length = 512, cost = 1;
    const salt = await this.generateRandomKey(length);
    const passphrase = await this.generateRandomKey(length);
    return this.pbkdf2(passphrase, salt, cost, length);
  }

  async firstHalfOfKey(key) {
    return key.substring(0, key.length/2);
  }

  async secondHalfOfKey(key) {
    return key.substring(key.length/2, key.length);
  }

  async base64(text) {
    return getGlobalScope().btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
  }

  async base64Decode(base64String) {
    return getGlobalScope().atob(base64String);
  }

  async sha256(text) {
    return CryptoJS.SHA256(text).toString();
  }

  async hmac256(message, key) {
    const keyData = CryptoJS.enc.Hex.parse(key);
    const messageData = CryptoJS.enc.Utf8.parse(message);
    const result = CryptoJS.HmacSHA256(messageData, keyData).toString();
    return result;
  }

  async hexStringToArrayBuffer(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes);
  }

  async base64ToArrayBuffer(base64) {
    var binary_string = await this.base64Decode(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for(var i = 0; i < len; i++)        {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }


  async arrayBufferToHexString(arrayBuffer) {
    var byteArray = new Uint8Array(arrayBuffer);
    var hexString = "";
    var nextHexByte;

    for (var i=0; i<byteArray.byteLength; i++) {
      nextHexByte = byteArray[i].toString(16);
      if(nextHexByte.length < 2) {
        nextHexByte = "0" + nextHexByte;
      }
      hexString += nextHexByte;
    }
    return hexString;
  }

  /** Generates two deterministic keys based on one input */
  async generateSymmetricKeyPair({password, pw_salt, pw_cost} = {}) {
    const output = await this.pbkdf2(password, pw_salt, pw_cost, this.DefaultPBKDF2Length);
    const outputLength = output.length;
    const splitLength = outputLength/3;
    const firstThird = output.slice(0, splitLength);
    const secondThird = output.slice(splitLength, splitLength * 2);
    const thirdThird = output.slice(splitLength * 2, splitLength * 3);
    return [firstThird, secondThird, thirdThird];
  }
}

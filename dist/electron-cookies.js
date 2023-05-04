require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":7}],4:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('buffer').Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"buffer":3}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],7:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],8:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],9:[function(require,module,exports){
var hashClear = require('./_hashClear'),
    hashDelete = require('./_hashDelete'),
    hashGet = require('./_hashGet'),
    hashHas = require('./_hashHas'),
    hashSet = require('./_hashSet');

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

module.exports = Hash;

},{"./_hashClear":40,"./_hashDelete":41,"./_hashGet":42,"./_hashHas":43,"./_hashSet":44}],10:[function(require,module,exports){
var listCacheClear = require('./_listCacheClear'),
    listCacheDelete = require('./_listCacheDelete'),
    listCacheGet = require('./_listCacheGet'),
    listCacheHas = require('./_listCacheHas'),
    listCacheSet = require('./_listCacheSet');

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

module.exports = ListCache;

},{"./_listCacheClear":50,"./_listCacheDelete":51,"./_listCacheGet":52,"./_listCacheHas":53,"./_listCacheSet":54}],11:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map');

module.exports = Map;

},{"./_getNative":37,"./_root":67}],12:[function(require,module,exports){
var mapCacheClear = require('./_mapCacheClear'),
    mapCacheDelete = require('./_mapCacheDelete'),
    mapCacheGet = require('./_mapCacheGet'),
    mapCacheHas = require('./_mapCacheHas'),
    mapCacheSet = require('./_mapCacheSet');

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

module.exports = MapCache;

},{"./_mapCacheClear":55,"./_mapCacheDelete":56,"./_mapCacheGet":57,"./_mapCacheHas":58,"./_mapCacheSet":59}],13:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;

},{"./_root":67}],14:[function(require,module,exports){
var baseTimes = require('./_baseTimes'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isIndex = require('./_isIndex'),
    isTypedArray = require('./isTypedArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = arrayLikeKeys;

},{"./_baseTimes":27,"./_isIndex":45,"./isArguments":73,"./isArray":74,"./isBuffer":76,"./isTypedArray":82}],15:[function(require,module,exports){
/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],16:[function(require,module,exports){
var baseAssignValue = require('./_baseAssignValue'),
    eq = require('./eq');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignValue;

},{"./_baseAssignValue":18,"./eq":71}],17:[function(require,module,exports){
var eq = require('./eq');

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

module.exports = assocIndexOf;

},{"./eq":71}],18:[function(require,module,exports){
var defineProperty = require('./_defineProperty');

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

module.exports = baseAssignValue;

},{"./_defineProperty":34}],19:[function(require,module,exports){
var castPath = require('./_castPath'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./_castPath":32,"./_toKey":69}],20:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    getRawTag = require('./_getRawTag'),
    objectToString = require('./_objectToString');

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;

},{"./_Symbol":13,"./_getRawTag":38,"./_objectToString":64}],21:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

module.exports = baseIsArguments;

},{"./_baseGetTag":20,"./isObjectLike":80}],22:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isMasked = require('./_isMasked'),
    isObject = require('./isObject'),
    toSource = require('./_toSource');

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

module.exports = baseIsNative;

},{"./_isMasked":48,"./_toSource":70,"./isFunction":77,"./isObject":79}],23:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isLength = require('./isLength'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

module.exports = baseIsTypedArray;

},{"./_baseGetTag":20,"./isLength":78,"./isObjectLike":80}],24:[function(require,module,exports){
var isPrototype = require('./_isPrototype'),
    nativeKeys = require('./_nativeKeys');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeys;

},{"./_isPrototype":49,"./_nativeKeys":62}],25:[function(require,module,exports){
var assignValue = require('./_assignValue'),
    castPath = require('./_castPath'),
    isIndex = require('./_isIndex'),
    isObject = require('./isObject'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.set`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The path of the property to set.
 * @param {*} value The value to set.
 * @param {Function} [customizer] The function to customize path creation.
 * @returns {Object} Returns `object`.
 */
function baseSet(object, path, value, customizer) {
  if (!isObject(object)) {
    return object;
  }
  path = castPath(path, object);

  var index = -1,
      length = path.length,
      lastIndex = length - 1,
      nested = object;

  while (nested != null && ++index < length) {
    var key = toKey(path[index]),
        newValue = value;

    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return object;
    }

    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined) {
        newValue = isObject(objValue)
          ? objValue
          : (isIndex(path[index + 1]) ? [] : {});
      }
    }
    assignValue(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}

module.exports = baseSet;

},{"./_assignValue":16,"./_castPath":32,"./_isIndex":45,"./_toKey":69,"./isObject":79}],26:[function(require,module,exports){
/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

module.exports = baseSlice;

},{}],27:[function(require,module,exports){
/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;

},{}],28:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    arrayMap = require('./_arrayMap'),
    isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = baseToString;

},{"./_Symbol":13,"./_arrayMap":15,"./isArray":74,"./isSymbol":81}],29:[function(require,module,exports){
/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

module.exports = baseUnary;

},{}],30:[function(require,module,exports){
var castPath = require('./_castPath'),
    last = require('./last'),
    parent = require('./_parent'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.unset`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The property path to unset.
 * @returns {boolean} Returns `true` if the property is deleted, else `false`.
 */
function baseUnset(object, path) {
  path = castPath(path, object);
  object = parent(object, path);
  return object == null || delete object[toKey(last(path))];
}

module.exports = baseUnset;

},{"./_castPath":32,"./_parent":66,"./_toKey":69,"./last":84}],31:[function(require,module,exports){
var arrayMap = require('./_arrayMap');

/**
 * The base implementation of `_.values` and `_.valuesIn` which creates an
 * array of `object` property values corresponding to the property names
 * of `props`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} props The property names to get values for.
 * @returns {Object} Returns the array of property values.
 */
function baseValues(object, props) {
  return arrayMap(props, function(key) {
    return object[key];
  });
}

module.exports = baseValues;

},{"./_arrayMap":15}],32:[function(require,module,exports){
var isArray = require('./isArray'),
    isKey = require('./_isKey'),
    stringToPath = require('./_stringToPath'),
    toString = require('./toString');

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}

module.exports = castPath;

},{"./_isKey":46,"./_stringToPath":68,"./isArray":74,"./toString":88}],33:[function(require,module,exports){
var root = require('./_root');

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

module.exports = coreJsData;

},{"./_root":67}],34:[function(require,module,exports){
var getNative = require('./_getNative');

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

module.exports = defineProperty;

},{"./_getNative":37}],35:[function(require,module,exports){
(function (global){(function (){
/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

module.exports = freeGlobal;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
var isKeyable = require('./_isKeyable');

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

module.exports = getMapData;

},{"./_isKeyable":47}],37:[function(require,module,exports){
var baseIsNative = require('./_baseIsNative'),
    getValue = require('./_getValue');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

module.exports = getNative;

},{"./_baseIsNative":22,"./_getValue":39}],38:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;

},{"./_Symbol":13}],39:[function(require,module,exports){
/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

module.exports = getValue;

},{}],40:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

module.exports = hashClear;

},{"./_nativeCreate":61}],41:[function(require,module,exports){
/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = hashDelete;

},{}],42:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

module.exports = hashGet;

},{"./_nativeCreate":61}],43:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

module.exports = hashHas;

},{"./_nativeCreate":61}],44:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

module.exports = hashSet;

},{"./_nativeCreate":61}],45:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

module.exports = isIndex;

},{}],46:[function(require,module,exports){
var isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

module.exports = isKey;

},{"./isArray":74,"./isSymbol":81}],47:[function(require,module,exports){
/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

module.exports = isKeyable;

},{}],48:[function(require,module,exports){
var coreJsData = require('./_coreJsData');

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

module.exports = isMasked;

},{"./_coreJsData":33}],49:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

module.exports = isPrototype;

},{}],50:[function(require,module,exports){
/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

module.exports = listCacheClear;

},{}],51:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

module.exports = listCacheDelete;

},{"./_assocIndexOf":17}],52:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

module.exports = listCacheGet;

},{"./_assocIndexOf":17}],53:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

module.exports = listCacheHas;

},{"./_assocIndexOf":17}],54:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

module.exports = listCacheSet;

},{"./_assocIndexOf":17}],55:[function(require,module,exports){
var Hash = require('./_Hash'),
    ListCache = require('./_ListCache'),
    Map = require('./_Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

module.exports = mapCacheClear;

},{"./_Hash":9,"./_ListCache":10,"./_Map":11}],56:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = mapCacheDelete;

},{"./_getMapData":36}],57:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

module.exports = mapCacheGet;

},{"./_getMapData":36}],58:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

module.exports = mapCacheHas;

},{"./_getMapData":36}],59:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

module.exports = mapCacheSet;

},{"./_getMapData":36}],60:[function(require,module,exports){
var memoize = require('./memoize');

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

module.exports = memoizeCapped;

},{"./memoize":85}],61:[function(require,module,exports){
var getNative = require('./_getNative');

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

module.exports = nativeCreate;

},{"./_getNative":37}],62:[function(require,module,exports){
var overArg = require('./_overArg');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

module.exports = nativeKeys;

},{"./_overArg":65}],63:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule && freeModule.require && freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;

},{"./_freeGlobal":35}],64:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;

},{}],65:[function(require,module,exports){
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],66:[function(require,module,exports){
var baseGet = require('./_baseGet'),
    baseSlice = require('./_baseSlice');

/**
 * Gets the parent value at `path` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path to get the parent value of.
 * @returns {*} Returns the parent value.
 */
function parent(object, path) {
  return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
}

module.exports = parent;

},{"./_baseGet":19,"./_baseSlice":26}],67:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;

},{"./_freeGlobal":35}],68:[function(require,module,exports){
var memoizeCapped = require('./_memoizeCapped');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

module.exports = stringToPath;

},{"./_memoizeCapped":60}],69:[function(require,module,exports){
var isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = toKey;

},{"./isSymbol":81}],70:[function(require,module,exports){
/** Used for built-in method references. */
var funcProto = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

module.exports = toSource;

},{}],71:[function(require,module,exports){
/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

module.exports = eq;

},{}],72:[function(require,module,exports){
var baseGet = require('./_baseGet');

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;

},{"./_baseGet":19}],73:[function(require,module,exports){
var baseIsArguments = require('./_baseIsArguments'),
    isObjectLike = require('./isObjectLike');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

module.exports = isArguments;

},{"./_baseIsArguments":21,"./isObjectLike":80}],74:[function(require,module,exports){
/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

module.exports = isArray;

},{}],75:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

module.exports = isArrayLike;

},{"./isFunction":77,"./isLength":78}],76:[function(require,module,exports){
var root = require('./_root'),
    stubFalse = require('./stubFalse');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

module.exports = isBuffer;

},{"./_root":67,"./stubFalse":87}],77:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObject = require('./isObject');

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

module.exports = isFunction;

},{"./_baseGetTag":20,"./isObject":79}],78:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],79:[function(require,module,exports){
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],80:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],81:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;

},{"./_baseGetTag":20,"./isObjectLike":80}],82:[function(require,module,exports){
var baseIsTypedArray = require('./_baseIsTypedArray'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

module.exports = isTypedArray;

},{"./_baseIsTypedArray":23,"./_baseUnary":29,"./_nodeUtil":63}],83:[function(require,module,exports){
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeys = require('./_baseKeys'),
    isArrayLike = require('./isArrayLike');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

module.exports = keys;

},{"./_arrayLikeKeys":14,"./_baseKeys":24,"./isArrayLike":75}],84:[function(require,module,exports){
/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array == null ? 0 : array.length;
  return length ? array[length - 1] : undefined;
}

module.exports = last;

},{}],85:[function(require,module,exports){
var MapCache = require('./_MapCache');

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = MapCache;

module.exports = memoize;

},{"./_MapCache":12}],86:[function(require,module,exports){
var baseSet = require('./_baseSet');

/**
 * Sets the value at `path` of `object`. If a portion of `path` doesn't exist,
 * it's created. Arrays are created for missing index properties while objects
 * are created for all other missing properties. Use `_.setWith` to customize
 * `path` creation.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to modify.
 * @param {Array|string} path The path of the property to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.set(object, 'a[0].b.c', 4);
 * console.log(object.a[0].b.c);
 * // => 4
 *
 * _.set(object, ['x', '0', 'y', 'z'], 5);
 * console.log(object.x[0].y.z);
 * // => 5
 */
function set(object, path, value) {
  return object == null ? object : baseSet(object, path, value);
}

module.exports = set;

},{"./_baseSet":25}],87:[function(require,module,exports){
/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = stubFalse;

},{}],88:[function(require,module,exports){
var baseToString = require('./_baseToString');

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

module.exports = toString;

},{"./_baseToString":28}],89:[function(require,module,exports){
var baseUnset = require('./_baseUnset');

/**
 * Removes the property at `path` of `object`.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The object to modify.
 * @param {Array|string} path The path of the property to unset.
 * @returns {boolean} Returns `true` if the property is deleted, else `false`.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 7 } }] };
 * _.unset(object, 'a[0].b.c');
 * // => true
 *
 * console.log(object);
 * // => { 'a': [{ 'b': {} }] };
 *
 * _.unset(object, ['a', '0', 'b', 'c']);
 * // => true
 *
 * console.log(object);
 * // => { 'a': [{ 'b': {} }] };
 */
function unset(object, path) {
  return object == null ? true : baseUnset(object, path);
}

module.exports = unset;

},{"./_baseUnset":30}],90:[function(require,module,exports){
var baseValues = require('./_baseValues'),
    keys = require('./keys');

/**
 * Creates an array of the own enumerable string keyed property values of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property values.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.values(new Foo);
 * // => [1, 2] (iteration order is not guaranteed)
 *
 * _.values('hi');
 * // => ['h', 'i']
 */
function values(object) {
  return object == null ? [] : baseValues(object, keys(object));
}

module.exports = values;

},{"./_baseValues":31,"./keys":83}],91:[function(require,module,exports){
(function (process){(function (){
'use strict';

if (typeof process === 'undefined' ||
    !process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this)}).call(this,require('_process'))
},{"_process":92}],92:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],93:[function(require,module,exports){
module.exports=[
"ac",
"com.ac",
"edu.ac",
"gov.ac",
"net.ac",
"mil.ac",
"org.ac",
"ad",
"nom.ad",
"ae",
"co.ae",
"net.ae",
"org.ae",
"sch.ae",
"ac.ae",
"gov.ae",
"mil.ae",
"aero",
"accident-investigation.aero",
"accident-prevention.aero",
"aerobatic.aero",
"aeroclub.aero",
"aerodrome.aero",
"agents.aero",
"aircraft.aero",
"airline.aero",
"airport.aero",
"air-surveillance.aero",
"airtraffic.aero",
"air-traffic-control.aero",
"ambulance.aero",
"amusement.aero",
"association.aero",
"author.aero",
"ballooning.aero",
"broker.aero",
"caa.aero",
"cargo.aero",
"catering.aero",
"certification.aero",
"championship.aero",
"charter.aero",
"civilaviation.aero",
"club.aero",
"conference.aero",
"consultant.aero",
"consulting.aero",
"control.aero",
"council.aero",
"crew.aero",
"design.aero",
"dgca.aero",
"educator.aero",
"emergency.aero",
"engine.aero",
"engineer.aero",
"entertainment.aero",
"equipment.aero",
"exchange.aero",
"express.aero",
"federation.aero",
"flight.aero",
"fuel.aero",
"gliding.aero",
"government.aero",
"groundhandling.aero",
"group.aero",
"hanggliding.aero",
"homebuilt.aero",
"insurance.aero",
"journal.aero",
"journalist.aero",
"leasing.aero",
"logistics.aero",
"magazine.aero",
"maintenance.aero",
"media.aero",
"microlight.aero",
"modelling.aero",
"navigation.aero",
"parachuting.aero",
"paragliding.aero",
"passenger-association.aero",
"pilot.aero",
"press.aero",
"production.aero",
"recreation.aero",
"repbody.aero",
"res.aero",
"research.aero",
"rotorcraft.aero",
"safety.aero",
"scientist.aero",
"services.aero",
"show.aero",
"skydiving.aero",
"software.aero",
"student.aero",
"trader.aero",
"trading.aero",
"trainer.aero",
"union.aero",
"workinggroup.aero",
"works.aero",
"af",
"gov.af",
"com.af",
"org.af",
"net.af",
"edu.af",
"ag",
"com.ag",
"org.ag",
"net.ag",
"co.ag",
"nom.ag",
"ai",
"off.ai",
"com.ai",
"net.ai",
"org.ai",
"al",
"com.al",
"edu.al",
"gov.al",
"mil.al",
"net.al",
"org.al",
"am",
"co.am",
"com.am",
"commune.am",
"net.am",
"org.am",
"ao",
"ed.ao",
"gv.ao",
"og.ao",
"co.ao",
"pb.ao",
"it.ao",
"aq",
"ar",
"bet.ar",
"com.ar",
"coop.ar",
"edu.ar",
"gob.ar",
"gov.ar",
"int.ar",
"mil.ar",
"musica.ar",
"mutual.ar",
"net.ar",
"org.ar",
"senasa.ar",
"tur.ar",
"arpa",
"e164.arpa",
"in-addr.arpa",
"ip6.arpa",
"iris.arpa",
"uri.arpa",
"urn.arpa",
"as",
"gov.as",
"asia",
"at",
"ac.at",
"co.at",
"gv.at",
"or.at",
"sth.ac.at",
"au",
"com.au",
"net.au",
"org.au",
"edu.au",
"gov.au",
"asn.au",
"id.au",
"info.au",
"conf.au",
"oz.au",
"act.au",
"nsw.au",
"nt.au",
"qld.au",
"sa.au",
"tas.au",
"vic.au",
"wa.au",
"act.edu.au",
"catholic.edu.au",
"nsw.edu.au",
"nt.edu.au",
"qld.edu.au",
"sa.edu.au",
"tas.edu.au",
"vic.edu.au",
"wa.edu.au",
"qld.gov.au",
"sa.gov.au",
"tas.gov.au",
"vic.gov.au",
"wa.gov.au",
"schools.nsw.edu.au",
"aw",
"com.aw",
"ax",
"az",
"com.az",
"net.az",
"int.az",
"gov.az",
"org.az",
"edu.az",
"info.az",
"pp.az",
"mil.az",
"name.az",
"pro.az",
"biz.az",
"ba",
"com.ba",
"edu.ba",
"gov.ba",
"mil.ba",
"net.ba",
"org.ba",
"bb",
"biz.bb",
"co.bb",
"com.bb",
"edu.bb",
"gov.bb",
"info.bb",
"net.bb",
"org.bb",
"store.bb",
"tv.bb",
"*.bd",
"be",
"ac.be",
"bf",
"gov.bf",
"bg",
"a.bg",
"b.bg",
"c.bg",
"d.bg",
"e.bg",
"f.bg",
"g.bg",
"h.bg",
"i.bg",
"j.bg",
"k.bg",
"l.bg",
"m.bg",
"n.bg",
"o.bg",
"p.bg",
"q.bg",
"r.bg",
"s.bg",
"t.bg",
"u.bg",
"v.bg",
"w.bg",
"x.bg",
"y.bg",
"z.bg",
"0.bg",
"1.bg",
"2.bg",
"3.bg",
"4.bg",
"5.bg",
"6.bg",
"7.bg",
"8.bg",
"9.bg",
"bh",
"com.bh",
"edu.bh",
"net.bh",
"org.bh",
"gov.bh",
"bi",
"co.bi",
"com.bi",
"edu.bi",
"or.bi",
"org.bi",
"biz",
"bj",
"asso.bj",
"barreau.bj",
"gouv.bj",
"bm",
"com.bm",
"edu.bm",
"gov.bm",
"net.bm",
"org.bm",
"bn",
"com.bn",
"edu.bn",
"gov.bn",
"net.bn",
"org.bn",
"bo",
"com.bo",
"edu.bo",
"gob.bo",
"int.bo",
"org.bo",
"net.bo",
"mil.bo",
"tv.bo",
"web.bo",
"academia.bo",
"agro.bo",
"arte.bo",
"blog.bo",
"bolivia.bo",
"ciencia.bo",
"cooperativa.bo",
"democracia.bo",
"deporte.bo",
"ecologia.bo",
"economia.bo",
"empresa.bo",
"indigena.bo",
"industria.bo",
"info.bo",
"medicina.bo",
"movimiento.bo",
"musica.bo",
"natural.bo",
"nombre.bo",
"noticias.bo",
"patria.bo",
"politica.bo",
"profesional.bo",
"plurinacional.bo",
"pueblo.bo",
"revista.bo",
"salud.bo",
"tecnologia.bo",
"tksat.bo",
"transporte.bo",
"wiki.bo",
"br",
"9guacu.br",
"abc.br",
"adm.br",
"adv.br",
"agr.br",
"aju.br",
"am.br",
"anani.br",
"aparecida.br",
"app.br",
"arq.br",
"art.br",
"ato.br",
"b.br",
"barueri.br",
"belem.br",
"bhz.br",
"bib.br",
"bio.br",
"blog.br",
"bmd.br",
"boavista.br",
"bsb.br",
"campinagrande.br",
"campinas.br",
"caxias.br",
"cim.br",
"cng.br",
"cnt.br",
"com.br",
"contagem.br",
"coop.br",
"coz.br",
"cri.br",
"cuiaba.br",
"curitiba.br",
"def.br",
"des.br",
"det.br",
"dev.br",
"ecn.br",
"eco.br",
"edu.br",
"emp.br",
"enf.br",
"eng.br",
"esp.br",
"etc.br",
"eti.br",
"far.br",
"feira.br",
"flog.br",
"floripa.br",
"fm.br",
"fnd.br",
"fortal.br",
"fot.br",
"foz.br",
"fst.br",
"g12.br",
"geo.br",
"ggf.br",
"goiania.br",
"gov.br",
"ac.gov.br",
"al.gov.br",
"am.gov.br",
"ap.gov.br",
"ba.gov.br",
"ce.gov.br",
"df.gov.br",
"es.gov.br",
"go.gov.br",
"ma.gov.br",
"mg.gov.br",
"ms.gov.br",
"mt.gov.br",
"pa.gov.br",
"pb.gov.br",
"pe.gov.br",
"pi.gov.br",
"pr.gov.br",
"rj.gov.br",
"rn.gov.br",
"ro.gov.br",
"rr.gov.br",
"rs.gov.br",
"sc.gov.br",
"se.gov.br",
"sp.gov.br",
"to.gov.br",
"gru.br",
"imb.br",
"ind.br",
"inf.br",
"jab.br",
"jampa.br",
"jdf.br",
"joinville.br",
"jor.br",
"jus.br",
"leg.br",
"lel.br",
"log.br",
"londrina.br",
"macapa.br",
"maceio.br",
"manaus.br",
"maringa.br",
"mat.br",
"med.br",
"mil.br",
"morena.br",
"mp.br",
"mus.br",
"natal.br",
"net.br",
"niteroi.br",
"*.nom.br",
"not.br",
"ntr.br",
"odo.br",
"ong.br",
"org.br",
"osasco.br",
"palmas.br",
"poa.br",
"ppg.br",
"pro.br",
"psc.br",
"psi.br",
"pvh.br",
"qsl.br",
"radio.br",
"rec.br",
"recife.br",
"rep.br",
"ribeirao.br",
"rio.br",
"riobranco.br",
"riopreto.br",
"salvador.br",
"sampa.br",
"santamaria.br",
"santoandre.br",
"saobernardo.br",
"saogonca.br",
"seg.br",
"sjc.br",
"slg.br",
"slz.br",
"sorocaba.br",
"srv.br",
"taxi.br",
"tc.br",
"tec.br",
"teo.br",
"the.br",
"tmp.br",
"trd.br",
"tur.br",
"tv.br",
"udi.br",
"vet.br",
"vix.br",
"vlog.br",
"wiki.br",
"zlg.br",
"bs",
"com.bs",
"net.bs",
"org.bs",
"edu.bs",
"gov.bs",
"bt",
"com.bt",
"edu.bt",
"gov.bt",
"net.bt",
"org.bt",
"bv",
"bw",
"co.bw",
"org.bw",
"by",
"gov.by",
"mil.by",
"com.by",
"of.by",
"bz",
"com.bz",
"net.bz",
"org.bz",
"edu.bz",
"gov.bz",
"ca",
"ab.ca",
"bc.ca",
"mb.ca",
"nb.ca",
"nf.ca",
"nl.ca",
"ns.ca",
"nt.ca",
"nu.ca",
"on.ca",
"pe.ca",
"qc.ca",
"sk.ca",
"yk.ca",
"gc.ca",
"cat",
"cc",
"cd",
"gov.cd",
"cf",
"cg",
"ch",
"ci",
"org.ci",
"or.ci",
"com.ci",
"co.ci",
"edu.ci",
"ed.ci",
"ac.ci",
"net.ci",
"go.ci",
"asso.ci",
"aéroport.ci",
"int.ci",
"presse.ci",
"md.ci",
"gouv.ci",
"*.ck",
"!www.ck",
"cl",
"co.cl",
"gob.cl",
"gov.cl",
"mil.cl",
"cm",
"co.cm",
"com.cm",
"gov.cm",
"net.cm",
"cn",
"ac.cn",
"com.cn",
"edu.cn",
"gov.cn",
"net.cn",
"org.cn",
"mil.cn",
"公司.cn",
"网络.cn",
"網絡.cn",
"ah.cn",
"bj.cn",
"cq.cn",
"fj.cn",
"gd.cn",
"gs.cn",
"gz.cn",
"gx.cn",
"ha.cn",
"hb.cn",
"he.cn",
"hi.cn",
"hl.cn",
"hn.cn",
"jl.cn",
"js.cn",
"jx.cn",
"ln.cn",
"nm.cn",
"nx.cn",
"qh.cn",
"sc.cn",
"sd.cn",
"sh.cn",
"sn.cn",
"sx.cn",
"tj.cn",
"xj.cn",
"xz.cn",
"yn.cn",
"zj.cn",
"hk.cn",
"mo.cn",
"tw.cn",
"co",
"arts.co",
"com.co",
"edu.co",
"firm.co",
"gov.co",
"info.co",
"int.co",
"mil.co",
"net.co",
"nom.co",
"org.co",
"rec.co",
"web.co",
"com",
"coop",
"cr",
"ac.cr",
"co.cr",
"ed.cr",
"fi.cr",
"go.cr",
"or.cr",
"sa.cr",
"cu",
"com.cu",
"edu.cu",
"org.cu",
"net.cu",
"gov.cu",
"inf.cu",
"cv",
"com.cv",
"edu.cv",
"int.cv",
"nome.cv",
"org.cv",
"cw",
"com.cw",
"edu.cw",
"net.cw",
"org.cw",
"cx",
"gov.cx",
"cy",
"ac.cy",
"biz.cy",
"com.cy",
"ekloges.cy",
"gov.cy",
"ltd.cy",
"mil.cy",
"net.cy",
"org.cy",
"press.cy",
"pro.cy",
"tm.cy",
"cz",
"de",
"dj",
"dk",
"dm",
"com.dm",
"net.dm",
"org.dm",
"edu.dm",
"gov.dm",
"do",
"art.do",
"com.do",
"edu.do",
"gob.do",
"gov.do",
"mil.do",
"net.do",
"org.do",
"sld.do",
"web.do",
"dz",
"art.dz",
"asso.dz",
"com.dz",
"edu.dz",
"gov.dz",
"org.dz",
"net.dz",
"pol.dz",
"soc.dz",
"tm.dz",
"ec",
"com.ec",
"info.ec",
"net.ec",
"fin.ec",
"k12.ec",
"med.ec",
"pro.ec",
"org.ec",
"edu.ec",
"gov.ec",
"gob.ec",
"mil.ec",
"edu",
"ee",
"edu.ee",
"gov.ee",
"riik.ee",
"lib.ee",
"med.ee",
"com.ee",
"pri.ee",
"aip.ee",
"org.ee",
"fie.ee",
"eg",
"com.eg",
"edu.eg",
"eun.eg",
"gov.eg",
"mil.eg",
"name.eg",
"net.eg",
"org.eg",
"sci.eg",
"*.er",
"es",
"com.es",
"nom.es",
"org.es",
"gob.es",
"edu.es",
"et",
"com.et",
"gov.et",
"org.et",
"edu.et",
"biz.et",
"name.et",
"info.et",
"net.et",
"eu",
"fi",
"aland.fi",
"fj",
"ac.fj",
"biz.fj",
"com.fj",
"gov.fj",
"info.fj",
"mil.fj",
"name.fj",
"net.fj",
"org.fj",
"pro.fj",
"*.fk",
"com.fm",
"edu.fm",
"net.fm",
"org.fm",
"fm",
"fo",
"fr",
"asso.fr",
"com.fr",
"gouv.fr",
"nom.fr",
"prd.fr",
"tm.fr",
"aeroport.fr",
"avocat.fr",
"avoues.fr",
"cci.fr",
"chambagri.fr",
"chirurgiens-dentistes.fr",
"experts-comptables.fr",
"geometre-expert.fr",
"greta.fr",
"huissier-justice.fr",
"medecin.fr",
"notaires.fr",
"pharmacien.fr",
"port.fr",
"veterinaire.fr",
"ga",
"gb",
"edu.gd",
"gov.gd",
"gd",
"ge",
"com.ge",
"edu.ge",
"gov.ge",
"org.ge",
"mil.ge",
"net.ge",
"pvt.ge",
"gf",
"gg",
"co.gg",
"net.gg",
"org.gg",
"gh",
"com.gh",
"edu.gh",
"gov.gh",
"org.gh",
"mil.gh",
"gi",
"com.gi",
"ltd.gi",
"gov.gi",
"mod.gi",
"edu.gi",
"org.gi",
"gl",
"co.gl",
"com.gl",
"edu.gl",
"net.gl",
"org.gl",
"gm",
"gn",
"ac.gn",
"com.gn",
"edu.gn",
"gov.gn",
"org.gn",
"net.gn",
"gov",
"gp",
"com.gp",
"net.gp",
"mobi.gp",
"edu.gp",
"org.gp",
"asso.gp",
"gq",
"gr",
"com.gr",
"edu.gr",
"net.gr",
"org.gr",
"gov.gr",
"gs",
"gt",
"com.gt",
"edu.gt",
"gob.gt",
"ind.gt",
"mil.gt",
"net.gt",
"org.gt",
"gu",
"com.gu",
"edu.gu",
"gov.gu",
"guam.gu",
"info.gu",
"net.gu",
"org.gu",
"web.gu",
"gw",
"gy",
"co.gy",
"com.gy",
"edu.gy",
"gov.gy",
"net.gy",
"org.gy",
"hk",
"com.hk",
"edu.hk",
"gov.hk",
"idv.hk",
"net.hk",
"org.hk",
"公司.hk",
"教育.hk",
"敎育.hk",
"政府.hk",
"個人.hk",
"个��.hk",
"箇人.hk",
"網络.hk",
"网络.hk",
"组織.hk",
"網絡.hk",
"网絡.hk",
"组织.hk",
"組織.hk",
"組织.hk",
"hm",
"hn",
"com.hn",
"edu.hn",
"org.hn",
"net.hn",
"mil.hn",
"gob.hn",
"hr",
"iz.hr",
"from.hr",
"name.hr",
"com.hr",
"ht",
"com.ht",
"shop.ht",
"firm.ht",
"info.ht",
"adult.ht",
"net.ht",
"pro.ht",
"org.ht",
"med.ht",
"art.ht",
"coop.ht",
"pol.ht",
"asso.ht",
"edu.ht",
"rel.ht",
"gouv.ht",
"perso.ht",
"hu",
"co.hu",
"info.hu",
"org.hu",
"priv.hu",
"sport.hu",
"tm.hu",
"2000.hu",
"agrar.hu",
"bolt.hu",
"casino.hu",
"city.hu",
"erotica.hu",
"erotika.hu",
"film.hu",
"forum.hu",
"games.hu",
"hotel.hu",
"ingatlan.hu",
"jogasz.hu",
"konyvelo.hu",
"lakas.hu",
"media.hu",
"news.hu",
"reklam.hu",
"sex.hu",
"shop.hu",
"suli.hu",
"szex.hu",
"tozsde.hu",
"utazas.hu",
"video.hu",
"id",
"ac.id",
"biz.id",
"co.id",
"desa.id",
"go.id",
"mil.id",
"my.id",
"net.id",
"or.id",
"ponpes.id",
"sch.id",
"web.id",
"ie",
"gov.ie",
"il",
"ac.il",
"co.il",
"gov.il",
"idf.il",
"k12.il",
"muni.il",
"net.il",
"org.il",
"im",
"ac.im",
"co.im",
"com.im",
"ltd.co.im",
"net.im",
"org.im",
"plc.co.im",
"tt.im",
"tv.im",
"in",
"co.in",
"firm.in",
"net.in",
"org.in",
"gen.in",
"ind.in",
"nic.in",
"ac.in",
"edu.in",
"res.in",
"gov.in",
"mil.in",
"info",
"int",
"eu.int",
"io",
"com.io",
"iq",
"gov.iq",
"edu.iq",
"mil.iq",
"com.iq",
"org.iq",
"net.iq",
"ir",
"ac.ir",
"co.ir",
"gov.ir",
"id.ir",
"net.ir",
"org.ir",
"sch.ir",
"ایران.ir",
"ايران.ir",
"is",
"net.is",
"com.is",
"edu.is",
"gov.is",
"org.is",
"int.is",
"it",
"gov.it",
"edu.it",
"abr.it",
"abruzzo.it",
"aosta-valley.it",
"aostavalley.it",
"bas.it",
"basilicata.it",
"cal.it",
"calabria.it",
"cam.it",
"campania.it",
"emilia-romagna.it",
"emiliaromagna.it",
"emr.it",
"friuli-v-giulia.it",
"friuli-ve-giulia.it",
"friuli-vegiulia.it",
"friuli-venezia-giulia.it",
"friuli-veneziagiulia.it",
"friuli-vgiulia.it",
"friuliv-giulia.it",
"friulive-giulia.it",
"friulivegiulia.it",
"friulivenezia-giulia.it",
"friuliveneziagiulia.it",
"friulivgiulia.it",
"fvg.it",
"laz.it",
"lazio.it",
"lig.it",
"liguria.it",
"lom.it",
"lombardia.it",
"lombardy.it",
"lucania.it",
"mar.it",
"marche.it",
"mol.it",
"molise.it",
"piedmont.it",
"piemonte.it",
"pmn.it",
"pug.it",
"puglia.it",
"sar.it",
"sardegna.it",
"sardinia.it",
"sic.it",
"sicilia.it",
"sicily.it",
"taa.it",
"tos.it",
"toscana.it",
"trentin-sud-tirol.it",
"trentin-süd-tirol.it",
"trentin-sudtirol.it",
"trentin-südtirol.it",
"trentin-sued-tirol.it",
"trentin-suedtirol.it",
"trentino-a-adige.it",
"trentino-aadige.it",
"trentino-alto-adige.it",
"trentino-altoadige.it",
"trentino-s-tirol.it",
"trentino-stirol.it",
"trentino-sud-tirol.it",
"trentino-süd-tirol.it",
"trentino-sudtirol.it",
"trentino-südtirol.it",
"trentino-sued-tirol.it",
"trentino-suedtirol.it",
"trentino.it",
"trentinoa-adige.it",
"trentinoaadige.it",
"trentinoalto-adige.it",
"trentinoaltoadige.it",
"trentinos-tirol.it",
"trentinostirol.it",
"trentinosud-tirol.it",
"trentinosüd-tirol.it",
"trentinosudtirol.it",
"trentinosüdtirol.it",
"trentinosued-tirol.it",
"trentinosuedtirol.it",
"trentinsud-tirol.it",
"trentinsüd-tirol.it",
"trentinsudtirol.it",
"trentinsüdtirol.it",
"trentinsued-tirol.it",
"trentinsuedtirol.it",
"tuscany.it",
"umb.it",
"umbria.it",
"val-d-aosta.it",
"val-daosta.it",
"vald-aosta.it",
"valdaosta.it",
"valle-aosta.it",
"valle-d-aosta.it",
"valle-daosta.it",
"valleaosta.it",
"valled-aosta.it",
"valledaosta.it",
"vallee-aoste.it",
"vallée-aoste.it",
"vallee-d-aoste.it",
"vallée-d-aoste.it",
"valleeaoste.it",
"valléeaoste.it",
"valleedaoste.it",
"valléedaoste.it",
"vao.it",
"vda.it",
"ven.it",
"veneto.it",
"ag.it",
"agrigento.it",
"al.it",
"alessandria.it",
"alto-adige.it",
"altoadige.it",
"an.it",
"ancona.it",
"andria-barletta-trani.it",
"andria-trani-barletta.it",
"andriabarlettatrani.it",
"andriatranibarletta.it",
"ao.it",
"aosta.it",
"aoste.it",
"ap.it",
"aq.it",
"aquila.it",
"ar.it",
"arezzo.it",
"ascoli-piceno.it",
"ascolipiceno.it",
"asti.it",
"at.it",
"av.it",
"avellino.it",
"ba.it",
"balsan-sudtirol.it",
"balsan-südtirol.it",
"balsan-suedtirol.it",
"balsan.it",
"bari.it",
"barletta-trani-andria.it",
"barlettatraniandria.it",
"belluno.it",
"benevento.it",
"bergamo.it",
"bg.it",
"bi.it",
"biella.it",
"bl.it",
"bn.it",
"bo.it",
"bologna.it",
"bolzano-altoadige.it",
"bolzano.it",
"bozen-sudtirol.it",
"bozen-südtirol.it",
"bozen-suedtirol.it",
"bozen.it",
"br.it",
"brescia.it",
"brindisi.it",
"bs.it",
"bt.it",
"bulsan-sudtirol.it",
"bulsan-südtirol.it",
"bulsan-suedtirol.it",
"bulsan.it",
"bz.it",
"ca.it",
"cagliari.it",
"caltanissetta.it",
"campidano-medio.it",
"campidanomedio.it",
"campobasso.it",
"carbonia-iglesias.it",
"carboniaiglesias.it",
"carrara-massa.it",
"carraramassa.it",
"caserta.it",
"catania.it",
"catanzaro.it",
"cb.it",
"ce.it",
"cesena-forli.it",
"cesena-forlì.it",
"cesenaforli.it",
"cesenaforlì.it",
"ch.it",
"chieti.it",
"ci.it",
"cl.it",
"cn.it",
"co.it",
"como.it",
"cosenza.it",
"cr.it",
"cremona.it",
"crotone.it",
"cs.it",
"ct.it",
"cuneo.it",
"cz.it",
"dell-ogliastra.it",
"dellogliastra.it",
"en.it",
"enna.it",
"fc.it",
"fe.it",
"fermo.it",
"ferrara.it",
"fg.it",
"fi.it",
"firenze.it",
"florence.it",
"fm.it",
"foggia.it",
"forli-cesena.it",
"forlì-cesena.it",
"forlicesena.it",
"forlìcesena.it",
"fr.it",
"frosinone.it",
"ge.it",
"genoa.it",
"genova.it",
"go.it",
"gorizia.it",
"gr.it",
"grosseto.it",
"iglesias-carbonia.it",
"iglesiascarbonia.it",
"im.it",
"imperia.it",
"is.it",
"isernia.it",
"kr.it",
"la-spezia.it",
"laquila.it",
"laspezia.it",
"latina.it",
"lc.it",
"le.it",
"lecce.it",
"lecco.it",
"li.it",
"livorno.it",
"lo.it",
"lodi.it",
"lt.it",
"lu.it",
"lucca.it",
"macerata.it",
"mantova.it",
"massa-carrara.it",
"massacarrara.it",
"matera.it",
"mb.it",
"mc.it",
"me.it",
"medio-campidano.it",
"mediocampidano.it",
"messina.it",
"mi.it",
"milan.it",
"milano.it",
"mn.it",
"mo.it",
"modena.it",
"monza-brianza.it",
"monza-e-della-brianza.it",
"monza.it",
"monzabrianza.it",
"monzaebrianza.it",
"monzaedellabrianza.it",
"ms.it",
"mt.it",
"na.it",
"naples.it",
"napoli.it",
"no.it",
"novara.it",
"nu.it",
"nuoro.it",
"og.it",
"ogliastra.it",
"olbia-tempio.it",
"olbiatempio.it",
"or.it",
"oristano.it",
"ot.it",
"pa.it",
"padova.it",
"padua.it",
"palermo.it",
"parma.it",
"pavia.it",
"pc.it",
"pd.it",
"pe.it",
"perugia.it",
"pesaro-urbino.it",
"pesarourbino.it",
"pescara.it",
"pg.it",
"pi.it",
"piacenza.it",
"pisa.it",
"pistoia.it",
"pn.it",
"po.it",
"pordenone.it",
"potenza.it",
"pr.it",
"prato.it",
"pt.it",
"pu.it",
"pv.it",
"pz.it",
"ra.it",
"ragusa.it",
"ravenna.it",
"rc.it",
"re.it",
"reggio-calabria.it",
"reggio-emilia.it",
"reggiocalabria.it",
"reggioemilia.it",
"rg.it",
"ri.it",
"rieti.it",
"rimini.it",
"rm.it",
"rn.it",
"ro.it",
"roma.it",
"rome.it",
"rovigo.it",
"sa.it",
"salerno.it",
"sassari.it",
"savona.it",
"si.it",
"siena.it",
"siracusa.it",
"so.it",
"sondrio.it",
"sp.it",
"sr.it",
"ss.it",
"suedtirol.it",
"südtirol.it",
"sv.it",
"ta.it",
"taranto.it",
"te.it",
"tempio-olbia.it",
"tempioolbia.it",
"teramo.it",
"terni.it",
"tn.it",
"to.it",
"torino.it",
"tp.it",
"tr.it",
"trani-andria-barletta.it",
"trani-barletta-andria.it",
"traniandriabarletta.it",
"tranibarlettaandria.it",
"trapani.it",
"trento.it",
"treviso.it",
"trieste.it",
"ts.it",
"turin.it",
"tv.it",
"ud.it",
"udine.it",
"urbino-pesaro.it",
"urbinopesaro.it",
"va.it",
"varese.it",
"vb.it",
"vc.it",
"ve.it",
"venezia.it",
"venice.it",
"verbania.it",
"vercelli.it",
"verona.it",
"vi.it",
"vibo-valentia.it",
"vibovalentia.it",
"vicenza.it",
"viterbo.it",
"vr.it",
"vs.it",
"vt.it",
"vv.it",
"je",
"co.je",
"net.je",
"org.je",
"*.jm",
"jo",
"com.jo",
"org.jo",
"net.jo",
"edu.jo",
"sch.jo",
"gov.jo",
"mil.jo",
"name.jo",
"jobs",
"jp",
"ac.jp",
"ad.jp",
"co.jp",
"ed.jp",
"go.jp",
"gr.jp",
"lg.jp",
"ne.jp",
"or.jp",
"aichi.jp",
"akita.jp",
"aomori.jp",
"chiba.jp",
"ehime.jp",
"fukui.jp",
"fukuoka.jp",
"fukushima.jp",
"gifu.jp",
"gunma.jp",
"hiroshima.jp",
"hokkaido.jp",
"hyogo.jp",
"ibaraki.jp",
"ishikawa.jp",
"iwate.jp",
"kagawa.jp",
"kagoshima.jp",
"kanagawa.jp",
"kochi.jp",
"kumamoto.jp",
"kyoto.jp",
"mie.jp",
"miyagi.jp",
"miyazaki.jp",
"nagano.jp",
"nagasaki.jp",
"nara.jp",
"niigata.jp",
"oita.jp",
"okayama.jp",
"okinawa.jp",
"osaka.jp",
"saga.jp",
"saitama.jp",
"shiga.jp",
"shimane.jp",
"shizuoka.jp",
"tochigi.jp",
"tokushima.jp",
"tokyo.jp",
"tottori.jp",
"toyama.jp",
"wakayama.jp",
"yamagata.jp",
"yamaguchi.jp",
"yamanashi.jp",
"栃木.jp",
"愛知.jp",
"愛媛.jp",
"兵庫.jp",
"熊本.jp",
"茨城.jp",
"北海道.jp",
"千葉.jp",
"和歌山.jp",
"長崎.jp",
"長野.jp",
"新潟.jp",
"青森.jp",
"静岡.jp",
"東京.jp",
"石川.jp",
"埼玉.jp",
"三重.jp",
"京都.jp",
"佐賀.jp",
"大分.jp",
"大阪.jp",
"奈良.jp",
"宮城.jp",
"宮崎.jp",
"富山.jp",
"山口.jp",
"山形.jp",
"山梨.jp",
"岩手.jp",
"岐阜.jp",
"岡山.jp",
"島根.jp",
"広島.jp",
"徳島.jp",
"沖縄.jp",
"滋賀.jp",
"神奈川.jp",
"福井.jp",
"福岡.jp",
"福島.jp",
"秋田.jp",
"群馬.jp",
"香川.jp",
"高知.jp",
"鳥取.jp",
"鹿児島.jp",
"*.kawasaki.jp",
"*.kitakyushu.jp",
"*.kobe.jp",
"*.nagoya.jp",
"*.sapporo.jp",
"*.sendai.jp",
"*.yokohama.jp",
"!city.kawasaki.jp",
"!city.kitakyushu.jp",
"!city.kobe.jp",
"!city.nagoya.jp",
"!city.sapporo.jp",
"!city.sendai.jp",
"!city.yokohama.jp",
"aisai.aichi.jp",
"ama.aichi.jp",
"anjo.aichi.jp",
"asuke.aichi.jp",
"chiryu.aichi.jp",
"chita.aichi.jp",
"fuso.aichi.jp",
"gamagori.aichi.jp",
"handa.aichi.jp",
"hazu.aichi.jp",
"hekinan.aichi.jp",
"higashiura.aichi.jp",
"ichinomiya.aichi.jp",
"inazawa.aichi.jp",
"inuyama.aichi.jp",
"isshiki.aichi.jp",
"iwakura.aichi.jp",
"kanie.aichi.jp",
"kariya.aichi.jp",
"kasugai.aichi.jp",
"kira.aichi.jp",
"kiyosu.aichi.jp",
"komaki.aichi.jp",
"konan.aichi.jp",
"kota.aichi.jp",
"mihama.aichi.jp",
"miyoshi.aichi.jp",
"nishio.aichi.jp",
"nisshin.aichi.jp",
"obu.aichi.jp",
"oguchi.aichi.jp",
"oharu.aichi.jp",
"okazaki.aichi.jp",
"owariasahi.aichi.jp",
"seto.aichi.jp",
"shikatsu.aichi.jp",
"shinshiro.aichi.jp",
"shitara.aichi.jp",
"tahara.aichi.jp",
"takahama.aichi.jp",
"tobishima.aichi.jp",
"toei.aichi.jp",
"togo.aichi.jp",
"tokai.aichi.jp",
"tokoname.aichi.jp",
"toyoake.aichi.jp",
"toyohashi.aichi.jp",
"toyokawa.aichi.jp",
"toyone.aichi.jp",
"toyota.aichi.jp",
"tsushima.aichi.jp",
"yatomi.aichi.jp",
"akita.akita.jp",
"daisen.akita.jp",
"fujisato.akita.jp",
"gojome.akita.jp",
"hachirogata.akita.jp",
"happou.akita.jp",
"higashinaruse.akita.jp",
"honjo.akita.jp",
"honjyo.akita.jp",
"ikawa.akita.jp",
"kamikoani.akita.jp",
"kamioka.akita.jp",
"katagami.akita.jp",
"kazuno.akita.jp",
"kitaakita.akita.jp",
"kosaka.akita.jp",
"kyowa.akita.jp",
"misato.akita.jp",
"mitane.akita.jp",
"moriyoshi.akita.jp",
"nikaho.akita.jp",
"noshiro.akita.jp",
"odate.akita.jp",
"oga.akita.jp",
"ogata.akita.jp",
"semboku.akita.jp",
"yokote.akita.jp",
"yurihonjo.akita.jp",
"aomori.aomori.jp",
"gonohe.aomori.jp",
"hachinohe.aomori.jp",
"hashikami.aomori.jp",
"hiranai.aomori.jp",
"hirosaki.aomori.jp",
"itayanagi.aomori.jp",
"kuroishi.aomori.jp",
"misawa.aomori.jp",
"mutsu.aomori.jp",
"nakadomari.aomori.jp",
"noheji.aomori.jp",
"oirase.aomori.jp",
"owani.aomori.jp",
"rokunohe.aomori.jp",
"sannohe.aomori.jp",
"shichinohe.aomori.jp",
"shingo.aomori.jp",
"takko.aomori.jp",
"towada.aomori.jp",
"tsugaru.aomori.jp",
"tsuruta.aomori.jp",
"abiko.chiba.jp",
"asahi.chiba.jp",
"chonan.chiba.jp",
"chosei.chiba.jp",
"choshi.chiba.jp",
"chuo.chiba.jp",
"funabashi.chiba.jp",
"futtsu.chiba.jp",
"hanamigawa.chiba.jp",
"ichihara.chiba.jp",
"ichikawa.chiba.jp",
"ichinomiya.chiba.jp",
"inzai.chiba.jp",
"isumi.chiba.jp",
"kamagaya.chiba.jp",
"kamogawa.chiba.jp",
"kashiwa.chiba.jp",
"katori.chiba.jp",
"katsuura.chiba.jp",
"kimitsu.chiba.jp",
"kisarazu.chiba.jp",
"kozaki.chiba.jp",
"kujukuri.chiba.jp",
"kyonan.chiba.jp",
"matsudo.chiba.jp",
"midori.chiba.jp",
"mihama.chiba.jp",
"minamiboso.chiba.jp",
"mobara.chiba.jp",
"mutsuzawa.chiba.jp",
"nagara.chiba.jp",
"nagareyama.chiba.jp",
"narashino.chiba.jp",
"narita.chiba.jp",
"noda.chiba.jp",
"oamishirasato.chiba.jp",
"omigawa.chiba.jp",
"onjuku.chiba.jp",
"otaki.chiba.jp",
"sakae.chiba.jp",
"sakura.chiba.jp",
"shimofusa.chiba.jp",
"shirako.chiba.jp",
"shiroi.chiba.jp",
"shisui.chiba.jp",
"sodegaura.chiba.jp",
"sosa.chiba.jp",
"tako.chiba.jp",
"tateyama.chiba.jp",
"togane.chiba.jp",
"tohnosho.chiba.jp",
"tomisato.chiba.jp",
"urayasu.chiba.jp",
"yachimata.chiba.jp",
"yachiyo.chiba.jp",
"yokaichiba.chiba.jp",
"yokoshibahikari.chiba.jp",
"yotsukaido.chiba.jp",
"ainan.ehime.jp",
"honai.ehime.jp",
"ikata.ehime.jp",
"imabari.ehime.jp",
"iyo.ehime.jp",
"kamijima.ehime.jp",
"kihoku.ehime.jp",
"kumakogen.ehime.jp",
"masaki.ehime.jp",
"matsuno.ehime.jp",
"matsuyama.ehime.jp",
"namikata.ehime.jp",
"niihama.ehime.jp",
"ozu.ehime.jp",
"saijo.ehime.jp",
"seiyo.ehime.jp",
"shikokuchuo.ehime.jp",
"tobe.ehime.jp",
"toon.ehime.jp",
"uchiko.ehime.jp",
"uwajima.ehime.jp",
"yawatahama.ehime.jp",
"echizen.fukui.jp",
"eiheiji.fukui.jp",
"fukui.fukui.jp",
"ikeda.fukui.jp",
"katsuyama.fukui.jp",
"mihama.fukui.jp",
"minamiechizen.fukui.jp",
"obama.fukui.jp",
"ohi.fukui.jp",
"ono.fukui.jp",
"sabae.fukui.jp",
"sakai.fukui.jp",
"takahama.fukui.jp",
"tsuruga.fukui.jp",
"wakasa.fukui.jp",
"ashiya.fukuoka.jp",
"buzen.fukuoka.jp",
"chikugo.fukuoka.jp",
"chikuho.fukuoka.jp",
"chikujo.fukuoka.jp",
"chikushino.fukuoka.jp",
"chikuzen.fukuoka.jp",
"chuo.fukuoka.jp",
"dazaifu.fukuoka.jp",
"fukuchi.fukuoka.jp",
"hakata.fukuoka.jp",
"higashi.fukuoka.jp",
"hirokawa.fukuoka.jp",
"hisayama.fukuoka.jp",
"iizuka.fukuoka.jp",
"inatsuki.fukuoka.jp",
"kaho.fukuoka.jp",
"kasuga.fukuoka.jp",
"kasuya.fukuoka.jp",
"kawara.fukuoka.jp",
"keisen.fukuoka.jp",
"koga.fukuoka.jp",
"kurate.fukuoka.jp",
"kurogi.fukuoka.jp",
"kurume.fukuoka.jp",
"minami.fukuoka.jp",
"miyako.fukuoka.jp",
"miyama.fukuoka.jp",
"miyawaka.fukuoka.jp",
"mizumaki.fukuoka.jp",
"munakata.fukuoka.jp",
"nakagawa.fukuoka.jp",
"nakama.fukuoka.jp",
"nishi.fukuoka.jp",
"nogata.fukuoka.jp",
"ogori.fukuoka.jp",
"okagaki.fukuoka.jp",
"okawa.fukuoka.jp",
"oki.fukuoka.jp",
"omuta.fukuoka.jp",
"onga.fukuoka.jp",
"onojo.fukuoka.jp",
"oto.fukuoka.jp",
"saigawa.fukuoka.jp",
"sasaguri.fukuoka.jp",
"shingu.fukuoka.jp",
"shinyoshitomi.fukuoka.jp",
"shonai.fukuoka.jp",
"soeda.fukuoka.jp",
"sue.fukuoka.jp",
"tachiarai.fukuoka.jp",
"tagawa.fukuoka.jp",
"takata.fukuoka.jp",
"toho.fukuoka.jp",
"toyotsu.fukuoka.jp",
"tsuiki.fukuoka.jp",
"ukiha.fukuoka.jp",
"umi.fukuoka.jp",
"usui.fukuoka.jp",
"yamada.fukuoka.jp",
"yame.fukuoka.jp",
"yanagawa.fukuoka.jp",
"yukuhashi.fukuoka.jp",
"aizubange.fukushima.jp",
"aizumisato.fukushima.jp",
"aizuwakamatsu.fukushima.jp",
"asakawa.fukushima.jp",
"bandai.fukushima.jp",
"date.fukushima.jp",
"fukushima.fukushima.jp",
"furudono.fukushima.jp",
"futaba.fukushima.jp",
"hanawa.fukushima.jp",
"higashi.fukushima.jp",
"hirata.fukushima.jp",
"hirono.fukushima.jp",
"iitate.fukushima.jp",
"inawashiro.fukushima.jp",
"ishikawa.fukushima.jp",
"iwaki.fukushima.jp",
"izumizaki.fukushima.jp",
"kagamiishi.fukushima.jp",
"kaneyama.fukushima.jp",
"kawamata.fukushima.jp",
"kitakata.fukushima.jp",
"kitashiobara.fukushima.jp",
"koori.fukushima.jp",
"koriyama.fukushima.jp",
"kunimi.fukushima.jp",
"miharu.fukushima.jp",
"mishima.fukushima.jp",
"namie.fukushima.jp",
"nango.fukushima.jp",
"nishiaizu.fukushima.jp",
"nishigo.fukushima.jp",
"okuma.fukushima.jp",
"omotego.fukushima.jp",
"ono.fukushima.jp",
"otama.fukushima.jp",
"samegawa.fukushima.jp",
"shimogo.fukushima.jp",
"shirakawa.fukushima.jp",
"showa.fukushima.jp",
"soma.fukushima.jp",
"sukagawa.fukushima.jp",
"taishin.fukushima.jp",
"tamakawa.fukushima.jp",
"tanagura.fukushima.jp",
"tenei.fukushima.jp",
"yabuki.fukushima.jp",
"yamato.fukushima.jp",
"yamatsuri.fukushima.jp",
"yanaizu.fukushima.jp",
"yugawa.fukushima.jp",
"anpachi.gifu.jp",
"ena.gifu.jp",
"gifu.gifu.jp",
"ginan.gifu.jp",
"godo.gifu.jp",
"gujo.gifu.jp",
"hashima.gifu.jp",
"hichiso.gifu.jp",
"hida.gifu.jp",
"higashishirakawa.gifu.jp",
"ibigawa.gifu.jp",
"ikeda.gifu.jp",
"kakamigahara.gifu.jp",
"kani.gifu.jp",
"kasahara.gifu.jp",
"kasamatsu.gifu.jp",
"kawaue.gifu.jp",
"kitagata.gifu.jp",
"mino.gifu.jp",
"minokamo.gifu.jp",
"mitake.gifu.jp",
"mizunami.gifu.jp",
"motosu.gifu.jp",
"nakatsugawa.gifu.jp",
"ogaki.gifu.jp",
"sakahogi.gifu.jp",
"seki.gifu.jp",
"sekigahara.gifu.jp",
"shirakawa.gifu.jp",
"tajimi.gifu.jp",
"takayama.gifu.jp",
"tarui.gifu.jp",
"toki.gifu.jp",
"tomika.gifu.jp",
"wanouchi.gifu.jp",
"yamagata.gifu.jp",
"yaotsu.gifu.jp",
"yoro.gifu.jp",
"annaka.gunma.jp",
"chiyoda.gunma.jp",
"fujioka.gunma.jp",
"higashiagatsuma.gunma.jp",
"isesaki.gunma.jp",
"itakura.gunma.jp",
"kanna.gunma.jp",
"kanra.gunma.jp",
"katashina.gunma.jp",
"kawaba.gunma.jp",
"kiryu.gunma.jp",
"kusatsu.gunma.jp",
"maebashi.gunma.jp",
"meiwa.gunma.jp",
"midori.gunma.jp",
"minakami.gunma.jp",
"naganohara.gunma.jp",
"nakanojo.gunma.jp",
"nanmoku.gunma.jp",
"numata.gunma.jp",
"oizumi.gunma.jp",
"ora.gunma.jp",
"ota.gunma.jp",
"shibukawa.gunma.jp",
"shimonita.gunma.jp",
"shinto.gunma.jp",
"showa.gunma.jp",
"takasaki.gunma.jp",
"takayama.gunma.jp",
"tamamura.gunma.jp",
"tatebayashi.gunma.jp",
"tomioka.gunma.jp",
"tsukiyono.gunma.jp",
"tsumagoi.gunma.jp",
"ueno.gunma.jp",
"yoshioka.gunma.jp",
"asaminami.hiroshima.jp",
"daiwa.hiroshima.jp",
"etajima.hiroshima.jp",
"fuchu.hiroshima.jp",
"fukuyama.hiroshima.jp",
"hatsukaichi.hiroshima.jp",
"higashihiroshima.hiroshima.jp",
"hongo.hiroshima.jp",
"jinsekikogen.hiroshima.jp",
"kaita.hiroshima.jp",
"kui.hiroshima.jp",
"kumano.hiroshima.jp",
"kure.hiroshima.jp",
"mihara.hiroshima.jp",
"miyoshi.hiroshima.jp",
"naka.hiroshima.jp",
"onomichi.hiroshima.jp",
"osakikamijima.hiroshima.jp",
"otake.hiroshima.jp",
"saka.hiroshima.jp",
"sera.hiroshima.jp",
"seranishi.hiroshima.jp",
"shinichi.hiroshima.jp",
"shobara.hiroshima.jp",
"takehara.hiroshima.jp",
"abashiri.hokkaido.jp",
"abira.hokkaido.jp",
"aibetsu.hokkaido.jp",
"akabira.hokkaido.jp",
"akkeshi.hokkaido.jp",
"asahikawa.hokkaido.jp",
"ashibetsu.hokkaido.jp",
"ashoro.hokkaido.jp",
"assabu.hokkaido.jp",
"atsuma.hokkaido.jp",
"bibai.hokkaido.jp",
"biei.hokkaido.jp",
"bifuka.hokkaido.jp",
"bihoro.hokkaido.jp",
"biratori.hokkaido.jp",
"chippubetsu.hokkaido.jp",
"chitose.hokkaido.jp",
"date.hokkaido.jp",
"ebetsu.hokkaido.jp",
"embetsu.hokkaido.jp",
"eniwa.hokkaido.jp",
"erimo.hokkaido.jp",
"esan.hokkaido.jp",
"esashi.hokkaido.jp",
"fukagawa.hokkaido.jp",
"fukushima.hokkaido.jp",
"furano.hokkaido.jp",
"furubira.hokkaido.jp",
"haboro.hokkaido.jp",
"hakodate.hokkaido.jp",
"hamatonbetsu.hokkaido.jp",
"hidaka.hokkaido.jp",
"higashikagura.hokkaido.jp",
"higashikawa.hokkaido.jp",
"hiroo.hokkaido.jp",
"hokuryu.hokkaido.jp",
"hokuto.hokkaido.jp",
"honbetsu.hokkaido.jp",
"horokanai.hokkaido.jp",
"horonobe.hokkaido.jp",
"ikeda.hokkaido.jp",
"imakane.hokkaido.jp",
"ishikari.hokkaido.jp",
"iwamizawa.hokkaido.jp",
"iwanai.hokkaido.jp",
"kamifurano.hokkaido.jp",
"kamikawa.hokkaido.jp",
"kamishihoro.hokkaido.jp",
"kamisunagawa.hokkaido.jp",
"kamoenai.hokkaido.jp",
"kayabe.hokkaido.jp",
"kembuchi.hokkaido.jp",
"kikonai.hokkaido.jp",
"kimobetsu.hokkaido.jp",
"kitahiroshima.hokkaido.jp",
"kitami.hokkaido.jp",
"kiyosato.hokkaido.jp",
"koshimizu.hokkaido.jp",
"kunneppu.hokkaido.jp",
"kuriyama.hokkaido.jp",
"kuromatsunai.hokkaido.jp",
"kushiro.hokkaido.jp",
"kutchan.hokkaido.jp",
"kyowa.hokkaido.jp",
"mashike.hokkaido.jp",
"matsumae.hokkaido.jp",
"mikasa.hokkaido.jp",
"minamifurano.hokkaido.jp",
"mombetsu.hokkaido.jp",
"moseushi.hokkaido.jp",
"mukawa.hokkaido.jp",
"muroran.hokkaido.jp",
"naie.hokkaido.jp",
"nakagawa.hokkaido.jp",
"nakasatsunai.hokkaido.jp",
"nakatombetsu.hokkaido.jp",
"nanae.hokkaido.jp",
"nanporo.hokkaido.jp",
"nayoro.hokkaido.jp",
"nemuro.hokkaido.jp",
"niikappu.hokkaido.jp",
"niki.hokkaido.jp",
"nishiokoppe.hokkaido.jp",
"noboribetsu.hokkaido.jp",
"numata.hokkaido.jp",
"obihiro.hokkaido.jp",
"obira.hokkaido.jp",
"oketo.hokkaido.jp",
"okoppe.hokkaido.jp",
"otaru.hokkaido.jp",
"otobe.hokkaido.jp",
"otofuke.hokkaido.jp",
"otoineppu.hokkaido.jp",
"oumu.hokkaido.jp",
"ozora.hokkaido.jp",
"pippu.hokkaido.jp",
"rankoshi.hokkaido.jp",
"rebun.hokkaido.jp",
"rikubetsu.hokkaido.jp",
"rishiri.hokkaido.jp",
"rishirifuji.hokkaido.jp",
"saroma.hokkaido.jp",
"sarufutsu.hokkaido.jp",
"shakotan.hokkaido.jp",
"shari.hokkaido.jp",
"shibecha.hokkaido.jp",
"shibetsu.hokkaido.jp",
"shikabe.hokkaido.jp",
"shikaoi.hokkaido.jp",
"shimamaki.hokkaido.jp",
"shimizu.hokkaido.jp",
"shimokawa.hokkaido.jp",
"shinshinotsu.hokkaido.jp",
"shintoku.hokkaido.jp",
"shiranuka.hokkaido.jp",
"shiraoi.hokkaido.jp",
"shiriuchi.hokkaido.jp",
"sobetsu.hokkaido.jp",
"sunagawa.hokkaido.jp",
"taiki.hokkaido.jp",
"takasu.hokkaido.jp",
"takikawa.hokkaido.jp",
"takinoue.hokkaido.jp",
"teshikaga.hokkaido.jp",
"tobetsu.hokkaido.jp",
"tohma.hokkaido.jp",
"tomakomai.hokkaido.jp",
"tomari.hokkaido.jp",
"toya.hokkaido.jp",
"toyako.hokkaido.jp",
"toyotomi.hokkaido.jp",
"toyoura.hokkaido.jp",
"tsubetsu.hokkaido.jp",
"tsukigata.hokkaido.jp",
"urakawa.hokkaido.jp",
"urausu.hokkaido.jp",
"uryu.hokkaido.jp",
"utashinai.hokkaido.jp",
"wakkanai.hokkaido.jp",
"wassamu.hokkaido.jp",
"yakumo.hokkaido.jp",
"yoichi.hokkaido.jp",
"aioi.hyogo.jp",
"akashi.hyogo.jp",
"ako.hyogo.jp",
"amagasaki.hyogo.jp",
"aogaki.hyogo.jp",
"asago.hyogo.jp",
"ashiya.hyogo.jp",
"awaji.hyogo.jp",
"fukusaki.hyogo.jp",
"goshiki.hyogo.jp",
"harima.hyogo.jp",
"himeji.hyogo.jp",
"ichikawa.hyogo.jp",
"inagawa.hyogo.jp",
"itami.hyogo.jp",
"kakogawa.hyogo.jp",
"kamigori.hyogo.jp",
"kamikawa.hyogo.jp",
"kasai.hyogo.jp",
"kasuga.hyogo.jp",
"kawanishi.hyogo.jp",
"miki.hyogo.jp",
"minamiawaji.hyogo.jp",
"nishinomiya.hyogo.jp",
"nishiwaki.hyogo.jp",
"ono.hyogo.jp",
"sanda.hyogo.jp",
"sannan.hyogo.jp",
"sasayama.hyogo.jp",
"sayo.hyogo.jp",
"shingu.hyogo.jp",
"shinonsen.hyogo.jp",
"shiso.hyogo.jp",
"sumoto.hyogo.jp",
"taishi.hyogo.jp",
"taka.hyogo.jp",
"takarazuka.hyogo.jp",
"takasago.hyogo.jp",
"takino.hyogo.jp",
"tamba.hyogo.jp",
"tatsuno.hyogo.jp",
"toyooka.hyogo.jp",
"yabu.hyogo.jp",
"yashiro.hyogo.jp",
"yoka.hyogo.jp",
"yokawa.hyogo.jp",
"ami.ibaraki.jp",
"asahi.ibaraki.jp",
"bando.ibaraki.jp",
"chikusei.ibaraki.jp",
"daigo.ibaraki.jp",
"fujishiro.ibaraki.jp",
"hitachi.ibaraki.jp",
"hitachinaka.ibaraki.jp",
"hitachiomiya.ibaraki.jp",
"hitachiota.ibaraki.jp",
"ibaraki.ibaraki.jp",
"ina.ibaraki.jp",
"inashiki.ibaraki.jp",
"itako.ibaraki.jp",
"iwama.ibaraki.jp",
"joso.ibaraki.jp",
"kamisu.ibaraki.jp",
"kasama.ibaraki.jp",
"kashima.ibaraki.jp",
"kasumigaura.ibaraki.jp",
"koga.ibaraki.jp",
"miho.ibaraki.jp",
"mito.ibaraki.jp",
"moriya.ibaraki.jp",
"naka.ibaraki.jp",
"namegata.ibaraki.jp",
"oarai.ibaraki.jp",
"ogawa.ibaraki.jp",
"omitama.ibaraki.jp",
"ryugasaki.ibaraki.jp",
"sakai.ibaraki.jp",
"sakuragawa.ibaraki.jp",
"shimodate.ibaraki.jp",
"shimotsuma.ibaraki.jp",
"shirosato.ibaraki.jp",
"sowa.ibaraki.jp",
"suifu.ibaraki.jp",
"takahagi.ibaraki.jp",
"tamatsukuri.ibaraki.jp",
"tokai.ibaraki.jp",
"tomobe.ibaraki.jp",
"tone.ibaraki.jp",
"toride.ibaraki.jp",
"tsuchiura.ibaraki.jp",
"tsukuba.ibaraki.jp",
"uchihara.ibaraki.jp",
"ushiku.ibaraki.jp",
"yachiyo.ibaraki.jp",
"yamagata.ibaraki.jp",
"yawara.ibaraki.jp",
"yuki.ibaraki.jp",
"anamizu.ishikawa.jp",
"hakui.ishikawa.jp",
"hakusan.ishikawa.jp",
"kaga.ishikawa.jp",
"kahoku.ishikawa.jp",
"kanazawa.ishikawa.jp",
"kawakita.ishikawa.jp",
"komatsu.ishikawa.jp",
"nakanoto.ishikawa.jp",
"nanao.ishikawa.jp",
"nomi.ishikawa.jp",
"nonoichi.ishikawa.jp",
"noto.ishikawa.jp",
"shika.ishikawa.jp",
"suzu.ishikawa.jp",
"tsubata.ishikawa.jp",
"tsurugi.ishikawa.jp",
"uchinada.ishikawa.jp",
"wajima.ishikawa.jp",
"fudai.iwate.jp",
"fujisawa.iwate.jp",
"hanamaki.iwate.jp",
"hiraizumi.iwate.jp",
"hirono.iwate.jp",
"ichinohe.iwate.jp",
"ichinoseki.iwate.jp",
"iwaizumi.iwate.jp",
"iwate.iwate.jp",
"joboji.iwate.jp",
"kamaishi.iwate.jp",
"kanegasaki.iwate.jp",
"karumai.iwate.jp",
"kawai.iwate.jp",
"kitakami.iwate.jp",
"kuji.iwate.jp",
"kunohe.iwate.jp",
"kuzumaki.iwate.jp",
"miyako.iwate.jp",
"mizusawa.iwate.jp",
"morioka.iwate.jp",
"ninohe.iwate.jp",
"noda.iwate.jp",
"ofunato.iwate.jp",
"oshu.iwate.jp",
"otsuchi.iwate.jp",
"rikuzentakata.iwate.jp",
"shiwa.iwate.jp",
"shizukuishi.iwate.jp",
"sumita.iwate.jp",
"tanohata.iwate.jp",
"tono.iwate.jp",
"yahaba.iwate.jp",
"yamada.iwate.jp",
"ayagawa.kagawa.jp",
"higashikagawa.kagawa.jp",
"kanonji.kagawa.jp",
"kotohira.kagawa.jp",
"manno.kagawa.jp",
"marugame.kagawa.jp",
"mitoyo.kagawa.jp",
"naoshima.kagawa.jp",
"sanuki.kagawa.jp",
"tadotsu.kagawa.jp",
"takamatsu.kagawa.jp",
"tonosho.kagawa.jp",
"uchinomi.kagawa.jp",
"utazu.kagawa.jp",
"zentsuji.kagawa.jp",
"akune.kagoshima.jp",
"amami.kagoshima.jp",
"hioki.kagoshima.jp",
"isa.kagoshima.jp",
"isen.kagoshima.jp",
"izumi.kagoshima.jp",
"kagoshima.kagoshima.jp",
"kanoya.kagoshima.jp",
"kawanabe.kagoshima.jp",
"kinko.kagoshima.jp",
"kouyama.kagoshima.jp",
"makurazaki.kagoshima.jp",
"matsumoto.kagoshima.jp",
"minamitane.kagoshima.jp",
"nakatane.kagoshima.jp",
"nishinoomote.kagoshima.jp",
"satsumasendai.kagoshima.jp",
"soo.kagoshima.jp",
"tarumizu.kagoshima.jp",
"yusui.kagoshima.jp",
"aikawa.kanagawa.jp",
"atsugi.kanagawa.jp",
"ayase.kanagawa.jp",
"chigasaki.kanagawa.jp",
"ebina.kanagawa.jp",
"fujisawa.kanagawa.jp",
"hadano.kanagawa.jp",
"hakone.kanagawa.jp",
"hiratsuka.kanagawa.jp",
"isehara.kanagawa.jp",
"kaisei.kanagawa.jp",
"kamakura.kanagawa.jp",
"kiyokawa.kanagawa.jp",
"matsuda.kanagawa.jp",
"minamiashigara.kanagawa.jp",
"miura.kanagawa.jp",
"nakai.kanagawa.jp",
"ninomiya.kanagawa.jp",
"odawara.kanagawa.jp",
"oi.kanagawa.jp",
"oiso.kanagawa.jp",
"sagamihara.kanagawa.jp",
"samukawa.kanagawa.jp",
"tsukui.kanagawa.jp",
"yamakita.kanagawa.jp",
"yamato.kanagawa.jp",
"yokosuka.kanagawa.jp",
"yugawara.kanagawa.jp",
"zama.kanagawa.jp",
"zushi.kanagawa.jp",
"aki.kochi.jp",
"geisei.kochi.jp",
"hidaka.kochi.jp",
"higashitsuno.kochi.jp",
"ino.kochi.jp",
"kagami.kochi.jp",
"kami.kochi.jp",
"kitagawa.kochi.jp",
"kochi.kochi.jp",
"mihara.kochi.jp",
"motoyama.kochi.jp",
"muroto.kochi.jp",
"nahari.kochi.jp",
"nakamura.kochi.jp",
"nankoku.kochi.jp",
"nishitosa.kochi.jp",
"niyodogawa.kochi.jp",
"ochi.kochi.jp",
"okawa.kochi.jp",
"otoyo.kochi.jp",
"otsuki.kochi.jp",
"sakawa.kochi.jp",
"sukumo.kochi.jp",
"susaki.kochi.jp",
"tosa.kochi.jp",
"tosashimizu.kochi.jp",
"toyo.kochi.jp",
"tsuno.kochi.jp",
"umaji.kochi.jp",
"yasuda.kochi.jp",
"yusuhara.kochi.jp",
"amakusa.kumamoto.jp",
"arao.kumamoto.jp",
"aso.kumamoto.jp",
"choyo.kumamoto.jp",
"gyokuto.kumamoto.jp",
"kamiamakusa.kumamoto.jp",
"kikuchi.kumamoto.jp",
"kumamoto.kumamoto.jp",
"mashiki.kumamoto.jp",
"mifune.kumamoto.jp",
"minamata.kumamoto.jp",
"minamioguni.kumamoto.jp",
"nagasu.kumamoto.jp",
"nishihara.kumamoto.jp",
"oguni.kumamoto.jp",
"ozu.kumamoto.jp",
"sumoto.kumamoto.jp",
"takamori.kumamoto.jp",
"uki.kumamoto.jp",
"uto.kumamoto.jp",
"yamaga.kumamoto.jp",
"yamato.kumamoto.jp",
"yatsushiro.kumamoto.jp",
"ayabe.kyoto.jp",
"fukuchiyama.kyoto.jp",
"higashiyama.kyoto.jp",
"ide.kyoto.jp",
"ine.kyoto.jp",
"joyo.kyoto.jp",
"kameoka.kyoto.jp",
"kamo.kyoto.jp",
"kita.kyoto.jp",
"kizu.kyoto.jp",
"kumiyama.kyoto.jp",
"kyotamba.kyoto.jp",
"kyotanabe.kyoto.jp",
"kyotango.kyoto.jp",
"maizuru.kyoto.jp",
"minami.kyoto.jp",
"minamiyamashiro.kyoto.jp",
"miyazu.kyoto.jp",
"muko.kyoto.jp",
"nagaokakyo.kyoto.jp",
"nakagyo.kyoto.jp",
"nantan.kyoto.jp",
"oyamazaki.kyoto.jp",
"sakyo.kyoto.jp",
"seika.kyoto.jp",
"tanabe.kyoto.jp",
"uji.kyoto.jp",
"ujitawara.kyoto.jp",
"wazuka.kyoto.jp",
"yamashina.kyoto.jp",
"yawata.kyoto.jp",
"asahi.mie.jp",
"inabe.mie.jp",
"ise.mie.jp",
"kameyama.mie.jp",
"kawagoe.mie.jp",
"kiho.mie.jp",
"kisosaki.mie.jp",
"kiwa.mie.jp",
"komono.mie.jp",
"kumano.mie.jp",
"kuwana.mie.jp",
"matsusaka.mie.jp",
"meiwa.mie.jp",
"mihama.mie.jp",
"minamiise.mie.jp",
"misugi.mie.jp",
"miyama.mie.jp",
"nabari.mie.jp",
"shima.mie.jp",
"suzuka.mie.jp",
"tado.mie.jp",
"taiki.mie.jp",
"taki.mie.jp",
"tamaki.mie.jp",
"toba.mie.jp",
"tsu.mie.jp",
"udono.mie.jp",
"ureshino.mie.jp",
"watarai.mie.jp",
"yokkaichi.mie.jp",
"furukawa.miyagi.jp",
"higashimatsushima.miyagi.jp",
"ishinomaki.miyagi.jp",
"iwanuma.miyagi.jp",
"kakuda.miyagi.jp",
"kami.miyagi.jp",
"kawasaki.miyagi.jp",
"marumori.miyagi.jp",
"matsushima.miyagi.jp",
"minamisanriku.miyagi.jp",
"misato.miyagi.jp",
"murata.miyagi.jp",
"natori.miyagi.jp",
"ogawara.miyagi.jp",
"ohira.miyagi.jp",
"onagawa.miyagi.jp",
"osaki.miyagi.jp",
"rifu.miyagi.jp",
"semine.miyagi.jp",
"shibata.miyagi.jp",
"shichikashuku.miyagi.jp",
"shikama.miyagi.jp",
"shiogama.miyagi.jp",
"shiroishi.miyagi.jp",
"tagajo.miyagi.jp",
"taiwa.miyagi.jp",
"tome.miyagi.jp",
"tomiya.miyagi.jp",
"wakuya.miyagi.jp",
"watari.miyagi.jp",
"yamamoto.miyagi.jp",
"zao.miyagi.jp",
"aya.miyazaki.jp",
"ebino.miyazaki.jp",
"gokase.miyazaki.jp",
"hyuga.miyazaki.jp",
"kadogawa.miyazaki.jp",
"kawaminami.miyazaki.jp",
"kijo.miyazaki.jp",
"kitagawa.miyazaki.jp",
"kitakata.miyazaki.jp",
"kitaura.miyazaki.jp",
"kobayashi.miyazaki.jp",
"kunitomi.miyazaki.jp",
"kushima.miyazaki.jp",
"mimata.miyazaki.jp",
"miyakonojo.miyazaki.jp",
"miyazaki.miyazaki.jp",
"morotsuka.miyazaki.jp",
"nichinan.miyazaki.jp",
"nishimera.miyazaki.jp",
"nobeoka.miyazaki.jp",
"saito.miyazaki.jp",
"shiiba.miyazaki.jp",
"shintomi.miyazaki.jp",
"takaharu.miyazaki.jp",
"takanabe.miyazaki.jp",
"takazaki.miyazaki.jp",
"tsuno.miyazaki.jp",
"achi.nagano.jp",
"agematsu.nagano.jp",
"anan.nagano.jp",
"aoki.nagano.jp",
"asahi.nagano.jp",
"azumino.nagano.jp",
"chikuhoku.nagano.jp",
"chikuma.nagano.jp",
"chino.nagano.jp",
"fujimi.nagano.jp",
"hakuba.nagano.jp",
"hara.nagano.jp",
"hiraya.nagano.jp",
"iida.nagano.jp",
"iijima.nagano.jp",
"iiyama.nagano.jp",
"iizuna.nagano.jp",
"ikeda.nagano.jp",
"ikusaka.nagano.jp",
"ina.nagano.jp",
"karuizawa.nagano.jp",
"kawakami.nagano.jp",
"kiso.nagano.jp",
"kisofukushima.nagano.jp",
"kitaaiki.nagano.jp",
"komagane.nagano.jp",
"komoro.nagano.jp",
"matsukawa.nagano.jp",
"matsumoto.nagano.jp",
"miasa.nagano.jp",
"minamiaiki.nagano.jp",
"minamimaki.nagano.jp",
"minamiminowa.nagano.jp",
"minowa.nagano.jp",
"miyada.nagano.jp",
"miyota.nagano.jp",
"mochizuki.nagano.jp",
"nagano.nagano.jp",
"nagawa.nagano.jp",
"nagiso.nagano.jp",
"nakagawa.nagano.jp",
"nakano.nagano.jp",
"nozawaonsen.nagano.jp",
"obuse.nagano.jp",
"ogawa.nagano.jp",
"okaya.nagano.jp",
"omachi.nagano.jp",
"omi.nagano.jp",
"ookuwa.nagano.jp",
"ooshika.nagano.jp",
"otaki.nagano.jp",
"otari.nagano.jp",
"sakae.nagano.jp",
"sakaki.nagano.jp",
"saku.nagano.jp",
"sakuho.nagano.jp",
"shimosuwa.nagano.jp",
"shinanomachi.nagano.jp",
"shiojiri.nagano.jp",
"suwa.nagano.jp",
"suzaka.nagano.jp",
"takagi.nagano.jp",
"takamori.nagano.jp",
"takayama.nagano.jp",
"tateshina.nagano.jp",
"tatsuno.nagano.jp",
"togakushi.nagano.jp",
"togura.nagano.jp",
"tomi.nagano.jp",
"ueda.nagano.jp",
"wada.nagano.jp",
"yamagata.nagano.jp",
"yamanouchi.nagano.jp",
"yasaka.nagano.jp",
"yasuoka.nagano.jp",
"chijiwa.nagasaki.jp",
"futsu.nagasaki.jp",
"goto.nagasaki.jp",
"hasami.nagasaki.jp",
"hirado.nagasaki.jp",
"iki.nagasaki.jp",
"isahaya.nagasaki.jp",
"kawatana.nagasaki.jp",
"kuchinotsu.nagasaki.jp",
"matsuura.nagasaki.jp",
"nagasaki.nagasaki.jp",
"obama.nagasaki.jp",
"omura.nagasaki.jp",
"oseto.nagasaki.jp",
"saikai.nagasaki.jp",
"sasebo.nagasaki.jp",
"seihi.nagasaki.jp",
"shimabara.nagasaki.jp",
"shinkamigoto.nagasaki.jp",
"togitsu.nagasaki.jp",
"tsushima.nagasaki.jp",
"unzen.nagasaki.jp",
"ando.nara.jp",
"gose.nara.jp",
"heguri.nara.jp",
"higashiyoshino.nara.jp",
"ikaruga.nara.jp",
"ikoma.nara.jp",
"kamikitayama.nara.jp",
"kanmaki.nara.jp",
"kashiba.nara.jp",
"kashihara.nara.jp",
"katsuragi.nara.jp",
"kawai.nara.jp",
"kawakami.nara.jp",
"kawanishi.nara.jp",
"koryo.nara.jp",
"kurotaki.nara.jp",
"mitsue.nara.jp",
"miyake.nara.jp",
"nara.nara.jp",
"nosegawa.nara.jp",
"oji.nara.jp",
"ouda.nara.jp",
"oyodo.nara.jp",
"sakurai.nara.jp",
"sango.nara.jp",
"shimoichi.nara.jp",
"shimokitayama.nara.jp",
"shinjo.nara.jp",
"soni.nara.jp",
"takatori.nara.jp",
"tawaramoto.nara.jp",
"tenkawa.nara.jp",
"tenri.nara.jp",
"uda.nara.jp",
"yamatokoriyama.nara.jp",
"yamatotakada.nara.jp",
"yamazoe.nara.jp",
"yoshino.nara.jp",
"aga.niigata.jp",
"agano.niigata.jp",
"gosen.niigata.jp",
"itoigawa.niigata.jp",
"izumozaki.niigata.jp",
"joetsu.niigata.jp",
"kamo.niigata.jp",
"kariwa.niigata.jp",
"kashiwazaki.niigata.jp",
"minamiuonuma.niigata.jp",
"mitsuke.niigata.jp",
"muika.niigata.jp",
"murakami.niigata.jp",
"myoko.niigata.jp",
"nagaoka.niigata.jp",
"niigata.niigata.jp",
"ojiya.niigata.jp",
"omi.niigata.jp",
"sado.niigata.jp",
"sanjo.niigata.jp",
"seiro.niigata.jp",
"seirou.niigata.jp",
"sekikawa.niigata.jp",
"shibata.niigata.jp",
"tagami.niigata.jp",
"tainai.niigata.jp",
"tochio.niigata.jp",
"tokamachi.niigata.jp",
"tsubame.niigata.jp",
"tsunan.niigata.jp",
"uonuma.niigata.jp",
"yahiko.niigata.jp",
"yoita.niigata.jp",
"yuzawa.niigata.jp",
"beppu.oita.jp",
"bungoono.oita.jp",
"bungotakada.oita.jp",
"hasama.oita.jp",
"hiji.oita.jp",
"himeshima.oita.jp",
"hita.oita.jp",
"kamitsue.oita.jp",
"kokonoe.oita.jp",
"kuju.oita.jp",
"kunisaki.oita.jp",
"kusu.oita.jp",
"oita.oita.jp",
"saiki.oita.jp",
"taketa.oita.jp",
"tsukumi.oita.jp",
"usa.oita.jp",
"usuki.oita.jp",
"yufu.oita.jp",
"akaiwa.okayama.jp",
"asakuchi.okayama.jp",
"bizen.okayama.jp",
"hayashima.okayama.jp",
"ibara.okayama.jp",
"kagamino.okayama.jp",
"kasaoka.okayama.jp",
"kibichuo.okayama.jp",
"kumenan.okayama.jp",
"kurashiki.okayama.jp",
"maniwa.okayama.jp",
"misaki.okayama.jp",
"nagi.okayama.jp",
"niimi.okayama.jp",
"nishiawakura.okayama.jp",
"okayama.okayama.jp",
"satosho.okayama.jp",
"setouchi.okayama.jp",
"shinjo.okayama.jp",
"shoo.okayama.jp",
"soja.okayama.jp",
"takahashi.okayama.jp",
"tamano.okayama.jp",
"tsuyama.okayama.jp",
"wake.okayama.jp",
"yakage.okayama.jp",
"aguni.okinawa.jp",
"ginowan.okinawa.jp",
"ginoza.okinawa.jp",
"gushikami.okinawa.jp",
"haebaru.okinawa.jp",
"higashi.okinawa.jp",
"hirara.okinawa.jp",
"iheya.okinawa.jp",
"ishigaki.okinawa.jp",
"ishikawa.okinawa.jp",
"itoman.okinawa.jp",
"izena.okinawa.jp",
"kadena.okinawa.jp",
"kin.okinawa.jp",
"kitadaito.okinawa.jp",
"kitanakagusuku.okinawa.jp",
"kumejima.okinawa.jp",
"kunigami.okinawa.jp",
"minamidaito.okinawa.jp",
"motobu.okinawa.jp",
"nago.okinawa.jp",
"naha.okinawa.jp",
"nakagusuku.okinawa.jp",
"nakijin.okinawa.jp",
"nanjo.okinawa.jp",
"nishihara.okinawa.jp",
"ogimi.okinawa.jp",
"okinawa.okinawa.jp",
"onna.okinawa.jp",
"shimoji.okinawa.jp",
"taketomi.okinawa.jp",
"tarama.okinawa.jp",
"tokashiki.okinawa.jp",
"tomigusuku.okinawa.jp",
"tonaki.okinawa.jp",
"urasoe.okinawa.jp",
"uruma.okinawa.jp",
"yaese.okinawa.jp",
"yomitan.okinawa.jp",
"yonabaru.okinawa.jp",
"yonaguni.okinawa.jp",
"zamami.okinawa.jp",
"abeno.osaka.jp",
"chihayaakasaka.osaka.jp",
"chuo.osaka.jp",
"daito.osaka.jp",
"fujiidera.osaka.jp",
"habikino.osaka.jp",
"hannan.osaka.jp",
"higashiosaka.osaka.jp",
"higashisumiyoshi.osaka.jp",
"higashiyodogawa.osaka.jp",
"hirakata.osaka.jp",
"ibaraki.osaka.jp",
"ikeda.osaka.jp",
"izumi.osaka.jp",
"izumiotsu.osaka.jp",
"izumisano.osaka.jp",
"kadoma.osaka.jp",
"kaizuka.osaka.jp",
"kanan.osaka.jp",
"kashiwara.osaka.jp",
"katano.osaka.jp",
"kawachinagano.osaka.jp",
"kishiwada.osaka.jp",
"kita.osaka.jp",
"kumatori.osaka.jp",
"matsubara.osaka.jp",
"minato.osaka.jp",
"minoh.osaka.jp",
"misaki.osaka.jp",
"moriguchi.osaka.jp",
"neyagawa.osaka.jp",
"nishi.osaka.jp",
"nose.osaka.jp",
"osakasayama.osaka.jp",
"sakai.osaka.jp",
"sayama.osaka.jp",
"sennan.osaka.jp",
"settsu.osaka.jp",
"shijonawate.osaka.jp",
"shimamoto.osaka.jp",
"suita.osaka.jp",
"tadaoka.osaka.jp",
"taishi.osaka.jp",
"tajiri.osaka.jp",
"takaishi.osaka.jp",
"takatsuki.osaka.jp",
"tondabayashi.osaka.jp",
"toyonaka.osaka.jp",
"toyono.osaka.jp",
"yao.osaka.jp",
"ariake.saga.jp",
"arita.saga.jp",
"fukudomi.saga.jp",
"genkai.saga.jp",
"hamatama.saga.jp",
"hizen.saga.jp",
"imari.saga.jp",
"kamimine.saga.jp",
"kanzaki.saga.jp",
"karatsu.saga.jp",
"kashima.saga.jp",
"kitagata.saga.jp",
"kitahata.saga.jp",
"kiyama.saga.jp",
"kouhoku.saga.jp",
"kyuragi.saga.jp",
"nishiarita.saga.jp",
"ogi.saga.jp",
"omachi.saga.jp",
"ouchi.saga.jp",
"saga.saga.jp",
"shiroishi.saga.jp",
"taku.saga.jp",
"tara.saga.jp",
"tosu.saga.jp",
"yoshinogari.saga.jp",
"arakawa.saitama.jp",
"asaka.saitama.jp",
"chichibu.saitama.jp",
"fujimi.saitama.jp",
"fujimino.saitama.jp",
"fukaya.saitama.jp",
"hanno.saitama.jp",
"hanyu.saitama.jp",
"hasuda.saitama.jp",
"hatogaya.saitama.jp",
"hatoyama.saitama.jp",
"hidaka.saitama.jp",
"higashichichibu.saitama.jp",
"higashimatsuyama.saitama.jp",
"honjo.saitama.jp",
"ina.saitama.jp",
"iruma.saitama.jp",
"iwatsuki.saitama.jp",
"kamiizumi.saitama.jp",
"kamikawa.saitama.jp",
"kamisato.saitama.jp",
"kasukabe.saitama.jp",
"kawagoe.saitama.jp",
"kawaguchi.saitama.jp",
"kawajima.saitama.jp",
"kazo.saitama.jp",
"kitamoto.saitama.jp",
"koshigaya.saitama.jp",
"kounosu.saitama.jp",
"kuki.saitama.jp",
"kumagaya.saitama.jp",
"matsubushi.saitama.jp",
"minano.saitama.jp",
"misato.saitama.jp",
"miyashiro.saitama.jp",
"miyoshi.saitama.jp",
"moroyama.saitama.jp",
"nagatoro.saitama.jp",
"namegawa.saitama.jp",
"niiza.saitama.jp",
"ogano.saitama.jp",
"ogawa.saitama.jp",
"ogose.saitama.jp",
"okegawa.saitama.jp",
"omiya.saitama.jp",
"otaki.saitama.jp",
"ranzan.saitama.jp",
"ryokami.saitama.jp",
"saitama.saitama.jp",
"sakado.saitama.jp",
"satte.saitama.jp",
"sayama.saitama.jp",
"shiki.saitama.jp",
"shiraoka.saitama.jp",
"soka.saitama.jp",
"sugito.saitama.jp",
"toda.saitama.jp",
"tokigawa.saitama.jp",
"tokorozawa.saitama.jp",
"tsurugashima.saitama.jp",
"urawa.saitama.jp",
"warabi.saitama.jp",
"yashio.saitama.jp",
"yokoze.saitama.jp",
"yono.saitama.jp",
"yorii.saitama.jp",
"yoshida.saitama.jp",
"yoshikawa.saitama.jp",
"yoshimi.saitama.jp",
"aisho.shiga.jp",
"gamo.shiga.jp",
"higashiomi.shiga.jp",
"hikone.shiga.jp",
"koka.shiga.jp",
"konan.shiga.jp",
"kosei.shiga.jp",
"koto.shiga.jp",
"kusatsu.shiga.jp",
"maibara.shiga.jp",
"moriyama.shiga.jp",
"nagahama.shiga.jp",
"nishiazai.shiga.jp",
"notogawa.shiga.jp",
"omihachiman.shiga.jp",
"otsu.shiga.jp",
"ritto.shiga.jp",
"ryuoh.shiga.jp",
"takashima.shiga.jp",
"takatsuki.shiga.jp",
"torahime.shiga.jp",
"toyosato.shiga.jp",
"yasu.shiga.jp",
"akagi.shimane.jp",
"ama.shimane.jp",
"gotsu.shimane.jp",
"hamada.shimane.jp",
"higashiizumo.shimane.jp",
"hikawa.shimane.jp",
"hikimi.shimane.jp",
"izumo.shimane.jp",
"kakinoki.shimane.jp",
"masuda.shimane.jp",
"matsue.shimane.jp",
"misato.shimane.jp",
"nishinoshima.shimane.jp",
"ohda.shimane.jp",
"okinoshima.shimane.jp",
"okuizumo.shimane.jp",
"shimane.shimane.jp",
"tamayu.shimane.jp",
"tsuwano.shimane.jp",
"unnan.shimane.jp",
"yakumo.shimane.jp",
"yasugi.shimane.jp",
"yatsuka.shimane.jp",
"arai.shizuoka.jp",
"atami.shizuoka.jp",
"fuji.shizuoka.jp",
"fujieda.shizuoka.jp",
"fujikawa.shizuoka.jp",
"fujinomiya.shizuoka.jp",
"fukuroi.shizuoka.jp",
"gotemba.shizuoka.jp",
"haibara.shizuoka.jp",
"hamamatsu.shizuoka.jp",
"higashiizu.shizuoka.jp",
"ito.shizuoka.jp",
"iwata.shizuoka.jp",
"izu.shizuoka.jp",
"izunokuni.shizuoka.jp",
"kakegawa.shizuoka.jp",
"kannami.shizuoka.jp",
"kawanehon.shizuoka.jp",
"kawazu.shizuoka.jp",
"kikugawa.shizuoka.jp",
"kosai.shizuoka.jp",
"makinohara.shizuoka.jp",
"matsuzaki.shizuoka.jp",
"minamiizu.shizuoka.jp",
"mishima.shizuoka.jp",
"morimachi.shizuoka.jp",
"nishiizu.shizuoka.jp",
"numazu.shizuoka.jp",
"omaezaki.shizuoka.jp",
"shimada.shizuoka.jp",
"shimizu.shizuoka.jp",
"shimoda.shizuoka.jp",
"shizuoka.shizuoka.jp",
"susono.shizuoka.jp",
"yaizu.shizuoka.jp",
"yoshida.shizuoka.jp",
"ashikaga.tochigi.jp",
"bato.tochigi.jp",
"haga.tochigi.jp",
"ichikai.tochigi.jp",
"iwafune.tochigi.jp",
"kaminokawa.tochigi.jp",
"kanuma.tochigi.jp",
"karasuyama.tochigi.jp",
"kuroiso.tochigi.jp",
"mashiko.tochigi.jp",
"mibu.tochigi.jp",
"moka.tochigi.jp",
"motegi.tochigi.jp",
"nasu.tochigi.jp",
"nasushiobara.tochigi.jp",
"nikko.tochigi.jp",
"nishikata.tochigi.jp",
"nogi.tochigi.jp",
"ohira.tochigi.jp",
"ohtawara.tochigi.jp",
"oyama.tochigi.jp",
"sakura.tochigi.jp",
"sano.tochigi.jp",
"shimotsuke.tochigi.jp",
"shioya.tochigi.jp",
"takanezawa.tochigi.jp",
"tochigi.tochigi.jp",
"tsuga.tochigi.jp",
"ujiie.tochigi.jp",
"utsunomiya.tochigi.jp",
"yaita.tochigi.jp",
"aizumi.tokushima.jp",
"anan.tokushima.jp",
"ichiba.tokushima.jp",
"itano.tokushima.jp",
"kainan.tokushima.jp",
"komatsushima.tokushima.jp",
"matsushige.tokushima.jp",
"mima.tokushima.jp",
"minami.tokushima.jp",
"miyoshi.tokushima.jp",
"mugi.tokushima.jp",
"nakagawa.tokushima.jp",
"naruto.tokushima.jp",
"sanagochi.tokushima.jp",
"shishikui.tokushima.jp",
"tokushima.tokushima.jp",
"wajiki.tokushima.jp",
"adachi.tokyo.jp",
"akiruno.tokyo.jp",
"akishima.tokyo.jp",
"aogashima.tokyo.jp",
"arakawa.tokyo.jp",
"bunkyo.tokyo.jp",
"chiyoda.tokyo.jp",
"chofu.tokyo.jp",
"chuo.tokyo.jp",
"edogawa.tokyo.jp",
"fuchu.tokyo.jp",
"fussa.tokyo.jp",
"hachijo.tokyo.jp",
"hachioji.tokyo.jp",
"hamura.tokyo.jp",
"higashikurume.tokyo.jp",
"higashimurayama.tokyo.jp",
"higashiyamato.tokyo.jp",
"hino.tokyo.jp",
"hinode.tokyo.jp",
"hinohara.tokyo.jp",
"inagi.tokyo.jp",
"itabashi.tokyo.jp",
"katsushika.tokyo.jp",
"kita.tokyo.jp",
"kiyose.tokyo.jp",
"kodaira.tokyo.jp",
"koganei.tokyo.jp",
"kokubunji.tokyo.jp",
"komae.tokyo.jp",
"koto.tokyo.jp",
"kouzushima.tokyo.jp",
"kunitachi.tokyo.jp",
"machida.tokyo.jp",
"meguro.tokyo.jp",
"minato.tokyo.jp",
"mitaka.tokyo.jp",
"mizuho.tokyo.jp",
"musashimurayama.tokyo.jp",
"musashino.tokyo.jp",
"nakano.tokyo.jp",
"nerima.tokyo.jp",
"ogasawara.tokyo.jp",
"okutama.tokyo.jp",
"ome.tokyo.jp",
"oshima.tokyo.jp",
"ota.tokyo.jp",
"setagaya.tokyo.jp",
"shibuya.tokyo.jp",
"shinagawa.tokyo.jp",
"shinjuku.tokyo.jp",
"suginami.tokyo.jp",
"sumida.tokyo.jp",
"tachikawa.tokyo.jp",
"taito.tokyo.jp",
"tama.tokyo.jp",
"toshima.tokyo.jp",
"chizu.tottori.jp",
"hino.tottori.jp",
"kawahara.tottori.jp",
"koge.tottori.jp",
"kotoura.tottori.jp",
"misasa.tottori.jp",
"nanbu.tottori.jp",
"nichinan.tottori.jp",
"sakaiminato.tottori.jp",
"tottori.tottori.jp",
"wakasa.tottori.jp",
"yazu.tottori.jp",
"yonago.tottori.jp",
"asahi.toyama.jp",
"fuchu.toyama.jp",
"fukumitsu.toyama.jp",
"funahashi.toyama.jp",
"himi.toyama.jp",
"imizu.toyama.jp",
"inami.toyama.jp",
"johana.toyama.jp",
"kamiichi.toyama.jp",
"kurobe.toyama.jp",
"nakaniikawa.toyama.jp",
"namerikawa.toyama.jp",
"nanto.toyama.jp",
"nyuzen.toyama.jp",
"oyabe.toyama.jp",
"taira.toyama.jp",
"takaoka.toyama.jp",
"tateyama.toyama.jp",
"toga.toyama.jp",
"tonami.toyama.jp",
"toyama.toyama.jp",
"unazuki.toyama.jp",
"uozu.toyama.jp",
"yamada.toyama.jp",
"arida.wakayama.jp",
"aridagawa.wakayama.jp",
"gobo.wakayama.jp",
"hashimoto.wakayama.jp",
"hidaka.wakayama.jp",
"hirogawa.wakayama.jp",
"inami.wakayama.jp",
"iwade.wakayama.jp",
"kainan.wakayama.jp",
"kamitonda.wakayama.jp",
"katsuragi.wakayama.jp",
"kimino.wakayama.jp",
"kinokawa.wakayama.jp",
"kitayama.wakayama.jp",
"koya.wakayama.jp",
"koza.wakayama.jp",
"kozagawa.wakayama.jp",
"kudoyama.wakayama.jp",
"kushimoto.wakayama.jp",
"mihama.wakayama.jp",
"misato.wakayama.jp",
"nachikatsuura.wakayama.jp",
"shingu.wakayama.jp",
"shirahama.wakayama.jp",
"taiji.wakayama.jp",
"tanabe.wakayama.jp",
"wakayama.wakayama.jp",
"yuasa.wakayama.jp",
"yura.wakayama.jp",
"asahi.yamagata.jp",
"funagata.yamagata.jp",
"higashine.yamagata.jp",
"iide.yamagata.jp",
"kahoku.yamagata.jp",
"kaminoyama.yamagata.jp",
"kaneyama.yamagata.jp",
"kawanishi.yamagata.jp",
"mamurogawa.yamagata.jp",
"mikawa.yamagata.jp",
"murayama.yamagata.jp",
"nagai.yamagata.jp",
"nakayama.yamagata.jp",
"nanyo.yamagata.jp",
"nishikawa.yamagata.jp",
"obanazawa.yamagata.jp",
"oe.yamagata.jp",
"oguni.yamagata.jp",
"ohkura.yamagata.jp",
"oishida.yamagata.jp",
"sagae.yamagata.jp",
"sakata.yamagata.jp",
"sakegawa.yamagata.jp",
"shinjo.yamagata.jp",
"shirataka.yamagata.jp",
"shonai.yamagata.jp",
"takahata.yamagata.jp",
"tendo.yamagata.jp",
"tozawa.yamagata.jp",
"tsuruoka.yamagata.jp",
"yamagata.yamagata.jp",
"yamanobe.yamagata.jp",
"yonezawa.yamagata.jp",
"yuza.yamagata.jp",
"abu.yamaguchi.jp",
"hagi.yamaguchi.jp",
"hikari.yamaguchi.jp",
"hofu.yamaguchi.jp",
"iwakuni.yamaguchi.jp",
"kudamatsu.yamaguchi.jp",
"mitou.yamaguchi.jp",
"nagato.yamaguchi.jp",
"oshima.yamaguchi.jp",
"shimonoseki.yamaguchi.jp",
"shunan.yamaguchi.jp",
"tabuse.yamaguchi.jp",
"tokuyama.yamaguchi.jp",
"toyota.yamaguchi.jp",
"ube.yamaguchi.jp",
"yuu.yamaguchi.jp",
"chuo.yamanashi.jp",
"doshi.yamanashi.jp",
"fuefuki.yamanashi.jp",
"fujikawa.yamanashi.jp",
"fujikawaguchiko.yamanashi.jp",
"fujiyoshida.yamanashi.jp",
"hayakawa.yamanashi.jp",
"hokuto.yamanashi.jp",
"ichikawamisato.yamanashi.jp",
"kai.yamanashi.jp",
"kofu.yamanashi.jp",
"koshu.yamanashi.jp",
"kosuge.yamanashi.jp",
"minami-alps.yamanashi.jp",
"minobu.yamanashi.jp",
"nakamichi.yamanashi.jp",
"nanbu.yamanashi.jp",
"narusawa.yamanashi.jp",
"nirasaki.yamanashi.jp",
"nishikatsura.yamanashi.jp",
"oshino.yamanashi.jp",
"otsuki.yamanashi.jp",
"showa.yamanashi.jp",
"tabayama.yamanashi.jp",
"tsuru.yamanashi.jp",
"uenohara.yamanashi.jp",
"yamanakako.yamanashi.jp",
"yamanashi.yamanashi.jp",
"ke",
"ac.ke",
"co.ke",
"go.ke",
"info.ke",
"me.ke",
"mobi.ke",
"ne.ke",
"or.ke",
"sc.ke",
"kg",
"org.kg",
"net.kg",
"com.kg",
"edu.kg",
"gov.kg",
"mil.kg",
"*.kh",
"ki",
"edu.ki",
"biz.ki",
"net.ki",
"org.ki",
"gov.ki",
"info.ki",
"com.ki",
"km",
"org.km",
"nom.km",
"gov.km",
"prd.km",
"tm.km",
"edu.km",
"mil.km",
"ass.km",
"com.km",
"coop.km",
"asso.km",
"presse.km",
"medecin.km",
"notaires.km",
"pharmaciens.km",
"veterinaire.km",
"gouv.km",
"kn",
"net.kn",
"org.kn",
"edu.kn",
"gov.kn",
"kp",
"com.kp",
"edu.kp",
"gov.kp",
"org.kp",
"rep.kp",
"tra.kp",
"kr",
"ac.kr",
"co.kr",
"es.kr",
"go.kr",
"hs.kr",
"kg.kr",
"mil.kr",
"ms.kr",
"ne.kr",
"or.kr",
"pe.kr",
"re.kr",
"sc.kr",
"busan.kr",
"chungbuk.kr",
"chungnam.kr",
"daegu.kr",
"daejeon.kr",
"gangwon.kr",
"gwangju.kr",
"gyeongbuk.kr",
"gyeonggi.kr",
"gyeongnam.kr",
"incheon.kr",
"jeju.kr",
"jeonbuk.kr",
"jeonnam.kr",
"seoul.kr",
"ulsan.kr",
"kw",
"com.kw",
"edu.kw",
"emb.kw",
"gov.kw",
"ind.kw",
"net.kw",
"org.kw",
"ky",
"com.ky",
"edu.ky",
"net.ky",
"org.ky",
"kz",
"org.kz",
"edu.kz",
"net.kz",
"gov.kz",
"mil.kz",
"com.kz",
"la",
"int.la",
"net.la",
"info.la",
"edu.la",
"gov.la",
"per.la",
"com.la",
"org.la",
"lb",
"com.lb",
"edu.lb",
"gov.lb",
"net.lb",
"org.lb",
"lc",
"com.lc",
"net.lc",
"co.lc",
"org.lc",
"edu.lc",
"gov.lc",
"li",
"lk",
"gov.lk",
"sch.lk",
"net.lk",
"int.lk",
"com.lk",
"org.lk",
"edu.lk",
"ngo.lk",
"soc.lk",
"web.lk",
"ltd.lk",
"assn.lk",
"grp.lk",
"hotel.lk",
"ac.lk",
"lr",
"com.lr",
"edu.lr",
"gov.lr",
"org.lr",
"net.lr",
"ls",
"ac.ls",
"biz.ls",
"co.ls",
"edu.ls",
"gov.ls",
"info.ls",
"net.ls",
"org.ls",
"sc.ls",
"lt",
"gov.lt",
"lu",
"lv",
"com.lv",
"edu.lv",
"gov.lv",
"org.lv",
"mil.lv",
"id.lv",
"net.lv",
"asn.lv",
"conf.lv",
"ly",
"com.ly",
"net.ly",
"gov.ly",
"plc.ly",
"edu.ly",
"sch.ly",
"med.ly",
"org.ly",
"id.ly",
"ma",
"co.ma",
"net.ma",
"gov.ma",
"org.ma",
"ac.ma",
"press.ma",
"mc",
"tm.mc",
"asso.mc",
"md",
"me",
"co.me",
"net.me",
"org.me",
"edu.me",
"ac.me",
"gov.me",
"its.me",
"priv.me",
"mg",
"org.mg",
"nom.mg",
"gov.mg",
"prd.mg",
"tm.mg",
"edu.mg",
"mil.mg",
"com.mg",
"co.mg",
"mh",
"mil",
"mk",
"com.mk",
"org.mk",
"net.mk",
"edu.mk",
"gov.mk",
"inf.mk",
"name.mk",
"ml",
"com.ml",
"edu.ml",
"gouv.ml",
"gov.ml",
"net.ml",
"org.ml",
"presse.ml",
"*.mm",
"mn",
"gov.mn",
"edu.mn",
"org.mn",
"mo",
"com.mo",
"net.mo",
"org.mo",
"edu.mo",
"gov.mo",
"mobi",
"mp",
"mq",
"mr",
"gov.mr",
"ms",
"com.ms",
"edu.ms",
"gov.ms",
"net.ms",
"org.ms",
"mt",
"com.mt",
"edu.mt",
"net.mt",
"org.mt",
"mu",
"com.mu",
"net.mu",
"org.mu",
"gov.mu",
"ac.mu",
"co.mu",
"or.mu",
"museum",
"academy.museum",
"agriculture.museum",
"air.museum",
"airguard.museum",
"alabama.museum",
"alaska.museum",
"amber.museum",
"ambulance.museum",
"american.museum",
"americana.museum",
"americanantiques.museum",
"americanart.museum",
"amsterdam.museum",
"and.museum",
"annefrank.museum",
"anthro.museum",
"anthropology.museum",
"antiques.museum",
"aquarium.museum",
"arboretum.museum",
"archaeological.museum",
"archaeology.museum",
"architecture.museum",
"art.museum",
"artanddesign.museum",
"artcenter.museum",
"artdeco.museum",
"arteducation.museum",
"artgallery.museum",
"arts.museum",
"artsandcrafts.museum",
"asmatart.museum",
"assassination.museum",
"assisi.museum",
"association.museum",
"astronomy.museum",
"atlanta.museum",
"austin.museum",
"australia.museum",
"automotive.museum",
"aviation.museum",
"axis.museum",
"badajoz.museum",
"baghdad.museum",
"bahn.museum",
"bale.museum",
"baltimore.museum",
"barcelona.museum",
"baseball.museum",
"basel.museum",
"baths.museum",
"bauern.museum",
"beauxarts.museum",
"beeldengeluid.museum",
"bellevue.museum",
"bergbau.museum",
"berkeley.museum",
"berlin.museum",
"bern.museum",
"bible.museum",
"bilbao.museum",
"bill.museum",
"birdart.museum",
"birthplace.museum",
"bonn.museum",
"boston.museum",
"botanical.museum",
"botanicalgarden.museum",
"botanicgarden.museum",
"botany.museum",
"brandywinevalley.museum",
"brasil.museum",
"bristol.museum",
"british.museum",
"britishcolumbia.museum",
"broadcast.museum",
"brunel.museum",
"brussel.museum",
"brussels.museum",
"bruxelles.museum",
"building.museum",
"burghof.museum",
"bus.museum",
"bushey.museum",
"cadaques.museum",
"california.museum",
"cambridge.museum",
"can.museum",
"canada.museum",
"capebreton.museum",
"carrier.museum",
"cartoonart.museum",
"casadelamoneda.museum",
"castle.museum",
"castres.museum",
"celtic.museum",
"center.museum",
"chattanooga.museum",
"cheltenham.museum",
"chesapeakebay.museum",
"chicago.museum",
"children.museum",
"childrens.museum",
"childrensgarden.museum",
"chiropractic.museum",
"chocolate.museum",
"christiansburg.museum",
"cincinnati.museum",
"cinema.museum",
"circus.museum",
"civilisation.museum",
"civilization.museum",
"civilwar.museum",
"clinton.museum",
"clock.museum",
"coal.museum",
"coastaldefence.museum",
"cody.museum",
"coldwar.museum",
"collection.museum",
"colonialwilliamsburg.museum",
"coloradoplateau.museum",
"columbia.museum",
"columbus.museum",
"communication.museum",
"communications.museum",
"community.museum",
"computer.museum",
"computerhistory.museum",
"comunicações.museum",
"contemporary.museum",
"contemporaryart.museum",
"convent.museum",
"copenhagen.museum",
"corporation.museum",
"correios-e-telecomunicações.museum",
"corvette.museum",
"costume.museum",
"countryestate.museum",
"county.museum",
"crafts.museum",
"cranbrook.museum",
"creation.museum",
"cultural.museum",
"culturalcenter.museum",
"culture.museum",
"cyber.museum",
"cymru.museum",
"dali.museum",
"dallas.museum",
"database.museum",
"ddr.museum",
"decorativearts.museum",
"delaware.museum",
"delmenhorst.museum",
"denmark.museum",
"depot.museum",
"design.museum",
"detroit.museum",
"dinosaur.museum",
"discovery.museum",
"dolls.museum",
"donostia.museum",
"durham.museum",
"eastafrica.museum",
"eastcoast.museum",
"education.museum",
"educational.museum",
"egyptian.museum",
"eisenbahn.museum",
"elburg.museum",
"elvendrell.museum",
"embroidery.museum",
"encyclopedic.museum",
"england.museum",
"entomology.museum",
"environment.museum",
"environmentalconservation.museum",
"epilepsy.museum",
"essex.museum",
"estate.museum",
"ethnology.museum",
"exeter.museum",
"exhibition.museum",
"family.museum",
"farm.museum",
"farmequipment.museum",
"farmers.museum",
"farmstead.museum",
"field.museum",
"figueres.museum",
"filatelia.museum",
"film.museum",
"fineart.museum",
"finearts.museum",
"finland.museum",
"flanders.museum",
"florida.museum",
"force.museum",
"fortmissoula.museum",
"fortworth.museum",
"foundation.museum",
"francaise.museum",
"frankfurt.museum",
"franziskaner.museum",
"freemasonry.museum",
"freiburg.museum",
"fribourg.museum",
"frog.museum",
"fundacio.museum",
"furniture.museum",
"gallery.museum",
"garden.museum",
"gateway.museum",
"geelvinck.museum",
"gemological.museum",
"geology.museum",
"georgia.museum",
"giessen.museum",
"glas.museum",
"glass.museum",
"gorge.museum",
"grandrapids.museum",
"graz.museum",
"guernsey.museum",
"halloffame.museum",
"hamburg.museum",
"handson.museum",
"harvestcelebration.museum",
"hawaii.museum",
"health.museum",
"heimatunduhren.museum",
"hellas.museum",
"helsinki.museum",
"hembygdsforbund.museum",
"heritage.museum",
"histoire.museum",
"historical.museum",
"historicalsociety.museum",
"historichouses.museum",
"historisch.museum",
"historisches.museum",
"history.museum",
"historyofscience.museum",
"horology.museum",
"house.museum",
"humanities.museum",
"illustration.museum",
"imageandsound.museum",
"indian.museum",
"indiana.museum",
"indianapolis.museum",
"indianmarket.museum",
"intelligence.museum",
"interactive.museum",
"iraq.museum",
"iron.museum",
"isleofman.museum",
"jamison.museum",
"jefferson.museum",
"jerusalem.museum",
"jewelry.museum",
"jewish.museum",
"jewishart.museum",
"jfk.museum",
"journalism.museum",
"judaica.museum",
"judygarland.museum",
"juedisches.museum",
"juif.museum",
"karate.museum",
"karikatur.museum",
"kids.museum",
"koebenhavn.museum",
"koeln.museum",
"kunst.museum",
"kunstsammlung.museum",
"kunstunddesign.museum",
"labor.museum",
"labour.museum",
"lajolla.museum",
"lancashire.museum",
"landes.museum",
"lans.museum",
"läns.museum",
"larsson.museum",
"lewismiller.museum",
"lincoln.museum",
"linz.museum",
"living.museum",
"livinghistory.museum",
"localhistory.museum",
"london.museum",
"losangeles.museum",
"louvre.museum",
"loyalist.museum",
"lucerne.museum",
"luxembourg.museum",
"luzern.museum",
"mad.museum",
"madrid.museum",
"mallorca.museum",
"manchester.museum",
"mansion.museum",
"mansions.museum",
"manx.museum",
"marburg.museum",
"maritime.museum",
"maritimo.museum",
"maryland.museum",
"marylhurst.museum",
"media.museum",
"medical.museum",
"medizinhistorisches.museum",
"meeres.museum",
"memorial.museum",
"mesaverde.museum",
"michigan.museum",
"midatlantic.museum",
"military.museum",
"mill.museum",
"miners.museum",
"mining.museum",
"minnesota.museum",
"missile.museum",
"missoula.museum",
"modern.museum",
"moma.museum",
"money.museum",
"monmouth.museum",
"monticello.museum",
"montreal.museum",
"moscow.museum",
"motorcycle.museum",
"muenchen.museum",
"muenster.museum",
"mulhouse.museum",
"muncie.museum",
"museet.museum",
"museumcenter.museum",
"museumvereniging.museum",
"music.museum",
"national.museum",
"nationalfirearms.museum",
"nationalheritage.museum",
"nativeamerican.museum",
"naturalhistory.museum",
"naturalhistorymuseum.museum",
"naturalsciences.museum",
"nature.museum",
"naturhistorisches.museum",
"natuurwetenschappen.museum",
"naumburg.museum",
"naval.museum",
"nebraska.museum",
"neues.museum",
"newhampshire.museum",
"newjersey.museum",
"newmexico.museum",
"newport.museum",
"newspaper.museum",
"newyork.museum",
"niepce.museum",
"norfolk.museum",
"north.museum",
"nrw.museum",
"nyc.museum",
"nyny.museum",
"oceanographic.museum",
"oceanographique.museum",
"omaha.museum",
"online.museum",
"ontario.museum",
"openair.museum",
"oregon.museum",
"oregontrail.museum",
"otago.museum",
"oxford.museum",
"pacific.museum",
"paderborn.museum",
"palace.museum",
"paleo.museum",
"palmsprings.museum",
"panama.museum",
"paris.museum",
"pasadena.museum",
"pharmacy.museum",
"philadelphia.museum",
"philadelphiaarea.museum",
"philately.museum",
"phoenix.museum",
"photography.museum",
"pilots.museum",
"pittsburgh.museum",
"planetarium.museum",
"plantation.museum",
"plants.museum",
"plaza.museum",
"portal.museum",
"portland.museum",
"portlligat.museum",
"posts-and-telecommunications.museum",
"preservation.museum",
"presidio.museum",
"press.museum",
"project.museum",
"public.museum",
"pubol.museum",
"quebec.museum",
"railroad.museum",
"railway.museum",
"research.museum",
"resistance.museum",
"riodejaneiro.museum",
"rochester.museum",
"rockart.museum",
"roma.museum",
"russia.museum",
"saintlouis.museum",
"salem.museum",
"salvadordali.museum",
"salzburg.museum",
"sandiego.museum",
"sanfrancisco.museum",
"santabarbara.museum",
"santacruz.museum",
"santafe.museum",
"saskatchewan.museum",
"satx.museum",
"savannahga.museum",
"schlesisches.museum",
"schoenbrunn.museum",
"schokoladen.museum",
"school.museum",
"schweiz.museum",
"science.museum",
"scienceandhistory.museum",
"scienceandindustry.museum",
"sciencecenter.museum",
"sciencecenters.museum",
"science-fiction.museum",
"sciencehistory.museum",
"sciences.museum",
"sciencesnaturelles.museum",
"scotland.museum",
"seaport.museum",
"settlement.museum",
"settlers.museum",
"shell.museum",
"sherbrooke.museum",
"sibenik.museum",
"silk.museum",
"ski.museum",
"skole.museum",
"society.museum",
"sologne.museum",
"soundandvision.museum",
"southcarolina.museum",
"southwest.museum",
"space.museum",
"spy.museum",
"square.museum",
"stadt.museum",
"stalbans.museum",
"starnberg.museum",
"state.museum",
"stateofdelaware.museum",
"station.museum",
"steam.museum",
"steiermark.museum",
"stjohn.museum",
"stockholm.museum",
"stpetersburg.museum",
"stuttgart.museum",
"suisse.museum",
"surgeonshall.museum",
"surrey.museum",
"svizzera.museum",
"sweden.museum",
"sydney.museum",
"tank.museum",
"tcm.museum",
"technology.museum",
"telekommunikation.museum",
"television.museum",
"texas.museum",
"textile.museum",
"theater.museum",
"time.museum",
"timekeeping.museum",
"topology.museum",
"torino.museum",
"touch.museum",
"town.museum",
"transport.museum",
"tree.museum",
"trolley.museum",
"trust.museum",
"trustee.museum",
"uhren.museum",
"ulm.museum",
"undersea.museum",
"university.museum",
"usa.museum",
"usantiques.museum",
"usarts.museum",
"uscountryestate.museum",
"usculture.museum",
"usdecorativearts.museum",
"usgarden.museum",
"ushistory.museum",
"ushuaia.museum",
"uslivinghistory.museum",
"utah.museum",
"uvic.museum",
"valley.museum",
"vantaa.museum",
"versailles.museum",
"viking.museum",
"village.museum",
"virginia.museum",
"virtual.museum",
"virtuel.museum",
"vlaanderen.museum",
"volkenkunde.museum",
"wales.museum",
"wallonie.museum",
"war.museum",
"washingtondc.museum",
"watchandclock.museum",
"watch-and-clock.museum",
"western.museum",
"westfalen.museum",
"whaling.museum",
"wildlife.museum",
"williamsburg.museum",
"windmill.museum",
"workshop.museum",
"york.museum",
"yorkshire.museum",
"yosemite.museum",
"youth.museum",
"zoological.museum",
"zoology.museum",
"ירושלים.museum",
"иком.museum",
"mv",
"aero.mv",
"biz.mv",
"com.mv",
"coop.mv",
"edu.mv",
"gov.mv",
"info.mv",
"int.mv",
"mil.mv",
"museum.mv",
"name.mv",
"net.mv",
"org.mv",
"pro.mv",
"mw",
"ac.mw",
"biz.mw",
"co.mw",
"com.mw",
"coop.mw",
"edu.mw",
"gov.mw",
"int.mw",
"museum.mw",
"net.mw",
"org.mw",
"mx",
"com.mx",
"org.mx",
"gob.mx",
"edu.mx",
"net.mx",
"my",
"biz.my",
"com.my",
"edu.my",
"gov.my",
"mil.my",
"name.my",
"net.my",
"org.my",
"mz",
"ac.mz",
"adv.mz",
"co.mz",
"edu.mz",
"gov.mz",
"mil.mz",
"net.mz",
"org.mz",
"na",
"info.na",
"pro.na",
"name.na",
"school.na",
"or.na",
"dr.na",
"us.na",
"mx.na",
"ca.na",
"in.na",
"cc.na",
"tv.na",
"ws.na",
"mobi.na",
"co.na",
"com.na",
"org.na",
"name",
"nc",
"asso.nc",
"nom.nc",
"ne",
"net",
"nf",
"com.nf",
"net.nf",
"per.nf",
"rec.nf",
"web.nf",
"arts.nf",
"firm.nf",
"info.nf",
"other.nf",
"store.nf",
"ng",
"com.ng",
"edu.ng",
"gov.ng",
"i.ng",
"mil.ng",
"mobi.ng",
"name.ng",
"net.ng",
"org.ng",
"sch.ng",
"ni",
"ac.ni",
"biz.ni",
"co.ni",
"com.ni",
"edu.ni",
"gob.ni",
"in.ni",
"info.ni",
"int.ni",
"mil.ni",
"net.ni",
"nom.ni",
"org.ni",
"web.ni",
"nl",
"no",
"fhs.no",
"vgs.no",
"fylkesbibl.no",
"folkebibl.no",
"museum.no",
"idrett.no",
"priv.no",
"mil.no",
"stat.no",
"dep.no",
"kommune.no",
"herad.no",
"aa.no",
"ah.no",
"bu.no",
"fm.no",
"hl.no",
"hm.no",
"jan-mayen.no",
"mr.no",
"nl.no",
"nt.no",
"of.no",
"ol.no",
"oslo.no",
"rl.no",
"sf.no",
"st.no",
"svalbard.no",
"tm.no",
"tr.no",
"va.no",
"vf.no",
"gs.aa.no",
"gs.ah.no",
"gs.bu.no",
"gs.fm.no",
"gs.hl.no",
"gs.hm.no",
"gs.jan-mayen.no",
"gs.mr.no",
"gs.nl.no",
"gs.nt.no",
"gs.of.no",
"gs.ol.no",
"gs.oslo.no",
"gs.rl.no",
"gs.sf.no",
"gs.st.no",
"gs.svalbard.no",
"gs.tm.no",
"gs.tr.no",
"gs.va.no",
"gs.vf.no",
"akrehamn.no",
"åkrehamn.no",
"algard.no",
"ålgård.no",
"arna.no",
"brumunddal.no",
"bryne.no",
"bronnoysund.no",
"brønnøysund.no",
"drobak.no",
"drøbak.no",
"egersund.no",
"fetsund.no",
"floro.no",
"florø.no",
"fredrikstad.no",
"hokksund.no",
"honefoss.no",
"hønefoss.no",
"jessheim.no",
"jorpeland.no",
"jørpeland.no",
"kirkenes.no",
"kopervik.no",
"krokstadelva.no",
"langevag.no",
"langevåg.no",
"leirvik.no",
"mjondalen.no",
"mjøndalen.no",
"mo-i-rana.no",
"mosjoen.no",
"mosjøen.no",
"nesoddtangen.no",
"orkanger.no",
"osoyro.no",
"osøyro.no",
"raholt.no",
"råholt.no",
"sandnessjoen.no",
"sandnessjøen.no",
"skedsmokorset.no",
"slattum.no",
"spjelkavik.no",
"stathelle.no",
"stavern.no",
"stjordalshalsen.no",
"stjørdalshalsen.no",
"tananger.no",
"tranby.no",
"vossevangen.no",
"afjord.no",
"åfjord.no",
"agdenes.no",
"al.no",
"ål.no",
"alesund.no",
"ålesund.no",
"alstahaug.no",
"alta.no",
"áltá.no",
"alaheadju.no",
"álaheadju.no",
"alvdal.no",
"amli.no",
"åmli.no",
"amot.no",
"åmot.no",
"andebu.no",
"andoy.no",
"andøy.no",
"andasuolo.no",
"ardal.no",
"årdal.no",
"aremark.no",
"arendal.no",
"ås.no",
"aseral.no",
"åseral.no",
"asker.no",
"askim.no",
"askvoll.no",
"askoy.no",
"askøy.no",
"asnes.no",
"åsnes.no",
"audnedaln.no",
"aukra.no",
"aure.no",
"aurland.no",
"aurskog-holand.no",
"aurskog-høland.no",
"austevoll.no",
"austrheim.no",
"averoy.no",
"averøy.no",
"balestrand.no",
"ballangen.no",
"balat.no",
"bálát.no",
"balsfjord.no",
"bahccavuotna.no",
"báhccavuotna.no",
"bamble.no",
"bardu.no",
"beardu.no",
"beiarn.no",
"bajddar.no",
"bájddar.no",
"baidar.no",
"báidár.no",
"berg.no",
"bergen.no",
"berlevag.no",
"berlevåg.no",
"bearalvahki.no",
"bearalváhki.no",
"bindal.no",
"birkenes.no",
"bjarkoy.no",
"bjarkøy.no",
"bjerkreim.no",
"bjugn.no",
"bodo.no",
"bodø.no",
"badaddja.no",
"bådåddjå.no",
"budejju.no",
"bokn.no",
"bremanger.no",
"bronnoy.no",
"brønnøy.no",
"bygland.no",
"bykle.no",
"barum.no",
"bærum.no",
"bo.telemark.no",
"bø.telemark.no",
"bo.nordland.no",
"bø.nordland.no",
"bievat.no",
"bievát.no",
"bomlo.no",
"bømlo.no",
"batsfjord.no",
"båtsfjord.no",
"bahcavuotna.no",
"báhcavuotna.no",
"dovre.no",
"drammen.no",
"drangedal.no",
"dyroy.no",
"dyrøy.no",
"donna.no",
"dønna.no",
"eid.no",
"eidfjord.no",
"eidsberg.no",
"eidskog.no",
"eidsvoll.no",
"eigersund.no",
"elverum.no",
"enebakk.no",
"engerdal.no",
"etne.no",
"etnedal.no",
"evenes.no",
"evenassi.no",
"evenášši.no",
"evje-og-hornnes.no",
"farsund.no",
"fauske.no",
"fuossko.no",
"fuoisku.no",
"fedje.no",
"fet.no",
"finnoy.no",
"finnøy.no",
"fitjar.no",
"fjaler.no",
"fjell.no",
"flakstad.no",
"flatanger.no",
"flekkefjord.no",
"flesberg.no",
"flora.no",
"fla.no",
"flå.no",
"folldal.no",
"forsand.no",
"fosnes.no",
"frei.no",
"frogn.no",
"froland.no",
"frosta.no",
"frana.no",
"fræna.no",
"froya.no",
"frøya.no",
"fusa.no",
"fyresdal.no",
"forde.no",
"førde.no",
"gamvik.no",
"gangaviika.no",
"gáŋgaviika.no",
"gaular.no",
"gausdal.no",
"gildeskal.no",
"gildeskål.no",
"giske.no",
"gjemnes.no",
"gjerdrum.no",
"gjerstad.no",
"gjesdal.no",
"gjovik.no",
"gjøvik.no",
"gloppen.no",
"gol.no",
"gran.no",
"grane.no",
"granvin.no",
"gratangen.no",
"grimstad.no",
"grong.no",
"kraanghke.no",
"kråanghke.no",
"grue.no",
"gulen.no",
"hadsel.no",
"halden.no",
"halsa.no",
"hamar.no",
"hamaroy.no",
"habmer.no",
"hábmer.no",
"hapmir.no",
"hápmir.no",
"hammerfest.no",
"hammarfeasta.no",
"hámmárfeasta.no",
"haram.no",
"hareid.no",
"harstad.no",
"hasvik.no",
"aknoluokta.no",
"ákŋoluokta.no",
"hattfjelldal.no",
"aarborte.no",
"haugesund.no",
"hemne.no",
"hemnes.no",
"hemsedal.no",
"heroy.more-og-romsdal.no",
"herøy.møre-og-romsdal.no",
"heroy.nordland.no",
"herøy.nordland.no",
"hitra.no",
"hjartdal.no",
"hjelmeland.no",
"hobol.no",
"hobøl.no",
"hof.no",
"hol.no",
"hole.no",
"holmestrand.no",
"holtalen.no",
"holtålen.no",
"hornindal.no",
"horten.no",
"hurdal.no",
"hurum.no",
"hvaler.no",
"hyllestad.no",
"hagebostad.no",
"hægebostad.no",
"hoyanger.no",
"høyanger.no",
"hoylandet.no",
"høylandet.no",
"ha.no",
"hå.no",
"ibestad.no",
"inderoy.no",
"inderøy.no",
"iveland.no",
"jevnaker.no",
"jondal.no",
"jolster.no",
"jølster.no",
"karasjok.no",
"karasjohka.no",
"kárášjohka.no",
"karlsoy.no",
"galsa.no",
"gálsá.no",
"karmoy.no",
"karmøy.no",
"kautokeino.no",
"guovdageaidnu.no",
"klepp.no",
"klabu.no",
"klæbu.no",
"kongsberg.no",
"kongsvinger.no",
"kragero.no",
"kragerø.no",
"kristiansand.no",
"kristiansund.no",
"krodsherad.no",
"krødsherad.no",
"kvalsund.no",
"rahkkeravju.no",
"ráhkkerávju.no",
"kvam.no",
"kvinesdal.no",
"kvinnherad.no",
"kviteseid.no",
"kvitsoy.no",
"kvitsøy.no",
"kvafjord.no",
"kvæfjord.no",
"giehtavuoatna.no",
"kvanangen.no",
"kvænangen.no",
"navuotna.no",
"návuotna.no",
"kafjord.no",
"kåfjord.no",
"gaivuotna.no",
"gáivuotna.no",
"larvik.no",
"lavangen.no",
"lavagis.no",
"loabat.no",
"loabát.no",
"lebesby.no",
"davvesiida.no",
"leikanger.no",
"leirfjord.no",
"leka.no",
"leksvik.no",
"lenvik.no",
"leangaviika.no",
"leaŋgaviika.no",
"lesja.no",
"levanger.no",
"lier.no",
"lierne.no",
"lillehammer.no",
"lillesand.no",
"lindesnes.no",
"lindas.no",
"lindås.no",
"lom.no",
"loppa.no",
"lahppi.no",
"láhppi.no",
"lund.no",
"lunner.no",
"luroy.no",
"lurøy.no",
"luster.no",
"lyngdal.no",
"lyngen.no",
"ivgu.no",
"lardal.no",
"lerdal.no",
"lærdal.no",
"lodingen.no",
"lødingen.no",
"lorenskog.no",
"lørenskog.no",
"loten.no",
"løten.no",
"malvik.no",
"masoy.no",
"måsøy.no",
"muosat.no",
"muosát.no",
"mandal.no",
"marker.no",
"marnardal.no",
"masfjorden.no",
"meland.no",
"meldal.no",
"melhus.no",
"meloy.no",
"meløy.no",
"meraker.no",
"meråker.no",
"moareke.no",
"moåreke.no",
"midsund.no",
"midtre-gauldal.no",
"modalen.no",
"modum.no",
"molde.no",
"moskenes.no",
"moss.no",
"mosvik.no",
"malselv.no",
"målselv.no",
"malatvuopmi.no",
"málatvuopmi.no",
"namdalseid.no",
"aejrie.no",
"namsos.no",
"namsskogan.no",
"naamesjevuemie.no",
"nååmesjevuemie.no",
"laakesvuemie.no",
"nannestad.no",
"narvik.no",
"narviika.no",
"naustdal.no",
"nedre-eiker.no",
"nes.akershus.no",
"nes.buskerud.no",
"nesna.no",
"nesodden.no",
"nesseby.no",
"unjarga.no",
"unjárga.no",
"nesset.no",
"nissedal.no",
"nittedal.no",
"nord-aurdal.no",
"nord-fron.no",
"nord-odal.no",
"norddal.no",
"nordkapp.no",
"davvenjarga.no",
"davvenjárga.no",
"nordre-land.no",
"nordreisa.no",
"raisa.no",
"ráisa.no",
"nore-og-uvdal.no",
"notodden.no",
"naroy.no",
"nærøy.no",
"notteroy.no",
"nøtterøy.no",
"odda.no",
"oksnes.no",
"øksnes.no",
"oppdal.no",
"oppegard.no",
"oppegård.no",
"orkdal.no",
"orland.no",
"ørland.no",
"orskog.no",
"ørskog.no",
"orsta.no",
"ørsta.no",
"os.hedmark.no",
"os.hordaland.no",
"osen.no",
"osteroy.no",
"osterøy.no",
"ostre-toten.no",
"østre-toten.no",
"overhalla.no",
"ovre-eiker.no",
"øvre-eiker.no",
"oyer.no",
"øyer.no",
"oygarden.no",
"øygarden.no",
"oystre-slidre.no",
"øystre-slidre.no",
"porsanger.no",
"porsangu.no",
"porsáŋgu.no",
"porsgrunn.no",
"radoy.no",
"radøy.no",
"rakkestad.no",
"rana.no",
"ruovat.no",
"randaberg.no",
"rauma.no",
"rendalen.no",
"rennebu.no",
"rennesoy.no",
"rennesøy.no",
"rindal.no",
"ringebu.no",
"ringerike.no",
"ringsaker.no",
"rissa.no",
"risor.no",
"risør.no",
"roan.no",
"rollag.no",
"rygge.no",
"ralingen.no",
"rælingen.no",
"rodoy.no",
"rødøy.no",
"romskog.no",
"rømskog.no",
"roros.no",
"røros.no",
"rost.no",
"røst.no",
"royken.no",
"røyken.no",
"royrvik.no",
"røyrvik.no",
"rade.no",
"råde.no",
"salangen.no",
"siellak.no",
"saltdal.no",
"salat.no",
"sálát.no",
"sálat.no",
"samnanger.no",
"sande.more-og-romsdal.no",
"sande.møre-og-romsdal.no",
"sande.vestfold.no",
"sandefjord.no",
"sandnes.no",
"sandoy.no",
"sandøy.no",
"sarpsborg.no",
"sauda.no",
"sauherad.no",
"sel.no",
"selbu.no",
"selje.no",
"seljord.no",
"sigdal.no",
"siljan.no",
"sirdal.no",
"skaun.no",
"skedsmo.no",
"ski.no",
"skien.no",
"skiptvet.no",
"skjervoy.no",
"skjervøy.no",
"skierva.no",
"skiervá.no",
"skjak.no",
"skjåk.no",
"skodje.no",
"skanland.no",
"skånland.no",
"skanit.no",
"skánit.no",
"smola.no",
"smøla.no",
"snillfjord.no",
"snasa.no",
"snåsa.no",
"snoasa.no",
"snaase.no",
"snåase.no",
"sogndal.no",
"sokndal.no",
"sola.no",
"solund.no",
"songdalen.no",
"sortland.no",
"spydeberg.no",
"stange.no",
"stavanger.no",
"steigen.no",
"steinkjer.no",
"stjordal.no",
"stjørdal.no",
"stokke.no",
"stor-elvdal.no",
"stord.no",
"stordal.no",
"storfjord.no",
"omasvuotna.no",
"strand.no",
"stranda.no",
"stryn.no",
"sula.no",
"suldal.no",
"sund.no",
"sunndal.no",
"surnadal.no",
"sveio.no",
"svelvik.no",
"sykkylven.no",
"sogne.no",
"søgne.no",
"somna.no",
"sømna.no",
"sondre-land.no",
"søndre-land.no",
"sor-aurdal.no",
"sør-aurdal.no",
"sor-fron.no",
"sør-fron.no",
"sor-odal.no",
"sør-odal.no",
"sor-varanger.no",
"sør-varanger.no",
"matta-varjjat.no",
"mátta-várjjat.no",
"sorfold.no",
"sørfold.no",
"sorreisa.no",
"sørreisa.no",
"sorum.no",
"sørum.no",
"tana.no",
"deatnu.no",
"time.no",
"tingvoll.no",
"tinn.no",
"tjeldsund.no",
"dielddanuorri.no",
"tjome.no",
"tjøme.no",
"tokke.no",
"tolga.no",
"torsken.no",
"tranoy.no",
"tranøy.no",
"tromso.no",
"tromsø.no",
"tromsa.no",
"romsa.no",
"trondheim.no",
"troandin.no",
"trysil.no",
"trana.no",
"træna.no",
"trogstad.no",
"trøgstad.no",
"tvedestrand.no",
"tydal.no",
"tynset.no",
"tysfjord.no",
"divtasvuodna.no",
"divttasvuotna.no",
"tysnes.no",
"tysvar.no",
"tysvær.no",
"tonsberg.no",
"tønsberg.no",
"ullensaker.no",
"ullensvang.no",
"ulvik.no",
"utsira.no",
"vadso.no",
"vadsø.no",
"cahcesuolo.no",
"čáhcesuolo.no",
"vaksdal.no",
"valle.no",
"vang.no",
"vanylven.no",
"vardo.no",
"vardø.no",
"varggat.no",
"várggát.no",
"vefsn.no",
"vaapste.no",
"vega.no",
"vegarshei.no",
"vegårshei.no",
"vennesla.no",
"verdal.no",
"verran.no",
"vestby.no",
"vestnes.no",
"vestre-slidre.no",
"vestre-toten.no",
"vestvagoy.no",
"vestvågøy.no",
"vevelstad.no",
"vik.no",
"vikna.no",
"vindafjord.no",
"volda.no",
"voss.no",
"varoy.no",
"værøy.no",
"vagan.no",
"vågan.no",
"voagat.no",
"vagsoy.no",
"vågsøy.no",
"vaga.no",
"vågå.no",
"valer.ostfold.no",
"våler.østfold.no",
"valer.hedmark.no",
"våler.hedmark.no",
"*.np",
"nr",
"biz.nr",
"info.nr",
"gov.nr",
"edu.nr",
"org.nr",
"net.nr",
"com.nr",
"nu",
"nz",
"ac.nz",
"co.nz",
"cri.nz",
"geek.nz",
"gen.nz",
"govt.nz",
"health.nz",
"iwi.nz",
"kiwi.nz",
"maori.nz",
"mil.nz",
"māori.nz",
"net.nz",
"org.nz",
"parliament.nz",
"school.nz",
"om",
"co.om",
"com.om",
"edu.om",
"gov.om",
"med.om",
"museum.om",
"net.om",
"org.om",
"pro.om",
"onion",
"org",
"pa",
"ac.pa",
"gob.pa",
"com.pa",
"org.pa",
"sld.pa",
"edu.pa",
"net.pa",
"ing.pa",
"abo.pa",
"med.pa",
"nom.pa",
"pe",
"edu.pe",
"gob.pe",
"nom.pe",
"mil.pe",
"org.pe",
"com.pe",
"net.pe",
"pf",
"com.pf",
"org.pf",
"edu.pf",
"*.pg",
"ph",
"com.ph",
"net.ph",
"org.ph",
"gov.ph",
"edu.ph",
"ngo.ph",
"mil.ph",
"i.ph",
"pk",
"com.pk",
"net.pk",
"edu.pk",
"org.pk",
"fam.pk",
"biz.pk",
"web.pk",
"gov.pk",
"gob.pk",
"gok.pk",
"gon.pk",
"gop.pk",
"gos.pk",
"info.pk",
"pl",
"com.pl",
"net.pl",
"org.pl",
"aid.pl",
"agro.pl",
"atm.pl",
"auto.pl",
"biz.pl",
"edu.pl",
"gmina.pl",
"gsm.pl",
"info.pl",
"mail.pl",
"miasta.pl",
"media.pl",
"mil.pl",
"nieruchomosci.pl",
"nom.pl",
"pc.pl",
"powiat.pl",
"priv.pl",
"realestate.pl",
"rel.pl",
"sex.pl",
"shop.pl",
"sklep.pl",
"sos.pl",
"szkola.pl",
"targi.pl",
"tm.pl",
"tourism.pl",
"travel.pl",
"turystyka.pl",
"gov.pl",
"ap.gov.pl",
"ic.gov.pl",
"is.gov.pl",
"us.gov.pl",
"kmpsp.gov.pl",
"kppsp.gov.pl",
"kwpsp.gov.pl",
"psp.gov.pl",
"wskr.gov.pl",
"kwp.gov.pl",
"mw.gov.pl",
"ug.gov.pl",
"um.gov.pl",
"umig.gov.pl",
"ugim.gov.pl",
"upow.gov.pl",
"uw.gov.pl",
"starostwo.gov.pl",
"pa.gov.pl",
"po.gov.pl",
"psse.gov.pl",
"pup.gov.pl",
"rzgw.gov.pl",
"sa.gov.pl",
"so.gov.pl",
"sr.gov.pl",
"wsa.gov.pl",
"sko.gov.pl",
"uzs.gov.pl",
"wiih.gov.pl",
"winb.gov.pl",
"pinb.gov.pl",
"wios.gov.pl",
"witd.gov.pl",
"wzmiuw.gov.pl",
"piw.gov.pl",
"wiw.gov.pl",
"griw.gov.pl",
"wif.gov.pl",
"oum.gov.pl",
"sdn.gov.pl",
"zp.gov.pl",
"uppo.gov.pl",
"mup.gov.pl",
"wuoz.gov.pl",
"konsulat.gov.pl",
"oirm.gov.pl",
"augustow.pl",
"babia-gora.pl",
"bedzin.pl",
"beskidy.pl",
"bialowieza.pl",
"bialystok.pl",
"bielawa.pl",
"bieszczady.pl",
"boleslawiec.pl",
"bydgoszcz.pl",
"bytom.pl",
"cieszyn.pl",
"czeladz.pl",
"czest.pl",
"dlugoleka.pl",
"elblag.pl",
"elk.pl",
"glogow.pl",
"gniezno.pl",
"gorlice.pl",
"grajewo.pl",
"ilawa.pl",
"jaworzno.pl",
"jelenia-gora.pl",
"jgora.pl",
"kalisz.pl",
"kazimierz-dolny.pl",
"karpacz.pl",
"kartuzy.pl",
"kaszuby.pl",
"katowice.pl",
"kepno.pl",
"ketrzyn.pl",
"klodzko.pl",
"kobierzyce.pl",
"kolobrzeg.pl",
"konin.pl",
"konskowola.pl",
"kutno.pl",
"lapy.pl",
"lebork.pl",
"legnica.pl",
"lezajsk.pl",
"limanowa.pl",
"lomza.pl",
"lowicz.pl",
"lubin.pl",
"lukow.pl",
"malbork.pl",
"malopolska.pl",
"mazowsze.pl",
"mazury.pl",
"mielec.pl",
"mielno.pl",
"mragowo.pl",
"naklo.pl",
"nowaruda.pl",
"nysa.pl",
"olawa.pl",
"olecko.pl",
"olkusz.pl",
"olsztyn.pl",
"opoczno.pl",
"opole.pl",
"ostroda.pl",
"ostroleka.pl",
"ostrowiec.pl",
"ostrowwlkp.pl",
"pila.pl",
"pisz.pl",
"podhale.pl",
"podlasie.pl",
"polkowice.pl",
"pomorze.pl",
"pomorskie.pl",
"prochowice.pl",
"pruszkow.pl",
"przeworsk.pl",
"pulawy.pl",
"radom.pl",
"rawa-maz.pl",
"rybnik.pl",
"rzeszow.pl",
"sanok.pl",
"sejny.pl",
"slask.pl",
"slupsk.pl",
"sosnowiec.pl",
"stalowa-wola.pl",
"skoczow.pl",
"starachowice.pl",
"stargard.pl",
"suwalki.pl",
"swidnica.pl",
"swiebodzin.pl",
"swinoujscie.pl",
"szczecin.pl",
"szczytno.pl",
"tarnobrzeg.pl",
"tgory.pl",
"turek.pl",
"tychy.pl",
"ustka.pl",
"walbrzych.pl",
"warmia.pl",
"warszawa.pl",
"waw.pl",
"wegrow.pl",
"wielun.pl",
"wlocl.pl",
"wloclawek.pl",
"wodzislaw.pl",
"wolomin.pl",
"wroclaw.pl",
"zachpomor.pl",
"zagan.pl",
"zarow.pl",
"zgora.pl",
"zgorzelec.pl",
"pm",
"pn",
"gov.pn",
"co.pn",
"org.pn",
"edu.pn",
"net.pn",
"post",
"pr",
"com.pr",
"net.pr",
"org.pr",
"gov.pr",
"edu.pr",
"isla.pr",
"pro.pr",
"biz.pr",
"info.pr",
"name.pr",
"est.pr",
"prof.pr",
"ac.pr",
"pro",
"aaa.pro",
"aca.pro",
"acct.pro",
"avocat.pro",
"bar.pro",
"cpa.pro",
"eng.pro",
"jur.pro",
"law.pro",
"med.pro",
"recht.pro",
"ps",
"edu.ps",
"gov.ps",
"sec.ps",
"plo.ps",
"com.ps",
"org.ps",
"net.ps",
"pt",
"net.pt",
"gov.pt",
"org.pt",
"edu.pt",
"int.pt",
"publ.pt",
"com.pt",
"nome.pt",
"pw",
"co.pw",
"ne.pw",
"or.pw",
"ed.pw",
"go.pw",
"belau.pw",
"py",
"com.py",
"coop.py",
"edu.py",
"gov.py",
"mil.py",
"net.py",
"org.py",
"qa",
"com.qa",
"edu.qa",
"gov.qa",
"mil.qa",
"name.qa",
"net.qa",
"org.qa",
"sch.qa",
"re",
"asso.re",
"com.re",
"nom.re",
"ro",
"arts.ro",
"com.ro",
"firm.ro",
"info.ro",
"nom.ro",
"nt.ro",
"org.ro",
"rec.ro",
"store.ro",
"tm.ro",
"www.ro",
"rs",
"ac.rs",
"co.rs",
"edu.rs",
"gov.rs",
"in.rs",
"org.rs",
"ru",
"rw",
"ac.rw",
"co.rw",
"coop.rw",
"gov.rw",
"mil.rw",
"net.rw",
"org.rw",
"sa",
"com.sa",
"net.sa",
"org.sa",
"gov.sa",
"med.sa",
"pub.sa",
"edu.sa",
"sch.sa",
"sb",
"com.sb",
"edu.sb",
"gov.sb",
"net.sb",
"org.sb",
"sc",
"com.sc",
"gov.sc",
"net.sc",
"org.sc",
"edu.sc",
"sd",
"com.sd",
"net.sd",
"org.sd",
"edu.sd",
"med.sd",
"tv.sd",
"gov.sd",
"info.sd",
"se",
"a.se",
"ac.se",
"b.se",
"bd.se",
"brand.se",
"c.se",
"d.se",
"e.se",
"f.se",
"fh.se",
"fhsk.se",
"fhv.se",
"g.se",
"h.se",
"i.se",
"k.se",
"komforb.se",
"kommunalforbund.se",
"komvux.se",
"l.se",
"lanbib.se",
"m.se",
"n.se",
"naturbruksgymn.se",
"o.se",
"org.se",
"p.se",
"parti.se",
"pp.se",
"press.se",
"r.se",
"s.se",
"t.se",
"tm.se",
"u.se",
"w.se",
"x.se",
"y.se",
"z.se",
"sg",
"com.sg",
"net.sg",
"org.sg",
"gov.sg",
"edu.sg",
"per.sg",
"sh",
"com.sh",
"net.sh",
"gov.sh",
"org.sh",
"mil.sh",
"si",
"sj",
"sk",
"sl",
"com.sl",
"net.sl",
"edu.sl",
"gov.sl",
"org.sl",
"sm",
"sn",
"art.sn",
"com.sn",
"edu.sn",
"gouv.sn",
"org.sn",
"perso.sn",
"univ.sn",
"so",
"com.so",
"edu.so",
"gov.so",
"me.so",
"net.so",
"org.so",
"sr",
"ss",
"biz.ss",
"com.ss",
"edu.ss",
"gov.ss",
"me.ss",
"net.ss",
"org.ss",
"sch.ss",
"st",
"co.st",
"com.st",
"consulado.st",
"edu.st",
"embaixada.st",
"mil.st",
"net.st",
"org.st",
"principe.st",
"saotome.st",
"store.st",
"su",
"sv",
"com.sv",
"edu.sv",
"gob.sv",
"org.sv",
"red.sv",
"sx",
"gov.sx",
"sy",
"edu.sy",
"gov.sy",
"net.sy",
"mil.sy",
"com.sy",
"org.sy",
"sz",
"co.sz",
"ac.sz",
"org.sz",
"tc",
"td",
"tel",
"tf",
"tg",
"th",
"ac.th",
"co.th",
"go.th",
"in.th",
"mi.th",
"net.th",
"or.th",
"tj",
"ac.tj",
"biz.tj",
"co.tj",
"com.tj",
"edu.tj",
"go.tj",
"gov.tj",
"int.tj",
"mil.tj",
"name.tj",
"net.tj",
"nic.tj",
"org.tj",
"test.tj",
"web.tj",
"tk",
"tl",
"gov.tl",
"tm",
"com.tm",
"co.tm",
"org.tm",
"net.tm",
"nom.tm",
"gov.tm",
"mil.tm",
"edu.tm",
"tn",
"com.tn",
"ens.tn",
"fin.tn",
"gov.tn",
"ind.tn",
"info.tn",
"intl.tn",
"mincom.tn",
"nat.tn",
"net.tn",
"org.tn",
"perso.tn",
"tourism.tn",
"to",
"com.to",
"gov.to",
"net.to",
"org.to",
"edu.to",
"mil.to",
"tr",
"av.tr",
"bbs.tr",
"bel.tr",
"biz.tr",
"com.tr",
"dr.tr",
"edu.tr",
"gen.tr",
"gov.tr",
"info.tr",
"mil.tr",
"k12.tr",
"kep.tr",
"name.tr",
"net.tr",
"org.tr",
"pol.tr",
"tel.tr",
"tsk.tr",
"tv.tr",
"web.tr",
"nc.tr",
"gov.nc.tr",
"tt",
"co.tt",
"com.tt",
"org.tt",
"net.tt",
"biz.tt",
"info.tt",
"pro.tt",
"int.tt",
"coop.tt",
"jobs.tt",
"mobi.tt",
"travel.tt",
"museum.tt",
"aero.tt",
"name.tt",
"gov.tt",
"edu.tt",
"tv",
"tw",
"edu.tw",
"gov.tw",
"mil.tw",
"com.tw",
"net.tw",
"org.tw",
"idv.tw",
"game.tw",
"ebiz.tw",
"club.tw",
"網路.tw",
"組織.tw",
"商業.tw",
"tz",
"ac.tz",
"co.tz",
"go.tz",
"hotel.tz",
"info.tz",
"me.tz",
"mil.tz",
"mobi.tz",
"ne.tz",
"or.tz",
"sc.tz",
"tv.tz",
"ua",
"com.ua",
"edu.ua",
"gov.ua",
"in.ua",
"net.ua",
"org.ua",
"cherkassy.ua",
"cherkasy.ua",
"chernigov.ua",
"chernihiv.ua",
"chernivtsi.ua",
"chernovtsy.ua",
"ck.ua",
"cn.ua",
"cr.ua",
"crimea.ua",
"cv.ua",
"dn.ua",
"dnepropetrovsk.ua",
"dnipropetrovsk.ua",
"donetsk.ua",
"dp.ua",
"if.ua",
"ivano-frankivsk.ua",
"kh.ua",
"kharkiv.ua",
"kharkov.ua",
"kherson.ua",
"khmelnitskiy.ua",
"khmelnytskyi.ua",
"kiev.ua",
"kirovograd.ua",
"km.ua",
"kr.ua",
"krym.ua",
"ks.ua",
"kv.ua",
"kyiv.ua",
"lg.ua",
"lt.ua",
"lugansk.ua",
"lutsk.ua",
"lv.ua",
"lviv.ua",
"mk.ua",
"mykolaiv.ua",
"nikolaev.ua",
"od.ua",
"odesa.ua",
"odessa.ua",
"pl.ua",
"poltava.ua",
"rivne.ua",
"rovno.ua",
"rv.ua",
"sb.ua",
"sebastopol.ua",
"sevastopol.ua",
"sm.ua",
"sumy.ua",
"te.ua",
"ternopil.ua",
"uz.ua",
"uzhgorod.ua",
"vinnica.ua",
"vinnytsia.ua",
"vn.ua",
"volyn.ua",
"yalta.ua",
"zaporizhzhe.ua",
"zaporizhzhia.ua",
"zhitomir.ua",
"zhytomyr.ua",
"zp.ua",
"zt.ua",
"ug",
"co.ug",
"or.ug",
"ac.ug",
"sc.ug",
"go.ug",
"ne.ug",
"com.ug",
"org.ug",
"uk",
"ac.uk",
"co.uk",
"gov.uk",
"ltd.uk",
"me.uk",
"net.uk",
"nhs.uk",
"org.uk",
"plc.uk",
"police.uk",
"*.sch.uk",
"us",
"dni.us",
"fed.us",
"isa.us",
"kids.us",
"nsn.us",
"ak.us",
"al.us",
"ar.us",
"as.us",
"az.us",
"ca.us",
"co.us",
"ct.us",
"dc.us",
"de.us",
"fl.us",
"ga.us",
"gu.us",
"hi.us",
"ia.us",
"id.us",
"il.us",
"in.us",
"ks.us",
"ky.us",
"la.us",
"ma.us",
"md.us",
"me.us",
"mi.us",
"mn.us",
"mo.us",
"ms.us",
"mt.us",
"nc.us",
"nd.us",
"ne.us",
"nh.us",
"nj.us",
"nm.us",
"nv.us",
"ny.us",
"oh.us",
"ok.us",
"or.us",
"pa.us",
"pr.us",
"ri.us",
"sc.us",
"sd.us",
"tn.us",
"tx.us",
"ut.us",
"vi.us",
"vt.us",
"va.us",
"wa.us",
"wi.us",
"wv.us",
"wy.us",
"k12.ak.us",
"k12.al.us",
"k12.ar.us",
"k12.as.us",
"k12.az.us",
"k12.ca.us",
"k12.co.us",
"k12.ct.us",
"k12.dc.us",
"k12.de.us",
"k12.fl.us",
"k12.ga.us",
"k12.gu.us",
"k12.ia.us",
"k12.id.us",
"k12.il.us",
"k12.in.us",
"k12.ks.us",
"k12.ky.us",
"k12.la.us",
"k12.ma.us",
"k12.md.us",
"k12.me.us",
"k12.mi.us",
"k12.mn.us",
"k12.mo.us",
"k12.ms.us",
"k12.mt.us",
"k12.nc.us",
"k12.ne.us",
"k12.nh.us",
"k12.nj.us",
"k12.nm.us",
"k12.nv.us",
"k12.ny.us",
"k12.oh.us",
"k12.ok.us",
"k12.or.us",
"k12.pa.us",
"k12.pr.us",
"k12.sc.us",
"k12.tn.us",
"k12.tx.us",
"k12.ut.us",
"k12.vi.us",
"k12.vt.us",
"k12.va.us",
"k12.wa.us",
"k12.wi.us",
"k12.wy.us",
"cc.ak.us",
"cc.al.us",
"cc.ar.us",
"cc.as.us",
"cc.az.us",
"cc.ca.us",
"cc.co.us",
"cc.ct.us",
"cc.dc.us",
"cc.de.us",
"cc.fl.us",
"cc.ga.us",
"cc.gu.us",
"cc.hi.us",
"cc.ia.us",
"cc.id.us",
"cc.il.us",
"cc.in.us",
"cc.ks.us",
"cc.ky.us",
"cc.la.us",
"cc.ma.us",
"cc.md.us",
"cc.me.us",
"cc.mi.us",
"cc.mn.us",
"cc.mo.us",
"cc.ms.us",
"cc.mt.us",
"cc.nc.us",
"cc.nd.us",
"cc.ne.us",
"cc.nh.us",
"cc.nj.us",
"cc.nm.us",
"cc.nv.us",
"cc.ny.us",
"cc.oh.us",
"cc.ok.us",
"cc.or.us",
"cc.pa.us",
"cc.pr.us",
"cc.ri.us",
"cc.sc.us",
"cc.sd.us",
"cc.tn.us",
"cc.tx.us",
"cc.ut.us",
"cc.vi.us",
"cc.vt.us",
"cc.va.us",
"cc.wa.us",
"cc.wi.us",
"cc.wv.us",
"cc.wy.us",
"lib.ak.us",
"lib.al.us",
"lib.ar.us",
"lib.as.us",
"lib.az.us",
"lib.ca.us",
"lib.co.us",
"lib.ct.us",
"lib.dc.us",
"lib.fl.us",
"lib.ga.us",
"lib.gu.us",
"lib.hi.us",
"lib.ia.us",
"lib.id.us",
"lib.il.us",
"lib.in.us",
"lib.ks.us",
"lib.ky.us",
"lib.la.us",
"lib.ma.us",
"lib.md.us",
"lib.me.us",
"lib.mi.us",
"lib.mn.us",
"lib.mo.us",
"lib.ms.us",
"lib.mt.us",
"lib.nc.us",
"lib.nd.us",
"lib.ne.us",
"lib.nh.us",
"lib.nj.us",
"lib.nm.us",
"lib.nv.us",
"lib.ny.us",
"lib.oh.us",
"lib.ok.us",
"lib.or.us",
"lib.pa.us",
"lib.pr.us",
"lib.ri.us",
"lib.sc.us",
"lib.sd.us",
"lib.tn.us",
"lib.tx.us",
"lib.ut.us",
"lib.vi.us",
"lib.vt.us",
"lib.va.us",
"lib.wa.us",
"lib.wi.us",
"lib.wy.us",
"pvt.k12.ma.us",
"chtr.k12.ma.us",
"paroch.k12.ma.us",
"ann-arbor.mi.us",
"cog.mi.us",
"dst.mi.us",
"eaton.mi.us",
"gen.mi.us",
"mus.mi.us",
"tec.mi.us",
"washtenaw.mi.us",
"uy",
"com.uy",
"edu.uy",
"gub.uy",
"mil.uy",
"net.uy",
"org.uy",
"uz",
"co.uz",
"com.uz",
"net.uz",
"org.uz",
"va",
"vc",
"com.vc",
"net.vc",
"org.vc",
"gov.vc",
"mil.vc",
"edu.vc",
"ve",
"arts.ve",
"bib.ve",
"co.ve",
"com.ve",
"e12.ve",
"edu.ve",
"firm.ve",
"gob.ve",
"gov.ve",
"info.ve",
"int.ve",
"mil.ve",
"net.ve",
"nom.ve",
"org.ve",
"rar.ve",
"rec.ve",
"store.ve",
"tec.ve",
"web.ve",
"vg",
"vi",
"co.vi",
"com.vi",
"k12.vi",
"net.vi",
"org.vi",
"vn",
"com.vn",
"net.vn",
"org.vn",
"edu.vn",
"gov.vn",
"int.vn",
"ac.vn",
"biz.vn",
"info.vn",
"name.vn",
"pro.vn",
"health.vn",
"vu",
"com.vu",
"edu.vu",
"net.vu",
"org.vu",
"wf",
"ws",
"com.ws",
"net.ws",
"org.ws",
"gov.ws",
"edu.ws",
"yt",
"امارات",
"հայ",
"বাংলা",
"бг",
"البحرين",
"бел",
"中国",
"中國",
"الجزائر",
"مصر",
"ею",
"ευ",
"موريتانيا",
"გე",
"ελ",
"香港",
"公司.香港",
"教育.香港",
"政府.香港",
"個人.香港",
"網絡.香港",
"組織.香港",
"ಭಾರತ",
"ଭାରତ",
"ভাৰত",
"भारतम्",
"भारोत",
"ڀارت",
"ഭാരതം",
"भारत",
"بارت",
"بھارت",
"భారత్",
"ભારત",
"ਭਾਰਤ",
"ভারত",
"இந்தியா",
"ایران",
"ايران",
"عراق",
"الاردن",
"한국",
"қаз",
"ລາວ",
"ලංකා",
"இலங்கை",
"المغرب",
"мкд",
"мон",
"澳門",
"澳门",
"مليسيا",
"عمان",
"پاکستان",
"پاكستان",
"فلسطين",
"срб",
"пр.срб",
"орг.срб",
"обр.срб",
"од.срб",
"упр.срб",
"ак.срб",
"рф",
"قطر",
"السعودية",
"السعودیة",
"السعودیۃ",
"السعوديه",
"سودان",
"新加坡",
"சிங்கப்பூர்",
"سورية",
"سوريا",
"ไทย",
"ศึกษา.ไทย",
"ธุรกิจ.ไทย",
"รัฐบาล.ไทย",
"ทหาร.ไทย",
"เน็ต.ไทย",
"องค์กร.ไทย",
"تونس",
"台灣",
"台湾",
"臺灣",
"укр",
"اليمن",
"xxx",
"ye",
"com.ye",
"edu.ye",
"gov.ye",
"net.ye",
"mil.ye",
"org.ye",
"ac.za",
"agric.za",
"alt.za",
"co.za",
"edu.za",
"gov.za",
"grondar.za",
"law.za",
"mil.za",
"net.za",
"ngo.za",
"nic.za",
"nis.za",
"nom.za",
"org.za",
"school.za",
"tm.za",
"web.za",
"zm",
"ac.zm",
"biz.zm",
"co.zm",
"com.zm",
"edu.zm",
"gov.zm",
"info.zm",
"mil.zm",
"net.zm",
"org.zm",
"sch.zm",
"zw",
"ac.zw",
"co.zw",
"gov.zw",
"mil.zw",
"org.zw",
"aaa",
"aarp",
"abarth",
"abb",
"abbott",
"abbvie",
"abc",
"able",
"abogado",
"abudhabi",
"academy",
"accenture",
"accountant",
"accountants",
"aco",
"actor",
"adac",
"ads",
"adult",
"aeg",
"aetna",
"afl",
"africa",
"agakhan",
"agency",
"aig",
"airbus",
"airforce",
"airtel",
"akdn",
"alfaromeo",
"alibaba",
"alipay",
"allfinanz",
"allstate",
"ally",
"alsace",
"alstom",
"amazon",
"americanexpress",
"americanfamily",
"amex",
"amfam",
"amica",
"amsterdam",
"analytics",
"android",
"anquan",
"anz",
"aol",
"apartments",
"app",
"apple",
"aquarelle",
"arab",
"aramco",
"archi",
"army",
"art",
"arte",
"asda",
"associates",
"athleta",
"attorney",
"auction",
"audi",
"audible",
"audio",
"auspost",
"author",
"auto",
"autos",
"avianca",
"aws",
"axa",
"azure",
"baby",
"baidu",
"banamex",
"bananarepublic",
"band",
"bank",
"bar",
"barcelona",
"barclaycard",
"barclays",
"barefoot",
"bargains",
"baseball",
"basketball",
"bauhaus",
"bayern",
"bbc",
"bbt",
"bbva",
"bcg",
"bcn",
"beats",
"beauty",
"beer",
"bentley",
"berlin",
"best",
"bestbuy",
"bet",
"bharti",
"bible",
"bid",
"bike",
"bing",
"bingo",
"bio",
"black",
"blackfriday",
"blockbuster",
"blog",
"bloomberg",
"blue",
"bms",
"bmw",
"bnpparibas",
"boats",
"boehringer",
"bofa",
"bom",
"bond",
"boo",
"book",
"booking",
"bosch",
"bostik",
"boston",
"bot",
"boutique",
"box",
"bradesco",
"bridgestone",
"broadway",
"broker",
"brother",
"brussels",
"bugatti",
"build",
"builders",
"business",
"buy",
"buzz",
"bzh",
"cab",
"cafe",
"cal",
"call",
"calvinklein",
"cam",
"camera",
"camp",
"cancerresearch",
"canon",
"capetown",
"capital",
"capitalone",
"car",
"caravan",
"cards",
"care",
"career",
"careers",
"cars",
"casa",
"case",
"cash",
"casino",
"catering",
"catholic",
"cba",
"cbn",
"cbre",
"cbs",
"center",
"ceo",
"cern",
"cfa",
"cfd",
"chanel",
"channel",
"charity",
"chase",
"chat",
"cheap",
"chintai",
"christmas",
"chrome",
"church",
"cipriani",
"circle",
"cisco",
"citadel",
"citi",
"citic",
"city",
"cityeats",
"claims",
"cleaning",
"click",
"clinic",
"clinique",
"clothing",
"cloud",
"club",
"clubmed",
"coach",
"codes",
"coffee",
"college",
"cologne",
"comcast",
"commbank",
"community",
"company",
"compare",
"computer",
"comsec",
"condos",
"construction",
"consulting",
"contact",
"contractors",
"cooking",
"cookingchannel",
"cool",
"corsica",
"country",
"coupon",
"coupons",
"courses",
"cpa",
"credit",
"creditcard",
"creditunion",
"cricket",
"crown",
"crs",
"cruise",
"cruises",
"cuisinella",
"cymru",
"cyou",
"dabur",
"dad",
"dance",
"data",
"date",
"dating",
"datsun",
"day",
"dclk",
"dds",
"deal",
"dealer",
"deals",
"degree",
"delivery",
"dell",
"deloitte",
"delta",
"democrat",
"dental",
"dentist",
"desi",
"design",
"dev",
"dhl",
"diamonds",
"diet",
"digital",
"direct",
"directory",
"discount",
"discover",
"dish",
"diy",
"dnp",
"docs",
"doctor",
"dog",
"domains",
"dot",
"download",
"drive",
"dtv",
"dubai",
"dunlop",
"dupont",
"durban",
"dvag",
"dvr",
"earth",
"eat",
"eco",
"edeka",
"education",
"email",
"emerck",
"energy",
"engineer",
"engineering",
"enterprises",
"epson",
"equipment",
"ericsson",
"erni",
"esq",
"estate",
"etisalat",
"eurovision",
"eus",
"events",
"exchange",
"expert",
"exposed",
"express",
"extraspace",
"fage",
"fail",
"fairwinds",
"faith",
"family",
"fan",
"fans",
"farm",
"farmers",
"fashion",
"fast",
"fedex",
"feedback",
"ferrari",
"ferrero",
"fiat",
"fidelity",
"fido",
"film",
"final",
"finance",
"financial",
"fire",
"firestone",
"firmdale",
"fish",
"fishing",
"fit",
"fitness",
"flickr",
"flights",
"flir",
"florist",
"flowers",
"fly",
"foo",
"food",
"foodnetwork",
"football",
"ford",
"forex",
"forsale",
"forum",
"foundation",
"fox",
"free",
"fresenius",
"frl",
"frogans",
"frontdoor",
"frontier",
"ftr",
"fujitsu",
"fun",
"fund",
"furniture",
"futbol",
"fyi",
"gal",
"gallery",
"gallo",
"gallup",
"game",
"games",
"gap",
"garden",
"gay",
"gbiz",
"gdn",
"gea",
"gent",
"genting",
"george",
"ggee",
"gift",
"gifts",
"gives",
"giving",
"glass",
"gle",
"global",
"globo",
"gmail",
"gmbh",
"gmo",
"gmx",
"godaddy",
"gold",
"goldpoint",
"golf",
"goo",
"goodyear",
"goog",
"google",
"gop",
"got",
"grainger",
"graphics",
"gratis",
"green",
"gripe",
"grocery",
"group",
"guardian",
"gucci",
"guge",
"guide",
"guitars",
"guru",
"hair",
"hamburg",
"hangout",
"haus",
"hbo",
"hdfc",
"hdfcbank",
"health",
"healthcare",
"help",
"helsinki",
"here",
"hermes",
"hgtv",
"hiphop",
"hisamitsu",
"hitachi",
"hiv",
"hkt",
"hockey",
"holdings",
"holiday",
"homedepot",
"homegoods",
"homes",
"homesense",
"honda",
"horse",
"hospital",
"host",
"hosting",
"hot",
"hoteles",
"hotels",
"hotmail",
"house",
"how",
"hsbc",
"hughes",
"hyatt",
"hyundai",
"ibm",
"icbc",
"ice",
"icu",
"ieee",
"ifm",
"ikano",
"imamat",
"imdb",
"immo",
"immobilien",
"inc",
"industries",
"infiniti",
"ing",
"ink",
"institute",
"insurance",
"insure",
"international",
"intuit",
"investments",
"ipiranga",
"irish",
"ismaili",
"ist",
"istanbul",
"itau",
"itv",
"jaguar",
"java",
"jcb",
"jeep",
"jetzt",
"jewelry",
"jio",
"jll",
"jmp",
"jnj",
"joburg",
"jot",
"joy",
"jpmorgan",
"jprs",
"juegos",
"juniper",
"kaufen",
"kddi",
"kerryhotels",
"kerrylogistics",
"kerryproperties",
"kfh",
"kia",
"kids",
"kim",
"kinder",
"kindle",
"kitchen",
"kiwi",
"koeln",
"komatsu",
"kosher",
"kpmg",
"kpn",
"krd",
"kred",
"kuokgroup",
"kyoto",
"lacaixa",
"lamborghini",
"lamer",
"lancaster",
"lancia",
"land",
"landrover",
"lanxess",
"lasalle",
"lat",
"latino",
"latrobe",
"law",
"lawyer",
"lds",
"lease",
"leclerc",
"lefrak",
"legal",
"lego",
"lexus",
"lgbt",
"lidl",
"life",
"lifeinsurance",
"lifestyle",
"lighting",
"like",
"lilly",
"limited",
"limo",
"lincoln",
"linde",
"link",
"lipsy",
"live",
"living",
"llc",
"llp",
"loan",
"loans",
"locker",
"locus",
"loft",
"lol",
"london",
"lotte",
"lotto",
"love",
"lpl",
"lplfinancial",
"ltd",
"ltda",
"lundbeck",
"luxe",
"luxury",
"macys",
"madrid",
"maif",
"maison",
"makeup",
"man",
"management",
"mango",
"map",
"market",
"marketing",
"markets",
"marriott",
"marshalls",
"maserati",
"mattel",
"mba",
"mckinsey",
"med",
"media",
"meet",
"melbourne",
"meme",
"memorial",
"men",
"menu",
"merckmsd",
"miami",
"microsoft",
"mini",
"mint",
"mit",
"mitsubishi",
"mlb",
"mls",
"mma",
"mobile",
"moda",
"moe",
"moi",
"mom",
"monash",
"money",
"monster",
"mormon",
"mortgage",
"moscow",
"moto",
"motorcycles",
"mov",
"movie",
"msd",
"mtn",
"mtr",
"music",
"mutual",
"nab",
"nagoya",
"natura",
"navy",
"nba",
"nec",
"netbank",
"netflix",
"network",
"neustar",
"new",
"news",
"next",
"nextdirect",
"nexus",
"nfl",
"ngo",
"nhk",
"nico",
"nike",
"nikon",
"ninja",
"nissan",
"nissay",
"nokia",
"northwesternmutual",
"norton",
"now",
"nowruz",
"nowtv",
"nra",
"nrw",
"ntt",
"nyc",
"obi",
"observer",
"office",
"okinawa",
"olayan",
"olayangroup",
"oldnavy",
"ollo",
"omega",
"one",
"ong",
"onl",
"online",
"ooo",
"open",
"oracle",
"orange",
"organic",
"origins",
"osaka",
"otsuka",
"ott",
"ovh",
"page",
"panasonic",
"paris",
"pars",
"partners",
"parts",
"party",
"passagens",
"pay",
"pccw",
"pet",
"pfizer",
"pharmacy",
"phd",
"philips",
"phone",
"photo",
"photography",
"photos",
"physio",
"pics",
"pictet",
"pictures",
"pid",
"pin",
"ping",
"pink",
"pioneer",
"pizza",
"place",
"play",
"playstation",
"plumbing",
"plus",
"pnc",
"pohl",
"poker",
"politie",
"porn",
"pramerica",
"praxi",
"press",
"prime",
"prod",
"productions",
"prof",
"progressive",
"promo",
"properties",
"property",
"protection",
"pru",
"prudential",
"pub",
"pwc",
"qpon",
"quebec",
"quest",
"racing",
"radio",
"read",
"realestate",
"realtor",
"realty",
"recipes",
"red",
"redstone",
"redumbrella",
"rehab",
"reise",
"reisen",
"reit",
"reliance",
"ren",
"rent",
"rentals",
"repair",
"report",
"republican",
"rest",
"restaurant",
"review",
"reviews",
"rexroth",
"rich",
"richardli",
"ricoh",
"ril",
"rio",
"rip",
"rocher",
"rocks",
"rodeo",
"rogers",
"room",
"rsvp",
"rugby",
"ruhr",
"run",
"rwe",
"ryukyu",
"saarland",
"safe",
"safety",
"sakura",
"sale",
"salon",
"samsclub",
"samsung",
"sandvik",
"sandvikcoromant",
"sanofi",
"sap",
"sarl",
"sas",
"save",
"saxo",
"sbi",
"sbs",
"sca",
"scb",
"schaeffler",
"schmidt",
"scholarships",
"school",
"schule",
"schwarz",
"science",
"scot",
"search",
"seat",
"secure",
"security",
"seek",
"select",
"sener",
"services",
"ses",
"seven",
"sew",
"sex",
"sexy",
"sfr",
"shangrila",
"sharp",
"shaw",
"shell",
"shia",
"shiksha",
"shoes",
"shop",
"shopping",
"shouji",
"show",
"showtime",
"silk",
"sina",
"singles",
"site",
"ski",
"skin",
"sky",
"skype",
"sling",
"smart",
"smile",
"sncf",
"soccer",
"social",
"softbank",
"software",
"sohu",
"solar",
"solutions",
"song",
"sony",
"soy",
"spa",
"space",
"sport",
"spot",
"srl",
"stada",
"staples",
"star",
"statebank",
"statefarm",
"stc",
"stcgroup",
"stockholm",
"storage",
"store",
"stream",
"studio",
"study",
"style",
"sucks",
"supplies",
"supply",
"support",
"surf",
"surgery",
"suzuki",
"swatch",
"swiss",
"sydney",
"systems",
"tab",
"taipei",
"talk",
"taobao",
"target",
"tatamotors",
"tatar",
"tattoo",
"tax",
"taxi",
"tci",
"tdk",
"team",
"tech",
"technology",
"temasek",
"tennis",
"teva",
"thd",
"theater",
"theatre",
"tiaa",
"tickets",
"tienda",
"tiffany",
"tips",
"tires",
"tirol",
"tjmaxx",
"tjx",
"tkmaxx",
"tmall",
"today",
"tokyo",
"tools",
"top",
"toray",
"toshiba",
"total",
"tours",
"town",
"toyota",
"toys",
"trade",
"trading",
"training",
"travel",
"travelchannel",
"travelers",
"travelersinsurance",
"trust",
"trv",
"tube",
"tui",
"tunes",
"tushu",
"tvs",
"ubank",
"ubs",
"unicom",
"university",
"uno",
"uol",
"ups",
"vacations",
"vana",
"vanguard",
"vegas",
"ventures",
"verisign",
"versicherung",
"vet",
"viajes",
"video",
"vig",
"viking",
"villas",
"vin",
"vip",
"virgin",
"visa",
"vision",
"viva",
"vivo",
"vlaanderen",
"vodka",
"volkswagen",
"volvo",
"vote",
"voting",
"voto",
"voyage",
"vuelos",
"wales",
"walmart",
"walter",
"wang",
"wanggou",
"watch",
"watches",
"weather",
"weatherchannel",
"webcam",
"weber",
"website",
"wedding",
"weibo",
"weir",
"whoswho",
"wien",
"wiki",
"williamhill",
"win",
"windows",
"wine",
"winners",
"wme",
"wolterskluwer",
"woodside",
"work",
"works",
"world",
"wow",
"wtc",
"wtf",
"xbox",
"xerox",
"xfinity",
"xihuan",
"xin",
"कॉम",
"セール",
"佛山",
"慈善",
"集团",
"在线",
"点看",
"คอม",
"八卦",
"موقع",
"公益",
"公司",
"香格里拉",
"网站",
"移动",
"我爱你",
"москва",
"католик",
"онлайн",
"сайт",
"联通",
"קום",
"时尚",
"微博",
"淡马锡",
"ファッション",
"орг",
"नेट",
"ストア",
"アマゾン",
"삼성",
"商标",
"商店",
"商城",
"дети",
"ポイント",
"新闻",
"家電",
"كوم",
"中文网",
"中信",
"娱乐",
"谷歌",
"電訊盈科",
"购物",
"クラウド",
"通販",
"网店",
"संगठन",
"餐厅",
"网络",
"ком",
"亚马逊",
"诺基亚",
"食品",
"飞利浦",
"手机",
"ارامكو",
"العليان",
"اتصالات",
"بازار",
"ابوظبي",
"كاثوليك",
"همراه",
"닷컴",
"政府",
"شبكة",
"بيتك",
"عرب",
"机构",
"组织机构",
"健康",
"招聘",
"рус",
"大拿",
"みんな",
"グーグル",
"世界",
"書籍",
"网址",
"닷넷",
"コム",
"天主教",
"游戏",
"vermögensberater",
"vermögensberatung",
"企业",
"信息",
"嘉里大酒店",
"嘉里",
"广东",
"政务",
"xyz",
"yachts",
"yahoo",
"yamaxun",
"yandex",
"yodobashi",
"yoga",
"yokohama",
"you",
"youtube",
"yun",
"zappos",
"zara",
"zero",
"zip",
"zone",
"zuerich",
"cc.ua",
"inf.ua",
"ltd.ua",
"611.to",
"graphox.us",
"*.devcdnaccesso.com",
"adobeaemcloud.com",
"*.dev.adobeaemcloud.com",
"hlx.live",
"adobeaemcloud.net",
"hlx.page",
"hlx3.page",
"beep.pl",
"airkitapps.com",
"airkitapps-au.com",
"airkitapps.eu",
"aivencloud.com",
"barsy.ca",
"*.compute.estate",
"*.alces.network",
"kasserver.com",
"altervista.org",
"alwaysdata.net",
"cloudfront.net",
"*.compute.amazonaws.com",
"*.compute-1.amazonaws.com",
"*.compute.amazonaws.com.cn",
"us-east-1.amazonaws.com",
"cn-north-1.eb.amazonaws.com.cn",
"cn-northwest-1.eb.amazonaws.com.cn",
"elasticbeanstalk.com",
"ap-northeast-1.elasticbeanstalk.com",
"ap-northeast-2.elasticbeanstalk.com",
"ap-northeast-3.elasticbeanstalk.com",
"ap-south-1.elasticbeanstalk.com",
"ap-southeast-1.elasticbeanstalk.com",
"ap-southeast-2.elasticbeanstalk.com",
"ca-central-1.elasticbeanstalk.com",
"eu-central-1.elasticbeanstalk.com",
"eu-west-1.elasticbeanstalk.com",
"eu-west-2.elasticbeanstalk.com",
"eu-west-3.elasticbeanstalk.com",
"sa-east-1.elasticbeanstalk.com",
"us-east-1.elasticbeanstalk.com",
"us-east-2.elasticbeanstalk.com",
"us-gov-west-1.elasticbeanstalk.com",
"us-west-1.elasticbeanstalk.com",
"us-west-2.elasticbeanstalk.com",
"*.elb.amazonaws.com",
"*.elb.amazonaws.com.cn",
"awsglobalaccelerator.com",
"s3.amazonaws.com",
"s3-ap-northeast-1.amazonaws.com",
"s3-ap-northeast-2.amazonaws.com",
"s3-ap-south-1.amazonaws.com",
"s3-ap-southeast-1.amazonaws.com",
"s3-ap-southeast-2.amazonaws.com",
"s3-ca-central-1.amazonaws.com",
"s3-eu-central-1.amazonaws.com",
"s3-eu-west-1.amazonaws.com",
"s3-eu-west-2.amazonaws.com",
"s3-eu-west-3.amazonaws.com",
"s3-external-1.amazonaws.com",
"s3-fips-us-gov-west-1.amazonaws.com",
"s3-sa-east-1.amazonaws.com",
"s3-us-gov-west-1.amazonaws.com",
"s3-us-east-2.amazonaws.com",
"s3-us-west-1.amazonaws.com",
"s3-us-west-2.amazonaws.com",
"s3.ap-northeast-2.amazonaws.com",
"s3.ap-south-1.amazonaws.com",
"s3.cn-north-1.amazonaws.com.cn",
"s3.ca-central-1.amazonaws.com",
"s3.eu-central-1.amazonaws.com",
"s3.eu-west-2.amazonaws.com",
"s3.eu-west-3.amazonaws.com",
"s3.us-east-2.amazonaws.com",
"s3.dualstack.ap-northeast-1.amazonaws.com",
"s3.dualstack.ap-northeast-2.amazonaws.com",
"s3.dualstack.ap-south-1.amazonaws.com",
"s3.dualstack.ap-southeast-1.amazonaws.com",
"s3.dualstack.ap-southeast-2.amazonaws.com",
"s3.dualstack.ca-central-1.amazonaws.com",
"s3.dualstack.eu-central-1.amazonaws.com",
"s3.dualstack.eu-west-1.amazonaws.com",
"s3.dualstack.eu-west-2.amazonaws.com",
"s3.dualstack.eu-west-3.amazonaws.com",
"s3.dualstack.sa-east-1.amazonaws.com",
"s3.dualstack.us-east-1.amazonaws.com",
"s3.dualstack.us-east-2.amazonaws.com",
"s3-website-us-east-1.amazonaws.com",
"s3-website-us-west-1.amazonaws.com",
"s3-website-us-west-2.amazonaws.com",
"s3-website-ap-northeast-1.amazonaws.com",
"s3-website-ap-southeast-1.amazonaws.com",
"s3-website-ap-southeast-2.amazonaws.com",
"s3-website-eu-west-1.amazonaws.com",
"s3-website-sa-east-1.amazonaws.com",
"s3-website.ap-northeast-2.amazonaws.com",
"s3-website.ap-south-1.amazonaws.com",
"s3-website.ca-central-1.amazonaws.com",
"s3-website.eu-central-1.amazonaws.com",
"s3-website.eu-west-2.amazonaws.com",
"s3-website.eu-west-3.amazonaws.com",
"s3-website.us-east-2.amazonaws.com",
"t3l3p0rt.net",
"tele.amune.org",
"apigee.io",
"siiites.com",
"appspacehosted.com",
"appspaceusercontent.com",
"appudo.net",
"on-aptible.com",
"user.aseinet.ne.jp",
"gv.vc",
"d.gv.vc",
"user.party.eus",
"pimienta.org",
"poivron.org",
"potager.org",
"sweetpepper.org",
"myasustor.com",
"cdn.prod.atlassian-dev.net",
"translated.page",
"myfritz.net",
"onavstack.net",
"*.awdev.ca",
"*.advisor.ws",
"ecommerce-shop.pl",
"b-data.io",
"backplaneapp.io",
"balena-devices.com",
"rs.ba",
"*.banzai.cloud",
"app.banzaicloud.io",
"*.backyards.banzaicloud.io",
"base.ec",
"official.ec",
"buyshop.jp",
"fashionstore.jp",
"handcrafted.jp",
"kawaiishop.jp",
"supersale.jp",
"theshop.jp",
"shopselect.net",
"base.shop",
"*.beget.app",
"betainabox.com",
"bnr.la",
"bitbucket.io",
"blackbaudcdn.net",
"of.je",
"bluebite.io",
"boomla.net",
"boutir.com",
"boxfuse.io",
"square7.ch",
"bplaced.com",
"bplaced.de",
"square7.de",
"bplaced.net",
"square7.net",
"shop.brendly.rs",
"browsersafetymark.io",
"uk0.bigv.io",
"dh.bytemark.co.uk",
"vm.bytemark.co.uk",
"cafjs.com",
"mycd.eu",
"drr.ac",
"uwu.ai",
"carrd.co",
"crd.co",
"ju.mp",
"ae.org",
"br.com",
"cn.com",
"com.de",
"com.se",
"de.com",
"eu.com",
"gb.net",
"hu.net",
"jp.net",
"jpn.com",
"mex.com",
"ru.com",
"sa.com",
"se.net",
"uk.com",
"uk.net",
"us.com",
"za.bz",
"za.com",
"ar.com",
"hu.com",
"kr.com",
"no.com",
"qc.com",
"uy.com",
"africa.com",
"gr.com",
"in.net",
"web.in",
"us.org",
"co.com",
"aus.basketball",
"nz.basketball",
"radio.am",
"radio.fm",
"c.la",
"certmgr.org",
"cx.ua",
"discourse.group",
"discourse.team",
"cleverapps.io",
"clerk.app",
"clerkstage.app",
"*.lcl.dev",
"*.lclstage.dev",
"*.stg.dev",
"*.stgstage.dev",
"clickrising.net",
"c66.me",
"cloud66.ws",
"cloud66.zone",
"jdevcloud.com",
"wpdevcloud.com",
"cloudaccess.host",
"freesite.host",
"cloudaccess.net",
"cloudcontrolled.com",
"cloudcontrolapp.com",
"*.cloudera.site",
"pages.dev",
"trycloudflare.com",
"workers.dev",
"wnext.app",
"co.ca",
"*.otap.co",
"co.cz",
"c.cdn77.org",
"cdn77-ssl.net",
"r.cdn77.net",
"rsc.cdn77.org",
"ssl.origin.cdn77-secure.org",
"cloudns.asia",
"cloudns.biz",
"cloudns.club",
"cloudns.cc",
"cloudns.eu",
"cloudns.in",
"cloudns.info",
"cloudns.org",
"cloudns.pro",
"cloudns.pw",
"cloudns.us",
"cnpy.gdn",
"codeberg.page",
"co.nl",
"co.no",
"webhosting.be",
"hosting-cluster.nl",
"ac.ru",
"edu.ru",
"gov.ru",
"int.ru",
"mil.ru",
"test.ru",
"dyn.cosidns.de",
"dynamisches-dns.de",
"dnsupdater.de",
"internet-dns.de",
"l-o-g-i-n.de",
"dynamic-dns.info",
"feste-ip.net",
"knx-server.net",
"static-access.net",
"realm.cz",
"*.cryptonomic.net",
"cupcake.is",
"curv.dev",
"*.customer-oci.com",
"*.oci.customer-oci.com",
"*.ocp.customer-oci.com",
"*.ocs.customer-oci.com",
"cyon.link",
"cyon.site",
"fnwk.site",
"folionetwork.site",
"platform0.app",
"daplie.me",
"localhost.daplie.me",
"dattolocal.com",
"dattorelay.com",
"dattoweb.com",
"mydatto.com",
"dattolocal.net",
"mydatto.net",
"biz.dk",
"co.dk",
"firm.dk",
"reg.dk",
"store.dk",
"dyndns.dappnode.io",
"*.dapps.earth",
"*.bzz.dapps.earth",
"builtwithdark.com",
"demo.datadetect.com",
"instance.datadetect.com",
"edgestack.me",
"ddns5.com",
"debian.net",
"deno.dev",
"deno-staging.dev",
"dedyn.io",
"deta.app",
"deta.dev",
"*.rss.my.id",
"*.diher.solutions",
"discordsays.com",
"discordsez.com",
"jozi.biz",
"dnshome.de",
"online.th",
"shop.th",
"drayddns.com",
"shoparena.pl",
"dreamhosters.com",
"mydrobo.com",
"drud.io",
"drud.us",
"duckdns.org",
"bip.sh",
"bitbridge.net",
"dy.fi",
"tunk.org",
"dyndns-at-home.com",
"dyndns-at-work.com",
"dyndns-blog.com",
"dyndns-free.com",
"dyndns-home.com",
"dyndns-ip.com",
"dyndns-mail.com",
"dyndns-office.com",
"dyndns-pics.com",
"dyndns-remote.com",
"dyndns-server.com",
"dyndns-web.com",
"dyndns-wiki.com",
"dyndns-work.com",
"dyndns.biz",
"dyndns.info",
"dyndns.org",
"dyndns.tv",
"at-band-camp.net",
"ath.cx",
"barrel-of-knowledge.info",
"barrell-of-knowledge.info",
"better-than.tv",
"blogdns.com",
"blogdns.net",
"blogdns.org",
"blogsite.org",
"boldlygoingnowhere.org",
"broke-it.net",
"buyshouses.net",
"cechire.com",
"dnsalias.com",
"dnsalias.net",
"dnsalias.org",
"dnsdojo.com",
"dnsdojo.net",
"dnsdojo.org",
"does-it.net",
"doesntexist.com",
"doesntexist.org",
"dontexist.com",
"dontexist.net",
"dontexist.org",
"doomdns.com",
"doomdns.org",
"dvrdns.org",
"dyn-o-saur.com",
"dynalias.com",
"dynalias.net",
"dynalias.org",
"dynathome.net",
"dyndns.ws",
"endofinternet.net",
"endofinternet.org",
"endoftheinternet.org",
"est-a-la-maison.com",
"est-a-la-masion.com",
"est-le-patron.com",
"est-mon-blogueur.com",
"for-better.biz",
"for-more.biz",
"for-our.info",
"for-some.biz",
"for-the.biz",
"forgot.her.name",
"forgot.his.name",
"from-ak.com",
"from-al.com",
"from-ar.com",
"from-az.net",
"from-ca.com",
"from-co.net",
"from-ct.com",
"from-dc.com",
"from-de.com",
"from-fl.com",
"from-ga.com",
"from-hi.com",
"from-ia.com",
"from-id.com",
"from-il.com",
"from-in.com",
"from-ks.com",
"from-ky.com",
"from-la.net",
"from-ma.com",
"from-md.com",
"from-me.org",
"from-mi.com",
"from-mn.com",
"from-mo.com",
"from-ms.com",
"from-mt.com",
"from-nc.com",
"from-nd.com",
"from-ne.com",
"from-nh.com",
"from-nj.com",
"from-nm.com",
"from-nv.com",
"from-ny.net",
"from-oh.com",
"from-ok.com",
"from-or.com",
"from-pa.com",
"from-pr.com",
"from-ri.com",
"from-sc.com",
"from-sd.com",
"from-tn.com",
"from-tx.com",
"from-ut.com",
"from-va.com",
"from-vt.com",
"from-wa.com",
"from-wi.com",
"from-wv.com",
"from-wy.com",
"ftpaccess.cc",
"fuettertdasnetz.de",
"game-host.org",
"game-server.cc",
"getmyip.com",
"gets-it.net",
"go.dyndns.org",
"gotdns.com",
"gotdns.org",
"groks-the.info",
"groks-this.info",
"ham-radio-op.net",
"here-for-more.info",
"hobby-site.com",
"hobby-site.org",
"home.dyndns.org",
"homedns.org",
"homeftp.net",
"homeftp.org",
"homeip.net",
"homelinux.com",
"homelinux.net",
"homelinux.org",
"homeunix.com",
"homeunix.net",
"homeunix.org",
"iamallama.com",
"in-the-band.net",
"is-a-anarchist.com",
"is-a-blogger.com",
"is-a-bookkeeper.com",
"is-a-bruinsfan.org",
"is-a-bulls-fan.com",
"is-a-candidate.org",
"is-a-caterer.com",
"is-a-celticsfan.org",
"is-a-chef.com",
"is-a-chef.net",
"is-a-chef.org",
"is-a-conservative.com",
"is-a-cpa.com",
"is-a-cubicle-slave.com",
"is-a-democrat.com",
"is-a-designer.com",
"is-a-doctor.com",
"is-a-financialadvisor.com",
"is-a-geek.com",
"is-a-geek.net",
"is-a-geek.org",
"is-a-green.com",
"is-a-guru.com",
"is-a-hard-worker.com",
"is-a-hunter.com",
"is-a-knight.org",
"is-a-landscaper.com",
"is-a-lawyer.com",
"is-a-liberal.com",
"is-a-libertarian.com",
"is-a-linux-user.org",
"is-a-llama.com",
"is-a-musician.com",
"is-a-nascarfan.com",
"is-a-nurse.com",
"is-a-painter.com",
"is-a-patsfan.org",
"is-a-personaltrainer.com",
"is-a-photographer.com",
"is-a-player.com",
"is-a-republican.com",
"is-a-rockstar.com",
"is-a-socialist.com",
"is-a-soxfan.org",
"is-a-student.com",
"is-a-teacher.com",
"is-a-techie.com",
"is-a-therapist.com",
"is-an-accountant.com",
"is-an-actor.com",
"is-an-actress.com",
"is-an-anarchist.com",
"is-an-artist.com",
"is-an-engineer.com",
"is-an-entertainer.com",
"is-by.us",
"is-certified.com",
"is-found.org",
"is-gone.com",
"is-into-anime.com",
"is-into-cars.com",
"is-into-cartoons.com",
"is-into-games.com",
"is-leet.com",
"is-lost.org",
"is-not-certified.com",
"is-saved.org",
"is-slick.com",
"is-uberleet.com",
"is-very-bad.org",
"is-very-evil.org",
"is-very-good.org",
"is-very-nice.org",
"is-very-sweet.org",
"is-with-theband.com",
"isa-geek.com",
"isa-geek.net",
"isa-geek.org",
"isa-hockeynut.com",
"issmarterthanyou.com",
"isteingeek.de",
"istmein.de",
"kicks-ass.net",
"kicks-ass.org",
"knowsitall.info",
"land-4-sale.us",
"lebtimnetz.de",
"leitungsen.de",
"likes-pie.com",
"likescandy.com",
"merseine.nu",
"mine.nu",
"misconfused.org",
"mypets.ws",
"myphotos.cc",
"neat-url.com",
"office-on-the.net",
"on-the-web.tv",
"podzone.net",
"podzone.org",
"readmyblog.org",
"saves-the-whales.com",
"scrapper-site.net",
"scrapping.cc",
"selfip.biz",
"selfip.com",
"selfip.info",
"selfip.net",
"selfip.org",
"sells-for-less.com",
"sells-for-u.com",
"sells-it.net",
"sellsyourhome.org",
"servebbs.com",
"servebbs.net",
"servebbs.org",
"serveftp.net",
"serveftp.org",
"servegame.org",
"shacknet.nu",
"simple-url.com",
"space-to-rent.com",
"stuff-4-sale.org",
"stuff-4-sale.us",
"teaches-yoga.com",
"thruhere.net",
"traeumtgerade.de",
"webhop.biz",
"webhop.info",
"webhop.net",
"webhop.org",
"worse-than.tv",
"writesthisblog.com",
"ddnss.de",
"dyn.ddnss.de",
"dyndns.ddnss.de",
"dyndns1.de",
"dyn-ip24.de",
"home-webserver.de",
"dyn.home-webserver.de",
"myhome-server.de",
"ddnss.org",
"definima.net",
"definima.io",
"ondigitalocean.app",
"*.digitaloceanspaces.com",
"bci.dnstrace.pro",
"ddnsfree.com",
"ddnsgeek.com",
"giize.com",
"gleeze.com",
"kozow.com",
"loseyourip.com",
"ooguy.com",
"theworkpc.com",
"casacam.net",
"dynu.net",
"accesscam.org",
"camdvr.org",
"freeddns.org",
"mywire.org",
"webredirect.org",
"myddns.rocks",
"blogsite.xyz",
"dynv6.net",
"e4.cz",
"eero.online",
"eero-stage.online",
"elementor.cloud",
"elementor.cool",
"en-root.fr",
"mytuleap.com",
"tuleap-partners.com",
"encr.app",
"encoreapi.com",
"onred.one",
"staging.onred.one",
"eu.encoway.cloud",
"eu.org",
"al.eu.org",
"asso.eu.org",
"at.eu.org",
"au.eu.org",
"be.eu.org",
"bg.eu.org",
"ca.eu.org",
"cd.eu.org",
"ch.eu.org",
"cn.eu.org",
"cy.eu.org",
"cz.eu.org",
"de.eu.org",
"dk.eu.org",
"edu.eu.org",
"ee.eu.org",
"es.eu.org",
"fi.eu.org",
"fr.eu.org",
"gr.eu.org",
"hr.eu.org",
"hu.eu.org",
"ie.eu.org",
"il.eu.org",
"in.eu.org",
"int.eu.org",
"is.eu.org",
"it.eu.org",
"jp.eu.org",
"kr.eu.org",
"lt.eu.org",
"lu.eu.org",
"lv.eu.org",
"mc.eu.org",
"me.eu.org",
"mk.eu.org",
"mt.eu.org",
"my.eu.org",
"net.eu.org",
"ng.eu.org",
"nl.eu.org",
"no.eu.org",
"nz.eu.org",
"paris.eu.org",
"pl.eu.org",
"pt.eu.org",
"q-a.eu.org",
"ro.eu.org",
"ru.eu.org",
"se.eu.org",
"si.eu.org",
"sk.eu.org",
"tr.eu.org",
"uk.eu.org",
"us.eu.org",
"eurodir.ru",
"eu-1.evennode.com",
"eu-2.evennode.com",
"eu-3.evennode.com",
"eu-4.evennode.com",
"us-1.evennode.com",
"us-2.evennode.com",
"us-3.evennode.com",
"us-4.evennode.com",
"twmail.cc",
"twmail.net",
"twmail.org",
"mymailer.com.tw",
"url.tw",
"onfabrica.com",
"apps.fbsbx.com",
"ru.net",
"adygeya.ru",
"bashkiria.ru",
"bir.ru",
"cbg.ru",
"com.ru",
"dagestan.ru",
"grozny.ru",
"kalmykia.ru",
"kustanai.ru",
"marine.ru",
"mordovia.ru",
"msk.ru",
"mytis.ru",
"nalchik.ru",
"nov.ru",
"pyatigorsk.ru",
"spb.ru",
"vladikavkaz.ru",
"vladimir.ru",
"abkhazia.su",
"adygeya.su",
"aktyubinsk.su",
"arkhangelsk.su",
"armenia.su",
"ashgabad.su",
"azerbaijan.su",
"balashov.su",
"bashkiria.su",
"bryansk.su",
"bukhara.su",
"chimkent.su",
"dagestan.su",
"east-kazakhstan.su",
"exnet.su",
"georgia.su",
"grozny.su",
"ivanovo.su",
"jambyl.su",
"kalmykia.su",
"kaluga.su",
"karacol.su",
"karaganda.su",
"karelia.su",
"khakassia.su",
"krasnodar.su",
"kurgan.su",
"kustanai.su",
"lenug.su",
"mangyshlak.su",
"mordovia.su",
"msk.su",
"murmansk.su",
"nalchik.su",
"navoi.su",
"north-kazakhstan.su",
"nov.su",
"obninsk.su",
"penza.su",
"pokrovsk.su",
"sochi.su",
"spb.su",
"tashkent.su",
"termez.su",
"togliatti.su",
"troitsk.su",
"tselinograd.su",
"tula.su",
"tuva.su",
"vladikavkaz.su",
"vladimir.su",
"vologda.su",
"channelsdvr.net",
"u.channelsdvr.net",
"edgecompute.app",
"fastly-terrarium.com",
"fastlylb.net",
"map.fastlylb.net",
"freetls.fastly.net",
"map.fastly.net",
"a.prod.fastly.net",
"global.prod.fastly.net",
"a.ssl.fastly.net",
"b.ssl.fastly.net",
"global.ssl.fastly.net",
"fastvps-server.com",
"fastvps.host",
"myfast.host",
"fastvps.site",
"myfast.space",
"fedorainfracloud.org",
"fedorapeople.org",
"cloud.fedoraproject.org",
"app.os.fedoraproject.org",
"app.os.stg.fedoraproject.org",
"conn.uk",
"copro.uk",
"hosp.uk",
"mydobiss.com",
"fh-muenster.io",
"filegear.me",
"filegear-au.me",
"filegear-de.me",
"filegear-gb.me",
"filegear-ie.me",
"filegear-jp.me",
"filegear-sg.me",
"firebaseapp.com",
"fireweb.app",
"flap.id",
"onflashdrive.app",
"fldrv.com",
"fly.dev",
"edgeapp.net",
"shw.io",
"flynnhosting.net",
"forgeblocks.com",
"id.forgerock.io",
"framer.app",
"framercanvas.com",
"*.frusky.de",
"ravpage.co.il",
"0e.vc",
"freebox-os.com",
"freeboxos.com",
"fbx-os.fr",
"fbxos.fr",
"freebox-os.fr",
"freeboxos.fr",
"freedesktop.org",
"freemyip.com",
"wien.funkfeuer.at",
"*.futurecms.at",
"*.ex.futurecms.at",
"*.in.futurecms.at",
"futurehosting.at",
"futuremailing.at",
"*.ex.ortsinfo.at",
"*.kunden.ortsinfo.at",
"*.statics.cloud",
"independent-commission.uk",
"independent-inquest.uk",
"independent-inquiry.uk",
"independent-panel.uk",
"independent-review.uk",
"public-inquiry.uk",
"royal-commission.uk",
"campaign.gov.uk",
"service.gov.uk",
"api.gov.uk",
"gehirn.ne.jp",
"usercontent.jp",
"gentapps.com",
"gentlentapis.com",
"lab.ms",
"cdn-edges.net",
"ghost.io",
"gsj.bz",
"githubusercontent.com",
"githubpreview.dev",
"github.io",
"gitlab.io",
"gitapp.si",
"gitpage.si",
"glitch.me",
"nog.community",
"co.ro",
"shop.ro",
"lolipop.io",
"angry.jp",
"babyblue.jp",
"babymilk.jp",
"backdrop.jp",
"bambina.jp",
"bitter.jp",
"blush.jp",
"boo.jp",
"boy.jp",
"boyfriend.jp",
"but.jp",
"candypop.jp",
"capoo.jp",
"catfood.jp",
"cheap.jp",
"chicappa.jp",
"chillout.jp",
"chips.jp",
"chowder.jp",
"chu.jp",
"ciao.jp",
"cocotte.jp",
"coolblog.jp",
"cranky.jp",
"cutegirl.jp",
"daa.jp",
"deca.jp",
"deci.jp",
"digick.jp",
"egoism.jp",
"fakefur.jp",
"fem.jp",
"flier.jp",
"floppy.jp",
"fool.jp",
"frenchkiss.jp",
"girlfriend.jp",
"girly.jp",
"gloomy.jp",
"gonna.jp",
"greater.jp",
"hacca.jp",
"heavy.jp",
"her.jp",
"hiho.jp",
"hippy.jp",
"holy.jp",
"hungry.jp",
"icurus.jp",
"itigo.jp",
"jellybean.jp",
"kikirara.jp",
"kill.jp",
"kilo.jp",
"kuron.jp",
"littlestar.jp",
"lolipopmc.jp",
"lolitapunk.jp",
"lomo.jp",
"lovepop.jp",
"lovesick.jp",
"main.jp",
"mods.jp",
"mond.jp",
"mongolian.jp",
"moo.jp",
"namaste.jp",
"nikita.jp",
"nobushi.jp",
"noor.jp",
"oops.jp",
"parallel.jp",
"parasite.jp",
"pecori.jp",
"peewee.jp",
"penne.jp",
"pepper.jp",
"perma.jp",
"pigboat.jp",
"pinoko.jp",
"punyu.jp",
"pupu.jp",
"pussycat.jp",
"pya.jp",
"raindrop.jp",
"readymade.jp",
"sadist.jp",
"schoolbus.jp",
"secret.jp",
"staba.jp",
"stripper.jp",
"sub.jp",
"sunnyday.jp",
"thick.jp",
"tonkotsu.jp",
"under.jp",
"upper.jp",
"velvet.jp",
"verse.jp",
"versus.jp",
"vivian.jp",
"watson.jp",
"weblike.jp",
"whitesnow.jp",
"zombie.jp",
"heteml.net",
"cloudapps.digital",
"london.cloudapps.digital",
"pymnt.uk",
"homeoffice.gov.uk",
"ro.im",
"goip.de",
"run.app",
"a.run.app",
"web.app",
"*.0emm.com",
"appspot.com",
"*.r.appspot.com",
"codespot.com",
"googleapis.com",
"googlecode.com",
"pagespeedmobilizer.com",
"publishproxy.com",
"withgoogle.com",
"withyoutube.com",
"*.gateway.dev",
"cloud.goog",
"translate.goog",
"*.usercontent.goog",
"cloudfunctions.net",
"blogspot.ae",
"blogspot.al",
"blogspot.am",
"blogspot.ba",
"blogspot.be",
"blogspot.bg",
"blogspot.bj",
"blogspot.ca",
"blogspot.cf",
"blogspot.ch",
"blogspot.cl",
"blogspot.co.at",
"blogspot.co.id",
"blogspot.co.il",
"blogspot.co.ke",
"blogspot.co.nz",
"blogspot.co.uk",
"blogspot.co.za",
"blogspot.com",
"blogspot.com.ar",
"blogspot.com.au",
"blogspot.com.br",
"blogspot.com.by",
"blogspot.com.co",
"blogspot.com.cy",
"blogspot.com.ee",
"blogspot.com.eg",
"blogspot.com.es",
"blogspot.com.mt",
"blogspot.com.ng",
"blogspot.com.tr",
"blogspot.com.uy",
"blogspot.cv",
"blogspot.cz",
"blogspot.de",
"blogspot.dk",
"blogspot.fi",
"blogspot.fr",
"blogspot.gr",
"blogspot.hk",
"blogspot.hr",
"blogspot.hu",
"blogspot.ie",
"blogspot.in",
"blogspot.is",
"blogspot.it",
"blogspot.jp",
"blogspot.kr",
"blogspot.li",
"blogspot.lt",
"blogspot.lu",
"blogspot.md",
"blogspot.mk",
"blogspot.mr",
"blogspot.mx",
"blogspot.my",
"blogspot.nl",
"blogspot.no",
"blogspot.pe",
"blogspot.pt",
"blogspot.qa",
"blogspot.re",
"blogspot.ro",
"blogspot.rs",
"blogspot.ru",
"blogspot.se",
"blogspot.sg",
"blogspot.si",
"blogspot.sk",
"blogspot.sn",
"blogspot.td",
"blogspot.tw",
"blogspot.ug",
"blogspot.vn",
"goupile.fr",
"gov.nl",
"awsmppl.com",
"günstigbestellen.de",
"günstigliefern.de",
"fin.ci",
"free.hr",
"caa.li",
"ua.rs",
"conf.se",
"hs.zone",
"hs.run",
"hashbang.sh",
"hasura.app",
"hasura-app.io",
"pages.it.hs-heilbronn.de",
"hepforge.org",
"herokuapp.com",
"herokussl.com",
"ravendb.cloud",
"myravendb.com",
"ravendb.community",
"ravendb.me",
"development.run",
"ravendb.run",
"homesklep.pl",
"secaas.hk",
"hoplix.shop",
"orx.biz",
"biz.gl",
"col.ng",
"firm.ng",
"gen.ng",
"ltd.ng",
"ngo.ng",
"edu.scot",
"sch.so",
"hostyhosting.io",
"häkkinen.fi",
"*.moonscale.io",
"moonscale.net",
"iki.fi",
"ibxos.it",
"iliadboxos.it",
"impertrixcdn.com",
"impertrix.com",
"smushcdn.com",
"wphostedmail.com",
"wpmucdn.com",
"tempurl.host",
"wpmudev.host",
"dyn-berlin.de",
"in-berlin.de",
"in-brb.de",
"in-butter.de",
"in-dsl.de",
"in-dsl.net",
"in-dsl.org",
"in-vpn.de",
"in-vpn.net",
"in-vpn.org",
"biz.at",
"info.at",
"info.cx",
"ac.leg.br",
"al.leg.br",
"am.leg.br",
"ap.leg.br",
"ba.leg.br",
"ce.leg.br",
"df.leg.br",
"es.leg.br",
"go.leg.br",
"ma.leg.br",
"mg.leg.br",
"ms.leg.br",
"mt.leg.br",
"pa.leg.br",
"pb.leg.br",
"pe.leg.br",
"pi.leg.br",
"pr.leg.br",
"rj.leg.br",
"rn.leg.br",
"ro.leg.br",
"rr.leg.br",
"rs.leg.br",
"sc.leg.br",
"se.leg.br",
"sp.leg.br",
"to.leg.br",
"pixolino.com",
"na4u.ru",
"iopsys.se",
"ipifony.net",
"iservschule.de",
"mein-iserv.de",
"schulplattform.de",
"schulserver.de",
"test-iserv.de",
"iserv.dev",
"iobb.net",
"mel.cloudlets.com.au",
"cloud.interhostsolutions.be",
"users.scale.virtualcloud.com.br",
"mycloud.by",
"alp1.ae.flow.ch",
"appengine.flow.ch",
"es-1.axarnet.cloud",
"diadem.cloud",
"vip.jelastic.cloud",
"jele.cloud",
"it1.eur.aruba.jenv-aruba.cloud",
"it1.jenv-aruba.cloud",
"keliweb.cloud",
"cs.keliweb.cloud",
"oxa.cloud",
"tn.oxa.cloud",
"uk.oxa.cloud",
"primetel.cloud",
"uk.primetel.cloud",
"ca.reclaim.cloud",
"uk.reclaim.cloud",
"us.reclaim.cloud",
"ch.trendhosting.cloud",
"de.trendhosting.cloud",
"jele.club",
"amscompute.com",
"clicketcloud.com",
"dopaas.com",
"hidora.com",
"paas.hosted-by-previder.com",
"rag-cloud.hosteur.com",
"rag-cloud-ch.hosteur.com",
"jcloud.ik-server.com",
"jcloud-ver-jpc.ik-server.com",
"demo.jelastic.com",
"kilatiron.com",
"paas.massivegrid.com",
"jed.wafaicloud.com",
"lon.wafaicloud.com",
"ryd.wafaicloud.com",
"j.scaleforce.com.cy",
"jelastic.dogado.eu",
"fi.cloudplatform.fi",
"demo.datacenter.fi",
"paas.datacenter.fi",
"jele.host",
"mircloud.host",
"paas.beebyte.io",
"sekd1.beebyteapp.io",
"jele.io",
"cloud-fr1.unispace.io",
"jc.neen.it",
"cloud.jelastic.open.tim.it",
"jcloud.kz",
"upaas.kazteleport.kz",
"cloudjiffy.net",
"fra1-de.cloudjiffy.net",
"west1-us.cloudjiffy.net",
"jls-sto1.elastx.net",
"jls-sto2.elastx.net",
"jls-sto3.elastx.net",
"faststacks.net",
"fr-1.paas.massivegrid.net",
"lon-1.paas.massivegrid.net",
"lon-2.paas.massivegrid.net",
"ny-1.paas.massivegrid.net",
"ny-2.paas.massivegrid.net",
"sg-1.paas.massivegrid.net",
"jelastic.saveincloud.net",
"nordeste-idc.saveincloud.net",
"j.scaleforce.net",
"jelastic.tsukaeru.net",
"sdscloud.pl",
"unicloud.pl",
"mircloud.ru",
"jelastic.regruhosting.ru",
"enscaled.sg",
"jele.site",
"jelastic.team",
"orangecloud.tn",
"j.layershift.co.uk",
"phx.enscaled.us",
"mircloud.us",
"myjino.ru",
"*.hosting.myjino.ru",
"*.landing.myjino.ru",
"*.spectrum.myjino.ru",
"*.vps.myjino.ru",
"jotelulu.cloud",
"*.triton.zone",
"*.cns.joyent.com",
"js.org",
"kaas.gg",
"khplay.nl",
"ktistory.com",
"kapsi.fi",
"keymachine.de",
"kinghost.net",
"uni5.net",
"knightpoint.systems",
"koobin.events",
"oya.to",
"kuleuven.cloud",
"ezproxy.kuleuven.be",
"co.krd",
"edu.krd",
"krellian.net",
"webthings.io",
"git-repos.de",
"lcube-server.de",
"svn-repos.de",
"leadpages.co",
"lpages.co",
"lpusercontent.com",
"lelux.site",
"co.business",
"co.education",
"co.events",
"co.financial",
"co.network",
"co.place",
"co.technology",
"app.lmpm.com",
"linkyard.cloud",
"linkyard-cloud.ch",
"members.linode.com",
"*.nodebalancer.linode.com",
"*.linodeobjects.com",
"ip.linodeusercontent.com",
"we.bs",
"*.user.localcert.dev",
"localzone.xyz",
"loginline.app",
"loginline.dev",
"loginline.io",
"loginline.services",
"loginline.site",
"servers.run",
"lohmus.me",
"krasnik.pl",
"leczna.pl",
"lubartow.pl",
"lublin.pl",
"poniatowa.pl",
"swidnik.pl",
"glug.org.uk",
"lug.org.uk",
"lugs.org.uk",
"barsy.bg",
"barsy.co.uk",
"barsyonline.co.uk",
"barsycenter.com",
"barsyonline.com",
"barsy.club",
"barsy.de",
"barsy.eu",
"barsy.in",
"barsy.info",
"barsy.io",
"barsy.me",
"barsy.menu",
"barsy.mobi",
"barsy.net",
"barsy.online",
"barsy.org",
"barsy.pro",
"barsy.pub",
"barsy.ro",
"barsy.shop",
"barsy.site",
"barsy.support",
"barsy.uk",
"*.magentosite.cloud",
"mayfirst.info",
"mayfirst.org",
"hb.cldmail.ru",
"cn.vu",
"mazeplay.com",
"mcpe.me",
"mcdir.me",
"mcdir.ru",
"mcpre.ru",
"vps.mcdir.ru",
"mediatech.by",
"mediatech.dev",
"hra.health",
"miniserver.com",
"memset.net",
"messerli.app",
"*.cloud.metacentrum.cz",
"custom.metacentrum.cz",
"flt.cloud.muni.cz",
"usr.cloud.muni.cz",
"meteorapp.com",
"eu.meteorapp.com",
"co.pl",
"*.azurecontainer.io",
"azurewebsites.net",
"azure-mobile.net",
"cloudapp.net",
"azurestaticapps.net",
"1.azurestaticapps.net",
"centralus.azurestaticapps.net",
"eastasia.azurestaticapps.net",
"eastus2.azurestaticapps.net",
"westeurope.azurestaticapps.net",
"westus2.azurestaticapps.net",
"csx.cc",
"mintere.site",
"forte.id",
"mozilla-iot.org",
"bmoattachments.org",
"net.ru",
"org.ru",
"pp.ru",
"hostedpi.com",
"customer.mythic-beasts.com",
"caracal.mythic-beasts.com",
"fentiger.mythic-beasts.com",
"lynx.mythic-beasts.com",
"ocelot.mythic-beasts.com",
"oncilla.mythic-beasts.com",
"onza.mythic-beasts.com",
"sphinx.mythic-beasts.com",
"vs.mythic-beasts.com",
"x.mythic-beasts.com",
"yali.mythic-beasts.com",
"cust.retrosnub.co.uk",
"ui.nabu.casa",
"pony.club",
"of.fashion",
"in.london",
"of.london",
"from.marketing",
"with.marketing",
"for.men",
"repair.men",
"and.mom",
"for.mom",
"for.one",
"under.one",
"for.sale",
"that.win",
"from.work",
"to.work",
"cloud.nospamproxy.com",
"netlify.app",
"4u.com",
"ngrok.io",
"nh-serv.co.uk",
"nfshost.com",
"*.developer.app",
"noop.app",
"*.northflank.app",
"*.build.run",
"*.code.run",
"*.database.run",
"*.migration.run",
"noticeable.news",
"dnsking.ch",
"mypi.co",
"n4t.co",
"001www.com",
"ddnslive.com",
"myiphost.com",
"forumz.info",
"16-b.it",
"32-b.it",
"64-b.it",
"soundcast.me",
"tcp4.me",
"dnsup.net",
"hicam.net",
"now-dns.net",
"ownip.net",
"vpndns.net",
"dynserv.org",
"now-dns.org",
"x443.pw",
"now-dns.top",
"ntdll.top",
"freeddns.us",
"crafting.xyz",
"zapto.xyz",
"nsupdate.info",
"nerdpol.ovh",
"blogsyte.com",
"brasilia.me",
"cable-modem.org",
"ciscofreak.com",
"collegefan.org",
"couchpotatofries.org",
"damnserver.com",
"ddns.me",
"ditchyourip.com",
"dnsfor.me",
"dnsiskinky.com",
"dvrcam.info",
"dynns.com",
"eating-organic.net",
"fantasyleague.cc",
"geekgalaxy.com",
"golffan.us",
"health-carereform.com",
"homesecuritymac.com",
"homesecuritypc.com",
"hopto.me",
"ilovecollege.info",
"loginto.me",
"mlbfan.org",
"mmafan.biz",
"myactivedirectory.com",
"mydissent.net",
"myeffect.net",
"mymediapc.net",
"mypsx.net",
"mysecuritycamera.com",
"mysecuritycamera.net",
"mysecuritycamera.org",
"net-freaks.com",
"nflfan.org",
"nhlfan.net",
"no-ip.ca",
"no-ip.co.uk",
"no-ip.net",
"noip.us",
"onthewifi.com",
"pgafan.net",
"point2this.com",
"pointto.us",
"privatizehealthinsurance.net",
"quicksytes.com",
"read-books.org",
"securitytactics.com",
"serveexchange.com",
"servehumour.com",
"servep2p.com",
"servesarcasm.com",
"stufftoread.com",
"ufcfan.org",
"unusualperson.com",
"workisboring.com",
"3utilities.com",
"bounceme.net",
"ddns.net",
"ddnsking.com",
"gotdns.ch",
"hopto.org",
"myftp.biz",
"myftp.org",
"myvnc.com",
"no-ip.biz",
"no-ip.info",
"no-ip.org",
"noip.me",
"redirectme.net",
"servebeer.com",
"serveblog.net",
"servecounterstrike.com",
"serveftp.com",
"servegame.com",
"servehalflife.com",
"servehttp.com",
"serveirc.com",
"serveminecraft.net",
"servemp3.com",
"servepics.com",
"servequake.com",
"sytes.net",
"webhop.me",
"zapto.org",
"stage.nodeart.io",
"pcloud.host",
"nyc.mn",
"static.observableusercontent.com",
"cya.gg",
"omg.lol",
"cloudycluster.net",
"omniwe.site",
"service.one",
"nid.io",
"opensocial.site",
"opencraft.hosting",
"orsites.com",
"operaunite.com",
"tech.orange",
"authgear-staging.com",
"authgearapps.com",
"skygearapp.com",
"outsystemscloud.com",
"*.webpaas.ovh.net",
"*.hosting.ovh.net",
"ownprovider.com",
"own.pm",
"*.owo.codes",
"ox.rs",
"oy.lc",
"pgfog.com",
"pagefrontapp.com",
"pagexl.com",
"*.paywhirl.com",
"bar0.net",
"bar1.net",
"bar2.net",
"rdv.to",
"art.pl",
"gliwice.pl",
"krakow.pl",
"poznan.pl",
"wroc.pl",
"zakopane.pl",
"pantheonsite.io",
"gotpantheon.com",
"mypep.link",
"perspecta.cloud",
"lk3.ru",
"on-web.fr",
"bc.platform.sh",
"ent.platform.sh",
"eu.platform.sh",
"us.platform.sh",
"*.platformsh.site",
"*.tst.site",
"platter-app.com",
"platter-app.dev",
"platterp.us",
"pdns.page",
"plesk.page",
"pleskns.com",
"dyn53.io",
"onporter.run",
"co.bn",
"postman-echo.com",
"pstmn.io",
"mock.pstmn.io",
"httpbin.org",
"prequalifyme.today",
"xen.prgmr.com",
"priv.at",
"prvcy.page",
"*.dweb.link",
"protonet.io",
"chirurgiens-dentistes-en-france.fr",
"byen.site",
"pubtls.org",
"pythonanywhere.com",
"eu.pythonanywhere.com",
"qoto.io",
"qualifioapp.com",
"qbuser.com",
"cloudsite.builders",
"instances.spawn.cc",
"instantcloud.cn",
"ras.ru",
"qa2.com",
"qcx.io",
"*.sys.qcx.io",
"dev-myqnapcloud.com",
"alpha-myqnapcloud.com",
"myqnapcloud.com",
"*.quipelements.com",
"vapor.cloud",
"vaporcloud.io",
"rackmaze.com",
"rackmaze.net",
"g.vbrplsbx.io",
"*.on-k3s.io",
"*.on-rancher.cloud",
"*.on-rio.io",
"readthedocs.io",
"rhcloud.com",
"app.render.com",
"onrender.com",
"repl.co",
"id.repl.co",
"repl.run",
"resindevice.io",
"devices.resinstaging.io",
"hzc.io",
"wellbeingzone.eu",
"wellbeingzone.co.uk",
"adimo.co.uk",
"itcouldbewor.se",
"git-pages.rit.edu",
"rocky.page",
"биз.рус",
"ком.рус",
"крым.рус",
"мир.рус",
"мск.рус",
"орг.рус",
"самара.рус",
"сочи.рус",
"спб.рус",
"я.рус",
"*.builder.code.com",
"*.dev-builder.code.com",
"*.stg-builder.code.com",
"sandcats.io",
"logoip.de",
"logoip.com",
"fr-par-1.baremetal.scw.cloud",
"fr-par-2.baremetal.scw.cloud",
"nl-ams-1.baremetal.scw.cloud",
"fnc.fr-par.scw.cloud",
"functions.fnc.fr-par.scw.cloud",
"k8s.fr-par.scw.cloud",
"nodes.k8s.fr-par.scw.cloud",
"s3.fr-par.scw.cloud",
"s3-website.fr-par.scw.cloud",
"whm.fr-par.scw.cloud",
"priv.instances.scw.cloud",
"pub.instances.scw.cloud",
"k8s.scw.cloud",
"k8s.nl-ams.scw.cloud",
"nodes.k8s.nl-ams.scw.cloud",
"s3.nl-ams.scw.cloud",
"s3-website.nl-ams.scw.cloud",
"whm.nl-ams.scw.cloud",
"k8s.pl-waw.scw.cloud",
"nodes.k8s.pl-waw.scw.cloud",
"s3.pl-waw.scw.cloud",
"s3-website.pl-waw.scw.cloud",
"scalebook.scw.cloud",
"smartlabeling.scw.cloud",
"dedibox.fr",
"schokokeks.net",
"gov.scot",
"service.gov.scot",
"scrysec.com",
"firewall-gateway.com",
"firewall-gateway.de",
"my-gateway.de",
"my-router.de",
"spdns.de",
"spdns.eu",
"firewall-gateway.net",
"my-firewall.org",
"myfirewall.org",
"spdns.org",
"seidat.net",
"sellfy.store",
"senseering.net",
"minisite.ms",
"magnet.page",
"biz.ua",
"co.ua",
"pp.ua",
"shiftcrypto.dev",
"shiftcrypto.io",
"shiftedit.io",
"myshopblocks.com",
"myshopify.com",
"shopitsite.com",
"shopware.store",
"mo-siemens.io",
"1kapp.com",
"appchizi.com",
"applinzi.com",
"sinaapp.com",
"vipsinaapp.com",
"siteleaf.net",
"bounty-full.com",
"alpha.bounty-full.com",
"beta.bounty-full.com",
"small-web.org",
"vp4.me",
"try-snowplow.com",
"srht.site",
"stackhero-network.com",
"musician.io",
"novecore.site",
"static.land",
"dev.static.land",
"sites.static.land",
"storebase.store",
"vps-host.net",
"atl.jelastic.vps-host.net",
"njs.jelastic.vps-host.net",
"ric.jelastic.vps-host.net",
"playstation-cloud.com",
"apps.lair.io",
"*.stolos.io",
"spacekit.io",
"customer.speedpartner.de",
"myspreadshop.at",
"myspreadshop.com.au",
"myspreadshop.be",
"myspreadshop.ca",
"myspreadshop.ch",
"myspreadshop.com",
"myspreadshop.de",
"myspreadshop.dk",
"myspreadshop.es",
"myspreadshop.fi",
"myspreadshop.fr",
"myspreadshop.ie",
"myspreadshop.it",
"myspreadshop.net",
"myspreadshop.nl",
"myspreadshop.no",
"myspreadshop.pl",
"myspreadshop.se",
"myspreadshop.co.uk",
"api.stdlib.com",
"storj.farm",
"utwente.io",
"soc.srcf.net",
"user.srcf.net",
"temp-dns.com",
"supabase.co",
"supabase.in",
"supabase.net",
"su.paba.se",
"*.s5y.io",
"*.sensiosite.cloud",
"syncloud.it",
"dscloud.biz",
"direct.quickconnect.cn",
"dsmynas.com",
"familyds.com",
"diskstation.me",
"dscloud.me",
"i234.me",
"myds.me",
"synology.me",
"dscloud.mobi",
"dsmynas.net",
"familyds.net",
"dsmynas.org",
"familyds.org",
"vpnplus.to",
"direct.quickconnect.to",
"tabitorder.co.il",
"taifun-dns.de",
"beta.tailscale.net",
"ts.net",
"gda.pl",
"gdansk.pl",
"gdynia.pl",
"med.pl",
"sopot.pl",
"site.tb-hosting.com",
"edugit.io",
"s3.teckids.org",
"telebit.app",
"telebit.io",
"*.telebit.xyz",
"gwiddle.co.uk",
"*.firenet.ch",
"*.svc.firenet.ch",
"reservd.com",
"thingdustdata.com",
"cust.dev.thingdust.io",
"cust.disrec.thingdust.io",
"cust.prod.thingdust.io",
"cust.testing.thingdust.io",
"reservd.dev.thingdust.io",
"reservd.disrec.thingdust.io",
"reservd.testing.thingdust.io",
"tickets.io",
"arvo.network",
"azimuth.network",
"tlon.network",
"torproject.net",
"pages.torproject.net",
"bloxcms.com",
"townnews-staging.com",
"tbits.me",
"12hp.at",
"2ix.at",
"4lima.at",
"lima-city.at",
"12hp.ch",
"2ix.ch",
"4lima.ch",
"lima-city.ch",
"trafficplex.cloud",
"de.cool",
"12hp.de",
"2ix.de",
"4lima.de",
"lima-city.de",
"1337.pictures",
"clan.rip",
"lima-city.rocks",
"webspace.rocks",
"lima.zone",
"*.transurl.be",
"*.transurl.eu",
"*.transurl.nl",
"site.transip.me",
"tuxfamily.org",
"dd-dns.de",
"diskstation.eu",
"diskstation.org",
"dray-dns.de",
"draydns.de",
"dyn-vpn.de",
"dynvpn.de",
"mein-vigor.de",
"my-vigor.de",
"my-wan.de",
"syno-ds.de",
"synology-diskstation.de",
"synology-ds.de",
"typedream.app",
"pro.typeform.com",
"uber.space",
"*.uberspace.de",
"hk.com",
"hk.org",
"ltd.hk",
"inc.hk",
"name.pm",
"sch.tf",
"biz.wf",
"sch.wf",
"org.yt",
"virtualuser.de",
"virtual-user.de",
"upli.io",
"urown.cloud",
"dnsupdate.info",
"lib.de.us",
"2038.io",
"vercel.app",
"vercel.dev",
"now.sh",
"router.management",
"v-info.info",
"voorloper.cloud",
"neko.am",
"nyaa.am",
"be.ax",
"cat.ax",
"es.ax",
"eu.ax",
"gg.ax",
"mc.ax",
"us.ax",
"xy.ax",
"nl.ci",
"xx.gl",
"app.gp",
"blog.gt",
"de.gt",
"to.gt",
"be.gy",
"cc.hn",
"blog.kg",
"io.kg",
"jp.kg",
"tv.kg",
"uk.kg",
"us.kg",
"de.ls",
"at.md",
"de.md",
"jp.md",
"to.md",
"indie.porn",
"vxl.sh",
"ch.tc",
"me.tc",
"we.tc",
"nyan.to",
"at.vg",
"blog.vu",
"dev.vu",
"me.vu",
"v.ua",
"*.vultrobjects.com",
"wafflecell.com",
"*.webhare.dev",
"reserve-online.net",
"reserve-online.com",
"bookonline.app",
"hotelwithflight.com",
"wedeploy.io",
"wedeploy.me",
"wedeploy.sh",
"remotewd.com",
"pages.wiardweb.com",
"wmflabs.org",
"toolforge.org",
"wmcloud.org",
"panel.gg",
"daemon.panel.gg",
"messwithdns.com",
"woltlab-demo.com",
"myforum.community",
"community-pro.de",
"diskussionsbereich.de",
"community-pro.net",
"meinforum.net",
"affinitylottery.org.uk",
"raffleentry.org.uk",
"weeklylottery.org.uk",
"wpenginepowered.com",
"js.wpenginepowered.com",
"wixsite.com",
"editorx.io",
"half.host",
"xnbay.com",
"u2.xnbay.com",
"u2-local.xnbay.com",
"cistron.nl",
"demon.nl",
"xs4all.space",
"yandexcloud.net",
"storage.yandexcloud.net",
"website.yandexcloud.net",
"official.academy",
"yolasite.com",
"ybo.faith",
"yombo.me",
"homelink.one",
"ybo.party",
"ybo.review",
"ybo.science",
"ybo.trade",
"ynh.fr",
"nohost.me",
"noho.st",
"za.net",
"za.org",
"bss.design",
"basicserver.io",
"virtualserver.io",
"enterprisecloud.nu"
]
},{}],94:[function(require,module,exports){
/*eslint no-var:0, prefer-arrow-callback: 0, object-shorthand: 0 */
'use strict';


var Punycode = require('punycode');


var internals = {};


//
// Read rules from file.
//
internals.rules = require('./data/rules.json').map(function (rule) {

  return {
    rule: rule,
    suffix: rule.replace(/^(\*\.|\!)/, ''),
    punySuffix: -1,
    wildcard: rule.charAt(0) === '*',
    exception: rule.charAt(0) === '!'
  };
});


//
// Check is given string ends with `suffix`.
//
internals.endsWith = function (str, suffix) {

  return str.indexOf(suffix, str.length - suffix.length) !== -1;
};


//
// Find rule for a given domain.
//
internals.findRule = function (domain) {

  var punyDomain = Punycode.toASCII(domain);
  return internals.rules.reduce(function (memo, rule) {

    if (rule.punySuffix === -1){
      rule.punySuffix = Punycode.toASCII(rule.suffix);
    }
    if (!internals.endsWith(punyDomain, '.' + rule.punySuffix) && punyDomain !== rule.punySuffix) {
      return memo;
    }
    // This has been commented out as it never seems to run. This is because
    // sub tlds always appear after their parents and we never find a shorter
    // match.
    //if (memo) {
    //  var memoSuffix = Punycode.toASCII(memo.suffix);
    //  if (memoSuffix.length >= punySuffix.length) {
    //    return memo;
    //  }
    //}
    return rule;
  }, null);
};


//
// Error codes and messages.
//
exports.errorCodes = {
  DOMAIN_TOO_SHORT: 'Domain name too short.',
  DOMAIN_TOO_LONG: 'Domain name too long. It should be no more than 255 chars.',
  LABEL_STARTS_WITH_DASH: 'Domain name label can not start with a dash.',
  LABEL_ENDS_WITH_DASH: 'Domain name label can not end with a dash.',
  LABEL_TOO_LONG: 'Domain name label should be at most 63 chars long.',
  LABEL_TOO_SHORT: 'Domain name label should be at least 1 character long.',
  LABEL_INVALID_CHARS: 'Domain name label can only contain alphanumeric characters or dashes.'
};


//
// Validate domain name and throw if not valid.
//
// From wikipedia:
//
// Hostnames are composed of series of labels concatenated with dots, as are all
// domain names. Each label must be between 1 and 63 characters long, and the
// entire hostname (including the delimiting dots) has a maximum of 255 chars.
//
// Allowed chars:
//
// * `a-z`
// * `0-9`
// * `-` but not as a starting or ending character
// * `.` as a separator for the textual portions of a domain name
//
// * http://en.wikipedia.org/wiki/Domain_name
// * http://en.wikipedia.org/wiki/Hostname
//
internals.validate = function (input) {

  // Before we can validate we need to take care of IDNs with unicode chars.
  var ascii = Punycode.toASCII(input);

  if (ascii.length < 1) {
    return 'DOMAIN_TOO_SHORT';
  }
  if (ascii.length > 255) {
    return 'DOMAIN_TOO_LONG';
  }

  // Check each part's length and allowed chars.
  var labels = ascii.split('.');
  var label;

  for (var i = 0; i < labels.length; ++i) {
    label = labels[i];
    if (!label.length) {
      return 'LABEL_TOO_SHORT';
    }
    if (label.length > 63) {
      return 'LABEL_TOO_LONG';
    }
    if (label.charAt(0) === '-') {
      return 'LABEL_STARTS_WITH_DASH';
    }
    if (label.charAt(label.length - 1) === '-') {
      return 'LABEL_ENDS_WITH_DASH';
    }
    if (!/^[a-z0-9\-]+$/.test(label)) {
      return 'LABEL_INVALID_CHARS';
    }
  }
};


//
// Public API
//


//
// Parse domain.
//
exports.parse = function (input) {

  if (typeof input !== 'string') {
    throw new TypeError('Domain name must be a string.');
  }

  // Force domain to lowercase.
  var domain = input.slice(0).toLowerCase();

  // Handle FQDN.
  // TODO: Simply remove trailing dot?
  if (domain.charAt(domain.length - 1) === '.') {
    domain = domain.slice(0, domain.length - 1);
  }

  // Validate and sanitise input.
  var error = internals.validate(domain);
  if (error) {
    return {
      input: input,
      error: {
        message: exports.errorCodes[error],
        code: error
      }
    };
  }

  var parsed = {
    input: input,
    tld: null,
    sld: null,
    domain: null,
    subdomain: null,
    listed: false
  };

  var domainParts = domain.split('.');

  // Non-Internet TLD
  if (domainParts[domainParts.length - 1] === 'local') {
    return parsed;
  }

  var handlePunycode = function () {

    if (!/xn--/.test(domain)) {
      return parsed;
    }
    if (parsed.domain) {
      parsed.domain = Punycode.toASCII(parsed.domain);
    }
    if (parsed.subdomain) {
      parsed.subdomain = Punycode.toASCII(parsed.subdomain);
    }
    return parsed;
  };

  var rule = internals.findRule(domain);

  // Unlisted tld.
  if (!rule) {
    if (domainParts.length < 2) {
      return parsed;
    }
    parsed.tld = domainParts.pop();
    parsed.sld = domainParts.pop();
    parsed.domain = [parsed.sld, parsed.tld].join('.');
    if (domainParts.length) {
      parsed.subdomain = domainParts.pop();
    }
    return handlePunycode();
  }

  // At this point we know the public suffix is listed.
  parsed.listed = true;

  var tldParts = rule.suffix.split('.');
  var privateParts = domainParts.slice(0, domainParts.length - tldParts.length);

  if (rule.exception) {
    privateParts.push(tldParts.shift());
  }

  parsed.tld = tldParts.join('.');

  if (!privateParts.length) {
    return handlePunycode();
  }

  if (rule.wildcard) {
    tldParts.unshift(privateParts.pop());
    parsed.tld = tldParts.join('.');
  }

  if (!privateParts.length) {
    return handlePunycode();
  }

  parsed.sld = privateParts.pop();
  parsed.domain = [parsed.sld,  parsed.tld].join('.');

  if (privateParts.length) {
    parsed.subdomain = privateParts.join('.');
  }

  return handlePunycode();
};


//
// Get domain.
//
exports.get = function (domain) {

  if (!domain) {
    return null;
  }
  return exports.parse(domain).domain || null;
};


//
// Check whether domain belongs to a known public suffix.
//
exports.isValid = function (domain) {

  var parsed = exports.parse(domain);
  return Boolean(parsed.domain && parsed.listed);
};

},{"./data/rules.json":93,"punycode":95}],95:[function(require,module,exports){
(function (global){(function (){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],96:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],97:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],98:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":96,"./encode":97}],99:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty
  , undef;

/**
 * Decode a URI encoded string.
 *
 * @param {String} input The URI encoded string.
 * @returns {String|Null} The decoded string.
 * @api private
 */
function decode(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch (e) {
    return null;
  }
}

/**
 * Attempts to encode a given input.
 *
 * @param {String} input The string that needs to be encoded.
 * @returns {String|Null} The encoded string.
 * @api private
 */
function encode(input) {
  try {
    return encodeURIComponent(input);
  } catch (e) {
    return null;
  }
}

/**
 * Simple query string parser.
 *
 * @param {String} query The query string that needs to be parsed.
 * @returns {Object}
 * @api public
 */
function querystring(query) {
  var parser = /([^=?#&]+)=?([^&]*)/g
    , result = {}
    , part;

  while (part = parser.exec(query)) {
    var key = decode(part[1])
      , value = decode(part[2]);

    //
    // Prevent overriding of existing properties. This ensures that build-in
    // methods like `toString` or __proto__ are not overriden by malicious
    // querystrings.
    //
    // In the case if failed decoding, we want to omit the key/value pairs
    // from the result.
    //
    if (key === null || value === null || key in result) continue;
    result[key] = value;
  }

  return result;
}

/**
 * Transform a query string to an object.
 *
 * @param {Object} obj Object that should be transformed.
 * @param {String} prefix Optional prefix.
 * @returns {String}
 * @api public
 */
function querystringify(obj, prefix) {
  prefix = prefix || '';

  var pairs = []
    , value
    , key;

  //
  // Optionally prefix with a '?' if needed
  //
  if ('string' !== typeof prefix) prefix = '?';

  for (key in obj) {
    if (has.call(obj, key)) {
      value = obj[key];

      //
      // Edge cases where we actually want to encode the value to an empty
      // string instead of the stringified value.
      //
      if (!value && (value === null || value === undef || isNaN(value))) {
        value = '';
      }

      key = encode(key);
      value = encode(value);

      //
      // If we failed to encode the strings, we should bail out as we don't
      // want to add invalid strings to the query.
      //
      if (key === null || value === null) continue;
      pairs.push(key +'='+ value);
    }
  }

  return pairs.length ? prefix + pairs.join('&') : '';
}

//
// Expose the module.
//
exports.stringify = querystringify;
exports.parse = querystring;

},{}],100:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":101}],101:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

{
  // avoid scope creep, the keys array can then be collected
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};
},{"./_stream_readable":103,"./_stream_writable":105,"core-util-is":5,"inherits":109,"process-nextick-args":91}],102:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":104,"core-util-is":5,"inherits":109}],103:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, { hasUnpiped: false });
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._readableState.highWaterMark;
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":101,"./internal/streams/BufferList":106,"./internal/streams/destroy":107,"./internal/streams/stream":108,"_process":92,"core-util-is":5,"events":6,"inherits":109,"isarray":8,"process-nextick-args":91,"safe-buffer":110,"string_decoder/":111,"util":2}],104:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":101,"core-util-is":5,"inherits":109}],105:[function(require,module,exports){
(function (process,global,setImmediate){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }

  // reuse the free corkReq.
  state.corkedRequestsFree.next = corkReq;
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"./_stream_duplex":101,"./internal/streams/destroy":107,"./internal/streams/stream":108,"_process":92,"core-util-is":5,"inherits":109,"process-nextick-args":91,"safe-buffer":110,"timers":141,"util-deprecate":156}],106:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":110,"util":2}],107:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        pna.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        pna.nextTick(emitErrorNT, this, err);
      }
    }

    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        pna.nextTick(emitErrorNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        pna.nextTick(emitErrorNT, _this, err);
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":91}],108:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":6}],109:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],110:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],111:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":110}],112:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":113}],113:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":101,"./lib/_stream_passthrough.js":102,"./lib/_stream_readable.js":103,"./lib/_stream_transform.js":104,"./lib/_stream_writable.js":105}],114:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":113}],115:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":105}],116:[function(require,module,exports){
'use strict';

/**
 * Check if we're required to add a port number.
 *
 * @see https://url.spec.whatwg.org/#default-port
 * @param {Number|String} port Port number we need to check
 * @param {String} protocol Protocol we need to check against.
 * @returns {Boolean} Is it a default port for the given protocol
 * @api private
 */
module.exports = function required(port, protocol) {
  protocol = protocol.split(':')[0];
  port = +port;

  if (!port) return false;

  switch (protocol) {
    case 'http':
    case 'ws':
    return port !== 80;

    case 'https':
    case 'wss':
    return port !== 443;

    case 'ftp':
    return port !== 21;

    case 'gopher':
    return port !== 70;

    case 'file':
    return false;
  }

  return port !== 0;
};

},{}],117:[function(require,module,exports){
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],118:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":6,"inherits":119,"readable-stream/duplex.js":100,"readable-stream/passthrough.js":112,"readable-stream/readable.js":113,"readable-stream/transform.js":114,"readable-stream/writable.js":115}],119:[function(require,module,exports){
arguments[4][109][0].apply(exports,arguments)
},{"dup":109}],120:[function(require,module,exports){
(function (global){(function (){
var ClientRequest = require('./lib/request')
var response = require('./lib/response')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.ClientRequest = ClientRequest
http.IncomingMessage = response.IncomingMessage

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.globalAgent = new http.Agent()

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":122,"./lib/response":123,"builtin-status-codes":4,"url":154,"xtend":160}],121:[function(require,module,exports){
(function (global){(function (){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.writableStream = isFunction(global.WritableStream)

exports.abortController = isFunction(global.AbortController)

// The xhr request to example.com may violate some restrictive CSP configurations,
// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
// and assume support for certain features below.
var xhr
function getXHR () {
	// Cache the xhr value
	if (xhr !== undefined) return xhr

	if (global.XMLHttpRequest) {
		xhr = new global.XMLHttpRequest()
		// If XDomainRequest is available (ie only, where xhr might not work
		// cross domain), use the page location. Otherwise use example.com
		// Note: this doesn't actually make an http request.
		try {
			xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
		} catch(e) {
			xhr = null
		}
	} else {
		// Service workers don't have XHR
		xhr = null
	}
	return xhr
}

function checkTypeSupport (type) {
	var xhr = getXHR()
	if (!xhr) return false
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// If fetch is supported, then arraybuffer will be supported too. Skip calling
// checkTypeSupport(), since that calls getXHR().
exports.arraybuffer = exports.fetch || checkTypeSupport('arraybuffer')

// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && checkTypeSupport('moz-chunked-arraybuffer')

// If fetch is supported, then overrideMimeType will be supported too. Skip calling
// getXHR().
exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

function isFunction (value) {
	return typeof value === 'function'
}

xhr = null // Help gc

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],122:[function(require,module,exports){
(function (process,global,Buffer){(function (){
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
	if (capability.fetch && useFetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + Buffer.from(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	var useFetch = true
	if (opts.mode === 'disable-fetch' || ('requestTimeout' in opts && !capability.abortController)) {
		// If the use of XHR should be preferred. Not typically needed.
		useFetch = false
		preferBinary = true
	} else if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary, useFetch)
	self._fetchTimer = null
	self._socketTimeout = null
	self._socketTimer = null

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var header = this._headers[name.toLowerCase()]
	if (header)
		return header.value
	return null
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	if ('timeout' in opts && opts.timeout !== 0) {
		self.setTimeout(opts.timeout)
	}

	var headersObj = self._headers
	var body = null
	if (opts.method !== 'GET' && opts.method !== 'HEAD') {
        body = new Blob(self._body, {
            type: (headersObj['content-type'] || {}).value || ''
        });
    }

	// create flattened list of headers
	var headersList = []
	Object.keys(headersObj).forEach(function (keyName) {
		var name = headersObj[keyName].name
		var value = headersObj[keyName].value
		if (Array.isArray(value)) {
			value.forEach(function (v) {
				headersList.push([name, v])
			})
		} else {
			headersList.push([name, value])
		}
	})

	if (self._mode === 'fetch') {
		var signal = null
		if (capability.abortController) {
			var controller = new AbortController()
			signal = controller.signal
			self._fetchAbortController = controller

			if ('requestTimeout' in opts && opts.requestTimeout !== 0) {
				self._fetchTimer = global.setTimeout(function () {
					self.emit('requestTimeout')
					if (self._fetchAbortController)
						self._fetchAbortController.abort()
				}, opts.requestTimeout)
			}
		}

		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headersList,
			body: body || undefined,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin',
			signal: signal
		}).then(function (response) {
			self._fetchResponse = response
			self._resetTimers(false)
			self._connect()
		}, function (reason) {
			self._resetTimers(true)
			if (!self._destroyed)
				self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		if ('requestTimeout' in opts) {
			xhr.timeout = opts.requestTimeout
			xhr.ontimeout = function () {
				self.emit('requestTimeout')
			}
		}

		headersList.forEach(function (header) {
			xhr.setRequestHeader(header[0], header[1])
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self._resetTimers(true)
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	self._resetTimers(false)

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress(self._resetTimers.bind(self))
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode, self._resetTimers.bind(self))
	self._response.on('error', function(err) {
		self.emit('error', err)
	})

	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype._resetTimers = function (done) {
	var self = this

	global.clearTimeout(self._socketTimer)
	self._socketTimer = null

	if (done) {
		global.clearTimeout(self._fetchTimer)
		self._fetchTimer = null
	} else if (self._socketTimeout) {
		self._socketTimer = global.setTimeout(function () {
			self.emit('timeout')
		}, self._socketTimeout)
	}
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function (err) {
	var self = this
	self._destroyed = true
	self._resetTimers(true)
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	else if (self._fetchAbortController)
		self._fetchAbortController.abort()

	if (err)
		self.emit('error', err)
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.setTimeout = function (timeout, cb) {
	var self = this

	if (cb)
		self.once('timeout', cb)

	self._socketTimeout = timeout
	self._resetTimers(false)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'via'
]

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":121,"./response":123,"_process":92,"buffer":3,"inherits":124,"readable-stream":139}],123:[function(require,module,exports){
(function (process,global,Buffer){(function (){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode, resetTimers) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.url = response.url
		self.statusCode = response.status
		self.statusMessage = response.statusText
		
		response.headers.forEach(function (header, key){
			self.headers[key.toLowerCase()] = header
			self.rawHeaders.push(key, header)
		})

		if (capability.writableStream) {
			var writable = new WritableStream({
				write: function (chunk) {
					resetTimers(false)
					return new Promise(function (resolve, reject) {
						if (self._destroyed) {
							reject()
						} else if(self.push(Buffer.from(chunk))) {
							resolve()
						} else {
							self._resumeFetch = resolve
						}
					})
				},
				close: function () {
					resetTimers(true)
					if (!self._destroyed)
						self.push(null)
				},
				abort: function (err) {
					resetTimers(true)
					if (!self._destroyed)
						self.emit('error', err)
				}
			})

			try {
				response.body.pipeTo(writable).catch(function (err) {
					resetTimers(true)
					if (!self._destroyed)
						self.emit('error', err)
				})
				return
			} catch (e) {} // pipeTo method isn't defined. Can't find a better way to feature test this
		}
		// fallback for when writableStream or pipeTo aren't available
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				resetTimers(result.done)
				if (result.done) {
					self.push(null)
					return
				}
				self.push(Buffer.from(result.value))
				read()
			}).catch(function (err) {
				resetTimers(true)
				if (!self._destroyed)
					self.emit('error', err)
			})
		}
		read()
	} else {
		self._xhr = xhr
		self._pos = 0

		self.url = xhr.responseURL
		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {
	var self = this

	var resolve = self._resumeFetch
	if (resolve) {
		self._resumeFetch = null
		resolve()
	}
}

IncomingMessage.prototype._onXHRProgress = function (resetTimers) {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text':
			response = xhr.responseText
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = Buffer.alloc(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE || !xhr.response)
				break
			response = xhr.response
			self.push(Buffer.from(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(Buffer.from(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(Buffer.from(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				resetTimers(true)
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		resetTimers(true)
		self.push(null)
	}
}

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":121,"_process":92,"buffer":3,"inherits":124,"readable-stream":139}],124:[function(require,module,exports){
arguments[4][109][0].apply(exports,arguments)
},{"dup":109}],125:[function(require,module,exports){
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.codes = codes;

},{}],126:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
};
/*</replacement>*/

module.exports = Duplex;
var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');
require('inherits')(Duplex, Readable);
{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}
function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;
  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;
    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}
Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

// the no-half-open enforcer
function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(onEndNT, this);
}
function onEndNT(self) {
  self.end();
}
Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});
}).call(this)}).call(this,require('_process'))
},{"./_stream_readable":128,"./_stream_writable":130,"_process":92,"inherits":124}],127:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;
var Transform = require('./_stream_transform');
require('inherits')(PassThrough, Transform);
function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}
PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":129,"inherits":124}],128:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

module.exports = Readable;

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;
var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

var Buffer = require('buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*<replacement>*/
var debugUtil = require('util');
var debug;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/buffer_list');
var destroyImpl = require('./internal/streams/destroy');
var _require = require('./internal/streams/state'),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = require('../errors').codes,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;

// Lazy loaded to improve the startup performance.
var StringDecoder;
var createReadableStreamAsyncIterator;
var from;
require('inherits')(Readable, Stream);
var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];
function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}
function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'end' (and potentially 'finish')
  this.autoDestroy = !!options.autoDestroy;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');
  if (!(this instanceof Readable)) return new Readable(options);

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex);

  // legacy
  this.readable = true;
  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }
  Stream.call(this);
}
Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;
  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }
  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};
function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  }

  // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.
  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }
  return er;
}
Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder;
  // If setEncoding(null), decoder.encoding equals utf8
  this._readableState.encoding = this._readableState.decoder.encoding;

  // Iterate over current buffer to convert already stored Buffers:
  var p = this._readableState.buffer.head;
  var content = '';
  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }
  this._readableState.buffer.clear();
  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
};

// Don't raise the hwm > 1GB
var MAX_HWM = 0x40000000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }
  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }
  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;
  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }
  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }
  if (ret !== null) this.emit('data', ret);
  return ret;
};
function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;
  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;
    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}
function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);
  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  }

  // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.
  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}
function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};
Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;
  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }
  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);
    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);
  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }
  return dest;
};
function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}
Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    for (var i = 0; i < len; i++) dests[i].emit('unpipe', this, {
      hasUnpiped: false
    });
    return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;
  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0;

    // Try start flowing on next tick if stream isn't explicitly paused
    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);
      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }
  return res;
};
Readable.prototype.addListener = Readable.prototype.on;
Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);
  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);
  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;
  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true;

    // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}
function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()
    state.flowing = !state.readableListening;
    resume(this, state);
  }
  state.paused = false;
  return this;
};
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}
function resume_(stream, state) {
  debug('resume', state.reading);
  if (!state.reading) {
    stream.read(0);
  }
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}
Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  this._readableState.paused = true;
  return this;
};
function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null);
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;
  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }
    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };
  return this;
};
if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = require('./internal/streams/async_iterator');
    }
    return createReadableStreamAsyncIterator(this);
  };
}
Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
});

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}
function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);
  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}
function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length);

  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;
      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}
if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = require('./internal/streams/from');
    }
    return from(Readable, iterable, opts);
  };
}
function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":125,"./_stream_duplex":126,"./internal/streams/async_iterator":131,"./internal/streams/buffer_list":132,"./internal/streams/destroy":133,"./internal/streams/from":135,"./internal/streams/state":137,"./internal/streams/stream":138,"_process":92,"buffer":3,"events":6,"inherits":124,"string_decoder/":140,"util":2}],129:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;
var _require$codes = require('../errors').codes,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
  ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
var Duplex = require('./_stream_duplex');
require('inherits')(Transform, Duplex);
function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;
  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }
  ts.writechunk = null;
  ts.writecb = null;
  if (data != null)
    // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}
function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;
  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}
function prefinish() {
  var _this = this;
  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}
Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};
Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;
  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};
Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};
function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null)
    // single equals check for both `null` and `undefined`
    stream.push(data);

  // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}
},{"../errors":125,"./_stream_duplex":126,"inherits":124}],130:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;
  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

var Buffer = require('buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
var destroyImpl = require('./internal/streams/destroy');
var _require = require('./internal/streams/state'),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = require('../errors').codes,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
  ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
  ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
  ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
var errorOrDestroy = destroyImpl.errorOrDestroy;
require('inherits')(Writable, Stream);
function nop() {}
function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'finish' (and potentially 'end')
  this.autoDestroy = !!options.autoDestroy;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}
WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};
(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex);

  // legacy.
  this.writable = true;
  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }
  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};
function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END();
  // TODO: defer error events consistently everywhere, not just the cb
  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var er;
  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }
  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }
  return true;
}
Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);
  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};
Writable.prototype.cork = function () {
  this._writableState.corked++;
};
Writable.prototype.uncork = function () {
  var state = this._writableState;
  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};
Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}
Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;
  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }
  return ret;
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}
function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}
function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}
function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;
    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }
    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}
function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;
  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }
    if (entry === null) state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}
Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};
Writable.prototype._writev = null;
Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;
  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending) endWritable(this, state, cb);
  return this;
};
Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});
function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      errorOrDestroy(stream, err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}
function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;
        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }
  return need;
}
function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}
function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }

  // reuse the free corkReq.
  state.corkedRequestsFree.next = corkReq;
}
Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":125,"./_stream_duplex":126,"./internal/streams/destroy":133,"./internal/streams/state":137,"./internal/streams/stream":138,"_process":92,"buffer":3,"inherits":124,"util-deprecate":156}],131:[function(require,module,exports){
(function (process){(function (){
'use strict';

var _Object$setPrototypeO;
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var finished = require('./end-of-stream');
var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');
function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}
function readAndResolve(iter) {
  var resolve = iter[kLastResolve];
  if (resolve !== null) {
    var data = iter[kStream].read();
    // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'
    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}
function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}
function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }
      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}
var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },
  next: function next() {
    var _this = this;
    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];
    if (error !== null) {
      return Promise.reject(error);
    }
    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }
    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    }

    // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time
    var lastPromise = this[kLastPromise];
    var promise;
    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();
      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }
      promise = new Promise(this[kHandlePromise]);
    }
    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;
  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);
var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;
  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();
      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject];
      // reject if we are waiting for data in the Promise
      // returned by next() and store the error
      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }
      iterator[kError] = err;
      return;
    }
    var resolve = iterator[kLastResolve];
    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }
    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};
module.exports = createReadableStreamAsyncIterator;
}).call(this)}).call(this,require('_process'))
},{"./end-of-stream":134,"_process":92}],132:[function(require,module,exports){
'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var _require = require('buffer'),
  Buffer = _require.Buffer;
var _require2 = require('util'),
  inspect = _require2.inspect;
var custom = inspect && inspect.custom || 'inspect';
function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}
module.exports = /*#__PURE__*/function () {
  function BufferList() {
    _classCallCheck(this, BufferList);
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) ret += s + p.data;
      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    }

    // Consumes a specified amount of bytes or characters from the buffered data.
  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;
      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    }

    // Consumes a specified amount of characters from the buffered data.
  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Consumes a specified amount of bytes from the buffered data.
  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Make sure the linked list only shows the minimal necessary information.
  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);
  return BufferList;
}();
},{"buffer":3,"util":2}],133:[function(require,module,exports){
(function (process){(function (){
'use strict';

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;
  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;
  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }
  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });
  return this;
}
function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}
function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}
function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }
  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}
function emitErrorNT(self, err) {
  self.emit('error', err);
}
function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.

  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}
module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};
}).call(this)}).call(this,require('_process'))
},{"_process":92}],134:[function(require,module,exports){
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

var ERR_STREAM_PREMATURE_CLOSE = require('../../../errors').codes.ERR_STREAM_PREMATURE_CLOSE;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    callback.apply(this, args);
  };
}
function noop() {}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;
  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };
  var writableEnded = stream._writableState && stream._writableState.finished;
  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };
  var readableEnded = stream._readableState && stream._readableState.endEmitted;
  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };
  var onerror = function onerror(err) {
    callback.call(stream, err);
  };
  var onclose = function onclose() {
    var err;
    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };
  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };
  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }
  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}
module.exports = eos;
},{"../../../errors":125}],135:[function(require,module,exports){
module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};

},{}],136:[function(require,module,exports){
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

var eos;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}
var _require$codes = require('../../../errors').codes,
  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = require('./end-of-stream');
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true;

    // request.destroy just do .end - .abort is what we want
    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}
function call(fn) {
  fn();
}
function pipe(from, to) {
  return from.pipe(to);
}
function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}
function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }
  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];
  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }
  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}
module.exports = pipeline;
},{"../../../errors":125,"./end-of-stream":134}],137:[function(require,module,exports){
'use strict';

var ERR_INVALID_OPT_VALUE = require('../../../errors').codes.ERR_INVALID_OPT_VALUE;
function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }
    return Math.floor(hwm);
  }

  // Default value
  return state.objectMode ? 16 : 16 * 1024;
}
module.exports = {
  getHighWaterMark: getHighWaterMark
};
},{"../../../errors":125}],138:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"dup":108,"events":6}],139:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');
exports.finished = require('./lib/internal/streams/end-of-stream.js');
exports.pipeline = require('./lib/internal/streams/pipeline.js');

},{"./lib/_stream_duplex.js":126,"./lib/_stream_passthrough.js":127,"./lib/_stream_readable.js":128,"./lib/_stream_transform.js":129,"./lib/_stream_writable.js":130,"./lib/internal/streams/end-of-stream.js":134,"./lib/internal/streams/pipeline.js":136}],140:[function(require,module,exports){
arguments[4][111][0].apply(exports,arguments)
},{"dup":111,"safe-buffer":117}],141:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":92,"timers":141}],142:[function(require,module,exports){
/*!
 * Copyright (c) 2015-2020, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
const punycode = require("punycode/");
const urlParse = require("url-parse");
const pubsuffix = require("./pubsuffix-psl");
const Store = require("./store").Store;
const MemoryCookieStore = require("./memstore").MemoryCookieStore;
const pathMatch = require("./pathMatch").pathMatch;
const validators = require("./validators.js");
const VERSION = require("./version");
const { fromCallback } = require("universalify");
const { getCustomInspectSymbol } = require("./utilHelper");

// From RFC6265 S4.1.1
// note that it excludes \x3B ";"
const COOKIE_OCTETS = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/;

const CONTROL_CHARS = /[\x00-\x1F]/;

// From Chromium // '\r', '\n' and '\0' should be treated as a terminator in
// the "relaxed" mode, see:
// https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/parsed_cookie.cc#L60
const TERMINATORS = ["\n", "\r", "\0"];

// RFC6265 S4.1.1 defines path value as 'any CHAR except CTLs or ";"'
// Note ';' is \x3B
const PATH_VALUE = /[\x20-\x3A\x3C-\x7E]+/;

// date-time parsing constants (RFC6265 S5.1.1)

const DATE_DELIM = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/;

const MONTH_TO_NUM = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

const MAX_TIME = 2147483647000; // 31-bit max
const MIN_TIME = 0; // 31-bit min
const SAME_SITE_CONTEXT_VAL_ERR =
  'Invalid sameSiteContext option for getCookies(); expected one of "strict", "lax", or "none"';

function checkSameSiteContext(value) {
  validators.validate(validators.isNonEmptyString(value), value);
  const context = String(value).toLowerCase();
  if (context === "none" || context === "lax" || context === "strict") {
    return context;
  } else {
    return null;
  }
}

const PrefixSecurityEnum = Object.freeze({
  SILENT: "silent",
  STRICT: "strict",
  DISABLED: "unsafe-disabled"
});

// Dumped from ip-regex@4.0.0, with the following changes:
// * all capturing groups converted to non-capturing -- "(?:)"
// * support for IPv6 Scoped Literal ("%eth1") removed
// * lowercase hexadecimal only
const IP_REGEX_LOWERCASE = /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-f\d]{1,4}:){7}(?:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,2}|:)|(?:[a-f\d]{1,4}:){4}(?:(?::[a-f\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,3}|:)|(?:[a-f\d]{1,4}:){3}(?:(?::[a-f\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,4}|:)|(?:[a-f\d]{1,4}:){2}(?:(?::[a-f\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,5}|:)|(?:[a-f\d]{1,4}:){1}(?:(?::[a-f\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,6}|:)|(?::(?:(?::[a-f\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,7}|:)))$)/;
const IP_V6_REGEX = `
\\[?(?:
(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|
(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|
(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|
(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|
(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:))
)(?:%[0-9a-zA-Z]{1,})?\\]?
`
  .replace(/\s*\/\/.*$/gm, "")
  .replace(/\n/g, "")
  .trim();
const IP_V6_REGEX_OBJECT = new RegExp(`^${IP_V6_REGEX}$`);

/*
 * Parses a Natural number (i.e., non-negative integer) with either the
 *    <min>*<max>DIGIT ( non-digit *OCTET )
 * or
 *    <min>*<max>DIGIT
 * grammar (RFC6265 S5.1.1).
 *
 * The "trailingOK" boolean controls if the grammar accepts a
 * "( non-digit *OCTET )" trailer.
 */
function parseDigits(token, minDigits, maxDigits, trailingOK) {
  let count = 0;
  while (count < token.length) {
    const c = token.charCodeAt(count);
    // "non-digit = %x00-2F / %x3A-FF"
    if (c <= 0x2f || c >= 0x3a) {
      break;
    }
    count++;
  }

  // constrain to a minimum and maximum number of digits.
  if (count < minDigits || count > maxDigits) {
    return null;
  }

  if (!trailingOK && count != token.length) {
    return null;
  }

  return parseInt(token.substr(0, count), 10);
}

function parseTime(token) {
  const parts = token.split(":");
  const result = [0, 0, 0];

  /* RF6256 S5.1.1:
   *      time            = hms-time ( non-digit *OCTET )
   *      hms-time        = time-field ":" time-field ":" time-field
   *      time-field      = 1*2DIGIT
   */

  if (parts.length !== 3) {
    return null;
  }

  for (let i = 0; i < 3; i++) {
    // "time-field" must be strictly "1*2DIGIT", HOWEVER, "hms-time" can be
    // followed by "( non-digit *OCTET )" so therefore the last time-field can
    // have a trailer
    const trailingOK = i == 2;
    const num = parseDigits(parts[i], 1, 2, trailingOK);
    if (num === null) {
      return null;
    }
    result[i] = num;
  }

  return result;
}

function parseMonth(token) {
  token = String(token)
    .substr(0, 3)
    .toLowerCase();
  const num = MONTH_TO_NUM[token];
  return num >= 0 ? num : null;
}

/*
 * RFC6265 S5.1.1 date parser (see RFC for full grammar)
 */
function parseDate(str) {
  if (!str) {
    return;
  }

  /* RFC6265 S5.1.1:
   * 2. Process each date-token sequentially in the order the date-tokens
   * appear in the cookie-date
   */
  const tokens = str.split(DATE_DELIM);
  if (!tokens) {
    return;
  }

  let hour = null;
  let minute = null;
  let second = null;
  let dayOfMonth = null;
  let month = null;
  let year = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token.length) {
      continue;
    }

    let result;

    /* 2.1. If the found-time flag is not set and the token matches the time
     * production, set the found-time flag and set the hour- value,
     * minute-value, and second-value to the numbers denoted by the digits in
     * the date-token, respectively.  Skip the remaining sub-steps and continue
     * to the next date-token.
     */
    if (second === null) {
      result = parseTime(token);
      if (result) {
        hour = result[0];
        minute = result[1];
        second = result[2];
        continue;
      }
    }

    /* 2.2. If the found-day-of-month flag is not set and the date-token matches
     * the day-of-month production, set the found-day-of- month flag and set
     * the day-of-month-value to the number denoted by the date-token.  Skip
     * the remaining sub-steps and continue to the next date-token.
     */
    if (dayOfMonth === null) {
      // "day-of-month = 1*2DIGIT ( non-digit *OCTET )"
      result = parseDigits(token, 1, 2, true);
      if (result !== null) {
        dayOfMonth = result;
        continue;
      }
    }

    /* 2.3. If the found-month flag is not set and the date-token matches the
     * month production, set the found-month flag and set the month-value to
     * the month denoted by the date-token.  Skip the remaining sub-steps and
     * continue to the next date-token.
     */
    if (month === null) {
      result = parseMonth(token);
      if (result !== null) {
        month = result;
        continue;
      }
    }

    /* 2.4. If the found-year flag is not set and the date-token matches the
     * year production, set the found-year flag and set the year-value to the
     * number denoted by the date-token.  Skip the remaining sub-steps and
     * continue to the next date-token.
     */
    if (year === null) {
      // "year = 2*4DIGIT ( non-digit *OCTET )"
      result = parseDigits(token, 2, 4, true);
      if (result !== null) {
        year = result;
        /* From S5.1.1:
         * 3.  If the year-value is greater than or equal to 70 and less
         * than or equal to 99, increment the year-value by 1900.
         * 4.  If the year-value is greater than or equal to 0 and less
         * than or equal to 69, increment the year-value by 2000.
         */
        if (year >= 70 && year <= 99) {
          year += 1900;
        } else if (year >= 0 && year <= 69) {
          year += 2000;
        }
      }
    }
  }

  /* RFC 6265 S5.1.1
   * "5. Abort these steps and fail to parse the cookie-date if:
   *     *  at least one of the found-day-of-month, found-month, found-
   *        year, or found-time flags is not set,
   *     *  the day-of-month-value is less than 1 or greater than 31,
   *     *  the year-value is less than 1601,
   *     *  the hour-value is greater than 23,
   *     *  the minute-value is greater than 59, or
   *     *  the second-value is greater than 59.
   *     (Note that leap seconds cannot be represented in this syntax.)"
   *
   * So, in order as above:
   */
  if (
    dayOfMonth === null ||
    month === null ||
    year === null ||
    second === null ||
    dayOfMonth < 1 ||
    dayOfMonth > 31 ||
    year < 1601 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return;
  }

  return new Date(Date.UTC(year, month, dayOfMonth, hour, minute, second));
}

function formatDate(date) {
  validators.validate(validators.isDate(date), date);
  return date.toUTCString();
}

// S5.1.2 Canonicalized Host Names
function canonicalDomain(str) {
  if (str == null) {
    return null;
  }
  str = str.trim().replace(/^\./, ""); // S4.1.2.3 & S5.2.3: ignore leading .

  if (IP_V6_REGEX_OBJECT.test(str)) {
    str = str.replace("[", "").replace("]", "");
  }

  // convert to IDN if any non-ASCII characters
  if (punycode && /[^\u0001-\u007f]/.test(str)) {
    str = punycode.toASCII(str);
  }

  return str.toLowerCase();
}

// S5.1.3 Domain Matching
function domainMatch(str, domStr, canonicalize) {
  if (str == null || domStr == null) {
    return null;
  }
  if (canonicalize !== false) {
    str = canonicalDomain(str);
    domStr = canonicalDomain(domStr);
  }

  /*
   * S5.1.3:
   * "A string domain-matches a given domain string if at least one of the
   * following conditions hold:"
   *
   * " o The domain string and the string are identical. (Note that both the
   * domain string and the string will have been canonicalized to lower case at
   * this point)"
   */
  if (str == domStr) {
    return true;
  }

  /* " o All of the following [three] conditions hold:" */

  /* "* The domain string is a suffix of the string" */
  const idx = str.lastIndexOf(domStr);
  if (idx <= 0) {
    return false; // it's a non-match (-1) or prefix (0)
  }

  // next, check it's a proper suffix
  // e.g., "a.b.c".indexOf("b.c") === 2
  // 5 === 3+2
  if (str.length !== domStr.length + idx) {
    return false; // it's not a suffix
  }

  /* "  * The last character of the string that is not included in the
   * domain string is a %x2E (".") character." */
  if (str.substr(idx - 1, 1) !== ".") {
    return false; // doesn't align on "."
  }

  /* "  * The string is a host name (i.e., not an IP address)." */
  if (IP_REGEX_LOWERCASE.test(str)) {
    return false; // it's an IP address
  }

  return true;
}

// RFC6265 S5.1.4 Paths and Path-Match

/*
 * "The user agent MUST use an algorithm equivalent to the following algorithm
 * to compute the default-path of a cookie:"
 *
 * Assumption: the path (and not query part or absolute uri) is passed in.
 */
function defaultPath(path) {
  // "2. If the uri-path is empty or if the first character of the uri-path is not
  // a %x2F ("/") character, output %x2F ("/") and skip the remaining steps.
  if (!path || path.substr(0, 1) !== "/") {
    return "/";
  }

  // "3. If the uri-path contains no more than one %x2F ("/") character, output
  // %x2F ("/") and skip the remaining step."
  if (path === "/") {
    return path;
  }

  const rightSlash = path.lastIndexOf("/");
  if (rightSlash === 0) {
    return "/";
  }

  // "4. Output the characters of the uri-path from the first character up to,
  // but not including, the right-most %x2F ("/")."
  return path.slice(0, rightSlash);
}

function trimTerminator(str) {
  if (validators.isEmptyString(str)) return str;
  for (let t = 0; t < TERMINATORS.length; t++) {
    const terminatorIdx = str.indexOf(TERMINATORS[t]);
    if (terminatorIdx !== -1) {
      str = str.substr(0, terminatorIdx);
    }
  }

  return str;
}

function parseCookiePair(cookiePair, looseMode) {
  cookiePair = trimTerminator(cookiePair);
  validators.validate(validators.isString(cookiePair), cookiePair);

  let firstEq = cookiePair.indexOf("=");
  if (looseMode) {
    if (firstEq === 0) {
      // '=' is immediately at start
      cookiePair = cookiePair.substr(1);
      firstEq = cookiePair.indexOf("="); // might still need to split on '='
    }
  } else {
    // non-loose mode
    if (firstEq <= 0) {
      // no '=' or is at start
      return; // needs to have non-empty "cookie-name"
    }
  }

  let cookieName, cookieValue;
  if (firstEq <= 0) {
    cookieName = "";
    cookieValue = cookiePair.trim();
  } else {
    cookieName = cookiePair.substr(0, firstEq).trim();
    cookieValue = cookiePair.substr(firstEq + 1).trim();
  }

  if (CONTROL_CHARS.test(cookieName) || CONTROL_CHARS.test(cookieValue)) {
    return;
  }

  const c = new Cookie();
  c.key = cookieName;
  c.value = cookieValue;
  return c;
}

function parse(str, options) {
  if (!options || typeof options !== "object") {
    options = {};
  }

  if (validators.isEmptyString(str) || !validators.isString(str)) {
    return null;
  }

  str = str.trim();

  // We use a regex to parse the "name-value-pair" part of S5.2
  const firstSemi = str.indexOf(";"); // S5.2 step 1
  const cookiePair = firstSemi === -1 ? str : str.substr(0, firstSemi);
  const c = parseCookiePair(cookiePair, !!options.loose);
  if (!c) {
    return;
  }

  if (firstSemi === -1) {
    return c;
  }

  // S5.2.3 "unparsed-attributes consist of the remainder of the set-cookie-string
  // (including the %x3B (";") in question)." plus later on in the same section
  // "discard the first ";" and trim".
  const unparsed = str.slice(firstSemi + 1).trim();

  // "If the unparsed-attributes string is empty, skip the rest of these
  // steps."
  if (unparsed.length === 0) {
    return c;
  }

  /*
   * S5.2 says that when looping over the items "[p]rocess the attribute-name
   * and attribute-value according to the requirements in the following
   * subsections" for every item.  Plus, for many of the individual attributes
   * in S5.3 it says to use the "attribute-value of the last attribute in the
   * cookie-attribute-list".  Therefore, in this implementation, we overwrite
   * the previous value.
   */
  const cookie_avs = unparsed.split(";");
  while (cookie_avs.length) {
    const av = cookie_avs.shift().trim();
    if (av.length === 0) {
      // happens if ";;" appears
      continue;
    }
    const av_sep = av.indexOf("=");
    let av_key, av_value;

    if (av_sep === -1) {
      av_key = av;
      av_value = null;
    } else {
      av_key = av.substr(0, av_sep);
      av_value = av.substr(av_sep + 1);
    }

    av_key = av_key.trim().toLowerCase();

    if (av_value) {
      av_value = av_value.trim();
    }

    switch (av_key) {
      case "expires": // S5.2.1
        if (av_value) {
          const exp = parseDate(av_value);
          // "If the attribute-value failed to parse as a cookie date, ignore the
          // cookie-av."
          if (exp) {
            // over and underflow not realistically a concern: V8's getTime() seems to
            // store something larger than a 32-bit time_t (even with 32-bit node)
            c.expires = exp;
          }
        }
        break;

      case "max-age": // S5.2.2
        if (av_value) {
          // "If the first character of the attribute-value is not a DIGIT or a "-"
          // character ...[or]... If the remainder of attribute-value contains a
          // non-DIGIT character, ignore the cookie-av."
          if (/^-?[0-9]+$/.test(av_value)) {
            const delta = parseInt(av_value, 10);
            // "If delta-seconds is less than or equal to zero (0), let expiry-time
            // be the earliest representable date and time."
            c.setMaxAge(delta);
          }
        }
        break;

      case "domain": // S5.2.3
        // "If the attribute-value is empty, the behavior is undefined.  However,
        // the user agent SHOULD ignore the cookie-av entirely."
        if (av_value) {
          // S5.2.3 "Let cookie-domain be the attribute-value without the leading %x2E
          // (".") character."
          const domain = av_value.trim().replace(/^\./, "");
          if (domain) {
            // "Convert the cookie-domain to lower case."
            c.domain = domain.toLowerCase();
          }
        }
        break;

      case "path": // S5.2.4
        /*
         * "If the attribute-value is empty or if the first character of the
         * attribute-value is not %x2F ("/"):
         *   Let cookie-path be the default-path.
         * Otherwise:
         *   Let cookie-path be the attribute-value."
         *
         * We'll represent the default-path as null since it depends on the
         * context of the parsing.
         */
        c.path = av_value && av_value[0] === "/" ? av_value : null;
        break;

      case "secure": // S5.2.5
        /*
         * "If the attribute-name case-insensitively matches the string "Secure",
         * the user agent MUST append an attribute to the cookie-attribute-list
         * with an attribute-name of Secure and an empty attribute-value."
         */
        c.secure = true;
        break;

      case "httponly": // S5.2.6 -- effectively the same as 'secure'
        c.httpOnly = true;
        break;

      case "samesite": // RFC6265bis-02 S5.3.7
        const enforcement = av_value ? av_value.toLowerCase() : "";
        switch (enforcement) {
          case "strict":
            c.sameSite = "strict";
            break;
          case "lax":
            c.sameSite = "lax";
            break;
          case "none":
            c.sameSite = "none";
            break;
          default:
            c.sameSite = undefined;
            break;
        }
        break;

      default:
        c.extensions = c.extensions || [];
        c.extensions.push(av);
        break;
    }
  }

  return c;
}

/**
 *  If the cookie-name begins with a case-sensitive match for the
 *  string "__Secure-", abort these steps and ignore the cookie
 *  entirely unless the cookie's secure-only-flag is true.
 * @param cookie
 * @returns boolean
 */
function isSecurePrefixConditionMet(cookie) {
  validators.validate(validators.isObject(cookie), cookie);
  return !cookie.key.startsWith("__Secure-") || cookie.secure;
}

/**
 *  If the cookie-name begins with a case-sensitive match for the
 *  string "__Host-", abort these steps and ignore the cookie
 *  entirely unless the cookie meets all the following criteria:
 *    1.  The cookie's secure-only-flag is true.
 *    2.  The cookie's host-only-flag is true.
 *    3.  The cookie-attribute-list contains an attribute with an
 *        attribute-name of "Path", and the cookie's path is "/".
 * @param cookie
 * @returns boolean
 */
function isHostPrefixConditionMet(cookie) {
  validators.validate(validators.isObject(cookie));
  return (
    !cookie.key.startsWith("__Host-") ||
    (cookie.secure &&
      cookie.hostOnly &&
      cookie.path != null &&
      cookie.path === "/")
  );
}

// avoid the V8 deoptimization monster!
function jsonParse(str) {
  let obj;
  try {
    obj = JSON.parse(str);
  } catch (e) {
    return e;
  }
  return obj;
}

function fromJSON(str) {
  if (!str || validators.isEmptyString(str)) {
    return null;
  }

  let obj;
  if (typeof str === "string") {
    obj = jsonParse(str);
    if (obj instanceof Error) {
      return null;
    }
  } else {
    // assume it's an Object
    obj = str;
  }

  const c = new Cookie();
  for (let i = 0; i < Cookie.serializableProperties.length; i++) {
    const prop = Cookie.serializableProperties[i];
    if (obj[prop] === undefined || obj[prop] === cookieDefaults[prop]) {
      continue; // leave as prototype default
    }

    if (prop === "expires" || prop === "creation" || prop === "lastAccessed") {
      if (obj[prop] === null) {
        c[prop] = null;
      } else {
        c[prop] = obj[prop] == "Infinity" ? "Infinity" : new Date(obj[prop]);
      }
    } else {
      c[prop] = obj[prop];
    }
  }

  return c;
}

/* Section 5.4 part 2:
 * "*  Cookies with longer paths are listed before cookies with
 *     shorter paths.
 *
 *  *  Among cookies that have equal-length path fields, cookies with
 *     earlier creation-times are listed before cookies with later
 *     creation-times."
 */

function cookieCompare(a, b) {
  validators.validate(validators.isObject(a), a);
  validators.validate(validators.isObject(b), b);
  let cmp = 0;

  // descending for length: b CMP a
  const aPathLen = a.path ? a.path.length : 0;
  const bPathLen = b.path ? b.path.length : 0;
  cmp = bPathLen - aPathLen;
  if (cmp !== 0) {
    return cmp;
  }

  // ascending for time: a CMP b
  const aTime = a.creation ? a.creation.getTime() : MAX_TIME;
  const bTime = b.creation ? b.creation.getTime() : MAX_TIME;
  cmp = aTime - bTime;
  if (cmp !== 0) {
    return cmp;
  }

  // break ties for the same millisecond (precision of JavaScript's clock)
  cmp = a.creationIndex - b.creationIndex;

  return cmp;
}

// Gives the permutation of all possible pathMatch()es of a given path. The
// array is in longest-to-shortest order.  Handy for indexing.
function permutePath(path) {
  validators.validate(validators.isString(path));
  if (path === "/") {
    return ["/"];
  }
  const permutations = [path];
  while (path.length > 1) {
    const lindex = path.lastIndexOf("/");
    if (lindex === 0) {
      break;
    }
    path = path.substr(0, lindex);
    permutations.push(path);
  }
  permutations.push("/");
  return permutations;
}

function getCookieContext(url) {
  if (url instanceof Object) {
    return url;
  }
  // NOTE: decodeURI will throw on malformed URIs (see GH-32).
  // Therefore, we will just skip decoding for such URIs.
  try {
    url = decodeURI(url);
  } catch (err) {
    // Silently swallow error
  }

  return urlParse(url);
}

const cookieDefaults = {
  // the order in which the RFC has them:
  key: "",
  value: "",
  expires: "Infinity",
  maxAge: null,
  domain: null,
  path: null,
  secure: false,
  httpOnly: false,
  extensions: null,
  // set by the CookieJar:
  hostOnly: null,
  pathIsDefault: null,
  creation: null,
  lastAccessed: null,
  sameSite: undefined
};

class Cookie {
  constructor(options = {}) {
    const customInspectSymbol = getCustomInspectSymbol();
    if (customInspectSymbol) {
      this[customInspectSymbol] = this.inspect;
    }

    Object.assign(this, cookieDefaults, options);
    this.creation = this.creation || new Date();

    // used to break creation ties in cookieCompare():
    Object.defineProperty(this, "creationIndex", {
      configurable: false,
      enumerable: false, // important for assert.deepEqual checks
      writable: true,
      value: ++Cookie.cookiesCreated
    });
  }

  inspect() {
    const now = Date.now();
    const hostOnly = this.hostOnly != null ? this.hostOnly : "?";
    const createAge = this.creation
      ? `${now - this.creation.getTime()}ms`
      : "?";
    const accessAge = this.lastAccessed
      ? `${now - this.lastAccessed.getTime()}ms`
      : "?";
    return `Cookie="${this.toString()}; hostOnly=${hostOnly}; aAge=${accessAge}; cAge=${createAge}"`;
  }

  toJSON() {
    const obj = {};

    for (const prop of Cookie.serializableProperties) {
      if (this[prop] === cookieDefaults[prop]) {
        continue; // leave as prototype default
      }

      if (
        prop === "expires" ||
        prop === "creation" ||
        prop === "lastAccessed"
      ) {
        if (this[prop] === null) {
          obj[prop] = null;
        } else {
          obj[prop] =
            this[prop] == "Infinity" // intentionally not ===
              ? "Infinity"
              : this[prop].toISOString();
        }
      } else if (prop === "maxAge") {
        if (this[prop] !== null) {
          // again, intentionally not ===
          obj[prop] =
            this[prop] == Infinity || this[prop] == -Infinity
              ? this[prop].toString()
              : this[prop];
        }
      } else {
        if (this[prop] !== cookieDefaults[prop]) {
          obj[prop] = this[prop];
        }
      }
    }

    return obj;
  }

  clone() {
    return fromJSON(this.toJSON());
  }

  validate() {
    if (!COOKIE_OCTETS.test(this.value)) {
      return false;
    }
    if (
      this.expires != Infinity &&
      !(this.expires instanceof Date) &&
      !parseDate(this.expires)
    ) {
      return false;
    }
    if (this.maxAge != null && this.maxAge <= 0) {
      return false; // "Max-Age=" non-zero-digit *DIGIT
    }
    if (this.path != null && !PATH_VALUE.test(this.path)) {
      return false;
    }

    const cdomain = this.cdomain();
    if (cdomain) {
      if (cdomain.match(/\.$/)) {
        return false; // S4.1.2.3 suggests that this is bad. domainMatch() tests confirm this
      }
      const suffix = pubsuffix.getPublicSuffix(cdomain);
      if (suffix == null) {
        // it's a public suffix
        return false;
      }
    }
    return true;
  }

  setExpires(exp) {
    if (exp instanceof Date) {
      this.expires = exp;
    } else {
      this.expires = parseDate(exp) || "Infinity";
    }
  }

  setMaxAge(age) {
    if (age === Infinity || age === -Infinity) {
      this.maxAge = age.toString(); // so JSON.stringify() works
    } else {
      this.maxAge = age;
    }
  }

  cookieString() {
    let val = this.value;
    if (val == null) {
      val = "";
    }
    if (this.key === "") {
      return val;
    }
    return `${this.key}=${val}`;
  }

  // gives Set-Cookie header format
  toString() {
    let str = this.cookieString();

    if (this.expires != Infinity) {
      if (this.expires instanceof Date) {
        str += `; Expires=${formatDate(this.expires)}`;
      } else {
        str += `; Expires=${this.expires}`;
      }
    }

    if (this.maxAge != null && this.maxAge != Infinity) {
      str += `; Max-Age=${this.maxAge}`;
    }

    if (this.domain && !this.hostOnly) {
      str += `; Domain=${this.domain}`;
    }
    if (this.path) {
      str += `; Path=${this.path}`;
    }

    if (this.secure) {
      str += "; Secure";
    }
    if (this.httpOnly) {
      str += "; HttpOnly";
    }
    if (this.sameSite && this.sameSite !== "none") {
      const ssCanon = Cookie.sameSiteCanonical[this.sameSite.toLowerCase()];
      str += `; SameSite=${ssCanon ? ssCanon : this.sameSite}`;
    }
    if (this.extensions) {
      this.extensions.forEach(ext => {
        str += `; ${ext}`;
      });
    }

    return str;
  }

  // TTL() partially replaces the "expiry-time" parts of S5.3 step 3 (setCookie()
  // elsewhere)
  // S5.3 says to give the "latest representable date" for which we use Infinity
  // For "expired" we use 0
  TTL(now) {
    /* RFC6265 S4.1.2.2 If a cookie has both the Max-Age and the Expires
     * attribute, the Max-Age attribute has precedence and controls the
     * expiration date of the cookie.
     * (Concurs with S5.3 step 3)
     */
    if (this.maxAge != null) {
      return this.maxAge <= 0 ? 0 : this.maxAge * 1000;
    }

    let expires = this.expires;
    if (expires != Infinity) {
      if (!(expires instanceof Date)) {
        expires = parseDate(expires) || Infinity;
      }

      if (expires == Infinity) {
        return Infinity;
      }

      return expires.getTime() - (now || Date.now());
    }

    return Infinity;
  }

  // expiryTime() replaces the "expiry-time" parts of S5.3 step 3 (setCookie()
  // elsewhere)
  expiryTime(now) {
    if (this.maxAge != null) {
      const relativeTo = now || this.creation || new Date();
      const age = this.maxAge <= 0 ? -Infinity : this.maxAge * 1000;
      return relativeTo.getTime() + age;
    }

    if (this.expires == Infinity) {
      return Infinity;
    }
    return this.expires.getTime();
  }

  // expiryDate() replaces the "expiry-time" parts of S5.3 step 3 (setCookie()
  // elsewhere), except it returns a Date
  expiryDate(now) {
    const millisec = this.expiryTime(now);
    if (millisec == Infinity) {
      return new Date(MAX_TIME);
    } else if (millisec == -Infinity) {
      return new Date(MIN_TIME);
    } else {
      return new Date(millisec);
    }
  }

  // This replaces the "persistent-flag" parts of S5.3 step 3
  isPersistent() {
    return this.maxAge != null || this.expires != Infinity;
  }

  // Mostly S5.1.2 and S5.2.3:
  canonicalizedDomain() {
    if (this.domain == null) {
      return null;
    }
    return canonicalDomain(this.domain);
  }

  cdomain() {
    return this.canonicalizedDomain();
  }
}

Cookie.cookiesCreated = 0;
Cookie.parse = parse;
Cookie.fromJSON = fromJSON;
Cookie.serializableProperties = Object.keys(cookieDefaults);
Cookie.sameSiteLevel = {
  strict: 3,
  lax: 2,
  none: 1
};

Cookie.sameSiteCanonical = {
  strict: "Strict",
  lax: "Lax"
};

function getNormalizedPrefixSecurity(prefixSecurity) {
  if (prefixSecurity != null) {
    const normalizedPrefixSecurity = prefixSecurity.toLowerCase();
    /* The three supported options */
    switch (normalizedPrefixSecurity) {
      case PrefixSecurityEnum.STRICT:
      case PrefixSecurityEnum.SILENT:
      case PrefixSecurityEnum.DISABLED:
        return normalizedPrefixSecurity;
    }
  }
  /* Default is SILENT */
  return PrefixSecurityEnum.SILENT;
}

class CookieJar {
  constructor(store, options = { rejectPublicSuffixes: true }) {
    if (typeof options === "boolean") {
      options = { rejectPublicSuffixes: options };
    }
    validators.validate(validators.isObject(options), options);
    this.rejectPublicSuffixes = options.rejectPublicSuffixes;
    this.enableLooseMode = !!options.looseMode;
    this.allowSpecialUseDomain =
      typeof options.allowSpecialUseDomain === "boolean"
        ? options.allowSpecialUseDomain
        : true;
    this.store = store || new MemoryCookieStore();
    this.prefixSecurity = getNormalizedPrefixSecurity(options.prefixSecurity);
    this._cloneSync = syncWrap("clone");
    this._importCookiesSync = syncWrap("_importCookies");
    this.getCookiesSync = syncWrap("getCookies");
    this.getCookieStringSync = syncWrap("getCookieString");
    this.getSetCookieStringsSync = syncWrap("getSetCookieStrings");
    this.removeAllCookiesSync = syncWrap("removeAllCookies");
    this.setCookieSync = syncWrap("setCookie");
    this.serializeSync = syncWrap("serialize");
  }

  setCookie(cookie, url, options, cb) {
    validators.validate(validators.isNonEmptyString(url), cb, options);
    let err;

    if (validators.isFunction(url)) {
      cb = url;
      return cb(new Error("No URL was specified"));
    }

    const context = getCookieContext(url);
    if (validators.isFunction(options)) {
      cb = options;
      options = {};
    }

    validators.validate(validators.isFunction(cb), cb);

    if (
      !validators.isNonEmptyString(cookie) &&
      !validators.isObject(cookie) &&
      cookie instanceof String &&
      cookie.length == 0
    ) {
      return cb(null);
    }

    const host = canonicalDomain(context.hostname);
    const loose = options.loose || this.enableLooseMode;

    let sameSiteContext = null;
    if (options.sameSiteContext) {
      sameSiteContext = checkSameSiteContext(options.sameSiteContext);
      if (!sameSiteContext) {
        return cb(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
    }

    // S5.3 step 1
    if (typeof cookie === "string" || cookie instanceof String) {
      cookie = Cookie.parse(cookie, { loose: loose });
      if (!cookie) {
        err = new Error("Cookie failed to parse");
        return cb(options.ignoreError ? null : err);
      }
    } else if (!(cookie instanceof Cookie)) {
      // If you're seeing this error, and are passing in a Cookie object,
      // it *might* be a Cookie object from another loaded version of tough-cookie.
      err = new Error(
        "First argument to setCookie must be a Cookie object or string"
      );
      return cb(options.ignoreError ? null : err);
    }

    // S5.3 step 2
    const now = options.now || new Date(); // will assign later to save effort in the face of errors

    // S5.3 step 3: NOOP; persistent-flag and expiry-time is handled by getCookie()

    // S5.3 step 4: NOOP; domain is null by default

    // S5.3 step 5: public suffixes
    if (this.rejectPublicSuffixes && cookie.domain) {
      const suffix = pubsuffix.getPublicSuffix(cookie.cdomain(), {
        allowSpecialUseDomain: this.allowSpecialUseDomain,
        ignoreError: options.ignoreError
      });
      if (suffix == null && !IP_V6_REGEX_OBJECT.test(cookie.domain)) {
        // e.g. "com"
        err = new Error("Cookie has domain set to a public suffix");
        return cb(options.ignoreError ? null : err);
      }
    }

    // S5.3 step 6:
    if (cookie.domain) {
      if (!domainMatch(host, cookie.cdomain(), false)) {
        err = new Error(
          `Cookie not in this host's domain. Cookie:${cookie.cdomain()} Request:${host}`
        );
        return cb(options.ignoreError ? null : err);
      }

      if (cookie.hostOnly == null) {
        // don't reset if already set
        cookie.hostOnly = false;
      }
    } else {
      cookie.hostOnly = true;
      cookie.domain = host;
    }

    //S5.2.4 If the attribute-value is empty or if the first character of the
    //attribute-value is not %x2F ("/"):
    //Let cookie-path be the default-path.
    if (!cookie.path || cookie.path[0] !== "/") {
      cookie.path = defaultPath(context.pathname);
      cookie.pathIsDefault = true;
    }

    // S5.3 step 8: NOOP; secure attribute
    // S5.3 step 9: NOOP; httpOnly attribute

    // S5.3 step 10
    if (options.http === false && cookie.httpOnly) {
      err = new Error("Cookie is HttpOnly and this isn't an HTTP API");
      return cb(options.ignoreError ? null : err);
    }

    // 6252bis-02 S5.4 Step 13 & 14:
    if (
      cookie.sameSite !== "none" &&
      cookie.sameSite !== undefined &&
      sameSiteContext
    ) {
      // "If the cookie's "same-site-flag" is not "None", and the cookie
      //  is being set from a context whose "site for cookies" is not an
      //  exact match for request-uri's host's registered domain, then
      //  abort these steps and ignore the newly created cookie entirely."
      if (sameSiteContext === "none") {
        err = new Error(
          "Cookie is SameSite but this is a cross-origin request"
        );
        return cb(options.ignoreError ? null : err);
      }
    }

    /* 6265bis-02 S5.4 Steps 15 & 16 */
    const ignoreErrorForPrefixSecurity =
      this.prefixSecurity === PrefixSecurityEnum.SILENT;
    const prefixSecurityDisabled =
      this.prefixSecurity === PrefixSecurityEnum.DISABLED;
    /* If prefix checking is not disabled ...*/
    if (!prefixSecurityDisabled) {
      let errorFound = false;
      let errorMsg;
      /* Check secure prefix condition */
      if (!isSecurePrefixConditionMet(cookie)) {
        errorFound = true;
        errorMsg = "Cookie has __Secure prefix but Secure attribute is not set";
      } else if (!isHostPrefixConditionMet(cookie)) {
        /* Check host prefix condition */
        errorFound = true;
        errorMsg =
          "Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'";
      }
      if (errorFound) {
        return cb(
          options.ignoreError || ignoreErrorForPrefixSecurity
            ? null
            : new Error(errorMsg)
        );
      }
    }

    const store = this.store;

    if (!store.updateCookie) {
      store.updateCookie = function(oldCookie, newCookie, cb) {
        this.putCookie(newCookie, cb);
      };
    }

    function withCookie(err, oldCookie) {
      if (err) {
        return cb(err);
      }

      const next = function(err) {
        if (err) {
          return cb(err);
        } else {
          cb(null, cookie);
        }
      };

      if (oldCookie) {
        // S5.3 step 11 - "If the cookie store contains a cookie with the same name,
        // domain, and path as the newly created cookie:"
        if (options.http === false && oldCookie.httpOnly) {
          // step 11.2
          err = new Error("old Cookie is HttpOnly and this isn't an HTTP API");
          return cb(options.ignoreError ? null : err);
        }
        cookie.creation = oldCookie.creation; // step 11.3
        cookie.creationIndex = oldCookie.creationIndex; // preserve tie-breaker
        cookie.lastAccessed = now;
        // Step 11.4 (delete cookie) is implied by just setting the new one:
        store.updateCookie(oldCookie, cookie, next); // step 12
      } else {
        cookie.creation = cookie.lastAccessed = now;
        store.putCookie(cookie, next); // step 12
      }
    }

    store.findCookie(cookie.domain, cookie.path, cookie.key, withCookie);
  }

  // RFC6365 S5.4
  getCookies(url, options, cb) {
    validators.validate(validators.isNonEmptyString(url), cb, url);
    const context = getCookieContext(url);
    if (validators.isFunction(options)) {
      cb = options;
      options = {};
    }
    validators.validate(validators.isObject(options), cb, options);
    validators.validate(validators.isFunction(cb), cb);

    const host = canonicalDomain(context.hostname);
    const path = context.pathname || "/";

    let secure = options.secure;
    if (
      secure == null &&
      context.protocol &&
      (context.protocol == "https:" || context.protocol == "wss:")
    ) {
      secure = true;
    }

    let sameSiteLevel = 0;
    if (options.sameSiteContext) {
      const sameSiteContext = checkSameSiteContext(options.sameSiteContext);
      sameSiteLevel = Cookie.sameSiteLevel[sameSiteContext];
      if (!sameSiteLevel) {
        return cb(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
    }

    let http = options.http;
    if (http == null) {
      http = true;
    }

    const now = options.now || Date.now();
    const expireCheck = options.expire !== false;
    const allPaths = !!options.allPaths;
    const store = this.store;

    function matchingCookie(c) {
      // "Either:
      //   The cookie's host-only-flag is true and the canonicalized
      //   request-host is identical to the cookie's domain.
      // Or:
      //   The cookie's host-only-flag is false and the canonicalized
      //   request-host domain-matches the cookie's domain."
      if (c.hostOnly) {
        if (c.domain != host) {
          return false;
        }
      } else {
        if (!domainMatch(host, c.domain, false)) {
          return false;
        }
      }

      // "The request-uri's path path-matches the cookie's path."
      if (!allPaths && !pathMatch(path, c.path)) {
        return false;
      }

      // "If the cookie's secure-only-flag is true, then the request-uri's
      // scheme must denote a "secure" protocol"
      if (c.secure && !secure) {
        return false;
      }

      // "If the cookie's http-only-flag is true, then exclude the cookie if the
      // cookie-string is being generated for a "non-HTTP" API"
      if (c.httpOnly && !http) {
        return false;
      }

      // RFC6265bis-02 S5.3.7
      if (sameSiteLevel) {
        const cookieLevel = Cookie.sameSiteLevel[c.sameSite || "none"];
        if (cookieLevel > sameSiteLevel) {
          // only allow cookies at or below the request level
          return false;
        }
      }

      // deferred from S5.3
      // non-RFC: allow retention of expired cookies by choice
      if (expireCheck && c.expiryTime() <= now) {
        store.removeCookie(c.domain, c.path, c.key, () => {}); // result ignored
        return false;
      }

      return true;
    }

    store.findCookies(
      host,
      allPaths ? null : path,
      this.allowSpecialUseDomain,
      (err, cookies) => {
        if (err) {
          return cb(err);
        }

        cookies = cookies.filter(matchingCookie);

        // sorting of S5.4 part 2
        if (options.sort !== false) {
          cookies = cookies.sort(cookieCompare);
        }

        // S5.4 part 3
        const now = new Date();
        for (const cookie of cookies) {
          cookie.lastAccessed = now;
        }
        // TODO persist lastAccessed

        cb(null, cookies);
      }
    );
  }

  getCookieString(...args) {
    const cb = args.pop();
    validators.validate(validators.isFunction(cb), cb);
    const next = function(err, cookies) {
      if (err) {
        cb(err);
      } else {
        cb(
          null,
          cookies
            .sort(cookieCompare)
            .map(c => c.cookieString())
            .join("; ")
        );
      }
    };
    args.push(next);
    this.getCookies.apply(this, args);
  }

  getSetCookieStrings(...args) {
    const cb = args.pop();
    validators.validate(validators.isFunction(cb), cb);
    const next = function(err, cookies) {
      if (err) {
        cb(err);
      } else {
        cb(
          null,
          cookies.map(c => {
            return c.toString();
          })
        );
      }
    };
    args.push(next);
    this.getCookies.apply(this, args);
  }

  serialize(cb) {
    validators.validate(validators.isFunction(cb), cb);
    let type = this.store.constructor.name;
    if (validators.isObject(type)) {
      type = null;
    }

    // update README.md "Serialization Format" if you change this, please!
    const serialized = {
      // The version of tough-cookie that serialized this jar. Generally a good
      // practice since future versions can make data import decisions based on
      // known past behavior. When/if this matters, use `semver`.
      version: `tough-cookie@${VERSION}`,

      // add the store type, to make humans happy:
      storeType: type,

      // CookieJar configuration:
      rejectPublicSuffixes: !!this.rejectPublicSuffixes,
      enableLooseMode: !!this.enableLooseMode,
      allowSpecialUseDomain: !!this.allowSpecialUseDomain,
      prefixSecurity: getNormalizedPrefixSecurity(this.prefixSecurity),

      // this gets filled from getAllCookies:
      cookies: []
    };

    if (
      !(
        this.store.getAllCookies &&
        typeof this.store.getAllCookies === "function"
      )
    ) {
      return cb(
        new Error(
          "store does not support getAllCookies and cannot be serialized"
        )
      );
    }

    this.store.getAllCookies((err, cookies) => {
      if (err) {
        return cb(err);
      }

      serialized.cookies = cookies.map(cookie => {
        // convert to serialized 'raw' cookies
        cookie = cookie instanceof Cookie ? cookie.toJSON() : cookie;

        // Remove the index so new ones get assigned during deserialization
        delete cookie.creationIndex;

        return cookie;
      });

      return cb(null, serialized);
    });
  }

  toJSON() {
    return this.serializeSync();
  }

  // use the class method CookieJar.deserialize instead of calling this directly
  _importCookies(serialized, cb) {
    let cookies = serialized.cookies;
    if (!cookies || !Array.isArray(cookies)) {
      return cb(new Error("serialized jar has no cookies array"));
    }
    cookies = cookies.slice(); // do not modify the original

    const putNext = err => {
      if (err) {
        return cb(err);
      }

      if (!cookies.length) {
        return cb(err, this);
      }

      let cookie;
      try {
        cookie = fromJSON(cookies.shift());
      } catch (e) {
        return cb(e);
      }

      if (cookie === null) {
        return putNext(null); // skip this cookie
      }

      this.store.putCookie(cookie, putNext);
    };

    putNext();
  }

  clone(newStore, cb) {
    if (arguments.length === 1) {
      cb = newStore;
      newStore = null;
    }

    this.serialize((err, serialized) => {
      if (err) {
        return cb(err);
      }
      CookieJar.deserialize(serialized, newStore, cb);
    });
  }

  cloneSync(newStore) {
    if (arguments.length === 0) {
      return this._cloneSync();
    }
    if (!newStore.synchronous) {
      throw new Error(
        "CookieJar clone destination store is not synchronous; use async API instead."
      );
    }
    return this._cloneSync(newStore);
  }

  removeAllCookies(cb) {
    validators.validate(validators.isFunction(cb), cb);
    const store = this.store;

    // Check that the store implements its own removeAllCookies(). The default
    // implementation in Store will immediately call the callback with a "not
    // implemented" Error.
    if (
      typeof store.removeAllCookies === "function" &&
      store.removeAllCookies !== Store.prototype.removeAllCookies
    ) {
      return store.removeAllCookies(cb);
    }

    store.getAllCookies((err, cookies) => {
      if (err) {
        return cb(err);
      }

      if (cookies.length === 0) {
        return cb(null);
      }

      let completedCount = 0;
      const removeErrors = [];

      function removeCookieCb(removeErr) {
        if (removeErr) {
          removeErrors.push(removeErr);
        }

        completedCount++;

        if (completedCount === cookies.length) {
          return cb(removeErrors.length ? removeErrors[0] : null);
        }
      }

      cookies.forEach(cookie => {
        store.removeCookie(
          cookie.domain,
          cookie.path,
          cookie.key,
          removeCookieCb
        );
      });
    });
  }

  static deserialize(strOrObj, store, cb) {
    if (arguments.length !== 3) {
      // store is optional
      cb = store;
      store = null;
    }
    validators.validate(validators.isFunction(cb), cb);

    let serialized;
    if (typeof strOrObj === "string") {
      serialized = jsonParse(strOrObj);
      if (serialized instanceof Error) {
        return cb(serialized);
      }
    } else {
      serialized = strOrObj;
    }

    const jar = new CookieJar(store, {
      rejectPublicSuffixes: serialized.rejectPublicSuffixes,
      looseMode: serialized.enableLooseMode,
      allowSpecialUseDomain: serialized.allowSpecialUseDomain,
      prefixSecurity: serialized.prefixSecurity
    });
    jar._importCookies(serialized, err => {
      if (err) {
        return cb(err);
      }
      cb(null, jar);
    });
  }

  static deserializeSync(strOrObj, store) {
    const serialized =
      typeof strOrObj === "string" ? JSON.parse(strOrObj) : strOrObj;
    const jar = new CookieJar(store, {
      rejectPublicSuffixes: serialized.rejectPublicSuffixes,
      looseMode: serialized.enableLooseMode
    });

    // catch this mistake early:
    if (!jar.store.synchronous) {
      throw new Error(
        "CookieJar store is not synchronous; use async API instead."
      );
    }

    jar._importCookiesSync(serialized);
    return jar;
  }
}
CookieJar.fromJSON = CookieJar.deserializeSync;

[
  "_importCookies",
  "clone",
  "getCookies",
  "getCookieString",
  "getSetCookieStrings",
  "removeAllCookies",
  "serialize",
  "setCookie"
].forEach(name => {
  CookieJar.prototype[name] = fromCallback(CookieJar.prototype[name]);
});
CookieJar.deserialize = fromCallback(CookieJar.deserialize);

// Use a closure to provide a true imperative API for synchronous stores.
function syncWrap(method) {
  return function(...args) {
    if (!this.store.synchronous) {
      throw new Error(
        "CookieJar store is not synchronous; use async API instead."
      );
    }

    let syncErr, syncResult;
    this[method](...args, (err, result) => {
      syncErr = err;
      syncResult = result;
    });

    if (syncErr) {
      throw syncErr;
    }
    return syncResult;
  };
}

exports.version = VERSION;
exports.CookieJar = CookieJar;
exports.Cookie = Cookie;
exports.Store = Store;
exports.MemoryCookieStore = MemoryCookieStore;
exports.parseDate = parseDate;
exports.formatDate = formatDate;
exports.parse = parse;
exports.fromJSON = fromJSON;
exports.domainMatch = domainMatch;
exports.defaultPath = defaultPath;
exports.pathMatch = pathMatch;
exports.getPublicSuffix = pubsuffix.getPublicSuffix;
exports.cookieCompare = cookieCompare;
exports.permuteDomain = require("./permuteDomain").permuteDomain;
exports.permutePath = permutePath;
exports.canonicalDomain = canonicalDomain;
exports.PrefixSecurityEnum = PrefixSecurityEnum;
exports.ParameterError = validators.ParameterError;

},{"./memstore":143,"./pathMatch":144,"./permuteDomain":145,"./pubsuffix-psl":146,"./store":147,"./utilHelper":148,"./validators.js":149,"./version":150,"punycode/":151,"universalify":152,"url-parse":153}],143:[function(require,module,exports){
/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
const { fromCallback } = require("universalify");
const Store = require("./store").Store;
const permuteDomain = require("./permuteDomain").permuteDomain;
const pathMatch = require("./pathMatch").pathMatch;
const { getCustomInspectSymbol, getUtilInspect } = require("./utilHelper");

class MemoryCookieStore extends Store {
  constructor() {
    super();
    this.synchronous = true;
    this.idx = {};
    const customInspectSymbol = getCustomInspectSymbol();
    if (customInspectSymbol) {
      this[customInspectSymbol] = this.inspect;
    }
  }

  inspect() {
    const util = { inspect: getUtilInspect(inspectFallback) };
    return `{ idx: ${util.inspect(this.idx, false, 2)} }`;
  }

  findCookie(domain, path, key, cb) {
    if (!this.idx[domain]) {
      return cb(null, undefined);
    }
    if (!this.idx[domain][path]) {
      return cb(null, undefined);
    }
    return cb(null, this.idx[domain][path][key] || null);
  }
  findCookies(domain, path, allowSpecialUseDomain, cb) {
    const results = [];
    if (typeof allowSpecialUseDomain === "function") {
      cb = allowSpecialUseDomain;
      allowSpecialUseDomain = true;
    }
    if (!domain) {
      return cb(null, []);
    }

    let pathMatcher;
    if (!path) {
      // null means "all paths"
      pathMatcher = function matchAll(domainIndex) {
        for (const curPath in domainIndex) {
          const pathIndex = domainIndex[curPath];
          for (const key in pathIndex) {
            results.push(pathIndex[key]);
          }
        }
      };
    } else {
      pathMatcher = function matchRFC(domainIndex) {
        //NOTE: we should use path-match algorithm from S5.1.4 here
        //(see : https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/canonical_cookie.cc#L299)
        Object.keys(domainIndex).forEach(cookiePath => {
          if (pathMatch(path, cookiePath)) {
            const pathIndex = domainIndex[cookiePath];
            for (const key in pathIndex) {
              results.push(pathIndex[key]);
            }
          }
        });
      };
    }

    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain];
    const idx = this.idx;
    domains.forEach(curDomain => {
      const domainIndex = idx[curDomain];
      if (!domainIndex) {
        return;
      }
      pathMatcher(domainIndex);
    });

    cb(null, results);
  }

  putCookie(cookie, cb) {
    if (!this.idx[cookie.domain]) {
      this.idx[cookie.domain] = {};
    }
    if (!this.idx[cookie.domain][cookie.path]) {
      this.idx[cookie.domain][cookie.path] = {};
    }
    this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
    cb(null);
  }
  updateCookie(oldCookie, newCookie, cb) {
    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    this.putCookie(newCookie, cb);
  }
  removeCookie(domain, path, key, cb) {
    if (
      this.idx[domain] &&
      this.idx[domain][path] &&
      this.idx[domain][path][key]
    ) {
      delete this.idx[domain][path][key];
    }
    cb(null);
  }
  removeCookies(domain, path, cb) {
    if (this.idx[domain]) {
      if (path) {
        delete this.idx[domain][path];
      } else {
        delete this.idx[domain];
      }
    }
    return cb(null);
  }
  removeAllCookies(cb) {
    this.idx = {};
    return cb(null);
  }
  getAllCookies(cb) {
    const cookies = [];
    const idx = this.idx;

    const domains = Object.keys(idx);
    domains.forEach(domain => {
      const paths = Object.keys(idx[domain]);
      paths.forEach(path => {
        const keys = Object.keys(idx[domain][path]);
        keys.forEach(key => {
          if (key !== null) {
            cookies.push(idx[domain][path][key]);
          }
        });
      });
    });

    // Sort by creationIndex so deserializing retains the creation order.
    // When implementing your own store, this SHOULD retain the order too
    cookies.sort((a, b) => {
      return (a.creationIndex || 0) - (b.creationIndex || 0);
    });

    cb(null, cookies);
  }
}

[
  "findCookie",
  "findCookies",
  "putCookie",
  "updateCookie",
  "removeCookie",
  "removeCookies",
  "removeAllCookies",
  "getAllCookies"
].forEach(name => {
  MemoryCookieStore.prototype[name] = fromCallback(
    MemoryCookieStore.prototype[name]
  );
});

exports.MemoryCookieStore = MemoryCookieStore;

function inspectFallback(val) {
  const domains = Object.keys(val);
  if (domains.length === 0) {
    return "{}";
  }
  let result = "{\n";
  Object.keys(val).forEach((domain, i) => {
    result += formatDomain(domain, val[domain]);
    if (i < domains.length - 1) {
      result += ",";
    }
    result += "\n";
  });
  result += "}";
  return result;
}

function formatDomain(domainName, domainValue) {
  const indent = "  ";
  let result = `${indent}'${domainName}': {\n`;
  Object.keys(domainValue).forEach((path, i, paths) => {
    result += formatPath(path, domainValue[path]);
    if (i < paths.length - 1) {
      result += ",";
    }
    result += "\n";
  });
  result += `${indent}}`;
  return result;
}

function formatPath(pathName, pathValue) {
  const indent = "    ";
  let result = `${indent}'${pathName}': {\n`;
  Object.keys(pathValue).forEach((cookieName, i, cookieNames) => {
    const cookie = pathValue[cookieName];
    result += `      ${cookieName}: ${cookie.inspect()}`;
    if (i < cookieNames.length - 1) {
      result += ",";
    }
    result += "\n";
  });
  result += `${indent}}`;
  return result;
}

exports.inspectFallback = inspectFallback;

},{"./pathMatch":144,"./permuteDomain":145,"./store":147,"./utilHelper":148,"universalify":152}],144:[function(require,module,exports){
/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
/*
 * "A request-path path-matches a given cookie-path if at least one of the
 * following conditions holds:"
 */
function pathMatch(reqPath, cookiePath) {
  // "o  The cookie-path and the request-path are identical."
  if (cookiePath === reqPath) {
    return true;
  }

  const idx = reqPath.indexOf(cookiePath);
  if (idx === 0) {
    // "o  The cookie-path is a prefix of the request-path, and the last
    // character of the cookie-path is %x2F ("/")."
    if (cookiePath.substr(-1) === "/") {
      return true;
    }

    // " o  The cookie-path is a prefix of the request-path, and the first
    // character of the request-path that is not included in the cookie- path
    // is a %x2F ("/") character."
    if (reqPath.substr(cookiePath.length, 1) === "/") {
      return true;
    }
  }

  return false;
}

exports.pathMatch = pathMatch;

},{}],145:[function(require,module,exports){
/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
const pubsuffix = require("./pubsuffix-psl");

// Gives the permutation of all possible domainMatch()es of a given domain. The
// array is in shortest-to-longest order.  Handy for indexing.

function permuteDomain(domain, allowSpecialUseDomain) {
  const pubSuf = pubsuffix.getPublicSuffix(domain, {
    allowSpecialUseDomain: allowSpecialUseDomain
  });

  if (!pubSuf) {
    return null;
  }
  if (pubSuf == domain) {
    return [domain];
  }

  // Nuke trailing dot
  if (domain.slice(-1) == ".") {
    domain = domain.slice(0, -1);
  }

  const prefix = domain.slice(0, -(pubSuf.length + 1)); // ".example.com"
  const parts = prefix.split(".").reverse();
  let cur = pubSuf;
  const permutations = [cur];
  while (parts.length) {
    cur = `${parts.shift()}.${cur}`;
    permutations.push(cur);
  }
  return permutations;
}

exports.permuteDomain = permuteDomain;

},{"./pubsuffix-psl":146}],146:[function(require,module,exports){
/*!
 * Copyright (c) 2018, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
const psl = require("psl");

// RFC 6761
const SPECIAL_USE_DOMAINS = [
  "local",
  "example",
  "invalid",
  "localhost",
  "test"
];

const SPECIAL_TREATMENT_DOMAINS = ["localhost", "invalid"];

function getPublicSuffix(domain, options = {}) {
  const domainParts = domain.split(".");
  const topLevelDomain = domainParts[domainParts.length - 1];
  const allowSpecialUseDomain = !!options.allowSpecialUseDomain;
  const ignoreError = !!options.ignoreError;

  if (allowSpecialUseDomain && SPECIAL_USE_DOMAINS.includes(topLevelDomain)) {
    if (domainParts.length > 1) {
      const secondLevelDomain = domainParts[domainParts.length - 2];
      // In aforementioned example, the eTLD/pubSuf will be apple.localhost
      return `${secondLevelDomain}.${topLevelDomain}`;
    } else if (SPECIAL_TREATMENT_DOMAINS.includes(topLevelDomain)) {
      // For a single word special use domain, e.g. 'localhost' or 'invalid', per RFC 6761,
      // "Application software MAY recognize {localhost/invalid} names as special, or
      // MAY pass them to name resolution APIs as they would for other domain names."
      return `${topLevelDomain}`;
    }
  }

  if (!ignoreError && SPECIAL_USE_DOMAINS.includes(topLevelDomain)) {
    throw new Error(
      `Cookie has domain set to the public suffix "${topLevelDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain:true, rejectPublicSuffixes: false}.`
    );
  }

  return psl.get(domain);
}

exports.getPublicSuffix = getPublicSuffix;

},{"psl":94}],147:[function(require,module,exports){
/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
/*jshint unused:false */

class Store {
  constructor() {
    this.synchronous = false;
  }

  findCookie(domain, path, key, cb) {
    throw new Error("findCookie is not implemented");
  }

  findCookies(domain, path, allowSpecialUseDomain, cb) {
    throw new Error("findCookies is not implemented");
  }

  putCookie(cookie, cb) {
    throw new Error("putCookie is not implemented");
  }

  updateCookie(oldCookie, newCookie, cb) {
    // recommended default implementation:
    // return this.putCookie(newCookie, cb);
    throw new Error("updateCookie is not implemented");
  }

  removeCookie(domain, path, key, cb) {
    throw new Error("removeCookie is not implemented");
  }

  removeCookies(domain, path, cb) {
    throw new Error("removeCookies is not implemented");
  }

  removeAllCookies(cb) {
    throw new Error("removeAllCookies is not implemented");
  }

  getAllCookies(cb) {
    throw new Error(
      "getAllCookies is not implemented (therefore jar cannot be serialized)"
    );
  }
}

exports.Store = Store;

},{}],148:[function(require,module,exports){
function requireUtil() {
  try {
    // eslint-disable-next-line no-restricted-modules
    return require("util");
  } catch (e) {
    return null;
  }
}

// for v10.12.0+
function lookupCustomInspectSymbol() {
  return Symbol.for("nodejs.util.inspect.custom");
}

// for older node environments
function tryReadingCustomSymbolFromUtilInspect(options) {
  const _requireUtil = options.requireUtil || requireUtil;
  const util = _requireUtil();
  return util ? util.inspect.custom : null;
}

exports.getUtilInspect = function getUtilInspect(fallback, options = {}) {
  const _requireUtil = options.requireUtil || requireUtil;
  const util = _requireUtil();
  return function inspect(value, showHidden, depth) {
    return util ? util.inspect(value, showHidden, depth) : fallback(value);
  };
};

exports.getCustomInspectSymbol = function getCustomInspectSymbol(options = {}) {
  const _lookupCustomInspectSymbol =
    options.lookupCustomInspectSymbol || lookupCustomInspectSymbol;

  // get custom inspect symbol for node environments
  return (
    _lookupCustomInspectSymbol() ||
    tryReadingCustomSymbolFromUtilInspect(options)
  );
};

},{"util":159}],149:[function(require,module,exports){
/* ************************************************************************************
Extracted from check-types.js
https://gitlab.com/philbooth/check-types.js

MIT License

Copyright (c) 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019 Phil Booth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

************************************************************************************ */
"use strict";

/* Validation functions copied from check-types package - https://www.npmjs.com/package/check-types */
function isFunction(data) {
  return typeof data === "function";
}

function isNonEmptyString(data) {
  return isString(data) && data !== "";
}

function isDate(data) {
  return isInstanceStrict(data, Date) && isInteger(data.getTime());
}

function isEmptyString(data) {
  return data === "" || (data instanceof String && data.toString() === "");
}

function isString(data) {
  return typeof data === "string" || data instanceof String;
}

function isObject(data) {
  return toString.call(data) === "[object Object]";
}
function isInstanceStrict(data, prototype) {
  try {
    return data instanceof prototype;
  } catch (error) {
    return false;
  }
}

function isInteger(data) {
  return typeof data === "number" && data % 1 === 0;
}
/* End validation functions */

function validate(bool, cb, options) {
  if (!isFunction(cb)) {
    options = cb;
    cb = null;
  }
  if (!isObject(options)) options = { Error: "Failed Check" };
  if (!bool) {
    if (cb) {
      cb(new ParameterError(options));
    } else {
      throw new ParameterError(options);
    }
  }
}

class ParameterError extends Error {
  constructor(...params) {
    super(...params);
  }
}

exports.ParameterError = ParameterError;
exports.isFunction = isFunction;
exports.isNonEmptyString = isNonEmptyString;
exports.isDate = isDate;
exports.isEmptyString = isEmptyString;
exports.isString = isString;
exports.isObject = isObject;
exports.validate = validate;

},{}],150:[function(require,module,exports){
// generated by genversion
module.exports = '4.1.2'

},{}],151:[function(require,module,exports){
'use strict';

/** Highest positive signed 32-bit float value */
const maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

/** Bootstring parameters */
const base = 36;
const tMin = 1;
const tMax = 26;
const skew = 38;
const damp = 700;
const initialBias = 72;
const initialN = 128; // 0x80
const delimiter = '-'; // '\x2D'

/** Regular expressions */
const regexPunycode = /^xn--/;
const regexNonASCII = /[^\0-\x7F]/; // Note: U+007F DEL is excluded too.
const regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

/** Error messages */
const errors = {
	'overflow': 'Overflow: input needs wider integers to process',
	'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
	'invalid-input': 'Invalid input'
};

/** Convenience shortcuts */
const baseMinusTMin = base - tMin;
const floor = Math.floor;
const stringFromCharCode = String.fromCharCode;

/*--------------------------------------------------------------------------*/

/**
 * A generic error utility function.
 * @private
 * @param {String} type The error type.
 * @returns {Error} Throws a `RangeError` with the applicable error message.
 */
function error(type) {
	throw new RangeError(errors[type]);
}

/**
 * A generic `Array#map` utility function.
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} callback The function that gets called for every array
 * item.
 * @returns {Array} A new array of values returned by the callback function.
 */
function map(array, callback) {
	const result = [];
	let length = array.length;
	while (length--) {
		result[length] = callback(array[length]);
	}
	return result;
}

/**
 * A simple `Array#map`-like wrapper to work with domain name strings or email
 * addresses.
 * @private
 * @param {String} domain The domain name or email address.
 * @param {Function} callback The function that gets called for every
 * character.
 * @returns {String} A new string of characters returned by the callback
 * function.
 */
function mapDomain(domain, callback) {
	const parts = domain.split('@');
	let result = '';
	if (parts.length > 1) {
		// In email addresses, only the domain name should be punycoded. Leave
		// the local part (i.e. everything up to `@`) intact.
		result = parts[0] + '@';
		domain = parts[1];
	}
	// Avoid `split(regex)` for IE8 compatibility. See #17.
	domain = domain.replace(regexSeparators, '\x2E');
	const labels = domain.split('.');
	const encoded = map(labels, callback).join('.');
	return result + encoded;
}

/**
 * Creates an array containing the numeric code points of each Unicode
 * character in the string. While JavaScript uses UCS-2 internally,
 * this function will convert a pair of surrogate halves (each of which
 * UCS-2 exposes as separate characters) into a single code point,
 * matching UTF-16.
 * @see `punycode.ucs2.encode`
 * @see <https://mathiasbynens.be/notes/javascript-encoding>
 * @memberOf punycode.ucs2
 * @name decode
 * @param {String} string The Unicode input string (UCS-2).
 * @returns {Array} The new array of code points.
 */
function ucs2decode(string) {
	const output = [];
	let counter = 0;
	const length = string.length;
	while (counter < length) {
		const value = string.charCodeAt(counter++);
		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
			// It's a high surrogate, and there is a next character.
			const extra = string.charCodeAt(counter++);
			if ((extra & 0xFC00) == 0xDC00) { // Low surrogate.
				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
			} else {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				output.push(value);
				counter--;
			}
		} else {
			output.push(value);
		}
	}
	return output;
}

/**
 * Creates a string based on an array of numeric code points.
 * @see `punycode.ucs2.decode`
 * @memberOf punycode.ucs2
 * @name encode
 * @param {Array} codePoints The array of numeric code points.
 * @returns {String} The new Unicode string (UCS-2).
 */
const ucs2encode = codePoints => String.fromCodePoint(...codePoints);

/**
 * Converts a basic code point into a digit/integer.
 * @see `digitToBasic()`
 * @private
 * @param {Number} codePoint The basic numeric code point value.
 * @returns {Number} The numeric value of a basic code point (for use in
 * representing integers) in the range `0` to `base - 1`, or `base` if
 * the code point does not represent a value.
 */
const basicToDigit = function(codePoint) {
	if (codePoint >= 0x30 && codePoint < 0x3A) {
		return 26 + (codePoint - 0x30);
	}
	if (codePoint >= 0x41 && codePoint < 0x5B) {
		return codePoint - 0x41;
	}
	if (codePoint >= 0x61 && codePoint < 0x7B) {
		return codePoint - 0x61;
	}
	return base;
};

/**
 * Converts a digit/integer into a basic code point.
 * @see `basicToDigit()`
 * @private
 * @param {Number} digit The numeric value of a basic code point.
 * @returns {Number} The basic code point whose value (when used for
 * representing integers) is `digit`, which needs to be in the range
 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
 * used; else, the lowercase form is used. The behavior is undefined
 * if `flag` is non-zero and `digit` has no uppercase form.
 */
const digitToBasic = function(digit, flag) {
	//  0..25 map to ASCII a..z or A..Z
	// 26..35 map to ASCII 0..9
	return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
};

/**
 * Bias adaptation function as per section 3.4 of RFC 3492.
 * https://tools.ietf.org/html/rfc3492#section-3.4
 * @private
 */
const adapt = function(delta, numPoints, firstTime) {
	let k = 0;
	delta = firstTime ? floor(delta / damp) : delta >> 1;
	delta += floor(delta / numPoints);
	for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
		delta = floor(delta / baseMinusTMin);
	}
	return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
};

/**
 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
 * symbols.
 * @memberOf punycode
 * @param {String} input The Punycode string of ASCII-only symbols.
 * @returns {String} The resulting string of Unicode symbols.
 */
const decode = function(input) {
	// Don't use UCS-2.
	const output = [];
	const inputLength = input.length;
	let i = 0;
	let n = initialN;
	let bias = initialBias;

	// Handle the basic code points: let `basic` be the number of input code
	// points before the last delimiter, or `0` if there is none, then copy
	// the first basic code points to the output.

	let basic = input.lastIndexOf(delimiter);
	if (basic < 0) {
		basic = 0;
	}

	for (let j = 0; j < basic; ++j) {
		// if it's not a basic code point
		if (input.charCodeAt(j) >= 0x80) {
			error('not-basic');
		}
		output.push(input.charCodeAt(j));
	}

	// Main decoding loop: start just after the last delimiter if any basic code
	// points were copied; start at the beginning otherwise.

	for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

		// `index` is the index of the next character to be consumed.
		// Decode a generalized variable-length integer into `delta`,
		// which gets added to `i`. The overflow checking is easier
		// if we increase `i` as we go, then subtract off its starting
		// value at the end to obtain `delta`.
		const oldi = i;
		for (let w = 1, k = base; /* no condition */; k += base) {

			if (index >= inputLength) {
				error('invalid-input');
			}

			const digit = basicToDigit(input.charCodeAt(index++));

			if (digit >= base) {
				error('invalid-input');
			}
			if (digit > floor((maxInt - i) / w)) {
				error('overflow');
			}

			i += digit * w;
			const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

			if (digit < t) {
				break;
			}

			const baseMinusT = base - t;
			if (w > floor(maxInt / baseMinusT)) {
				error('overflow');
			}

			w *= baseMinusT;

		}

		const out = output.length + 1;
		bias = adapt(i - oldi, out, oldi == 0);

		// `i` was supposed to wrap around from `out` to `0`,
		// incrementing `n` each time, so we'll fix that now:
		if (floor(i / out) > maxInt - n) {
			error('overflow');
		}

		n += floor(i / out);
		i %= out;

		// Insert `n` at position `i` of the output.
		output.splice(i++, 0, n);

	}

	return String.fromCodePoint(...output);
};

/**
 * Converts a string of Unicode symbols (e.g. a domain name label) to a
 * Punycode string of ASCII-only symbols.
 * @memberOf punycode
 * @param {String} input The string of Unicode symbols.
 * @returns {String} The resulting Punycode string of ASCII-only symbols.
 */
const encode = function(input) {
	const output = [];

	// Convert the input in UCS-2 to an array of Unicode code points.
	input = ucs2decode(input);

	// Cache the length.
	const inputLength = input.length;

	// Initialize the state.
	let n = initialN;
	let delta = 0;
	let bias = initialBias;

	// Handle the basic code points.
	for (const currentValue of input) {
		if (currentValue < 0x80) {
			output.push(stringFromCharCode(currentValue));
		}
	}

	const basicLength = output.length;
	let handledCPCount = basicLength;

	// `handledCPCount` is the number of code points that have been handled;
	// `basicLength` is the number of basic code points.

	// Finish the basic string with a delimiter unless it's empty.
	if (basicLength) {
		output.push(delimiter);
	}

	// Main encoding loop:
	while (handledCPCount < inputLength) {

		// All non-basic code points < n have been handled already. Find the next
		// larger one:
		let m = maxInt;
		for (const currentValue of input) {
			if (currentValue >= n && currentValue < m) {
				m = currentValue;
			}
		}

		// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
		// but guard against overflow.
		const handledCPCountPlusOne = handledCPCount + 1;
		if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
			error('overflow');
		}

		delta += (m - n) * handledCPCountPlusOne;
		n = m;

		for (const currentValue of input) {
			if (currentValue < n && ++delta > maxInt) {
				error('overflow');
			}
			if (currentValue === n) {
				// Represent delta as a generalized variable-length integer.
				let q = delta;
				for (let k = base; /* no condition */; k += base) {
					const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
					if (q < t) {
						break;
					}
					const qMinusT = q - t;
					const baseMinusT = base - t;
					output.push(
						stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
					);
					q = floor(qMinusT / baseMinusT);
				}

				output.push(stringFromCharCode(digitToBasic(q, 0)));
				bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength);
				delta = 0;
				++handledCPCount;
			}
		}

		++delta;
		++n;

	}
	return output.join('');
};

/**
 * Converts a Punycode string representing a domain name or an email address
 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
 * it doesn't matter if you call it on a string that has already been
 * converted to Unicode.
 * @memberOf punycode
 * @param {String} input The Punycoded domain name or email address to
 * convert to Unicode.
 * @returns {String} The Unicode representation of the given Punycode
 * string.
 */
const toUnicode = function(input) {
	return mapDomain(input, function(string) {
		return regexPunycode.test(string)
			? decode(string.slice(4).toLowerCase())
			: string;
	});
};

/**
 * Converts a Unicode string representing a domain name or an email address to
 * Punycode. Only the non-ASCII parts of the domain name will be converted,
 * i.e. it doesn't matter if you call it with a domain that's already in
 * ASCII.
 * @memberOf punycode
 * @param {String} input The domain name or email address to convert, as a
 * Unicode string.
 * @returns {String} The Punycode representation of the given domain name or
 * email address.
 */
const toASCII = function(input) {
	return mapDomain(input, function(string) {
		return regexNonASCII.test(string)
			? 'xn--' + encode(string)
			: string;
	});
};

/*--------------------------------------------------------------------------*/

/** Define the public API */
const punycode = {
	/**
	 * A string representing the current Punycode.js version number.
	 * @memberOf punycode
	 * @type String
	 */
	'version': '2.1.0',
	/**
	 * An object of methods to convert from JavaScript's internal character
	 * representation (UCS-2) to Unicode code points, and back.
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode
	 * @type Object
	 */
	'ucs2': {
		'decode': ucs2decode,
		'encode': ucs2encode
	},
	'decode': decode,
	'encode': encode,
	'toASCII': toASCII,
	'toUnicode': toUnicode
};

module.exports = punycode;

},{}],152:[function(require,module,exports){
'use strict'

exports.fromCallback = function (fn) {
  return Object.defineProperty(function () {
    if (typeof arguments[arguments.length - 1] === 'function') fn.apply(this, arguments)
    else {
      return new Promise((resolve, reject) => {
        arguments[arguments.length] = (err, res) => {
          if (err) return reject(err)
          resolve(res)
        }
        arguments.length++
        fn.apply(this, arguments)
      })
    }
  }, 'name', { value: fn.name })
}

exports.fromPromise = function (fn) {
  return Object.defineProperty(function () {
    const cb = arguments[arguments.length - 1]
    if (typeof cb !== 'function') return fn.apply(this, arguments)
    else {
      delete arguments[arguments.length - 1]
      arguments.length--
      fn.apply(this, arguments).then(r => cb(null, r), cb)
    }
  }, 'name', { value: fn.name })
}

},{}],153:[function(require,module,exports){
(function (global){(function (){
'use strict';

var required = require('requires-port')
  , qs = require('querystringify')
  , controlOrWhitespace = /^[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/
  , CRHTLF = /[\n\r\t]/g
  , slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//
  , port = /:\d+$/
  , protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\\/]+)?([\S\s]*)/i
  , windowsDriveLetter = /^[a-zA-Z]:/;

/**
 * Remove control characters and whitespace from the beginning of a string.
 *
 * @param {Object|String} str String to trim.
 * @returns {String} A new string representing `str` stripped of control
 *     characters and whitespace from its beginning.
 * @public
 */
function trimLeft(str) {
  return (str ? str : '').toString().replace(controlOrWhitespace, '');
}

/**
 * These are the parse rules for the URL parser, it informs the parser
 * about:
 *
 * 0. The char it Needs to parse, if it's a string it should be done using
 *    indexOf, RegExp using exec and NaN means set as current value.
 * 1. The property we should set when parsing this value.
 * 2. Indication if it's backwards or forward parsing, when set as number it's
 *    the value of extra chars that should be split off.
 * 3. Inherit from location if non existing in the parser.
 * 4. `toLowerCase` the resulting value.
 */
var rules = [
  ['#', 'hash'],                        // Extract from the back.
  ['?', 'query'],                       // Extract from the back.
  function sanitize(address, url) {     // Sanitize what is left of the address
    return isSpecial(url.protocol) ? address.replace(/\\/g, '/') : address;
  },
  ['/', 'pathname'],                    // Extract from the back.
  ['@', 'auth', 1],                     // Extract from the front.
  [NaN, 'host', undefined, 1, 1],       // Set left over value.
  [/:(\d*)$/, 'port', undefined, 1],    // RegExp the back.
  [NaN, 'hostname', undefined, 1, 1]    // Set left over.
];

/**
 * These properties should not be copied or inherited from. This is only needed
 * for all non blob URL's as a blob URL does not include a hash, only the
 * origin.
 *
 * @type {Object}
 * @private
 */
var ignore = { hash: 1, query: 1 };

/**
 * The location object differs when your code is loaded through a normal page,
 * Worker or through a worker using a blob. And with the blobble begins the
 * trouble as the location object will contain the URL of the blob, not the
 * location of the page where our code is loaded in. The actual origin is
 * encoded in the `pathname` so we can thankfully generate a good "default"
 * location from it so we can generate proper relative URL's again.
 *
 * @param {Object|String} loc Optional default location object.
 * @returns {Object} lolcation object.
 * @public
 */
function lolcation(loc) {
  var globalVar;

  if (typeof window !== 'undefined') globalVar = window;
  else if (typeof global !== 'undefined') globalVar = global;
  else if (typeof self !== 'undefined') globalVar = self;
  else globalVar = {};

  var location = globalVar.location || {};
  loc = loc || location;

  var finaldestination = {}
    , type = typeof loc
    , key;

  if ('blob:' === loc.protocol) {
    finaldestination = new Url(unescape(loc.pathname), {});
  } else if ('string' === type) {
    finaldestination = new Url(loc, {});
    for (key in ignore) delete finaldestination[key];
  } else if ('object' === type) {
    for (key in loc) {
      if (key in ignore) continue;
      finaldestination[key] = loc[key];
    }

    if (finaldestination.slashes === undefined) {
      finaldestination.slashes = slashes.test(loc.href);
    }
  }

  return finaldestination;
}

/**
 * Check whether a protocol scheme is special.
 *
 * @param {String} The protocol scheme of the URL
 * @return {Boolean} `true` if the protocol scheme is special, else `false`
 * @private
 */
function isSpecial(scheme) {
  return (
    scheme === 'file:' ||
    scheme === 'ftp:' ||
    scheme === 'http:' ||
    scheme === 'https:' ||
    scheme === 'ws:' ||
    scheme === 'wss:'
  );
}

/**
 * @typedef ProtocolExtract
 * @type Object
 * @property {String} protocol Protocol matched in the URL, in lowercase.
 * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
 * @property {String} rest Rest of the URL that is not part of the protocol.
 */

/**
 * Extract protocol information from a URL with/without double slash ("//").
 *
 * @param {String} address URL we want to extract from.
 * @param {Object} location
 * @return {ProtocolExtract} Extracted information.
 * @private
 */
function extractProtocol(address, location) {
  address = trimLeft(address);
  address = address.replace(CRHTLF, '');
  location = location || {};

  var match = protocolre.exec(address);
  var protocol = match[1] ? match[1].toLowerCase() : '';
  var forwardSlashes = !!match[2];
  var otherSlashes = !!match[3];
  var slashesCount = 0;
  var rest;

  if (forwardSlashes) {
    if (otherSlashes) {
      rest = match[2] + match[3] + match[4];
      slashesCount = match[2].length + match[3].length;
    } else {
      rest = match[2] + match[4];
      slashesCount = match[2].length;
    }
  } else {
    if (otherSlashes) {
      rest = match[3] + match[4];
      slashesCount = match[3].length;
    } else {
      rest = match[4]
    }
  }

  if (protocol === 'file:') {
    if (slashesCount >= 2) {
      rest = rest.slice(2);
    }
  } else if (isSpecial(protocol)) {
    rest = match[4];
  } else if (protocol) {
    if (forwardSlashes) {
      rest = rest.slice(2);
    }
  } else if (slashesCount >= 2 && isSpecial(location.protocol)) {
    rest = match[4];
  }

  return {
    protocol: protocol,
    slashes: forwardSlashes || isSpecial(protocol),
    slashesCount: slashesCount,
    rest: rest
  };
}

/**
 * Resolve a relative URL pathname against a base URL pathname.
 *
 * @param {String} relative Pathname of the relative URL.
 * @param {String} base Pathname of the base URL.
 * @return {String} Resolved pathname.
 * @private
 */
function resolve(relative, base) {
  if (relative === '') return base;

  var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/'))
    , i = path.length
    , last = path[i - 1]
    , unshift = false
    , up = 0;

  while (i--) {
    if (path[i] === '.') {
      path.splice(i, 1);
    } else if (path[i] === '..') {
      path.splice(i, 1);
      up++;
    } else if (up) {
      if (i === 0) unshift = true;
      path.splice(i, 1);
      up--;
    }
  }

  if (unshift) path.unshift('');
  if (last === '.' || last === '..') path.push('');

  return path.join('/');
}

/**
 * The actual URL instance. Instead of returning an object we've opted-in to
 * create an actual constructor as it's much more memory efficient and
 * faster and it pleases my OCD.
 *
 * It is worth noting that we should not use `URL` as class name to prevent
 * clashes with the global URL instance that got introduced in browsers.
 *
 * @constructor
 * @param {String} address URL we want to parse.
 * @param {Object|String} [location] Location defaults for relative paths.
 * @param {Boolean|Function} [parser] Parser for the query string.
 * @private
 */
function Url(address, location, parser) {
  address = trimLeft(address);
  address = address.replace(CRHTLF, '');

  if (!(this instanceof Url)) {
    return new Url(address, location, parser);
  }

  var relative, extracted, parse, instruction, index, key
    , instructions = rules.slice()
    , type = typeof location
    , url = this
    , i = 0;

  //
  // The following if statements allows this module two have compatibility with
  // 2 different API:
  //
  // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
  //    where the boolean indicates that the query string should also be parsed.
  //
  // 2. The `URL` interface of the browser which accepts a URL, object as
  //    arguments. The supplied object will be used as default values / fall-back
  //    for relative paths.
  //
  if ('object' !== type && 'string' !== type) {
    parser = location;
    location = null;
  }

  if (parser && 'function' !== typeof parser) parser = qs.parse;

  location = lolcation(location);

  //
  // Extract protocol information before running the instructions.
  //
  extracted = extractProtocol(address || '', location);
  relative = !extracted.protocol && !extracted.slashes;
  url.slashes = extracted.slashes || relative && location.slashes;
  url.protocol = extracted.protocol || location.protocol || '';
  address = extracted.rest;

  //
  // When the authority component is absent the URL starts with a path
  // component.
  //
  if (
    extracted.protocol === 'file:' && (
      extracted.slashesCount !== 2 || windowsDriveLetter.test(address)) ||
    (!extracted.slashes &&
      (extracted.protocol ||
        extracted.slashesCount < 2 ||
        !isSpecial(url.protocol)))
  ) {
    instructions[3] = [/(.*)/, 'pathname'];
  }

  for (; i < instructions.length; i++) {
    instruction = instructions[i];

    if (typeof instruction === 'function') {
      address = instruction(address, url);
      continue;
    }

    parse = instruction[0];
    key = instruction[1];

    if (parse !== parse) {
      url[key] = address;
    } else if ('string' === typeof parse) {
      index = parse === '@'
        ? address.lastIndexOf(parse)
        : address.indexOf(parse);

      if (~index) {
        if ('number' === typeof instruction[2]) {
          url[key] = address.slice(0, index);
          address = address.slice(index + instruction[2]);
        } else {
          url[key] = address.slice(index);
          address = address.slice(0, index);
        }
      }
    } else if ((index = parse.exec(address))) {
      url[key] = index[1];
      address = address.slice(0, index.index);
    }

    url[key] = url[key] || (
      relative && instruction[3] ? location[key] || '' : ''
    );

    //
    // Hostname, host and protocol should be lowercased so they can be used to
    // create a proper `origin`.
    //
    if (instruction[4]) url[key] = url[key].toLowerCase();
  }

  //
  // Also parse the supplied query string in to an object. If we're supplied
  // with a custom parser as function use that instead of the default build-in
  // parser.
  //
  if (parser) url.query = parser(url.query);

  //
  // If the URL is relative, resolve the pathname against the base URL.
  //
  if (
      relative
    && location.slashes
    && url.pathname.charAt(0) !== '/'
    && (url.pathname !== '' || location.pathname !== '')
  ) {
    url.pathname = resolve(url.pathname, location.pathname);
  }

  //
  // Default to a / for pathname if none exists. This normalizes the URL
  // to always have a /
  //
  if (url.pathname.charAt(0) !== '/' && isSpecial(url.protocol)) {
    url.pathname = '/' + url.pathname;
  }

  //
  // We should not add port numbers if they are already the default port number
  // for a given protocol. As the host also contains the port number we're going
  // override it with the hostname which contains no port number.
  //
  if (!required(url.port, url.protocol)) {
    url.host = url.hostname;
    url.port = '';
  }

  //
  // Parse down the `auth` for the username and password.
  //
  url.username = url.password = '';

  if (url.auth) {
    index = url.auth.indexOf(':');

    if (~index) {
      url.username = url.auth.slice(0, index);
      url.username = encodeURIComponent(decodeURIComponent(url.username));

      url.password = url.auth.slice(index + 1);
      url.password = encodeURIComponent(decodeURIComponent(url.password))
    } else {
      url.username = encodeURIComponent(decodeURIComponent(url.auth));
    }

    url.auth = url.password ? url.username +':'+ url.password : url.username;
  }

  url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
    ? url.protocol +'//'+ url.host
    : 'null';

  //
  // The href is just the compiled result.
  //
  url.href = url.toString();
}

/**
 * This is convenience method for changing properties in the URL instance to
 * insure that they all propagate correctly.
 *
 * @param {String} part          Property we need to adjust.
 * @param {Mixed} value          The newly assigned value.
 * @param {Boolean|Function} fn  When setting the query, it will be the function
 *                               used to parse the query.
 *                               When setting the protocol, double slash will be
 *                               removed from the final url if it is true.
 * @returns {URL} URL instance for chaining.
 * @public
 */
function set(part, value, fn) {
  var url = this;

  switch (part) {
    case 'query':
      if ('string' === typeof value && value.length) {
        value = (fn || qs.parse)(value);
      }

      url[part] = value;
      break;

    case 'port':
      url[part] = value;

      if (!required(value, url.protocol)) {
        url.host = url.hostname;
        url[part] = '';
      } else if (value) {
        url.host = url.hostname +':'+ value;
      }

      break;

    case 'hostname':
      url[part] = value;

      if (url.port) value += ':'+ url.port;
      url.host = value;
      break;

    case 'host':
      url[part] = value;

      if (port.test(value)) {
        value = value.split(':');
        url.port = value.pop();
        url.hostname = value.join(':');
      } else {
        url.hostname = value;
        url.port = '';
      }

      break;

    case 'protocol':
      url.protocol = value.toLowerCase();
      url.slashes = !fn;
      break;

    case 'pathname':
    case 'hash':
      if (value) {
        var char = part === 'pathname' ? '/' : '#';
        url[part] = value.charAt(0) !== char ? char + value : value;
      } else {
        url[part] = value;
      }
      break;

    case 'username':
    case 'password':
      url[part] = encodeURIComponent(value);
      break;

    case 'auth':
      var index = value.indexOf(':');

      if (~index) {
        url.username = value.slice(0, index);
        url.username = encodeURIComponent(decodeURIComponent(url.username));

        url.password = value.slice(index + 1);
        url.password = encodeURIComponent(decodeURIComponent(url.password));
      } else {
        url.username = encodeURIComponent(decodeURIComponent(value));
      }
  }

  for (var i = 0; i < rules.length; i++) {
    var ins = rules[i];

    if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
  }

  url.auth = url.password ? url.username +':'+ url.password : url.username;

  url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
    ? url.protocol +'//'+ url.host
    : 'null';

  url.href = url.toString();

  return url;
}

/**
 * Transform the properties back in to a valid and full URL string.
 *
 * @param {Function} stringify Optional query stringify function.
 * @returns {String} Compiled version of the URL.
 * @public
 */
function toString(stringify) {
  if (!stringify || 'function' !== typeof stringify) stringify = qs.stringify;

  var query
    , url = this
    , host = url.host
    , protocol = url.protocol;

  if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';

  var result =
    protocol +
    ((url.protocol && url.slashes) || isSpecial(url.protocol) ? '//' : '');

  if (url.username) {
    result += url.username;
    if (url.password) result += ':'+ url.password;
    result += '@';
  } else if (url.password) {
    result += ':'+ url.password;
    result += '@';
  } else if (
    url.protocol !== 'file:' &&
    isSpecial(url.protocol) &&
    !host &&
    url.pathname !== '/'
  ) {
    //
    // Add back the empty userinfo, otherwise the original invalid URL
    // might be transformed into a valid one with `url.pathname` as host.
    //
    result += '@';
  }

  //
  // Trailing colon is removed from `url.host` when it is parsed. If it still
  // ends with a colon, then add back the trailing colon that was removed. This
  // prevents an invalid URL from being transformed into a valid one.
  //
  if (host[host.length - 1] === ':' || (port.test(url.hostname) && !url.port)) {
    host += ':';
  }

  result += host + url.pathname;

  query = 'object' === typeof url.query ? stringify(url.query) : url.query;
  if (query) result += '?' !== query.charAt(0) ? '?'+ query : query;

  if (url.hash) result += url.hash;

  return result;
}

Url.prototype = { set: set, toString: toString };

//
// Expose the URL parser and some additional properties that might be useful for
// others or testing.
//
Url.extractProtocol = extractProtocol;
Url.location = lolcation;
Url.trimLeft = trimLeft;
Url.qs = qs;

module.exports = Url;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"querystringify":99,"requires-port":116}],154:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":155,"punycode":95,"querystring":98}],155:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],156:[function(require,module,exports){
(function (global){(function (){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],157:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],158:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],159:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":158,"_process":92,"inherits":157}],160:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],161:[function(require,module,exports){
const tough = require('tough-cookie');
const WebStorageCookieStore = require('./tough-cookie-web-storage-store');

const { Cookie } = tough;

// This should resemble a real URI, but have a fake TLD. We don't want to have it so that
// it's possible to send these cookies to a domain someone could register after the fact, but
// for Heap, we need a parseable URI because internally we try to determine the right level to set
// a cookie, rather than having a known set of public suffix domains.
const FAKE_APP_URI = 'https://yourdomain.heap/';

(function(document) {
  const store = new WebStorageCookieStore(localStorage);

  const cookiejar = new tough.CookieJar(store);
  Object.defineProperty(document, "cookie", {
    get() {
      return cookiejar.getCookieStringSync(FAKE_APP_URI);
    },
    set(cookie) {
    // loose: true lets us accept cookies with key and no value, which the
    // original tests for this library included.
      cookiejar.setCookieSync(Cookie.parse(cookie, {loose: true}), FAKE_APP_URI);
    }
  });
})(document);

},{"./tough-cookie-web-storage-store":162,"tough-cookie":142}],162:[function(require,module,exports){
'use strict';

let ToughCookie = require('tough-cookie');

let get = require('lodash/get');
let set = require('lodash/set');
let unset = require('lodash/unset');
let values = require('lodash/values');

let Cookie = ToughCookie.Cookie;

const STORE_KEY = '__cookieStore__';

class WebStorageCookieStore extends ToughCookie.Store {
  constructor(storage) {
    super();
    this._storage = storage;
    this.synchronous = true;
  }

  findCookie(domain, path, key, callback) {
    let store = this._readStore();
    let cookie = get(store, [domain, path, key], null);
    callback(null, Cookie.fromJSON(cookie));
  }

  findCookies(domain, path, allowSpecialUseDomain, callback) {
    if (!domain) {
      callback(null, []);
      return;
    }

    let cookies = [];
    let store = this._readStore();
    let domains = ToughCookie.permuteDomain(domain, allowSpecialUseDomain) || [domain];
    for (let domain of domains) {
      if (!store[domain]) {
        continue;
      }

      let matchingPaths = Object.keys(store[domain]);
      if (path != null) {
        matchingPaths = matchingPaths
          .filter(cookiePath => this._isOnPath(cookiePath, path));
      }

      for (let path of matchingPaths) {
        cookies.push(...values(store[domain][path]));
      }
    }

    cookies = cookies.map(cookie => Cookie.fromJSON(cookie));
    callback(null, cookies);
  }

  /**
   * Returns whether `cookiePath` is on the given `urlPath`
   */
  _isOnPath(cookiePath, urlPath) {
    if (!cookiePath) {
      return false;
    }

    if (cookiePath === urlPath) {
      return true;
    }

    if (!urlPath.startsWith(cookiePath)) {
      return false;
    }

    if (cookiePath[cookiePath.length - 1] !== '/' &&
        urlPath[cookiePath.length] !== '/') {
      return false;
    }
    return true;
  }

  putCookie(cookie, callback) {
    let store = this._readStore();
    set(store, [cookie.domain, cookie.path, cookie.key], cookie);
    this._writeStore(store);
    callback(null);
  }

  updateCookie(oldCookie, newCookie, callback) {
    this.putCookie(newCookie, callback);
  }

  removeCookie(domain, path, key, callback) {
    let store = this._readStore();
    unset(store, [domain, path, key]);
    this._writeStore(store);
    callback(null);
  }

  removeCookies(domain, path, callback) {
    let store = this._readStore();
    if (path == null) {
      unset(store, [domain]);
    } else {
      unset(store, [domain, path]);
    }
    this._writeStore(store);
    callback(null);
  }

  getAllCookies(callback) {
    let cookies = [];
    let store = this._readStore();
    for (let domain of Object.keys(store)) {
      for (let path of Object.keys(store[domain])) {
        cookies.push(...values(store[domain][path]));
      }
    }

    cookies = cookies.map(cookie => Cookie.fromJSON(cookie));
    cookies.sort((c1, c2) => (c1.creationIndex || 0) - (c2.creationIndex || 0));
    callback(null, cookies);
  }

  _readStore() {
    let json = this._storage.getItem(STORE_KEY);
    if (json != null) {
      try {
        return JSON.parse(json);
      } catch (e) { }
    }
    return {};
  }

  _writeStore(store) {
    this._storage.setItem(STORE_KEY, JSON.stringify(store));
  }
}

module.exports = WebStorageCookieStore;

},{"lodash/get":72,"lodash/set":86,"lodash/unset":89,"lodash/values":90,"tough-cookie":142}],"net":[function(require,module,exports){
(function (process,Buffer){(function (){
var stream = require('stream');
var util = require('util');
var timers = require('timers');
var http = require('http');

var debug = util.debuglog('net');

var proxy = {
	protocol: (window.location.protocol == 'https:') ? 'wss' : 'ws',
	hostname: window.location.hostname,
	port: window.location.port,
	path: '/api/vm/net'
};
function getProxy() {
	return proxy;
}
function getProxyHost() {
	var host = getProxy().hostname;
	if (getProxy().port) {
		host += ':'+getProxy().port;
	}
	return host;
}
function getProxyOrigin() {
	return getProxy().protocol + '://' + getProxyHost();
}
exports.setProxy = function (options) {
	options = options || {};

	if (options.protocol) {
		proxy.protocol = options.protocol;
	}
	if (options.hostname) {
		proxy.hostname = options.hostname;
	}
	if (options.port) {
		proxy.port = options.port;
	}
	if (options.path) {
		proxy.path = options.path;
	}
};

exports.createServer = function () {
	throw new Error('Cannot create server in a browser');
};

exports.connect = exports.createConnection = function (/* options, connectListener */) {
	var args = normalizeConnectArgs(arguments);
	debug('createConnection', args);
	var s = new Socket(args[0]);
	return Socket.prototype.connect.apply(s, args);
};

function toNumber(x) { return (x = Number(x)) >= 0 ? x : false; }

function isPipeName(s) {
	return util.isString(s) && toNumber(s) === false;
}

// Returns an array [options] or [options, cb]
// It is the same as the argument of Socket.prototype.connect().
function normalizeConnectArgs(args) {
	var options = {};
	if (util.isObject(args[0])) {
		// connect(options, [cb])
		options = args[0];
	} else if (isPipeName(args[0])) {
		// connect(path, [cb]);
		options.path = args[0];
	} else {
		// connect(port, [host], [cb])
		options.port = args[0];
		if (util.isString(args[1])) {
			options.host = args[1];
		}
	}
	var cb = args[args.length - 1];
	return util.isFunction(cb) ? [options, cb] : [options];
}
exports._normalizeConnectArgs = normalizeConnectArgs;

function Socket(options) {
	if (!(this instanceof Socket)) return new Socket(options);

	this._connecting = false;
	this._host = null;

	if (util.isNumber(options))
		options = { fd: options }; // Legacy interface.
	else if (util.isUndefined(options))
		options = {};

	stream.Duplex.call(this, options);

	// these will be set once there is a connection
	this.readable = this.writable = false;

	// handle strings directly
	this._writableState.decodeStrings = false;

	// default to *not* allowing half open sockets
	this.allowHalfOpen = options && options.allowHalfOpen || false;
}
util.inherits(Socket, stream.Duplex);

exports.Socket = Socket;
exports.Stream = Socket; // Legacy naming.

Socket.prototype.listen = function () {
	throw new Error('Cannot listen in a browser');
};

Socket.prototype.setTimeout = function (msecs, callback) {
	if (msecs > 0 && isFinite(msecs)) {
		timers.enroll(this, msecs);
		//timers._unrefActive(this);
		if (callback) {
			this.once('timeout', callback);
		}
	} else if (msecs === 0) {
		timers.unenroll(this);
		if (callback) {
			this.removeListener('timeout', callback);
		}
	}
};

Socket.prototype._onTimeout = function () {
	debug('_onTimeout');
	this.emit('timeout');
};

Socket.prototype.setNoDelay = function (enable) {};
Socket.prototype.setKeepAlive = function (setting, msecs) {};

Socket.prototype.address = function () {
	return {
		address: this.remoteAddress,
		port: this.remotePort,
		family: this.remoteFamily
	};
};

Object.defineProperty(Socket.prototype, 'readyState', {
	get: function() {
		if (this._connecting) {
			return 'opening';
		} else if (this.readable && this.writable) {
			return 'open';
		} else if (this.readable && !this.writable) {
			return 'readOnly';
		} else if (!this.readable && this.writable) {
			return 'writeOnly';
		} else {
			return 'closed';
		}
	}
});

Socket.prototype.bufferSize = undefined;

Socket.prototype._read = function () {};

Socket.prototype.end = function(data, encoding) {
	stream.Duplex.prototype.end.call(this, data, encoding);
	this.writable = false;

	if (this._ws) {
		this._ws.close();
	}

	// just in case we're waiting for an EOF.
	if (this.readable && !this._readableState.endEmitted)
		this.read(0);
	else
		maybeDestroy(this);
};

// Call whenever we set writable=false or readable=false
function maybeDestroy(socket) {
	if (!socket.readable &&
		!socket.writable &&
		!socket.destroyed &&
		!socket._connecting &&
		!socket._writableState.length) {
		socket.destroy();
	}
}

Socket.prototype.destroySoon = function() {
	if (this.writable)
		this.end();
	if (this._writableState.finished)
		this.destroy();
	else
		this.once('finish', this.destroy);
};

Socket.prototype.destroy = function(exception) {
	debug('destroy', exception);
	
	if (this.destroyed) {
		return;
	}

	this._connecting = false;

	this.readable = this.writable = false;

	timers.unenroll(this);

	debug('close');

	this.destroyed = true;
};

Socket.prototype.remoteAddress = null;
Socket.prototype.remoteFamily = null;
Socket.prototype.remotePort = null;

// Used for servers only - not here
Socket.prototype.localAddress = null;
Socket.prototype.localPort = null;

Socket.prototype.bytesRead = 0;
Socket.prototype.bytesWritten = 0;

Socket.prototype._write = function (data, encoding, cb) {
	var self = this;
	cb = cb || function () {};

	// If we are still connecting, then buffer this for later.
	// The Writable logic will buffer up any more writes while
	// waiting for this one to be done.
	if (this._connecting) {
		this._pendingData = data;
		this._pendingEncoding = encoding;
		this.once('connect', function() {
			this._write(data, encoding, cb);
		});
		return;
	}
	this._pendingData = null;
	this._pendingEncoding = '';

	if (encoding == 'binary' && typeof data == 'string') { //TODO: maybe apply this for all string inputs?
		// Setting encoding is very important for binary data - otherwise the data gets modified
		data = new Buffer(data, encoding);
	}

	// Send the data
	this._ws.send(data);

	process.nextTick(function () {
		//console.log('[tcp] sent: ', data.toString(), data.length);
		self.bytesWritten += data.length;
		cb();
	});
};

Socket.prototype.write = function(chunk, encoding, cb) {
	if (!util.isString(chunk) && !util.isBuffer(chunk))
		throw new TypeError('invalid data');
	return stream.Duplex.prototype.write.apply(this, arguments);
};

Socket.prototype.connect = function(options, cb) {
	var self = this;
	
	if (!util.isObject(options)) {
		// Old API:
		// connect(port, [host], [cb])
		// connect(path, [cb]);
		var args = normalizeConnectArgs(arguments);
		return Socket.prototype.connect.apply(this, args);
	}

	cb = cb || function () {};

	if (this.write !== Socket.prototype.write)
		this.write = Socket.prototype.write;

	if (options.path) {
		throw new Error('options.path not supported in the browser');
	}

	self._connecting = true;
	self.writable = true;
	self._host = options.host;

	var req = http.request({
		hostname: getProxy().hostname,
		port: getProxy().port,
		path: getProxy().path + '/connect',
		method: 'POST'
	}, function (res) {
		var json = '';
		res.on('data', function (buf) {
			json += buf;
		});
		res.on('end', function () {
			var data = null;
			try {
				data = JSON.parse(json);
			} catch (e) {
				data = {
					code: res.statusCode,
					error: json
				};
			}

			if (data.error) {
				self.emit('error', 'Cannot open TCP connection ['+res.statusCode+']: '+data.error);
				self.destroy();
				return;
			}

			self.remoteAddress = data.remote.address;
			self.remoteFamily = data.remote.family;
			self.remotePort = data.remote.port;

			self._connectWebSocket(data.token, function (err) {
				if (err) {
					cb(err);
					return;
				}

				cb();
			});
		});
 	});

	req.setHeader('Content-Type', 'application/json');
	req.write(JSON.stringify(options));
	req.end();

	return this;
};

Socket.prototype._connectWebSocket = function (token, cb) {
	var self = this;

	if (self._ws) {
		process.nextTick(function () {
			cb();
		});
		return;
	}

	this._ws = new WebSocket(getProxyOrigin() + getProxy().path + '/socket?token='+token);
	this._handleWebsocket();

	if (cb) {
		self.on('connect', cb);
	}
};

Socket.prototype._handleWebsocket = function () {
	var self = this;

	this._ws.addEventListener('open', function () {
		//console.log('TCP OK');

		self._connecting = false;
		self.readable = true;

		self.emit('connect');

		self.read(0);
	});
	this._ws.addEventListener('error', function (e) {
		// `e` doesn't contain anything useful (https://developer.mozilla.org/en/docs/WebSockets/Writing_WebSocket_client_applications#Connection_errors)
		console.warn('TCP error', e);
		self.emit('error', 'An error occured with the WebSocket');
	});
	this._ws.addEventListener('message', function (e) {
		var contents = e.data;

		var gotBuffer = function (buffer) {
			//console.log('[tcp] received: ' + buffer.toString(), buffer.length);
			self.bytesRead += buffer.length;
			self.push(buffer);
		};

		if (typeof contents == 'string') {
			var buffer = new Buffer(contents);
			gotBuffer(buffer);
		} else if (window.Blob && contents instanceof Blob) {
			var fileReader = new FileReader();
			fileReader.addEventListener('load', function (e) {
				var buf = fileReader.result;
				var arr = new Uint8Array(buf);
				gotBuffer(new Buffer(arr));
			});
			fileReader.readAsArrayBuffer(contents);
		} else {
			console.warn('Cannot read TCP stream: unsupported message type', contents);
		}
	});
	this._ws.addEventListener('close', function () {
		if (self.readyState == 'open') {
			//console.log('TCP closed');
			self.destroy();
		}
	});
};

exports.isIP = function (input) {
	if (exports.isIPv4(input)) {
		return 4;
	} else if (exports.isIPv6(input)) {
		return 6;
	} else {
		return 0;
	}
};
exports.isIPv4 = function(input) {
	return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(input);
};
exports.isIPv6 = function(input) {
	return /^(([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))$/.test(input);
};

}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":92,"buffer":3,"http":120,"stream":118,"timers":141,"util":159}]},{},[161]);

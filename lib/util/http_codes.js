'use strict';

/**
 * Hash of HTTP Response Codes
 */
class HTTPCodes {
  /**
   * OK
   * @return {Number} 200
   * @readonly
   * @static
   */
  static get OK () { return 200; }

  /**
   * CREATED
   * @return {Number} 201
   * @readonly
   * @static
   */
  static get CREATED () { return 201; }

  /**
   * NO CONTENT
   * @return {Number} 204
   * @readonly
   * @static
   */
  static get NO_CONTENT () { return 204; }

  /**
   * PARTIAL CONTENT
   * @return {Number} 206
   * @readonly
   * @static
   */
  static get PARTIAL_CONTENT () { return 206; }

  /**
   * MULTIPLE CHOICES
   * @return {Number} 300
   * @readonly
   * @static
   */
  static get MULTIPLE_CHOICES () { return 300; }

  /**
   * MOVED PERMANENTLY
   * @return {Number} 301
   * @readonly
   * @static
   */
  static get MOVED_PERMANENTLY () { return 301; }

  /**
   * FOUND
   * @return {Number} 302
   * @readonly
   * @static
   */
  static get FOUND () { return 302; }

  /**
   * SEE OTHER
   * @return {Number} 303
   * @readonly
   * @static
   */
  static get SEE_OTHER () { return 303; }

  /**
   * NOT MODIFIED
   * @return {Number} 304
   * @readonly
   * @static
   */
  static get NOT_MODIFIED () { return 304; }

  /**
   * USE PROXY
   * @return {Number} 305
   * @readonly
   * @static
   */
  static get USE_PROXY () { return 305; }

  /**
   * SWITCH PROXY
   * @return {Number} 306
   * @readonly
   * @static
   */
  static get SWITCH_PROXY () { return 306; }

  /**
   * TEMPORARY REDIRECT
   * @return {Number} 307
   * @readonly
   * @static
   */
  static get TEMPORARY_REDIRECT () { return 307; }

  /**
   * PERMANENT REDIRECT
   * @return {Number} 308
   * @readonly
   * @static
   */
  static get PERMANENT_REDIRECT () { return 308; }

  /**
   * BAD REQUEST
   * @return {Number} 400
   * @readonly
   * @static
   */
  static get BAD_REQUEST () { return 400; }

  /**
   * UNAUTHORIZED
   * @return {Number} 401
   * @readonly
   * @static
   */
  static get UNAUTHORIZED () { return 401; }

  /**
   * PAYMENT REQUIRED
   * @return {Number} 402
   * @readonly
   * @static
   */
  static get PAYMENT_REQUIRED () { return 402; }

  /**
   * FORBIDDEN
   * @return {Number} 403
   * @readonly
   * @static
   */
  static get FORBIDDEN () { return 403; }

  /**
   * NOT FOUND
   * @return {Number} 404
   * @readonly
   * @static
   */
  static get NOT_FOUND () { return 404; }

  /**
   * METHOD NOT ALLOWED
   * @return {Number} 405
   * @readonly
   * @static
   */
  static get METHOD_NOT_ALLOWED () { return 405; }

  /**
   * NOT NOT_ACCEPTABLE
   * @return {Number} 406
   * @readonly
   * @static
   */
  static get NOT_ACCEPTABLE () { return 406; }

  /**
   * PROXY AUTHENTICATION REQUESTED
   * @return {Number} 407
   * @readonly
   * @static
   */
  static get PROXY_AUTHENTICATION_REQUIRED () { return 407; }

  /**
   * REQUEST TIMEOUT
   * @return {Number} 408
   * @readonly
   * @static
   */
  static get REQUEST_TIMEOUT () { return 408; }

  /**
   * CONFLICT
   * @return {Number} 409
   * @readonly
   * @static
   */
  static get CONFLICT () { return 409; }

  /**
   * GONE
   * @return {Number} 410
   * @readonly
   * @static
   */
  static get GONE () { return 410; }

  /**
   * LENGTH REQUIRED
   * @return {Number} 411
   * @readonly
   * @static
   */
  static get LENGTH_REQUIRED () { return 411; }

  /**
   * PRECONDITION FAILED
   * @return {Number} 412
   * @readonly
   * @static
   */
  static get PRECONDITION_FAILED () { return 412; }

  /**
   * REQUEST ENTITY TOO LARGE
   * @return {Number} 413
   * @readonly
   * @static
   */
  static get REQUEST_ENTITY_TOO_LARGE () { return 413; }

  /**
   * REQUEST URI TOO LONG
   * @return {Number} 414
   * @readonly
   * @static
   */
  static get REQUEST_URI_TOO_LONG () { return 414; }

  /**
   * UNSUPPORTED MEDIA TYPE
   * @return {Number} 415
   * @readonly
   * @static
   */
  static get UNSUPPORTED_MEDIA_TYPE () { return 415; }

  /**
   * REQUESTED RANGE NOT SATISFIABLE
   * @return {Number} 416
   * @readonly
   * @static
   */
  static get REQUESTED_RANGE_NOT_SATISFIABLE () { return 416; }

  /**
   * EXPECTATION FAILED
   * @return {Number} 417
   * @readonly
   * @static
   */
  static get EXPECTATION_FAILED () { return 417; }

  /**
   * IM A TEAPOT
   * @return {Number} 418
   * @readonly
   * @static
   */
  static get IM_A_TEAPOT () { return 418; }

  /**
   * AUTHENTICATION TIMEOUT
   * @return {Number} 419
   * @readonly
   * @static
   */
  static get AUTHENTICATION_TIMEOUT () { return 419; }

  /**
   * METHOD FAILURE
   * @return {Number} 420
   * @readonly
   * @static
   */
  static get METHOD_FAILURE () { return 420; }

  /**
   * UNPROCESSABLE ENTITY
   * @return {Number} 422
   * @readonly
   * @static
   */
  static get UNPROCESSABLE_ENTITY () { return 422; }

  /**
   * LOCKED
   * @return {Number} 423
   * @readonly
   * @static
   */
  static get LOCKED () { return 423; }

  /**
   * FAILEDDEPENDENCY
   * @return {Number} 424
   * @readonly
   * @static
   */
  static get FAILED_DEPENDENCY () { return 424; }

  /**
   * UPGRADE REQUIRED
   * @return {Number} 426
   * @readonly
   * @static
   */
  static get UPGRADE_REQUIRED () { return 426; }

  /**
   * PRECONDITION REQUIRED
   * @return {Number} 428
   * @readonly
   * @static
   */
  static get PRECONDITION_REQUIRED () { return 428; }

  /**
   * TOO MANY REQUESTS
   * @return {Number} 429
   * @readonly
   * @static
   */
  static get TOO_MANY_REQUESTS () { return 429; }

  /**
   * REQUEST HEADER FIELDS TOO LARGE
   * @return {Number} 431
   * @readonly
   * @static
   */
  static get REQUEST_HEADER_FIELDS_TOO_LARGE () { return 431; }

  /**
   * LOGIN TIMEOUT
   * @return {Number} 440
   * @readonly
   * @static
   */
  static get LOGIN_TIMEOUT () { return 440; }

  /**
   * NO RESPONSE
   * @return {Number} 444
   * @readonly
   * @static
   */
  static get NO_RESPONSE () { return 444; }

  /**
   * RETRY WITH
   * @return {Number} 449
   * @readonly
   * @static
   */
  static get RETRY_WITH () { return 449; }

  /**
   * BLOCKED BY WINDOWS PARENTAL CONTROLS
   * @return {Number} 450
   * @readonly
   * @static
   */
  static get BLOCKED_BY_WINDOWS_PARENTAL_CONTROLS () { return 450; }

  /**
   * UNAVAILABLE FOR LEGAL REASONS
   * @return {Number} 451
   * @readonly
   * @static
   */
  static get UNAVAILABLE_FOR_LEGAL_REASONS () { return 451; }

  /**
   * REQUEST HEADER TOO LARGE
   * @return {Number} 494
   * @readonly
   * @static
   */
  static get REQUEST_HEADER_TOO_LARGE () { return 494; }

  /**
   * CERT ERROR
   * @return {Number} 495
   * @readonly
   * @static
   */
  static get CERT_ERROR () { return 495; }

  /**
   * NO_CERT
   * @return {Number} 496
   * @readonly
   * @static
   */
  static get NO_CERT () { return 496; }

  /**
   * HTTP TO HTTPS
   * @return {Number} 497
   * @readonly
   * @static
   */
  static get HTTP_TO_HTTPS () { return 497; }

  /**
   * TOKEN EXPIRED INVALID
   * @return {Number} 498
   * @readonly
   * @static
   */
  static get TOKEN_EXPIRED_INVALID () { return 498; }

  /**
   * CLIENT CLOSED REQUEST
   * @return {Number} 499
   * @readonly
   * @static
   */
  static get CLIENT_CLOSED_REQUEST () { return 499; }

  /**
   * INTERNAL SERVER ERROR
   * @return {Number} 500
   * @readonly
   * @static
   */
  static get INTERNAL_SERVER_ERROR () { return 500; }

  /**
   * NOT IMPLEMENTED
   * @return {Number} 501
   * @readonly
   * @static
   */
  static get NOT_IMPLEMENTED () { return 501; }

  /**
   * BAD GATEWAY
   * @return {Number} 502
   * @readonly
   * @static
   */
  static get BAD_GATEWAY () { return 502; }

  /**
   * SERVICE UNAVAILABLE
   * @return {Number} 503
   * @readonly
   * @static
   */
  static get SERVICE_UNAVAILABLE () { return 503; }

  /**
   * GATEWAY TIMEOUT
   * @return {Number} 504
   * @readonly
   * @static
   */
  static get GATEWAY_TIMEOUT () { return 504; }

  /**
   * HTTP VERSION NOT SUPPORTED
   * @return {Number} 505
   * @readonly
   * @static
   */
  static get HTTP_VERSION_NOT_SUPPORTED () { return 505; }

  /**
   * VARIANT ALSO NEGOTIATES
   * @return {Number} 506
   * @readonly
   * @static
   */
  static get VARIANT_ALSO_NEGOTIATES () { return 506; }

  /**
   * INSUFFICIENT STORAGE
   * @return {Number} 507
   * @readonly
   * @static
   */
  static get INSUFFICIENT_STORAGE () { return 507; }

  /**
   * LOOP DETECTED
   * @return {Number} 508
   * @readonly
   * @static
   */
  static get LOOP_DETECTED () { return 508; }

  /**
   * BANDWIDTH LIMIT EXCEEDED
   * @return {Number} 509
   * @readonly
   * @static
   */
  static get BANDWIDTH_LIMIT_EXCEEDED () { return 509; }

  /**
   * NOT EXTENDED
   * @return {Number} 510
   * @readonly
   * @static
   */
  static get NOT_EXTENDED () { return 510; }

  /**
   * NETWORK NETWORK AUTHENTICATION REQUIRED
   * @return {Number} 511
   * @readonly
   * @static
   */
  static get NETWORK_AUTHENTICATION_REQUIRED () { return 511; }

  /**
   * ORIGIN ERROR
   * @return {Number} 520
   * @readonly
   * @static
   */
  static get ORIGIN_ERROR () { return 520; }

  /**
   * WEB SERVER IS DOWN
   * @return {Number} 521
   * @readonly
   * @static
   */
  static get WEB_SERVER_IS_DOWN () { return 521; }

  /**
   * CONNECTION TIMED OUT
   * @return {Number} 522
   * @readonly
   * @static
   */
  static get CONNECTION_TIMED_OUT () { return 522; }

  /**
   * PROXY DECLINED REQUEST
   * @return {Number} 523
   * @readonly
   * @static
   */
  static get PROXY_DECLINED_REQUEST () { return 523; }

  /**
   * A TIMEOUT OCCURRED
   * @return {Number} 524
   * @readonly
   * @static
   */
  static get A_TIMEOUT_OCCURRED () { return 524; }

  /**
   * NETWORK READ TIMEOUT ERROR
   * @return {Number} 598
   * @readonly
   * @static
   */
  static get NETWORK_READ_TIMEOUT_ERROR () { return 598; }

  /**
   * NETWORK CONNECT TIMEOUT ERROR
   * @return {Number} 599
   * @readonly
   * @static
   */
  static get NETWORK_CONNECT_TIMEOUT_ERROR () { return 599; }
}

module.exports = HTTPCodes;

'use strict';

/**
 * Hash of HTTP Response Codes
 */
class HTTPCodes {
  /**
   * HTTP OK.
   *
   * @returns {number} The HTTP status code 200.
   * @readonly
   * @static
   */
  static get OK () { return 200; }

  /**
   * HTTP CREATED.
   *
   * @returns {number} The HTTP status code 201.
   * @readonly
   * @static
   */
  static get CREATED () { return 201; }

  /**
   * HTTP NO CONTENT.
   *
   * @returns {number} The HTTP status code 204.
   * @readonly
   * @static
   */
  static get NO_CONTENT () { return 204; }

  /**
   * HTTP PARTIAL CONTENT.
   *
   * @returns {number} The HTTP status code 206.
   * @readonly
   * @static
   */
  static get PARTIAL_CONTENT () { return 206; }

  /**
   * HTTP MULTIPLE CHOICES.
   *
   * @returns {number} The HTTP status code 300.
   * @readonly
   * @static
   */
  static get MULTIPLE_CHOICES () { return 300; }

  /**
   * HTTP MOVED PERMANENTLY.
   *
   * @returns {number} The HTTP status code 301.
   * @readonly
   * @static
   */
  static get MOVED_PERMANENTLY () { return 301; }

  /**
   * HTTP FOUND.
   *
   * @returns {number} The HTTP status code 302.
   * @readonly
   * @static
   */
  static get FOUND () { return 302; }

  /**
   * HTTP SEE OTHER.
   *
   * @returns {number} The HTTP status code 303.
   * @readonly
   * @static
   */
  static get SEE_OTHER () { return 303; }

  /**
   * HTTP NOT MODIFIED.
   *
   * @returns {number} The HTTP status code 304.
   * @readonly
   * @static
   */
  static get NOT_MODIFIED () { return 304; }

  /**
   * HTTP USE PROXY.
   *
   * @returns {number} The HTTP status code 305.
   * @readonly
   * @static
   */
  static get USE_PROXY () { return 305; }

  /**
   * HTTP SWITCH PROXY.
   *
   * @returns {number} The HTTP status code 306.
   * @readonly
   * @static
   */
  static get SWITCH_PROXY () { return 306; }

  /**
   * HTTP TEMPORARY REDIRECT.
   *
   * @returns {number} The HTTP status code 307.
   * @readonly
   * @static
   */
  static get TEMPORARY_REDIRECT () { return 307; }

  /**
   * HTTP PERMANENT REDIRECT.
   *
   * @returns {number} The HTTP status code 308.
   * @readonly
   * @static
   */
  static get PERMANENT_REDIRECT () { return 308; }

  /**
   * HTTP BAD REQUEST.
   *
   * @returns {number} The HTTP status code 400.
   * @readonly
   * @static
   */
  static get BAD_REQUEST () { return 400; }

  /**
   * HTTP UNAUTHORIZED.
   *
   * @returns {number} The HTTP status code 401.
   * @readonly
   * @static
   */
  static get UNAUTHORIZED () { return 401; }

  /**
   * HTTP PAYMENT REQUIRED.
   *
   * @returns {number} The HTTP status code 402.
   * @readonly
   * @static
   */
  static get PAYMENT_REQUIRED () { return 402; }

  /**
   * HTTP FORBIDDEN.
   *
   * @returns {number} The HTTP status code 403.
   * @readonly
   * @static
   */
  static get FORBIDDEN () { return 403; }

  /**
   * HTTP NOT FOUND.
   *
   * @returns {number} The HTTP status code 404.
   * @readonly
   * @static
   */
  static get NOT_FOUND () { return 404; }

  /**
   * HTTP METHOD NOT ALLOWED.
   *
   * @returns {number} The HTTP status code 405.
   * @readonly
   * @static
   */
  static get METHOD_NOT_ALLOWED () { return 405; }

  /**
   * HTTP NOT NOT_ACCEPTABLE.
   *
   * @returns {number} The HTTP status code 406.
   * @readonly
   * @static
   */
  static get NOT_ACCEPTABLE () { return 406; }

  /**
   * HTTP PROXY AUTHENTICATION REQUESTED.
   *
   * @returns {number} The HTTP status code 407.
   * @readonly
   * @static
   */
  static get PROXY_AUTHENTICATION_REQUIRED () { return 407; }

  /**
   * HTTP REQUEST TIMEOUT.
   *
   * @returns {number} The HTTP status code 408.
   * @readonly
   * @static
   */
  static get REQUEST_TIMEOUT () { return 408; }

  /**
   * HTTP CONFLICT.
   *
   * @returns {number} The HTTP status code 409.
   * @readonly
   * @static
   */
  static get CONFLICT () { return 409; }

  /**
   * HTTP GONE.
   *
   * @returns {number} The HTTP status code 410.
   * @readonly
   * @static
   */
  static get GONE () { return 410; }

  /**
   * HTTP LENGTH REQUIRED.
   *
   * @returns {number} The HTTP status code 411.
   * @readonly
   * @static
   */
  static get LENGTH_REQUIRED () { return 411; }

  /**
   * HTTP PRECONDITION FAILED.
   *
   * @returns {number} The HTTP status code 412.
   * @readonly
   * @static
   */
  static get PRECONDITION_FAILED () { return 412; }

  /**
   * HTTP REQUEST ENTITY TOO LARGE.
   *
   * @returns {number} The HTTP status code 413.
   * @readonly
   * @static
   */
  static get REQUEST_ENTITY_TOO_LARGE () { return 413; }

  /**
   * HTTP REQUEST URI TOO LONG.
   *
   * @returns {number} The HTTP status code 414.
   * @readonly
   * @static
   */
  static get REQUEST_URI_TOO_LONG () { return 414; }

  /**
   * HTTP UNSUPPORTED MEDIA TYPE.
   *
   * @returns {number} The HTTP status code 415.
   * @readonly
   * @static
   */
  static get UNSUPPORTED_MEDIA_TYPE () { return 415; }

  /**
   * HTTP REQUESTED RANGE NOT SATISFIABLE.
   *
   * @returns {number} The HTTP status code 416.
   * @readonly
   * @static
   */
  static get REQUESTED_RANGE_NOT_SATISFIABLE () { return 416; }

  /**
   * HTTP EXPECTATION FAILED.
   *
   * @returns {number} The HTTP status code 417.
   * @readonly
   * @static
   */
  static get EXPECTATION_FAILED () { return 417; }

  /**
   * HTTP IM A TEAPOT.
   *
   * @returns {number} The HTTP status code 418.
   * @readonly
   * @static
   */
  static get IM_A_TEAPOT () { return 418; }

  /**
   * HTTP AUTHENTICATION TIMEOUT.
   *
   * @returns {number} The HTTP status code 419.
   * @readonly
   * @static
   */
  static get AUTHENTICATION_TIMEOUT () { return 419; }

  /**
   * HTTP METHOD FAILURE.
   *
   * @returns {number} The HTTP status code 420.
   * @readonly
   * @static
   */
  static get METHOD_FAILURE () { return 420; }

  /**
   * HTTP UNPROCESSABLE ENTITY.
   *
   * @returns {number} The HTTP status code 422.
   * @readonly
   * @static
   */
  static get UNPROCESSABLE_ENTITY () { return 422; }

  /**
   * HTTP LOCKED.
   *
   * @returns {number} The HTTP status code 423.
   * @readonly
   * @static
   */
  static get LOCKED () { return 423; }

  /**
   * HTTP FAILEDDEPENDENCY.
   *
   * @returns {number} The HTTP status code 424.
   * @readonly
   * @static
   */
  static get FAILED_DEPENDENCY () { return 424; }

  /**
   * HTTP UPGRADE REQUIRED.
   *
   * @returns {number} The HTTP status code 426.
   * @readonly
   * @static
   */
  static get UPGRADE_REQUIRED () { return 426; }

  /**
   * HTTP PRECONDITION REQUIRED.
   *
   * @returns {number} The HTTP status code 428.
   * @readonly
   * @static
   */
  static get PRECONDITION_REQUIRED () { return 428; }

  /**
   * HTTP TOO MANY REQUESTS.
   *
   * @returns {number} The HTTP status code 429.
   * @readonly
   * @static
   */
  static get TOO_MANY_REQUESTS () { return 429; }

  /**
   * HTTP REQUEST HEADER FIELDS TOO LARGE.
   *
   * @returns {number} The HTTP status code 431.
   * @readonly
   * @static
   */
  static get REQUEST_HEADER_FIELDS_TOO_LARGE () { return 431; }

  /**
   * HTTP LOGIN TIMEOUT.
   *
   * @returns {number} The HTTP status code 440.
   * @readonly
   * @static
   */
  static get LOGIN_TIMEOUT () { return 440; }

  /**
   * HTTP NO RESPONSE.
   *
   * @returns {number} The HTTP status code 444.
   * @readonly
   * @static
   */
  static get NO_RESPONSE () { return 444; }

  /**
   * HTTP RETRY WITH.
   *
   * @returns {number} The HTTP status code 449.
   * @readonly
   * @static
   */
  static get RETRY_WITH () { return 449; }

  /**
   * HTTP BLOCKED BY WINDOWS PARENTAL CONTROLS.
   *
   * @returns {number} The HTTP status code 450.
   * @readonly
   * @static
   */
  static get BLOCKED_BY_WINDOWS_PARENTAL_CONTROLS () { return 450; }

  /**
   * HTTP UNAVAILABLE FOR LEGAL REASONS.
   *
   * @returns {number} The HTTP status code 451.
   * @readonly
   * @static
   */
  static get UNAVAILABLE_FOR_LEGAL_REASONS () { return 451; }

  /**
   * HTTP REQUEST HEADER TOO LARGE.
   *
   * @returns {number} The HTTP status code 494.
   * @readonly
   * @static
   */
  static get REQUEST_HEADER_TOO_LARGE () { return 494; }

  /**
   * HTTP CERT ERROR.
   *
   * @returns {number} The HTTP status code 495.
   * @readonly
   * @static
   */
  static get CERT_ERROR () { return 495; }

  /**
   * HTTP NO_CERT.
   *
   * @returns {number} The HTTP status code 496.
   * @readonly
   * @static
   */
  static get NO_CERT () { return 496; }

  /**
   * HTTP HTTP TO HTTPS.
   *
   * @returns {number} The HTTP status code 497.
   * @readonly
   * @static
   */
  static get HTTP_TO_HTTPS () { return 497; }

  /**
   * HTTP TOKEN EXPIRED INVALID.
   *
   * @returns {number} The HTTP status code 498.
   * @readonly
   * @static
   */
  static get TOKEN_EXPIRED_INVALID () { return 498; }

  /**
   * HTTP CLIENT CLOSED REQUEST.
   *
   * @returns {number} The HTTP status code 499.
   * @readonly
   * @static
   */
  static get CLIENT_CLOSED_REQUEST () { return 499; }

  /**
   * HTTP INTERNAL SERVER ERROR.
   *
   * @returns {number} The HTTP status code 500.
   * @readonly
   * @static
   */
  static get INTERNAL_SERVER_ERROR () { return 500; }

  /**
   * HTTP NOT IMPLEMENTED.
   *
   * @returns {number} The HTTP status code 501.
   * @readonly
   * @static
   */
  static get NOT_IMPLEMENTED () { return 501; }

  /**
   * HTTP BAD GATEWAY.
   *
   * @returns {number} The HTTP status code 502.
   * @readonly
   * @static
   */
  static get BAD_GATEWAY () { return 502; }

  /**
   * HTTP SERVICE UNAVAILABLE.
   *
   * @returns {number} The HTTP status code 503.
   * @readonly
   * @static
   */
  static get SERVICE_UNAVAILABLE () { return 503; }

  /**
   * HTTP GATEWAY TIMEOUT.
   *
   * @returns {number} The HTTP status code 504.
   * @readonly
   * @static
   */
  static get GATEWAY_TIMEOUT () { return 504; }

  /**
   * HTTP HTTP VERSION NOT SUPPORTED.
   *
   * @returns {number} The HTTP status code 505.
   * @readonly
   * @static
   */
  static get HTTP_VERSION_NOT_SUPPORTED () { return 505; }

  /**
   * HTTP VARIANT ALSO NEGOTIATES.
   *
   * @returns {number} The HTTP status code 506.
   * @readonly
   * @static
   */
  static get VARIANT_ALSO_NEGOTIATES () { return 506; }

  /**
   * HTTP INSUFFICIENT STORAGE.
   *
   * @returns {number} The HTTP status code 507.
   * @readonly
   * @static
   */
  static get INSUFFICIENT_STORAGE () { return 507; }

  /**
   * HTTP LOOP DETECTED.
   *
   * @returns {number} The HTTP status code 508.
   * @readonly
   * @static
   */
  static get LOOP_DETECTED () { return 508; }

  /**
   * HTTP BANDWIDTH LIMIT EXCEEDED.
   *
   * @returns {number} The HTTP status code 509.
   * @readonly
   * @static
   */
  static get BANDWIDTH_LIMIT_EXCEEDED () { return 509; }

  /**
   * HTTP NOT EXTENDED.
   *
   * @returns {number} The HTTP status code 510.
   * @readonly
   * @static
   */
  static get NOT_EXTENDED () { return 510; }

  /**
   * HTTP NETWORK NETWORK AUTHENTICATION REQUIRED.
   *
   * @returns {number} The HTTP status code 511.
   * @readonly
   * @static
   */
  static get NETWORK_AUTHENTICATION_REQUIRED () { return 511; }

  /**
   * HTTP ORIGIN ERROR.
   *
   * @returns {number} The HTTP status code 520.
   * @readonly
   * @static
   */
  static get ORIGIN_ERROR () { return 520; }

  /**
   * HTTP WEB SERVER IS DOWN.
   *
   * @returns {number} The HTTP status code 521.
   * @readonly
   * @static
   */
  static get WEB_SERVER_IS_DOWN () { return 521; }

  /**
   * HTTP CONNECTION TIMED OUT.
   *
   * @returns {number} The HTTP status code 522.
   * @readonly
   * @static
   */
  static get CONNECTION_TIMED_OUT () { return 522; }

  /**
   * HTTP PROXY DECLINED REQUEST.
   *
   * @returns {number} The HTTP status code 523.
   * @readonly
   * @static
   */
  static get PROXY_DECLINED_REQUEST () { return 523; }

  /**
   * HTTP A TIMEOUT OCCURRED.
   *
   * @returns {number} The HTTP status code 524.
   * @readonly
   * @static
   */
  static get A_TIMEOUT_OCCURRED () { return 524; }

  /**
   * HTTP NETWORK READ TIMEOUT ERROR.
   *
   * @returns {number} The HTTP status code 598.
   * @readonly
   * @static
   */
  static get NETWORK_READ_TIMEOUT_ERROR () { return 598; }

  /**
   * HTTP NETWORK CONNECT TIMEOUT ERROR.
   *
   * @returns {number} The HTTP status code 599.
   * @readonly
   * @static
   */
  static get NETWORK_CONNECT_TIMEOUT_ERROR () { return 599; }
}

module.exports = HTTPCodes;

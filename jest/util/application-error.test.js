describe('util/application_error', () => {
  const Ravel = require('../../lib/ravel');
  const httpCodes = require('../../lib/util/http_codes');

  describe('Ravel.Error', () => {
    it('should provide .General', () => {
      expect(Ravel).toHaveProperty('Error');
      expect(typeof Ravel.Error).toBe('function');
      const err = new Ravel.Error('test');
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('constructor should reject codes which are greater than valid HTTP error codes', () => {
      class TestError extends Ravel.Error {
        constructor (msg) {
          super(msg, 600);
        }
      }
      expect(() => {
        return new TestError('test');
      }).toThrow();
    });

    it('constructor should reject codes which are less than valid HTTP error codes', () => {
      class TestError extends Ravel.Error {
        constructor (msg) {
          super(msg, 50);
        }
      }
      expect(() => {
        return new TestError('test');
      }).toThrow();
    });

    it('constructor should reject codes which are not numbers', () => {
      class TestError extends Ravel.Error {
        constructor (msg) {
          super(msg, '600');
        }
      }
      expect(() => {
        return new TestError('test');
      }).toThrow();
    });
  });

  describe('app.ApplicationError', () => {
    let app;
    beforeEach(() =>{
      app = new Ravel();
    });

    it('should provide .Access', () => {
      expect(typeof app.ApplicationError.Access).toBe('function');
      const err = new app.ApplicationError.Access('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.FORBIDDEN);
    });

    it('should provide .Authentication', () => {
      expect(typeof app.ApplicationError.Authentication).toBe('function');
      const err = new app.ApplicationError.Authentication('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.UNAUTHORIZED);
    });

    it('should provide .DuplicateEntry', () => {
      expect(typeof app.ApplicationError.DuplicateEntry).toBe('function');
      const err = new app.ApplicationError.DuplicateEntry('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.CONFLICT);
    });

    it('should provide .IllegalValue', () => {
      expect(typeof app.ApplicationError.IllegalValue).toBe('function');
      const err = new app.ApplicationError.IllegalValue('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.BAD_REQUEST);
    });

    it('should provide .NotAllowed', () => {
      expect(typeof app.ApplicationError.NotAllowed).toBe('function');
      const err = new app.ApplicationError.NotAllowed('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.METHOD_NOT_ALLOWED);
    });

    it('should provide .NotFound', () => {
      expect(typeof app.ApplicationError.NotFound).toBe('function');
      const err = new app.ApplicationError.NotFound('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.NOT_FOUND);
    });

    it('should provide .NotImplemented', () => {
      expect(typeof app.ApplicationError.NotImplemented).toBe('function');
      const err = new app.ApplicationError.NotImplemented('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.NOT_IMPLEMENTED);
    });

    it('should provide .RangeOutOfBounds', () => {
      expect(typeof app.ApplicationError.RangeOutOfBounds).toBe('function');
      const err = new app.ApplicationError.RangeOutOfBounds('test');
      expect(err).toBeInstanceOf(app.ApplicationError.General);
      expect(err.message).toBe('test');
      expect(err.code).toBe(httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
    });
  });
});

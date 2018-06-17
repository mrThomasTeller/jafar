import main from '../../app/reducers/main';
import { increment, decrement } from '../../app/actions/main';

describe('reducers', () => {
  describe('main', () => {
    it('should handle initial state', () => {
      expect(main(undefined, { type: 'unknown' })).toBe(0);
    });

    it('should handle INCREMENT_COUNTER', () => {
      expect(main(1, increment())).toBe(2);
    });

    it('should handle DECREMENT_COUNTER', () => {
      expect(main(1, decrement())).toBe(0);
    });

    it('should handle unknown action type', () => {
      expect(main(1, { type: 'unknown' })).toBe(1);
    });
  });
});

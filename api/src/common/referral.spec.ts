import {
  REFERRAL_REQUIRED_INVITES,
} from './referral';

describe('referral constants', () => {
  it('requires two successful invites for the reward', () => {
    expect(REFERRAL_REQUIRED_INVITES).toBe(2);
  });
});

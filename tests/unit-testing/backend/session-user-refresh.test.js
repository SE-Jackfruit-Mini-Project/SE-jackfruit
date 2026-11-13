import { jest } from '@jest/globals';
const findUnique = jest.fn();
jest.unstable_mockModule('../../../backend/src/utils/prisma.js', () => ({ prisma: { user: { findUnique } } }));
const { syncSessionUser } = await import('../../../backend/src/middleware/session-user.middleware.js');
beforeEach(() => jest.clearAllMocks());
function context() {
  const req = { session: { user: { id: 'user-1', role: 'ADMIN', fullName: 'Old name' }, destroy: jest.fn(cb => cb()) } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), clearCookie: jest.fn() };
  return { req, res, next: jest.fn() };
}
test('refreshes role and profile before authorization', async () => {
  const c = context(); findUnique.mockResolvedValue({ id: 'user-1', role: 'DONOR', fullName: 'New name', isActive: true });
  await syncSessionUser(c.req,c.res,c.next);
  expect(c.req.session.user).toMatchObject({ role: 'DONOR', fullName: 'New name' }); expect(c.next).toHaveBeenCalledWith();
});
test.each([null, { id: 'user-1', isActive: false }])('rejects deleted or deactivated accounts', async user => {
  const c = context(); findUnique.mockResolvedValue(user); await syncSessionUser(c.req,c.res,c.next);
  expect(c.req.session.destroy).toHaveBeenCalled(); expect(c.res.status).toHaveBeenCalledWith(401); expect(c.next).not.toHaveBeenCalled();
});
test('database failure cannot authorize a stale session', async () => {
  const c=context(); const error=new Error('Database unavailable');findUnique.mockRejectedValue(error);
  await syncSessionUser(c.req,c.res,c.next);expect(c.next).toHaveBeenCalledWith(error);
});
test('public requests do not query the database', async () => {
  const c=context(); c.req.session={};await syncSessionUser(c.req,c.res,c.next);
  expect(findUnique).not.toHaveBeenCalled();expect(c.next).toHaveBeenCalledWith();
});

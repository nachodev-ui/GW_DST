// Fail at the boundary if a regression accidentally tries real HTTP/TCP access.
const deny = () => {
  throw new Error('Network access is forbidden in offline tests');
};
globalThis.fetch = deny;
require('node:net').Socket.prototype.connect = deny;

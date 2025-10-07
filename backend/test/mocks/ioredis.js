class MockIORedis {
  constructor() {}
  connect() { return Promise.resolve(); }
  disconnect() { return Promise.resolve(); }
  on() {}
  ping() { return Promise.resolve('PONG'); }
  get() { return Promise.resolve(null); }
  set() { return Promise.resolve('OK'); }
  setex() { return Promise.resolve('OK'); }
  del() { return Promise.resolve(1); }
  keys() { return Promise.resolve([]); }
  ttl() { return Promise.resolve(-1); }
  info() { return Promise.resolve(''); }
  flushall() { return Promise.resolve('OK'); }
  exists() { return Promise.resolve(0); }
}

module.exports = MockIORedis;
module.exports.default = MockIORedis;

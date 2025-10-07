class MockIORedis {
  options: any;
  constructor(...args: any[]) {
    this.options = args;
  }
  connect = jest.fn(async () => undefined);
  disconnect = jest.fn(async () => undefined);
  on = jest.fn();
  ping = jest.fn(async () => 'PONG');
  get = jest.fn(async () => null);
  set = jest.fn(async () => 'OK');
  del = jest.fn(async () => 1);
  flushall = jest.fn(async () => 'OK');
}

export default MockIORedis;
export { MockIORedis as Redis };

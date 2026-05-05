import { factory } from "ulid";

const prng = () => {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0xff;
};

export const ulid = factory(prng);

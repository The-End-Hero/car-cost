/// <reference types="vite/client" />

declare module "math.js" {
  const math: {
    round: (n: number) => number;
    pow: (base: number, exp: number) => number;
  };
  export default math;
}

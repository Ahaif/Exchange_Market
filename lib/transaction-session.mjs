/** Acquire synchronously before the first await; React state alone is not a lock. */
export function createTransactionGate() {
  let locked = false;
  return {
    enter() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
  };
}
/** @param {{revision:number,chainId:number,account:string}} expected @param {{revision:number,chainId:number,account:string}} actual */
export function assertTransactionSession(expected, actual) {
  if (
    expected.revision !== actual.revision ||
    expected.chainId !== actual.chainId ||
    expected.account.toLowerCase() !== actual.account.toLowerCase()
  )
    throw new Error("Wallet session changed. Reconnect before continuing.");
}

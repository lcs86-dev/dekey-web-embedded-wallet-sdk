const getWallet = (wallets) => {
  const wids = wallets.map((w) => {
    return w.wid;
  });
  const walletId = Math.max(...wids);
  return wallets.find((w) => w.wid == walletId);
};

const getNextWidForRecover = (wallets) => {
  const wids = wallets.map((w) => {
    return w.wid;
  });
  return Math.max(...wids) + 1;
};

const WalletUtil = {
  getWallet,
  getNextWidForRecover,
};

export default WalletUtil;

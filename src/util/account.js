const _getActiveAccountId = () => {
  return 0;
};

const getActiveAccount = (accounts) => {
  const activeAccountId = _getActiveAccountId();
  return accounts.find((a) => a.id === activeAccountId);
};

const getSid = (accounts) => {
  return accounts[0].sid;
};

const AccountUtil = {
  getActiveAccount,
  getSid,
};

export default AccountUtil;

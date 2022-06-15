import { createAsyncMiddleware } from "json-rpc-engine";
import AccountUtil from "../util/account";

/**
 * Handle RPC methods called by dapps
 */
export default function getRpcMethodMiddleware({
  hostname,
  getProviderState,
  ethSendTransaction,
  resetStore,
  getStoreState,
  updateStore,
  dekeyGenerateKey,
  dekeyRecoverShare,
  retrieveKeyShare,
  unlock,
  addUnapprovedMessageAsync,
  dekeyHandleSavingRecoverInfoFailure,
  signPersonalMessage,
  getUser,
  changePassword,
}) {
  // all user facing RPC calls not implemented by the provider
  return createAsyncMiddleware(async (req, res, next) => {
    const rpcMethods = {
      personal_sign: async () => {
        try {
          const rawSig = await addUnapprovedMessageAsync(req);
          // const result = await signPersonalMessage(msgId);
          res.result = rawSig;
        } catch (error) {
          res.error = error.toString();
        }
      },
      eth_requestAccounts: async () => {
        const { user } = getStoreState();

        if (!user) {
          res.result = [];
        } else {
          const activeAccount = AccountUtil.getActiveAccount(user.accounts);
          res.result = activeAccount ? [activeAccount.ethAddress] : [];
        }
      },
      eth_accounts: async () => {
        const { user } = getStoreState();

        if (!user) {
          res.result = [];
        } else {
          const activeAccount = AccountUtil.getActiveAccount(user.accounts);
          res.result = activeAccount ? [activeAccount.ethAddress] : [];
        }
      },

      eth_sendTransaction: async () => {
        try {
          const txHash = await ethSendTransaction(req.params[0]);
          console.log("ethSendTransaction txHash", txHash);
          res.result = txHash;
        } catch (error) {
          res.error = error.toString();
        }
      },

      dekey_wallet_create: async () => {
        try {
          res.result = await dekeyGenerateKey(req.params[0]);
        } catch (error) {
          res.error = error.toString();
        }
      },

      dekey_wallet_recover: async () => {
        try {
          res.result = await dekeyRecoverShare(req.params[0]);
        } catch (error) {
          res.error = error.toString();
        }
      },

      // handle failure of saving share and user info in auth server by deleting local keyshare, user info
      dekey_handle_saving_recover_info_failure: async () => {
        try {
          updateStore({
            user: null,
          });
          res.result = true;
        } catch (error) {
          res.error = error.toString();
        }
      },

      dekey_update_store: () => {
        try {
          updateStore(req.params[0]);
          res.result = true;
        } catch (error) {
          res.error = error.toString();
        }
      },

      dekey_unlock: async () => {
        try {
          await unlock(req.params[0]);
          res.result = true;
        } catch (error) {
          res.error = error.toString();
        }
      },

      dekey_user: async () => {
        try {
          res.result = await getUser();
        } catch (error) {
          res.error = error.toString();
        }
      },

      dekey_change_password: async () => {
        try {
          res.result = await changePassword({
            oldPassword: req.params[0],
            newPassword: req.params[1],
            encpv: req.params[2],
          });
        } catch (error) {
          res.error = error.toString();
        }
      },

      /**
       * This method is used by the inpage provider to get its state on
       * initialization.
       */
      metamask_getProviderState: async () => {
        res.result = {
          isUnlocked: true,
          networkVersion: "1",
          chainId: "0x1",
          accounts: [],
          // ...getProviderState(),
          // ...this.getProviderNetworkState(memState),
          // accounts: await getAccounts(),
          // accounts: ["0xc2420a498492590a298b894346408ce880d00fe7"],
        };
      },

      /**
       * This method is sent by the window.web3 shim. It can be used to
       * record web3 shim usage metrics. These metrics are already collected
       * in the extension, and can optionally be added to mobile as well.
       *
       * For now, we need to respond to this method to not throw errors on
       * the page, and we implement it as a no-op.
       */
      metamask_logWeb3ShimUsage: () => (res.result = null),
    };

    if (!rpcMethods[req.method]) {
      return next();
    }
    await rpcMethods[req.method]();
  });
}

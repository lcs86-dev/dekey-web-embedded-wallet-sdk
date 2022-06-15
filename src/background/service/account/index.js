import EventEmitter from "events";
import AccountUtil from "../../../util/account";
import WalletUtil from "../../../util/wallet";

export class AccountService extends EventEmitter {
  _autologinTimeout;

  constructor({ accountRestApi, dekeyStore }) {
    super();
    this.accountRestApi = accountRestApi;
    this.dekeyStore = dekeyStore;
  }

  registerUser = async ({ address, pubkey, uCPubKey, sid, uid, wid }) => {
    try {
      const {
        accessToken,
        user,
        wallets,
        expiresIn, // in milliseconds
      } = await this.accountRestApi.registerUser({
        address,
        pubkey,
        uCPubKey,
        sid,
        uid,
        wid,
      });

      this.dekeyStore.updateStore({
        accessToken: accessToken,
        expirationTime: new Date().getTime() + +expiresIn,
      });

      return {
        user,
        wallets,
      };
    } catch (error) {
      throw error;
    }
  };

  recoverWallet = async ({ uCPubKey, uid, wid }) => {
    try {
      const {
        accessToken,
        user,
        expiresIn, // in milliseconds
        wallets,
      } = await this.accountRestApi.recoverWallet({
        uCPubKey,
        uid,
        wid,
      });

      this.dekeyStore.updateStore({
        accessToken: accessToken,
        expirationTime: new Date().getTime() + +expiresIn,
      });

      return {
        user,
        wallets,
      };
    } catch (error) {
      throw error;
    }
  };

  getUser = async () => {
    try {
      const { accessToken } = this.dekeyStore.getState();
      const user = await this.accountRestApi.getUser(accessToken);
      return user;
    } catch (error) {
      this._lock();
    }
  };

  initializeWallet = async () => {
    this.dekeyStore.updateStore({
      unapprovedPersonalMsgs: {},
    });
  };

  unlock = async (password, mpcService) => {
    const { user, encpv, wallets } = this.dekeyStore.getState();

    const activeAccount = AccountUtil.getActiveAccount(user.accounts);

    const wallet = WalletUtil.getWallet(wallets);

    const { hashMessage } = await this.accountRestApi.getChallengeMessage(
      activeAccount.sid
    );

    const { SigR, SigS } = await mpcService.unlock({
      hashMessage,
      EncPV: encpv,
      password,
    });

    const unlockResult = await this.accountRestApi.unlock({
      r: SigR,
      s: SigS,
      hashMessage,
      aaid: activeAccount.id,
      sid: activeAccount.sid,
      wid: wallet.wid,
    });

    this.dekeyStore.updateStore({
      locked: false,
      accessToken: unlockResult.accessToken,
      expirationTime: new Date().getTime() + +unlockResult.expiresIn,
    });

    // mpcService.changeActiveAccount({ accountId: activeAccount.id });

    this._setAutologinTimer(unlockResult.expiresIn);
  };

  _setAutologinTimer = (expiresIn) => {
    if (this._autologinTimeout) {
      clearTimeout(this._autologinTimeout);
    }
    const timeout = setTimeout(() => this._autoLogin(), +expiresIn * 0.7);
    this._autologinTimeout = timeout;
  };

  _autoLogin = async () => {
    try {
      const { accessToken } = this.dekeyStore.getState();

      const result = await this.accountRestApi.getNewSessionJwt(accessToken);

      this.dekeyStore.updateStore({
        accessToken: result.accessToken,
        expirationTime: new Date().getTime() + +result.expiresIn,
      });

      this._setAutologinTimer(result.expiresIn);
    } catch (error) {
      await this._lock();
      throw error;
    }
  };

  _lock = async () => {
    try {
      this.dekeyStore.updateStore({
        accessToken: null,
        locked: true,
      });

      if (this._autologinTimeout) {
        clearTimeout(this._autologinTimeout);
      }
    } catch (error) {}
  };
}

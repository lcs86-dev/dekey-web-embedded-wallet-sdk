import EventEmitter from "events";
import { v4 as uuidv4 } from "uuid";
import AccountUtil from "../../../util/account";
import WalletUtil from "../../../util/wallet";

// const CHAIN_ID_LIST = {
//   eth: 1,
//   ropsten: 3,
//   rinkeby: 4,
//   goerli: 5,
//   kovan: 42,
//   binanceSmartChain: 56,
//   baobob: 1001,
//   cypress: 8217,
//   arbitrum: 42161,
//   arbitrumRinkeby: 421611,
//   optimistic: 10,
//   optimisticKovan: 69,
//   matic: 137,
//   mumbaiGoerli: 80001,
// };

const DEFAULT_NETWORKS = [
  {
    id: uuidv4(),
    symbol: "ETH",
    name: "Private Network",
    /** Besu */
    // rpcUrl: "https://besu.dekey.app",
    // chainId: 1337,
    // blockExplorerUrl: "http://63.250.52.190:26000",
    /** Expedition */
    // rpcUrl: "http://54.180.149.196:8668",
    rpcUrl: "https://ethereum.myinitial.io",
    chainId: 6888,
    blockExplorerUrl:
      "http://54.180.149.196/?rpcUrl=http://54.180.149.196:8668",
  },
];

export class AccountService extends EventEmitter {
  _autologinTimeout;

  constructor({ accountRestApi, dekeyStore }) {
    super();
    this.accountRestApi = accountRestApi;
    this.dekeyStore = dekeyStore;
  }

  registerUser = async ({ address, pubkey, uCPubKey, sid, uid, wid }) => {
    console.log("registerUser", { address, pubkey, uCPubKey, sid, uid, wid });
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
        // user,
        // activeAccount: user.accounts[0],
        // mpcToken: mpcToken,
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
        // user,
        // activeAccount: user.accounts[0],
        // mpcToken: mpcToken,
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

  saveKeygenResult = async (dto) => {
    try {
      const { UCPubKey, OurPubKey, Sid, address, accessToken, PVEncStr } = dto;
      const accountId = 0;
      return this.accountRestApi.saveKeyGenResult({
        uCPubKey: UCPubKey,
        pubKey: OurPubKey,
        sid: Sid,
        address,
        accessToken,
        accountId,
      });
    } catch (error) {
      throw error;
    }
  };

  initializeWallet = async () => {
    // const networks = DEFAULT_NETWORKS;
    // const ethMainAsset = DEFAULT_ASSETS[0];

    this.dekeyStore.updateStore({
      unapprovedPersonalMsgs: {},
      // networks: [...networks],
      // currentNetwork: { ...networks[0] },
      // assets: [{ ...ethMainAsset }],
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
    // console.log("after changeActiveAccount");

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

      // this.emit('locked');

      if (this._autologinTimeout) {
        clearTimeout(this._autologinTimeout);
      }

      // provider.accountChanged([]);
    } catch (error) {
      //log.error(error);
    }
  };
}

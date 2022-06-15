import { v4 as uuidv4 } from "uuid";

import WalletUtil from "../../util/wallet";

export class AccountController {
  constructor({ accountService, mpcService, dekeyStore, accountRestApi }) {
    this.accountService = accountService;
    this.mpcService = mpcService;
    this.dekeyStore = dekeyStore;
    this.accountRestApi = accountRestApi;
  }

  async generateKey({ password }) {
    const uid = uuidv4();
    const wid = 1;

    // TODO: replace to the token issued by skt
    const mpcToken = "DUMMY_TOKEN";

    const keyGenResult = await this.mpcService.generateKeyShare({
      uid,
      wid,
      password,
      mpcToken,
    });

    const { UCPubKey, OurPubKey, Sid, PVEncStr } = keyGenResult;

    const { user, wallets } = await this.accountService.registerUser({
      address: Sid,
      pubkey: OurPubKey,
      uCPubKey: UCPubKey,
      sid: Sid,
      uid,
      wid,
    });

    this.dekeyStore.updateStore({
      user,
      wallets,
      encpv: PVEncStr,
    });

    await this.unlock({ password });

    return { user, wallets, encpv: PVEncStr };
  }

  async recoverShare(dto) {
    const { password, user, wallets } = dto;

    // const existingUser = JSON.parse(dto.backupInfo.user);
    // const existingWallets = JSON.parse(dto.backupInfo.wallets);

    const mpcToken = "DUMMY_TOKEN";

    const nextWid = WalletUtil.getNextWidForRecover(wallets);

    const { UCPubKey, OurPubKey, Sid, PVEncStr } =
      await this.mpcService.recoverShare({
        uid: user.uid,
        wid: nextWid,
        password,
        sid: user.accounts[0].sid,
        mpcToken,
      });

    //  save recover result to app server including wallet (wid, uid, ucpubkey)
    const recoverWalletResult = await this.accountService.recoverWallet({
      uid: user.uid,
      wid: nextWid,
      uCPubKey: UCPubKey,
    });

    this.dekeyStore.updateStore({
      user,
      wallets: recoverWalletResult.wallets,
      encpv: PVEncStr,
    });

    await this.unlock({ password });

    return {
      user,
      wallets: recoverWalletResult.wallets,
      encpv: PVEncStr,
    };
  }

  async unlock({ password }) {
    try {
      await this.accountService.unlock(password, this.mpcService);
    } catch (error) {
      throw error;
    }
  }

  async getUser() {
    return this.accountService.getUser();
  }

  async changePassword(dto) {
    const { oldPassword, newPassword, encpv } = dto;
    const newEncpv = await this.mpcService.changePassword(dto);
    await this.accountService.unlock(newPassword, this.mpcService);
    return newEncpv;
  }
}

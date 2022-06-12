import WalletUtil from "../../util/wallet";

export class AccountController {
  constructor({ accountService, mpcService, dekeyStore, accountRestApi }) {
    this.accountService = accountService;
    this.mpcService = mpcService;
    this.dekeyStore = dekeyStore;
    this.accountRestApi = accountRestApi;
  }

  async generateKey({ password }) {
    // const registerUserResult = await this.accountService.registerUser();

    // const { mpcToken, accessToken, expiresIn } = registerUserResult;

    const uid = new Date().getTime();
    const wid = 1;

    const mpcToken = "DUMMY_TOKEN";

    const keyGenResult = await this.mpcService.generateKeyShare({
      uid,
      wid,
      password,
      mpcToken,
    });

    console.log("keyGenResult", keyGenResult);

    const { UCPubKey, OurPubKey, Sid, PVEncStr } = keyGenResult;

    // await this.accountService.saveShareToKeyCloud({
    //   userid: emailAddress,
    //   passwordhash: password,
    //   encshare: {
    //     UCPubKey: UCPubKey,
    //     OurPubKey: OurPubKey,
    //     Sid: Sid,
    //     address: EthAddress,
    //     accessToken,
    //     PVEncStr: PVEncStr,
    //     accountName,
    //   },
    // });

    const { user, wallets } = await this.accountService.registerUser({
      address: Sid,
      pubkey: OurPubKey,
      uCPubKey: UCPubKey,
      sid: Sid,
      uid,
      wid,
    });

    console.log("updatedUser", user);

    // user.EncPV = PVEncStr;

    this.dekeyStore.updateStore({
      user,
      wallets,
      encpv: PVEncStr,
    });

    // const dbState = this.dekeyStore.getState();

    await this.unlock({ password });

    // const passwordhash = ethers.utils.keccak256(password);
    // const passwordhash = password;

    // await this.accountService.saveShareToKeyCloud({
    //   userid: emailAddress,
    //   passwordhash,
    //   encshare: JSON.stringify(dbState),
    // });

    return { user, wallets, encpv: PVEncStr };
  }

  async recoverShare(dto) {
    // const { user } = this.dekeyStore.getState();
    console.log("recoverShare user", dto);

    const { password, user, wallets } = dto;

    // const existingUser = JSON.parse(dto.backupInfo.user);
    // const existingWallets = JSON.parse(dto.backupInfo.wallets);

    const mpcToken = "DUMMY_TOKEN";

    const nextWid = WalletUtil.getNextWidForRecover(wallets);

    const { UCPubKey, OurPubKey, Sid, PVEncStr } =
      await this.mpcService.recoverShare({
        uid: +user.uid,
        wid: nextWid,
        password,
        sid: user.accounts[0].sid,
        mpcToken,
      });

    //  save recover result to app server including wallet (wid, uid, ucpubkey)
    const recoverWalletResult = await this.accountService.recoverWallet({
      uid: +user.uid,
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
    return this.mpcService.changePassword(dto);
  }
}

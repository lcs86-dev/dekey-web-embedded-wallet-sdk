import AccountUtil from "../../util/account";
import NetworkUtil from "../../util/network";

export class TransactionController {
  constructor({
    // nonceTracker,
    transactionService,
    providerConnectionManager,
    dekeyStore,
  }) {
    // this.nonceTracker = nonceTracker;
    this.transactionService = transactionService;
    this.providerConnectionManager = providerConnectionManager;
    this.dekeyStore = dekeyStore;
  }

  async ethSendTransaction(newTxParams) {
    console.log("ethSendTransaction newTxParams", newTxParams);
    const { user } = this.dekeyStore.getState();

    console.log("ethSendTransaction user", user);

    const activeAccount = AccountUtil.getActiveAccount(user.accounts);
    const currentNetwork = NetworkUtil.getCurrentNetwork();

    // const nResult = await this.nonceTracker.getNonceLock(
    //   activeAccount.ethAddress,
    //   currentNetwork.chainId,
    //   this.mutexService,
    //   txType,
    //   nonce
    // );
    // releaseLock = nResult.releaseLock;
    // const nextNonce = nResult.nextNonce;

    const networkNonceNext =
      await this.providerConnectionManager.getTransactionCount(
        activeAccount.ethAddress
      );

    console.log("networkNonceNext", networkNonceNext);

    let gas = await this.providerConnectionManager.estimateGas({
      from: activeAccount.ethAddress,
      to: newTxParams.to,
      data: newTxParams.data,
      value: newTxParams.value ?? "0x0",
    });

    console.log("gas", gas);

    const rawTx = await this.transactionService.signTx({
      txParams: {
        chainId: currentNetwork.chainId,
        from: activeAccount.ethAddress,
        gasLimit: gas,
        ...newTxParams,
        // data: "0x69318a7900000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
        // to: "0x31D9BC105a7eE27c7b78Ba3758Cf7B5D79ccA06E",
        // gasLimit: "0xdd63",
        // maxFeePerGas: "0x3b9aca16",
        // maxPriorityFeePerGas: "0x3b9aca00",
        // nonce: networkNonceNext,
        // gasPrice: null,
        // aaid: activeAccount.aaid,
        // assetId: null,
        // contractAddress: null,
        // dappAlertId: "930f6edf-116b-7b9-8376-f00797673846",
        // domainName: "https://panmunjom.github.io",
        // funcName: "makeComment",
        // gasUsed: "0xc943",
        // hash: "0xdcea3044ded373af0a13a14952bd2f689b07e6c37282635588e9eb21dbda5bb4",
        // id: "e3c45df0-ce36-461d-ab20-5654f417879a",
        // isAutoconfirm: true,
        // status: "confirmed",
        // tabId: 801,
        // timeStamp: "1632122339",
        // tokenDecimal: null,
        // tokenSymbol: null,
        // txSource: 3,
        // type: null,
        // value: null,
      },
      nonce: networkNonceNext,
      network: currentNetwork,
      account: activeAccount,
    });

    return this.providerConnectionManager.broadcastTx(rawTx);
  }
}

import { ethers } from "ethers";
import EventEmitter from "events";
import { stripHexPrefix } from "ethjs-util";
import ethUtil from "ethereumjs-util";

export class TransactionService extends EventEmitter {
  constructor({ mpcService, dekeyStore, accountRestApi }) {
    super();
    this.mpcService = mpcService;
    this.dekeyStore = dekeyStore;
    this.accountRestApi = accountRestApi;
  }

  async signTx({
    txParams,
    network,
    nonce,
    account,
    // autoconfirm,
    // dappInfo,
    // ledgerService,
  }) {
    try {
      const { chainId } = network;

      const unsignedTx = this.makeUnsignedTx({
        to: txParams.to,
        value: txParams.value,
        data: txParams.data,
        gasLimit: txParams.gasLimit,
        gasPrice: txParams.gasPrice,
        maxFeePerGas: txParams.maxFeePerGas,
        maxPriorityFeePerGas: txParams.maxPriorityFeePerGas,
        chainId,
        nonce,
      });

      console.log("unsignedTx", unsignedTx);

      if (txParams.contractAddress) {
        delete unsignedTx.value;
      }

      const { gasPrice, to } = txParams;
      const { accessToken } = this.dekeyStore.getState();

      const serializedTx = this.serializeEthTx(unsignedTx);
      const messageHash = ethers.utils.keccak256(serializedTx);

      const mpcToken = await this.accountRestApi.getMpcJwt(accessToken);

      // const requestApprovalInput: RequestTxApprovalInput = {
      //   hash: messageHash,
      //   unsignedTx,
      //   userId: user.uid,
      //   walletId: 1,
      // };
      // await TxInfra.validateHash(requestApprovalInput, accessToken);

      const sResult = await this.mpcService.sign({
        txHash: messageHash.slice(2),
        mpcToken,
        accountId: account.id,
      });
      console.log("sResult", sResult);
      const { r, s, vsource } = sResult;
      const v = this.calculateV({
        r,
        s,
        vsource,
        hash: messageHash,
        addressInUse: account.ethAddress,
        chainId,
      });

      const rawTx = ethers.utils.serializeTransaction(unsignedTx, {
        v,
        r,
        s,
      });

      if (!rawTx) {
        throw new Error("No rawTx");
      }

      return rawTx;
    } catch (error) {
      throw error;
    }
  }

  calculateV = (arg) => {
    let { r, s, hash, addressInUse, vsource, chainId } = arg;
    const CHAIN_ID_OFFSET = 35;
    try {
      const v = vsource + CHAIN_ID_OFFSET + 2 * chainId;
      const recoveredAddress = ethers.utils.recoverAddress(hash, {
        v: v,
        r,
        s,
      });
      if (recoveredAddress !== addressInUse) {
        throw new Error(`Recovered address is not equalt to addressInUse`);
      }
      return v;
    } catch (error) {
      throw error;
    }
  };

  makeUnsignedTx({
    to,
    value,
    data,
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chainId,
    nonce,
  }) {
    const supportsEIP1559 = Boolean(maxFeePerGas);
    if (supportsEIP1559) {
      return {
        chainId,
        data,
        to,
        value,
        nonce,
        gasLimit,
        maxFeePerGas, // wei hex string
        maxPriorityFeePerGas, // wei hex string
        type: 2, // ethers.js eip-1559
      };
    }
    return {
      chainId,
      data,
      to,
      value,
      nonce,
      gasLimit,
      gasPrice,
    };
  }

  concatSig = (v, r, s) => {
    const OFFSET = 27;
    const rBuffer = Buffer.from(stripHexPrefix(r), "hex");
    const sBuffer = Buffer.from(stripHexPrefix(s), "hex");
    const rSig = ethUtil.fromSigned(rBuffer);
    const sSig = ethUtil.fromSigned(sBuffer);
    // const vSig = ethUtil.bufferToInt(v);
    const rStr = this._padWithZeroes(
      ethUtil.toUnsigned(rSig).toString("hex"),
      64
    );
    const sStr = this._padWithZeroes(
      ethUtil.toUnsigned(sSig).toString("hex"),
      64
    );
    const vStr = ethUtil.stripHexPrefix(ethUtil.intToHex(v + OFFSET));
    return ethUtil.addHexPrefix(rStr.concat(sStr, vStr)).toString("hex");
  };

  _padWithZeroes = (number, length) => {
    let myString = `${number}`;
    while (myString.length < length) {
      myString = `0${myString}`;
    }
    return myString;
  };

  serializeEthTx = (unsignedTx) => {
    return ethers.utils.serializeTransaction(unsignedTx); // klaytn tx type 정보 포함 시 에러 발생
  };
}

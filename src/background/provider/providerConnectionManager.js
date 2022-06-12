import EventEmitter from "events";
import Web3 from "web3";
import { BigNumber, ethers } from "ethers";
import EthQuery from "ethjs-query";
// import humanAbi from "human-standard-token-abi";
import { JsonRpcEngine } from "json-rpc-engine";
import { providerFromEngine } from "eth-json-rpc-middleware";
import {
  createSwappableProxy,
  createEventEmitterProxy,
} from "swappable-obj-proxy";

// import {NetworkModel} from '../../main/transactions/interface';
// import {KIP_ABI} from '../../infra/rest-api/erc20';
// import log from 'loglevel';
import createJsonRpcClient from "./createJsonRpcClient";

export class ProviderConnectionManager extends EventEmitter {
  connection;
  query;
  ethQuery;
  ethersProvider;
  dekeyStore;
  connected;
  web3;
  chainId;
  _providerProxy;
  _blockTrackerProxy;
  _provider;
  _blockTracker;

  // return the proxies so the references will always be good
  getProviderAndBlockTracker() {
    const provider = this._providerProxy;
    const blockTracker = this._blockTrackerProxy;
    return { provider, blockTracker };
  }

  async connect(network, accToken) {
    try {
      const { chainId, rpcUrl, target, isCustom } = network;
      const rpcUrlWithNoTrailingSlash = rpcUrl.replace(/\/$/, "");

      let formattedRpcUrl;
      if (rpcUrl.includes("infura")) {
        formattedRpcUrl =
          rpcUrlWithNoTrailingSlash + `/${process.env.INFURA_ID}`;
      } else if (rpcUrl.includes("alchemy")) {
        formattedRpcUrl =
          rpcUrlWithNoTrailingSlash + `/${process.env.ALCHEMY_ID}`;
      } else {
        formattedRpcUrl = rpcUrlWithNoTrailingSlash;
      }

      this._initialize({
        rpcUrl: formattedRpcUrl,
        chainId,
      });

      /** libraries to communicate with rpc node */
      this.web3 = new Web3(this._provider);
      this.ethersProvider = new ethers.providers.Web3Provider(this._provider);
      this.query = new EthQuery(this._provider);
      this.chainId = network.chainId;

      // this.emit("connected", network);
    } catch (error) {
      throw error;
    }
  }

  _initialize({ rpcUrl, chainId, networkDomain }) {
    const cResult = createJsonRpcClient({
      rpcUrl,
      chainId,
      networkDomain,
    });
    this._setNetworkClient(cResult);
  }

  _setNetworkClient({ networkMiddleware, blockTracker }) {
    const engine = new JsonRpcEngine();
    engine.push(networkMiddleware);
    const provider = providerFromEngine(engine);
    this._setProviderAndBlockTracker({ provider, blockTracker });
  }

  _setProviderAndBlockTracker({ provider, blockTracker }) {
    // update or intialize proxies
    if (this._providerProxy) {
      this._providerProxy.setTarget(provider);
    } else {
      this._providerProxy = createSwappableProxy(provider);
    }
    if (this._blockTrackerProxy) {
      this._blockTrackerProxy.setTarget(blockTracker);
    } else {
      this._blockTrackerProxy = createEventEmitterProxy(blockTracker, {
        eventFilter: "skipInternal",
      });
    }
    this._provider = provider;
    this._blockTracker = blockTracker;
  }

  async getTransactionCount(address) {
    // const txCount = await this.ethersProvider.getTransactionCount(
    //   address,
    //   'pending'
    // );
    // const txCount = await this.web3.eth.getTransactionCount(address, 'pending');

    const txCount = await this.query.getTransactionCount(address, "pending");

    return BigNumber.from(txCount.toString(10)).toHexString();
  }

  async broadcastTx(rawTx) {
    const result = await this.query.sendRawTransaction(rawTx);
    return result;
  }

  async estimateGas(txMeta) {
    const result = await this.query.estimateGas(txMeta);
    return BigNumber.from(result.toString(10)).toHexString();
  }
}

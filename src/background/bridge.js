/* eslint-disable import/no-commonjs */
import URL from "url-parse";
import { JsonRpcEngine } from "json-rpc-engine";
import { providerAsMiddleware } from "eth-json-rpc-middleware";
import {
  JS_POST_MESSAGE_TO_PROVIDER,
  JS_IFRAME_POST_MESSAGE_TO_PROVIDER,
} from "../util/browserScripts";
import MobilePortStream from "./MobilePortStream";
import { setupMultiplex } from "../util/streams";
// import { createOriginMiddleware, createLoggerMiddleware } from '../util/middlewares';
// import Engine from './Engine';
// import { getAllNetworks } from '../util/networks';
// import Logger from '../util/Logger';
// import AppConstants from './AppConstants';
import { createEngineStream } from "json-rpc-middleware-stream";
import createMethodMiddleware from "./methodMiddleware";

const createFilterMiddleware = require("eth-json-rpc-filters");
const createSubscriptionManager = require("eth-json-rpc-filters/subscriptionManager");

const pump = require("pump");
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require("events").EventEmitter;
// const { NOTIFICATION_NAMES } = AppConstants;

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */

class Port extends EventEmitter {
  constructor(window, isMainFrame) {
    super();
    this._window = window;
    this._isMainFrame = isMainFrame;
  }

  postMessage = (msg, origin = "*") => {
    // console.log("POrt postMessage");
    // console.log(msg);
    // const js = this._isMainFrame
    //   ? JS_POST_MESSAGE_TO_PROVIDER(msg, origin)
    //   : JS_IFRAME_POST_MESSAGE_TO_PROVIDER(msg, origin);
    // if (this._window.webViewRef && this._window.webViewRef.current) {
    //   this._window && this._window.injectJavaScript(js);
    // }
    window.parent.postMessage(JSON.stringify(msg), "*");
  };
}

export class BackgroundBridge extends EventEmitter {
  // UCWasm;

  constructor({
    webview,
    url,
    // getRpcMethodMiddleware,
    isMainFrame,
    transactionController,
    personalMessageController,
    accountController,
    providerConnectionManager,
    dekeyStore,
  }) {
    super();
    // this.UCWasm = new UCWasm();
    this.url = url;
    this.hostname = new URL(url).hostname;
    this.isMainFrame = isMainFrame;
    // this._webviewRef = webview && webview.current;
    this._webviewRef = webview;

    // this.createMiddleware = getRpcMethodMiddleware;
    this.transactionController = transactionController;
    this.personalMessageController = personalMessageController;
    this.accountController = accountController;
    this.providerConnectionManager = providerConnectionManager;
    this.dekeyStore = dekeyStore;

    // this.provider = Engine.context.NetworkController.provider;
    // this.blockTracker = this.provider._blockTracker;
    this.port = new Port(this._webviewRef, isMainFrame);

    this.engine = null;

    this.chainIdSent = null;

    const portStream = new MobilePortStream(this.port, url);
    // setup multiplexing
    const mux = setupMultiplex(portStream);
    // connect features
    this.setupProviderConnection(mux.createStream("dekey-mobile-provider"));

    //     const INPAGE = "dekey-inpage";
    // const CONTENT_SCRIPT = "dekey-contentscript";
    // const PROVIDER = "dekey-provider";

    // Engine.context.NetworkController.subscribe(this.sendStateUpdate);
    // Engine.context.PreferencesController.subscribe(this.sendStateUpdate);

    // Engine.context.KeyringController.onLock(this.onLock.bind(this));
    // Engine.context.KeyringController.onUnlock(this.onUnlock.bind(this));

    this.on("update", this.onStateUpdate);

    // import '@metamask/mobile-provider/dist/index';
    // require('dekey-mobile-provider/dist/index')

    window.addEventListener("message", (event) => {
      // console.log(event);
      let msg = event.data;
      try {
        msg = JSON.parse(event.data);
      } catch {}
      this.onMessage(msg);
    });

    const { encpv, locked } = this.dekeyStore.getState();
    const hasKeyShare = !!encpv;

    window.parent.postMessage(
      { type: "bridge#initialized", hasKeyShare, locked },
      "*"
    );
  }

  // generateMpcKeyshare(dto) {
  //   console.log("generateMpcKeyshare");
  //   try {
  //     const eventEmitter = new EventEmitter();
  //     // eventEmitter.once('ddd')
  //     this.UCWasm.generateKeyShare(dto, eventEmitter);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  // onUnlock() {
  // 	this.sendNotification({
  // 		method: NOTIFICATION_NAMES.unlockStateChanged,
  // 		params: true,
  // 	});
  // }

  // onLock() {
  // 	this.sendNotification({
  // 		method: NOTIFICATION_NAMES.unlockStateChanged,
  // 		params: false,
  // 	});
  // }

  // getProviderNetworkState({ network }) {
  // 	const networkType = Engine.context.NetworkController.state.provider.type;
  // 	const networkProvider = Engine.context.NetworkController.state.provider;

  // 	const isInitialNetwork = networkType && getAllNetworks().includes(networkType);
  // 	let chainId;

  // 	if (isInitialNetwork) {
  // 		chainId = NetworksChainId[networkType];
  // 	} else if (networkType === 'rpc') {
  // 		chainId = networkProvider.chainId;
  // 	}
  // 	if (chainId && !chainId.startsWith('0x')) {
  // 		// Convert to hex
  // 		chainId = `0x${parseInt(chainId, 10).toString(16)}`;
  // 	}

  // 	const result = {
  // 		networkVersion: network,
  // 		chainId,
  // 	};
  // 	return result;
  // }

  onStateUpdate(memState) {
    if (!memState) {
      memState = this.getState();
    }
    const publicState = this.getProviderNetworkState(memState);

    // Check if update already sent
    if (this.chainIdSent === publicState.chainId) return;
    this.chainIdSent = publicState.chainId;

    // this.sendNotification({
    // 	method: NOTIFICATION_NAMES.chainChanged,
    // 	params: publicState,
    // });
  }

  // isUnlocked() {
  // 	return Engine.context.KeyringController.isUnlocked();
  // }

  getProviderState() {
    const memState = this.getState();
    return {
      isUnlocked: this.isUnlocked(),
      ...this.getProviderNetworkState(memState),
    };
  }

  sendStateUpdate = () => {
    this.emit("update");
  };

  onMessage = (msg) => {
    this.port.emit("message", { name: msg.name, data: msg.data });
  };

  onDisconnect = () => {
    this.port.emit("disconnect", { name: this.port.name, data: null });
  };

  /**
   * A method for serving our ethereum provider over a given stream.
   * @param {*} outStream - The stream to provide over.
   */
  setupProviderConnection(outStream) {
    try {
      this.engine = this.setupProviderEngine();

      // setup connection
      const providerStream = createEngineStream({ engine: this.engine });

      pump(outStream, providerStream, outStream, (err) => {
        // handle any middleware cleanup
        this.engine._middleware.forEach((mid) => {
          if (mid.destroy && typeof mid.destroy === "function") {
            mid.destroy();
          }
        });
        // if (err) Logger.log('Error with provider stream conn', err);
      });
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   **/
  setupProviderEngine() {
    // const origin = this.hostname;
    // setup json rpc engine stack
    const engine = new JsonRpcEngine();

    // // create filter polyfill middleware
    const { provider, blockTracker } =
      this.providerConnectionManager.getProviderAndBlockTracker();
    const filterMiddleware = createFilterMiddleware({ provider, blockTracker });

    // // // create subscription polyfill middleware
    const subscriptionManager = createSubscriptionManager({
      provider,
      blockTracker,
    });
    subscriptionManager.events.on("notification", (message) =>
      engine.emit("notification", message)
    );

    // // metadata
    // engine.push(createOriginMiddleware({ origin }));
    engine.push(createLoggerMiddleware({ origin }));
    // // filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);
    // // watch asset

    // // user-facing RPC methods
    engine.push(
      createMethodMiddleware({
        hostname: this.hostname,
        getProviderState: () => {},
        ethSendTransaction: this.transactionController.ethSendTransaction.bind(
          this.transactionController
        ),
        addUnapprovedMessageAsync:
          this.personalMessageController.addUnapprovedMessageAsync.bind(
            this.personalMessageController
          ),
        signPersonalMessage:
          this.personalMessageController.signPersonalMessage.bind(
            this.personalMessageController
          ),
        resetStore: this.dekeyStore.reset.bind(this.dekeyStore),
        getStoreState: this.dekeyStore.getState.bind(this.dekeyStore),
        updateStore: this.dekeyStore.updateStore.bind(this.dekeyStore),
        dekeyGenerateKey: this.accountController.generateKey.bind(
          this.accountController
        ),
        dekeyRecoverShare: this.accountController.recoverShare.bind(
          this.accountController
        ),
        unlock: this.accountController.unlock.bind(this.accountController),
        lock: this.accountController.lock.bind(this.accountController),
        getUser: this.accountController.getUser.bind(this.accountController),
        changePassword: this.accountController.changePassword.bind(
          this.accountController
        ),
        // getProviderState: this.getProviderState.bind(this),
      })
    );

    engine.push(providerAsMiddleware(provider));
    return engine;
  }

  sendNotification(payload) {
    this.engine && this.engine.emit("notification", payload);
  }
}

export function createOriginMiddleware(opts) {
  return function originMiddleware(
    /** @type {any} */ req,
    /** @type {any} */ _,
    /** @type {Function} */ next
  ) {
    req.origin = opts.origin;

    // web3-provider-engine compatibility
    // TODO:provider delete this after web3-provider-engine deprecation
    if (!req.params) {
      req.params = [];
    }

    next();
  };
}

export function createLoggerMiddleware(opts) {
  return function loggerMiddleware(
    /** @type {any} */ req,
    /** @type {any} */ res,
    /** @type {Function} */ next
  ) {
    // console.log(`RPC (${opts.origin}):`, req, "->", res);

    next((/** @type {Function} */ cb) => {
      // console.log(`RPC (${opts.origin}):`, req, "->", res);
      cb();
    });
  };
}

export default BackgroundBridge;

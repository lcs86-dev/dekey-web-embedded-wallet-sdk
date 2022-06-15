import BackgroundBridge from "./bridge";
import { AccountService } from "./service/account";
import { MpcService } from "./service/mpc";
import { TransactionService } from "./service/transaction";
import { AccountRestApi } from "./infra/rest-api/account";
import { DekeyStore } from "./dekeyStore";
import { ProviderConnectionManager } from "./provider/providerConnectionManager";
import { TransactionController } from "./controller/transaction";
import { AccountController } from "./controller/account";
import PersonalMessageController from "./controller/personalMessage";
import NetworkUtil from "../util/network";

(async () => {
  const dekeyStore = new DekeyStore();
  const accountRestApi = new AccountRestApi();

  const accountService = new AccountService({
    accountRestApi,
    dekeyStore,
  });
  const mpcService = new MpcService();
  const transactionService = new TransactionService({
    mpcService,
    dekeyStore,
    accountRestApi,
  });

  mpcService.on("wasm:loaded", async () => {
    await accountService.initializeWallet();

    const currentNetwork = NetworkUtil.getCurrentNetwork();

    const providerConnectionManager = new ProviderConnectionManager();
    const transactionController = new TransactionController({
      transactionService,
      providerConnectionManager,
      dekeyStore,
    });
    const accountController = new AccountController({
      accountService,
      mpcService,
      dekeyStore,
    });
    const personalMessageController = new PersonalMessageController({
      mpcService,
      transactionService,
      dekeyStore,
      getMpcJwt: accountRestApi.getMpcJwt,
    });
    await providerConnectionManager.connect(currentNetwork);

    // init BackgroundBridge after making provider
    const bridge = new BackgroundBridge({
      webview: window, // iframe context
      url: window.location.href,
      isMainFrame: true,
      transactionController,
      accountController,
      personalMessageController,
      providerConnectionManager,
      dekeyStore,
    });
  });
})();

// import _ from "lodash";

export class DekeyStore {
  reset() {
    // this.store = new ComposableObservableStore(initState);
    localStorage.removeItem("dekey");
  }

  getState() {
    try {
      const result = localStorage.getItem("dekey");

      return JSON.parse(result) ?? {};
    } catch (error) {
      return {};
    }
  }

  updateStore(change) {
    let dekeyState = {};
    try {
      dekeyState = JSON.parse(localStorage.getItem("dekey"));
    } catch (error) {}

    const newState = { ...dekeyState, ...change };

    localStorage.setItem("dekey", JSON.stringify(newState));
  }
}

// networks: [...networks],
// currentNetwork: { ...networks[0] },
// unapprovedPersonalMsgs: {},
// user,
// activeAccount,
// wallets,
// accessToken,
// expirationTime,
// locked

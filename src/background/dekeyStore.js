export class DekeyStore {
  reset() {
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

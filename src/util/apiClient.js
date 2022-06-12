import { DekeyStore } from "../background/dekeyStore";

const apiURL = `${process.env.APP_SERVER_ADDRESS_PROTOCOL}://${process.env.APP_SERVER_ADDRESS}/api`;

const dekeyStore = new DekeyStore();

async function client(
  endpoint,
  { method, data, token, headers: customHeaders, ...customConfig } = {}
) {
  const config = {
    method: data ? "POST" : "GET",
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      Authorization: token ? "Bearer " + token : undefined,
      "Content-Type": data ? "application/json" : undefined,
      ...customHeaders,
    },
    ...customConfig,
  };

  return window
    .fetch(`${apiURL}/${endpoint}`, config)
    .then(async (response) => {
      if (response.status === 401) {
        logout();
        // refresh the page for them
        window.location.assign(window.location);
        return Promise.reject({ message: "Please re-authenticate." });
      }
      const data = await response.json();
      if (response.ok) {
        return data;
      } else {
        return Promise.reject(data);
      }
    });
}

function logout() {
  dekeyStore.updateStore({
    locked: true,
    accessToken: null,
  });
}

export { client };

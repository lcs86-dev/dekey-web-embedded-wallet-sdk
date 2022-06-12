import axios from "axios";

export const apiClient = axios.create({
  baseURL: `${process.env.APP_SERVER_ADDRESS_PROTOCOL}://${process.env.APP_SERVER_ADDRESS}/api/`,
  timeout: 10000,
});

export const keyCloudAxios = axios.create({
  baseURL: `${process.env.KEY_CLOUD_ADDRESS}`,
  timeout: 10000,
});

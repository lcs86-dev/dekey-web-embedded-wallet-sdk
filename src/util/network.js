import { v4 as uuidv4 } from "uuid";

const DEFAULT_NETWORKS = [
  {
    // id: uuidv4(),
    symbol: "ETH",
    name: "Private Network",
    /** Besu */
    // rpcUrl: "https://besu.dekey.app",
    // chainId: 1337,
    // blockExplorerUrl: "http://63.250.52.190:26000",
    /** Expedition */
    // rpcUrl: "http://54.180.149.196:8668",
    rpcUrl: "https://ethereum.myinitial.io",
    chainId: 6888,
    blockExplorerUrl:
      "http://54.180.149.196/?rpcUrl=http://54.180.149.196:8668",
  },
];

const getCurrentNetwork = () => {
  return DEFAULT_NETWORKS[0];
};

const NetworkUtil = {
  getCurrentNetwork,
};

export default NetworkUtil;

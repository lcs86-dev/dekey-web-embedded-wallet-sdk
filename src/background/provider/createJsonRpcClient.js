import { mergeMiddleware } from "json-rpc-engine";
import {
  createFetchMiddleware,
  createBlockRefRewriteMiddleware,
  createBlockCacheMiddleware,
  createInflightCacheMiddleware,
  createBlockTrackerInspectorMiddleware,
  providerFromMiddleware,
} from "eth-json-rpc-middleware";
import { PollingBlockTracker } from "eth-block-tracker";

const SECOND = 10000;

const blockTrackerOpts = { pollingInterval: SECOND };

export default function createJsonRpcClient({
  rpcUrl,
  chainId,
  // networkDomain,
}) {
  const fetchMiddleware = createFetchMiddleware({ rpcUrl });

  const blockProvider = providerFromMiddleware(fetchMiddleware);
  const blockTracker = new PollingBlockTracker({
    ...blockTrackerOpts,
    provider: blockProvider,
  });

  const networkMiddleware = mergeMiddleware([
    createChainIdMiddleware(chainId),
    // createBlockRefRewriteMiddleware({ blockTracker }),
    // createBlockCacheMiddleware({ blockTracker }),
    // createInflightCacheMiddleware(),
    // createBlockTrackerInspectorMiddleware({ blockTracker }),
    fetchMiddleware,
  ]);

  return { networkMiddleware, blockTracker };
}

function createChainIdMiddleware(chainId) {
  return (req, res, next, end) => {
    if (req.method === "eth_chainId") {
      res.result = chainId;
      return end();
    }
    return next();
  };
}

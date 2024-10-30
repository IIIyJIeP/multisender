import { rpcURLs } from '@/configs';
import { useChain } from '@cosmos-kit/react';
import {
  useRpcEndpoint,
  useRpcClient,
  createRpcQueryHooks,
} from 'interchain-query';
import { cosmos as chain} from 'osmojs'

export const useQueryHooks = (chainName: string) => {
  const { getRpcEndpoint } = useChain(chainName);

  const getCustomRpcEndpoint = async () => {
    const rpcEndpoint = rpcURLs[chainName]
    if (!rpcEndpoint) return getRpcEndpoint()
    try {
      const client = await chain.ClientFactory.createRPCQueryClient({ rpcEndpoint })
      if (!client) return getRpcEndpoint()
    } catch (err) {
      console.log(err)
      return getRpcEndpoint()
    }
    return  rpcEndpoint
  }

  const rpcEndpointQuery = useRpcEndpoint({
    getter: getCustomRpcEndpoint,
    options: {
      staleTime: Infinity,
      queryKeyHashFn: (queryKey) => {
        return JSON.stringify([...queryKey, chainName]);
      },
    },
  });
  
  const rpcClientQuery = useRpcClient({
    rpcEndpoint: rpcEndpointQuery.data || '',
    options: {
      enabled: Boolean(rpcEndpointQuery.data),
      staleTime: Infinity,
    },
  });

  const { cosmos } = createRpcQueryHooks({
    rpc: rpcClientQuery.data,
  });

  const isReady = Boolean(rpcClientQuery.data);
  const isFetching = rpcEndpointQuery.isFetching || rpcClientQuery.isFetching;

  return {
    cosmos,
    isReady,
    isFetching,
    rpcEndpoint: rpcEndpointQuery.data || '',
  };
};

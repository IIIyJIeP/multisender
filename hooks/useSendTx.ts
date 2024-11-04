import { useChain } from '@cosmos-kit/react';
import { isDeliverTxSuccess, StdFee } from '@cosmjs/stargate';

import { cosmos, getSigningCosmwasmClient, getSigningCosmosClient } from 'osmojs';
import { EncodeObject } from 'osmojs/types';
import { getTokenByChainName } from '@/utils';
import { useToast } from './useToast';
import { coin } from '@cosmjs/amino';
import { useQueryHooks } from './useQueryHooks';
import { MsgExecuteContract } from 'osmojs/cosmwasm/wasm/v1/tx';

const txRaw = cosmos.tx.v1beta1.TxRaw;

enum TxStatus {
  Failed = 'Transaction Failed',
  Successful = 'Transaction Successful',
  Broadcasting = 'Transaction Broadcasting',
}

type UserAction = 'retry' | 'skip' | 'stop'

export type QueueSendresponse = {
  failedMsgs: EncodeObject[]
  batchesResults: {
    batchNumber: number
    isSuccess: boolean
    txHash?: string
  }[]
}

type SendTxOptions = {
  msgs: EncodeObject[]
  fee?: StdFee | null
  onSuccess?: (txHash: string) => void
  onComplete?: (errMsg?: string) => void
  batchNumber?: number
  tokenSymbol?: string
};

type QueueSendTxOptions = {
  msgs: EncodeObject[]
  batchSize: number
  fee?: StdFee | null
  onSuccess?: (results: QueueSendresponse) => void
  onComplete?: () => void
  onUserActionNeed?: (massage: string) => Promise<UserAction>
  signMode?: SignMode
  tokenSymbol?: string
}

export enum SignMode {
  AMINO = 'AMINO',
  DIRECT = 'DIRECT'
}

export const useSendTx = (chainName: string) => {
  const { toast } = useToast();
  const { address, getOfflineSignerAmino, getOfflineSignerDirect } = useChain(chainName);
  const { rpcEndpoint } = useQueryHooks(chainName)

  const queueSendMsgsTx = async (options: QueueSendTxOptions) => {
    const {
      msgs,
      batchSize,
      fee,
      onSuccess,
      onComplete,
      onUserActionNeed,
      signMode,
      tokenSymbol,
    } = options;

    if (!address) {
      toast({
        type: 'error',
        title: 'Wallet not connected',
        description: 'Please connect the wallet',
      });
      onComplete && onComplete();
      return;
    }
    const result: QueueSendresponse = {
      batchesResults: [],
      failedMsgs: []
    }
    const queueMsgs: EncodeObject[][] = []
    for (let i = 0; i < Math.ceil(msgs.length / batchSize); i++) {
      queueMsgs[i] = msgs.slice((i * batchSize), (i * batchSize) + batchSize)
    }

    let isAtLeastOneSuccessful = false

    let batchNumber = 1
    let next = true
    while (queueMsgs.length > 0 && next === true) {
      const batchMsgs = queueMsgs.shift()!
      let action: UserAction = 'retry'
      while (action === 'retry') {
        next = false
        let errMsg: string | null = null
        await sendTx(
          {
            msgs: batchMsgs,
            fee,
            onSuccess: (txHash) => {
              next = true
              isAtLeastOneSuccessful = true
              result.batchesResults.push({
                batchNumber,
                isSuccess: true,
                txHash,
              })
            },
            onComplete: (e) => { errMsg = e ?? null },
            batchNumber,
            tokenSymbol
          },
          signMode
        )
        if (next) break;
        if (onUserActionNeed) {
          action = await onUserActionNeed(errMsg ?? 'Transaction Failed!')
          if (action !== 'retry') {
            result.batchesResults.push({
              batchNumber,
              isSuccess: false,
            })
            result.failedMsgs.push(...batchMsgs)
          }
          if (action === 'skip') next = true;
        }
      }
      batchNumber++
    }
    onSuccess && isAtLeastOneSuccessful && onSuccess(result)
    onComplete && onComplete()
  }

  const sendTx = async (options: SendTxOptions, signMode?: SignMode) => {
    const {
      msgs,
      fee,
      onSuccess,
      onComplete,
      batchNumber,
      tokenSymbol
    } = options;
    const offlineSigner = signMode === 'DIRECT' ? getOfflineSignerDirect() : getOfflineSignerAmino()
    let errMsg: string | undefined

    if (!address) {
      toast({
        type: 'error',
        title: 'Wallet not connected',
        description: 'Please connect the wallet',
      });
      if (onComplete) onComplete(errMsg);
      return;
    }

    let signed: Parameters<typeof txRaw.encode>['0'];
    let client: Awaited<ReturnType<typeof getSigningCosmwasmClient>>;
    const getSigningClient = msgs[0].typeUrl === MsgExecuteContract.typeUrl ?
      getSigningCosmwasmClient
      : getSigningCosmosClient

    try {
      client = await getSigningClient({
        rpcEndpoint: rpcEndpoint,
        signer: offlineSigner,
      });

      const estimatedGas = Math.round((await client.simulate(address, msgs, '')) * 1.8).toString()
      const defaultFee: StdFee = {
        amount: [coin('0', getTokenByChainName(chainName).base)],
        gas: estimatedGas,
      }

      signed = await client.sign(
        address,
        msgs,
        fee || defaultFee,
        `https://multisender.iiiyjiep.ru  ${tokenSymbol ?? ''} Batch #${batchNumber ?? 'n/a'}`
      )
    } catch (e: any) {
      errMsg = e.toString()
      toast({
        title: TxStatus.Failed,
        description: errMsg || 'An unexpected error has occurred',
        type: 'error',
      });
      if (onComplete) onComplete(errMsg);
      return;
    }

    const broadcastToastId = toast({
      title: TxStatus.Broadcasting,
      description: 'Waiting for transaction to be included in the block',
      type: 'loading',
      duration: 999999,
    });

    if (client && signed) {
      try {
        const res = await client.broadcastTx(Uint8Array.from(txRaw.encode(signed).finish()))
        if (isDeliverTxSuccess(res)) {
          toast({
            title: TxStatus.Successful,
            type: 'success',
          })

          if (onSuccess) onSuccess(res.transactionHash);
        } else {
          errMsg = res.rawLog
          toast({
            title: TxStatus.Failed,
            description: errMsg,
            type: 'error',
            duration: 10000,
          });
        }
      } catch (err) {
        errMsg = String(err)
        toast({
          title: TxStatus.Failed,
          description: errMsg,
          type: 'error',
          duration: 10000,
        });
      } finally { toast.close(broadcastToastId) }

    } else {
      toast.close(broadcastToastId);
    }
    if (onComplete) onComplete(errMsg);
  };

  return { sendTx, queueSendMsgsTx };
};

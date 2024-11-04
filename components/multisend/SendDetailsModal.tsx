import { useEffect, useState } from 'react';
import { ChainName } from 'cosmos-kit';
import { BasicModal, Box, Button, Divider, Text } from '@interchain-ui/react';
import { CsvData, Result, ResultModal } from '.';
import { getSigningCosmosClient, getSigningCosmwasmClient } from 'osmojs'
import { MsgSend } from 'osmojs/cosmos/bank/v1beta1/tx';
import { MsgExecuteContract } from 'osmojs/cosmwasm/wasm/v1/tx';
import { useChain } from '@cosmos-kit/react';
import { EncodeObject } from '@cosmjs/proto-signing';
import { useQueryHooks, useSendTx, useConfirmDialog, QueueSendresponse, batchSize } from '@/hooks';

export type TokentInfo = {
    denom: string
    symbol: string
    availableAmount: number
    multiplier: number
    isCW20?: boolean
}

type SendModalProps = {
    isOpen: boolean
    onClose: () => void
    chainName: ChainName
    address: string
    sendingList: CsvData[]
    asset: TokentInfo
    feeToken: TokentInfo
    onSuccesSend?: () => void
}

export const SendDetailsModal = ({ 
    isOpen,
    onClose,
    chainName,
    address,
    asset,
    feeToken,
    sendingList,
    onSuccesSend
}: SendModalProps) => {
    const [isSending, setIsSending] = useState(false)
    const [estFee, setEstFee] = useState<number>()
    const [result, setResult] = useState<Result>()
    const [isSuccess, setIsSuccess] = useState(false)

    const {getOfflineSignerAmino, chain} = useChain(chainName)
    const {rpcEndpoint} = useQueryHooks(chainName)
    const {queueSendMsgsTx} = useSendTx(chainName)
    const { openDialog, ConfirmDialogComponent } = useConfirmDialog()

    const msgs: EncodeObject[] = sendingList.map((recipient) => {
        const msg = !asset.isCW20 ? {
            typeUrl: MsgSend.typeUrl,
            value: {
                amount: [
                    {
                        amount: recipient.amount.toString(),
                        denom: asset.denom
                    },
                ],
                fromAddress: address,
                toAddress: recipient.address,
            }
        } : {
            typeUrl: MsgExecuteContract.typeUrl,
            value: MsgExecuteContract.fromAmino({
                contract: asset.denom.replace('cw20:', ''),
                sender: address,
                funds: [],
                msg: {
                    transfer: {
                        recipient: recipient.address,
                        amount: recipient.amount.toString()
                    }
                }
            })
        }
        return msg
    })

    const totalAmountToSend = sendingList.reduce(
        (acc, curr) => acc += curr.amount, 0
    ) / asset.multiplier
    const isInsufficientAsset = asset.availableAmount < totalAmountToSend

    const TransactionsNeeded = Math.ceil(sendingList.length / batchSize)
    const isInsufficientFeeToken = estFee ? feeToken.availableAmount < estFee : false

    const isInsufficient = feeToken.denom === asset.denom && estFee ? 
        feeToken.availableAmount < totalAmountToSend + estFee
    : false
    
    const isReadyToSend = !isInsufficientFeeToken && !isInsufficientAsset && !isInsufficient

    const onModalClose = () => {
        setIsSending(false);
        setResult(undefined)
        isSuccess && onSuccesSend && onSuccesSend()
        setIsSuccess(false)
        onClose();
    };

    const onSendClick = async () => {
        setIsSending(true)

        queueSendMsgsTx ({
            msgs,
            onSuccess: (res) => {
                writeResult(res)
                setIsSuccess(true)
            },
            onComplete: () => {
                setIsSending(false)
            },
            onUserActionNeed: massage => openDialog(massage),
            tokenSymbol: asset.symbol,
        })
    }

    const updateEstimateFee = async (msgsToSend: EncodeObject[]) => {
        const gasPrice = chain.fees?.fee_tokens.find(token => token.denom === feeToken.denom)?.low_gas_price
        if (!gasPrice) return;
        try {
            const getSigningClient = msgs[0].typeUrl === MsgExecuteContract.typeUrl ?
                getSigningCosmwasmClient 
            : getSigningCosmosClient
            const client = await getSigningClient({
                rpcEndpoint: rpcEndpoint,
                signer: getOfflineSignerAmino(),
            })

            const feeAmount = Math.round((await client.simulate(address, msgsToSend.slice(0, batchSize), '')) * 2 * gasPrice)
            setEstFee(Number(feeAmount) * TransactionsNeeded / feeToken.multiplier)
        } catch (err) { console.error(err) }
    }

    const writeResult = (res: QueueSendresponse) => {
        const failedAddresses: string[] = res.failedMsgs.map(msg => {
            return msg.typeUrl === MsgExecuteContract.typeUrl ?
                MsgExecuteContract.toAmino(msg.value).msg?.transfer?.recipient || null
            : msg.value.toAddress || null
        }).filter(msg => msg !== null)
        const failedSends = sendingList.filter(send => failedAddresses.includes(send.address))
        failedSends.forEach(sending => sending.amount /= asset.multiplier)
        setResult({
            failedSends,
            batchesResults: [...res.batchesResults]
        })
    }

    useEffect(() => {
        updateEstimateFee(msgs)
    }, []) // eslint-disable-line
    
    return (
        <BasicModal
            title="Send Detais"
            isOpen={isOpen}
            renderCloseButton={isSending ? ()=>{} : undefined}
            onClose={!isSending ? onModalClose : undefined}
            closeOnClickaway={false}
        >
            <Box
                width={{ mobile: '100%' }}
                display="flex"
                flexDirection="column"
                gap="$9"
                pt="$4"
            >
                
                <Box
                    display='flex'
                    flexDirection='column'
                >
                    <Text
                        fontSize='medium'
                    >
                        {`Number of recipients: ${sendingList.length}`}
                    </Text>
                    <Text
                        fontSize='medium'
                    >
                        {`Transactions needed: ${TransactionsNeeded}`}
                    </Text>

                    <Divider height="0.2px" mt="$2" mb="$4" />

                    <Text
                        fontSize='medium'
                    >
                        {`Amount to send: ${totalAmountToSend} ${asset.symbol}`}
                    </Text>
                    <Text
                        fontSize='medium'
                    >
                        {`Available balance: ${asset.availableAmount} ${asset.symbol} `}
                    </Text>
                    {isInsufficientAsset && <Text
                        fontSize='medium'
                        fontWeight='$semibold'
                        color='red'
                    >
                        Warning! Available balance is less than the amount required to send!
                    </Text>}

                    <Divider height="0.2px" mt="$2" mb="$4" />

                    <Text
                        fontSize='medium'
                    >
                        {`Estimated gas fee: ~${estFee || 'n/a'} ${feeToken.symbol}`}
                    </Text>
                    <Text
                        fontSize='medium'
                    >
                        {`Available balance: ${feeToken.availableAmount} ${feeToken.symbol}`}
                    </Text>
                    {isInsufficientFeeToken && <Text
                        fontSize='medium'
                        fontWeight='$semibold'
                        color='red'
                    >
                        Warning! Available balance is less than estimated gas fee!
                    </Text>}
                    {isInsufficient && <Text
                        fontSize='medium'
                        fontWeight='$semibold'
                        color='red'
                    >
                        Warning! Available balance is less than the amount required to send and estimated gas fee!
                    </Text>}
                    {isReadyToSend && <Text
                        fontSize='medium'
                        fontWeight='$semibold'
                        textAlign='center'
                        color='green'
                        attributes={{ mt: '$5' }}
                    >
                        Ready to Send!
                    </Text>}
                </Box>

                <Box width="$full" mt="$9">
                    <Button
                        fluidWidth
                        intent="tertiary"
                        isLoading={isSending}
                        disabled={!isReadyToSend || isSending}
                        onClick={onSendClick}
                    >
                        SendAll
                    </Button>
                </Box>

                {ConfirmDialogComponent}
                {result && <ResultModal
                    isOpen={true} // TODO:
                    chainName={chainName}
                    onClose={onModalClose}
                    result={result}
                    tokenSymbol={asset.symbol}
                />}
            </Box>
        </BasicModal>
    )
};

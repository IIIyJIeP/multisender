import { ChainName } from 'cosmos-kit'
import { useChain, } from '@cosmos-kit/react'
import { Box, ChainListItem, Text, useColorModeValue } from '@interchain-ui/react'
import { usePrices, useQueryHooks } from '@/hooks'
import { calcDollarValue } from '@/utils'
import { TokentInfo } from '.'
import { useEffect } from 'react'

 /** 
  * @param refresh - Any value that changes when an refresh is needed 
  */
export const MainCoinBalance = ({
    chainName,
    onBalanceChange,
    refresh
}: {
    chainName: ChainName,
    onBalanceChange: (tokenInfo: TokentInfo) => void
    refresh?: any
}) => {
    const { address, assets } = useChain(chainName)
    const { cosmos } = useQueryHooks(chainName)
    const boxShadow = useColorModeValue(
        '0 0 2px #dfdfdf, 0 0 6px -2px #d3d3d3',
        '0 0 2px #363636, 0 0 8px -2px #4f4f4f'
    )

    const coin = assets?.assets[0]
    const { data, refetch } = cosmos.bank.v1beta1.useBalance({ request: { address: address || '', denom: coin?.base || '' } })
    const baseAmount = data?.balance?.amount
    const display = coin?.display
    const exponent = coin?.denom_units.find(unit => unit.denom === display)?.exponent
    const amount = baseAmount && exponent ? (Number(baseAmount) / Math.pow(10, Number(exponent))).toString() : undefined
    const prices = usePrices()
    const cost = coin && amount && prices.data ? '$' + calcDollarValue(coin.base, amount, prices.data).toString() : 'n/a'

    useEffect(() => {
        if (!amount || !coin || !exponent) return
        onBalanceChange({
            availableAmount: Number(amount),
            denom: coin.base,
            multiplier: Math.pow(10, exponent),
            symbol: coin.symbol
        })
    }, [amount, coin, exponent, onBalanceChange])

    useEffect(() => {
        refetch()
    }, [refresh, refetch])

    return (
        <Box
            mx='auto'
            maxWidth='20rem'
            display="flex"
            flexDirection="column"
            boxShadow={boxShadow}
        >
            <Text
                fontSize='large'
                fontWeight='$bold'
                attributes={{ mb: '$2' }}
            >
                Your balance:
            </Text>
            <ChainListItem
                isActive={false}
                size='md'
                iconUrl={coin?.logo_URIs?.svg || coin?.logo_URIs?.png || ''}
                name={coin?.name || ''}
                tokenName={coin?.symbol || ''}
                amount={amount || 'n/a'}
                notionalValue={cost}
            />
            {Number(amount) === 0 && <Text
                fontSize='medium'
                fontWeight='$bold'
                color='Red'
                attributes={{ mb: '$2' }}
            >
                {`Insufficient balance to pay for gas`}
            </Text>}
        </Box>
    )
}
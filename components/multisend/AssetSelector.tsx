import { useState, Key, useEffect } from 'react';
import { cw20 } from '@/configs'
import {
  Box,
  Combobox,
  Text,
  Stack,
  Avatar,
  useTheme,
  Spinner,
} from '@interchain-ui/react';
import { useChain } from '@cosmos-kit/react';
import { useQueryHooks } from '@/hooks';
import { Asset } from '@chain-registry/types';
import { Coin, cosmwasm } from 'osmojs'
import {SkipClient} from '@skip-go/client'

const skipClient = new SkipClient()

type Option = {
  label: string;
  amount: string;
  iconUrl: string
};

/** 
  * @param refresh - Any value that changes when an refresh is needed 
  */
export interface ChooseAssetProps {
  chainName: string;
  onChange: (selectedItem: (Asset&{amount: string, exponent: number})|undefined) => void;
  addContractAddress?: string;
  refresh?: any
}

const AssetOption = (props: Option) => {
  return (
    <Stack
      direction="horizontal"
      space="$4"
      attributes={{ alignItems: 'center' }}
    >
      <Avatar
        name={props.label}
        getInitials={(name) => name[0]}
        size="xs"
        src={props.iconUrl}
        fallbackMode="bg"
      />
      <Box
        display='flex'
        flexDirection='row'
        alignItems='center'
        justifyContent='space-between'
        width='$full'
        flexWrap='nowrap'
      >
        <Text fontSize="$md" fontWeight="$normal" color="$text">
          {props.label}
        </Text>
        <Text whiteSpace='nowrap' fontSize="$md" fontWeight="$normal" color="$text">
          {props.amount}
        </Text>
      </Box>
    </Stack>
  );
};

export const AssesetSlector = ({ chainName, onChange, addContractAddress, refresh }: ChooseAssetProps) => {
  const [selectedKey, setSelectedKey] = useState<Key>();
  const [input, setInput] = useState('');
  const [availableAssets, setAvailableAssets] = useState<(Asset&{amount: string, exponent: number})[]>([]);
  const { themeClass } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false) 

  const { address, assets, chain } = useChain(chainName)
  const { cosmos, rpcEndpoint } = useQueryHooks(chainName)
  const {data, isFetching, isLoading, refetch} = cosmos.bank.v1beta1.useAllBalances({ request: { address: address || '' } })
  const allBalances = data?.balances || []
  const selectedAsset = availableAssets.find((a) => a.symbol === selectedKey)

  const updeteAvailableAssets = async () => {
    setIsUpdating(true)
    const avAssets: (Asset&{amount: string, exponent: number})[] = []
    const cw20tokens = [...(cw20[chainName]||[])]
    const cw20balances: Coin[] = []
    const cw20client = await cosmwasm.ClientFactory.createRPCQueryClient({ rpcEndpoint })
    if (addContractAddress) cw20tokens.push(addContractAddress);
    if (cw20tokens.length > 0) {
      for (let contract of cw20tokens) {
        try{
          const cw20balance = cosmwasm.wasm.v1.QuerySmartContractStateResponse.toAmino(
            await cw20client.cosmwasm.wasm.v1.smartContractState(
              cosmwasm.wasm.v1.QuerySmartContractStateRequest.fromAmino({
                address: contract, query_data: {
                  balance: {
                    address: address || '',
                  }
                }
              })
            )
          ).data?.balance as string | undefined
          if (!cw20balance || Number(cw20balance) === 0) continue;
          cw20balances.push({
            amount: cw20balance,
            denom: 'cw20:' + contract
          })
        } catch(rrr){}  
      }
    }
    for (let balance of [...allBalances, ...cw20balances]) {
      /* TODO fix type error */
        /* @ts-ignore */
      let assetMeta: Asset | undefined = assets?.assets.find(asset => asset.base === balance.denom)
      if (!assetMeta && balance.denom.includes('cw20:')) {
        const contractAddress = balance.denom.replace('cw20:', '')
        const tokenInfo = cosmwasm.wasm.v1.QuerySmartContractStateResponse.toAmino(
          await cw20client.cosmwasm.wasm.v1.smartContractState(
            cosmwasm.wasm.v1.QuerySmartContractStateRequest.fromAmino({
              address: contractAddress, query_data: {
                token_info: {}
              }
            })
          )
        ).data as {
          name?: string,
          symbol?: string,
          decimals?: number,
        } | undefined
        if (!tokenInfo) continue;
        assetMeta = {
          base: balance.denom,
          denom_units: [
            {
              denom: balance.denom,
              exponent: 0
            },
            {
              denom: tokenInfo.symbol||'',
              exponent: tokenInfo.decimals||0
            }
          ],
          display: tokenInfo.symbol||'',
          name: tokenInfo.name||'',
          symbol: tokenInfo.symbol||'',
          address: contractAddress,
          type_asset: 'cw20'
        }
        const history = await cw20client.cosmwasm.wasm.v1.contractHistory({address: contractAddress})
        const entry = history.entries.find(entry => {
          const decodedEntry = cosmwasm.wasm.v1.ContractCodeHistoryEntry.toAmino(entry)
          const url = decodedEntry.msg?.marketing?.logo?.url
          return !!url
        })
        if (entry) {
          const decodedEntry = cosmwasm.wasm.v1.ContractCodeHistoryEntry.toAmino(entry)
          let url = decodedEntry.msg?.marketing?.logo?.url as string
          if (url.includes('https://github.com/')) url += '?raw=true'
          assetMeta.logo_URIs = {png: url}
        }
      }
      if (!assetMeta) {
        try {
          const skipAssets = await skipClient.assetsFromSource({
            includeCW20Assets: true,
            sourceAssetChainID: chain.chain_id,
            sourceAssetDenom: balance.denom
          })
          const skipAsset = skipAssets[chain.chain_id][0]
          /* @ts-ignore */
          assetMeta = {
            base: balance.denom,
            denom_units: [
              {
                denom: skipAsset.denom,
                exponent: 0
              },
              {
                denom: skipAsset.symbol || skipAsset.denom,
                exponent: skipAsset.decimals || 0
              },
            ],
            display: skipAsset.symbol || skipAsset.denom,
            name: skipAsset.name || skipAsset.denom,
            symbol: skipAsset.symbol || skipAsset.denom,
            logo_URIs: { png: skipAsset.logoURI }
          }
        } catch (err) {}  
      }
      if (!assetMeta) {
        try {
          const response = await cw20client.cosmos.bank.v1beta1.denomMetadata({ denom: balance.denom })
          /* @ts-ignore */
          assetMeta = {
            base: response.metadata.base,
            denom_units: response.metadata.denomUnits,
            display: response.metadata.display,
            name: response.metadata.name,
            symbol: response.metadata.symbol,
            logo_URIs: { svg: response.metadata.uri }
          }
        } catch (err) { }
      }
      if (!assetMeta) {
        /* @ts-ignore */
        assetMeta = {
          base: balance.denom,
          denom_units: [
            {
              denom: balance.denom,
              exponent: 0
            },
          ],
          display: balance.denom,
          name: balance.denom,
          symbol: balance.denom,
        }
      }
      if (assetMeta) {
        const baseAmount = balance.amount
        const exponent1 = assetMeta.denom_units.find(unit => unit.denom === assetMeta.display)?.exponent
        const exponent2 = assetMeta.denom_units.find(unit => unit.denom === assetMeta.symbol)?.exponent
        const exponent =  exponent2 || exponent1 || 0
        const amount = baseAmount ? (Number(baseAmount)/Math.pow(10, Number(exponent))).toString() : ''

        const ass = {...assetMeta, amount, exponent}
        avAssets.push(ass)
      };
    }
    setAvailableAssets(avAssets)
    setIsUpdating(false)
  }

  useEffect(() => {
    if (isUpdating)
      onChange(undefined)
  }, [isUpdating, onChange])

  useEffect(() => {
    setAvailableAssets([])
    refetch()
  }, [chainName, setAvailableAssets, refetch])
  
  useEffect(() => {
    refetch()
  }, [address, refresh, addContractAddress, refetch])
  
  useEffect(() => {
    if (!isFetching && !isLoading)
    updeteAvailableAssets()
  }, [isFetching, isLoading]) // eslint-disable-line

  useEffect(() => {
    onChange(selectedAsset);
    if (!selectedAsset?.symbol) {
      setSelectedKey(undefined)
      setInput('')
    }
  }, [selectedAsset, onChange])

  if (isUpdating) return (
    <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    >
      <Spinner
        size='xx-large'
        attributes={{width: {
          mobile: '100%',
          mdMobile: '420px',
        }}}
      />
    </Box>
  )

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      className={themeClass}
    >
      <Combobox
        selectedKey={selectedKey as string}
        onSelectionChange={(item) => {
          setInput(item?.toString() || '')
          setSelectedKey(item||undefined);
        }}
        
        inputAddonStart={
          selectedKey ? (
            <Avatar
              name={selectedKey as string}
              getInitials={(name) => name[0]}
              size="xs"
              src={selectedAsset?.logo_URIs?.svg || selectedAsset?.logo_URIs?.png}
              fallbackMode="bg"
              attributes={{
                paddingX: '$4',
              }}
            />
          ) : null
        }
        inputValue={input}
        onInputChange={(i) => { setInput(i) }}

        styleProps={{
          width: {
            mobile: '100%',
            mdMobile: '420px',
          },
        }}
      >
        {availableAssets.map((option) => (
          <Combobox.Item key={option.symbol} textValue={option.symbol}>
            <AssetOption
              iconUrl={option.logo_URIs?.svg || option.logo_URIs?.png || ''}
              label={option.symbol}
              amount={option.amount}
            />
          </Combobox.Item>
        ))}
      </Combobox>
    </Box>
  );
};

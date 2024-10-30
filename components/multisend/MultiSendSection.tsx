import { ChainName } from 'cosmos-kit';
import { useChain } from '@cosmos-kit/react';
import { Box, Spinner, Stack, Text, useColorModeValue, Tooltip } from '@interchain-ui/react';
import { AddressInput, AssesetSlector, CsvData, MainCoinBalance, UploadCSV } from '.';
import { useQueryHooks } from '@/hooks';
import { useEffect, useState } from 'react';
import { Asset } from '@chain-registry/types';
import { Checkbox } from '@mui/joy';
import { SendDetailsModal, TokentInfo } from '.';

export const MultisendSection = ({ chainName }: { chainName: ChainName }) => {
  const { address } = useChain(chainName);
  const { isReady } = useQueryHooks(chainName)
  const backgroundColor = useColorModeValue('$white', '$blackAlpha500')
  const tooltipTextColor = useColorModeValue('$white', '$black')
  
  const boxShadow = useColorModeValue(
    '0 0 2px #dfdfdf, 0 0 6px -2px #d3d3d3',
    '0 0 2px #363636, 0 0 8px -2px #4f4f4f'
  )
  const [selectedAsset, setSelectedAsset] = useState<Asset & { amount: string, exponent: number }>()
  const [contractAddress, setContractAddress] = useState('')
  const [isInvalidCW20Address, setIsInvalidCW20Address] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [data, setData] = useState<CsvData[]>([])
  const [coinInfo, setCoinInfo] = useState<TokentInfo>()
  const [refresh, setRefresh] = useState(false)
  
  useEffect(() => {
    setContractAddress('')
    setIsChecked(false)
    setData([])
  }, [chainName])


  if (!address) {
    return (
      <Text
        fontWeight="$semibold"
        fontSize="$lg"
        textAlign="center"
        color="$textSecondary"
        attributes={{ my: '$24' }}
      >
        Please connect your wallet
      </Text>
    )
  }
  if (!isReady) {
    return (
      <Spinner
        attributes={{ mx: 'auto', my: 'auto' }}
      />
    )
  }
  return (
    <Box
      display='flex'
      flexDirection='column'
      mb='$15'
      justifyContent='flex-start'
      alignItems='stretch'
    >
      {/* Main balance */}
      <Box
        mb='$10'
      >
        <MainCoinBalance
          chainName={chainName}
          onBalanceChange={setCoinInfo}
          refresh={refresh}
        />
      </Box>
      {/* Asset selector */}
      <Box
        bg={backgroundColor}
        boxShadow={boxShadow}
        borderRadius='$lg'
        width='fit-content'
        mx='auto'
      >
        <Box display='flex' flexDirection='row' alignItems='center' justifyContent='center' gap='$4'>
        <Text
          textAlign='center'
        >
          Select asset for Multisend
        </Text>
        <Tooltip placement='top-end' title={<Text color={tooltipTextColor} attributes={{ maxWidth: {mobile: '15rem', tablet:'30rem'} }}>
          Select an asset for multi-sending. 
          The selector displays only those assets that are on the balance. 
          If the required CW20 token is not in the list, check the &quot;add custom cw20 token address&quot; 
          checkbox and enter the contract address. If the address is entered correctly and the token 
          is on the balance, it will appear in the selector. 
        </Text>}><Text fontWeight='$bold' color='$blue500'>  (¡) </Text>
        </Tooltip>
        </Box>
        <Box
          width='fit-content'
          mx={{ mobile: '$8', tablet: '$11' }}
          pt='$4'
        >
          <Checkbox
            disabled={false}
            label="add custom cw20 token address"
            size="md"
            variant="outlined"
            color='neutral'
            onChange={(e) => {
              setIsChecked(e.target.checked)
              if (!e.target.checked) setContractAddress('')
            }}
            checked={isChecked}
          />
        </Box>
        {isChecked && <AddressInput
          chainName={chainName}
          address={contractAddress}
          onAddressChange={(address) => { setContractAddress(address) }}
          placeholder='Insert CW20 token contract address'
          onInvalidAddress={(error) => {
            setIsInvalidCW20Address(!!error)
          }}
        />}
        <Stack
          attributes={{
            display: 'grid',
            gridTemplateColumns: { mobile: '1fr', tablet: '3fr 2fr' },
            mx: 'auto',
            px: '$8',
            py: '$5',
            width: 'fit-content',
            borderRadius: '$lg',
            justifyContent: 'center',

          }}
        >
          <Box
            py={{ mobile: '$3', tablet: '$2' }}
            px={{ mobile: "auto", tablet: '$5' }}
            width='$full'
            maxWidth="18rem"
            justifyContent="center"
          >
            <AssesetSlector
              chainName={chainName}
              onChange={setSelectedAsset}
              addContractAddress={isInvalidCW20Address ? '' : contractAddress}
              refresh={refresh}
            />
          </Box>
          <Box
            my={{ mobile: '$3', tablet: '$auto' }}
            px={{ mobile: 'auto' }}

            display='flex'
            width='$full'
            overflow="hidden"
            justifyContent={{ mobile: 'center', tablet: 'left' }}
          >
            <Text
              fontWeight='$bold'
              fontSize='medium'
            >
              Amount: {selectedAsset?.amount || 'n/a'}
            </Text>
          </Box>
        </Stack>
      </Box>
      {/* CSV uploader */}
      {selectedAsset && <Box
        width='$full'
        mt='$4'
      >
        <UploadCSV
          chainName={chainName}
          assetDigits={selectedAsset.exponent}
          onDataRecieve={setData}
        />
      </Box>}
      {/* SendModal */}
      {selectedAsset && coinInfo && data.length > 0 && <SendDetailsModal
        chainName={chainName}
        address={address}
        isOpen={data.length > 0}
        sendingList={data}
        onClose={() => {setData([])}}
        feeToken={coinInfo}
        asset={{
          availableAmount: Number(selectedAsset.amount),
          denom: selectedAsset.base,
          symbol: selectedAsset.symbol,
          multiplier: Math.pow(10, selectedAsset.exponent),
          isCW20: selectedAsset.type_asset === 'cw20'
        }}
        onSuccesSend={() => setRefresh(prev => !prev)}
      />}

    </Box>
  )
}

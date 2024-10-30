import { useMemo } from 'react';
import { useChain } from '@cosmos-kit/react';
import { fromBech32 } from '@cosmjs/encoding';
import { TextField, Text, Box, BoxProps } from '@interchain-ui/react';

type AddressInputProps = {
  chainName: string;
  address: string;
  onAddressChange: (address: string) => void;
  mb?: BoxProps['mb'];
  label?: string;
  placeholder?: string;
  onInvalidAddress?: (error: string) => void;
};

export const AddressInput = ({
  chainName,
  address,
  onAddressChange,
  label,
  mb,
  onInvalidAddress,
  placeholder,
}: AddressInputProps) => {
  const { chain } = useChain(chainName);
  
  const errorMessage = useMemo(() => {
    let errorMsg = 'empty';

    if (!address) {
      onInvalidAddress && onInvalidAddress(errorMsg);
      return errorMsg;
    }

    try {
      const res = fromBech32(address);
      if (!address.startsWith(chain.bech32_prefix)) {
        errorMsg = `Invalid address: Unexpected prefix (expected: ${chain.bech32_prefix}, actual: ${res.prefix})`;
      } else {errorMsg = ''}
    } catch (error) {
      errorMsg = 'Invalid address';
    } finally {
      onInvalidAddress && onInvalidAddress(errorMsg);
      return errorMsg;
    }
  }, [address, chain.bech32_prefix]) // eslint-disable-line

  return (
    <Box mb={mb} mx={{mobile: '$8', tablet: '$11'}}>
      <TextField
        id={label || 'address'}
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        label={label}
        placeholder={placeholder}
        attributes={{ mb: errorMessage ? '$2' : '0' }}
        intent={errorMessage && errorMessage !== 'empty' ? 'error' : 'default'}
      />

      {errorMessage && errorMessage !== 'empty' && <Text color="$textDanger">{errorMessage}</Text>}
    </Box>
  );
};

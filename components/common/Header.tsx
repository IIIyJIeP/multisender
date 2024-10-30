import {
  Box,
  Button,
  Icon,
  Text,
  useTheme,
  useColorModeValue,
} from '@interchain-ui/react';
import { CssBaseline, useColorScheme } from '@mui/joy';
import { useEffect } from 'react';

const stacks = ['Multisender'];

export function Header() {
  const { theme, setTheme } = useTheme();
  const { mode, setMode } = useColorScheme()

  const toggleColorMode = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    
  };
  
  useEffect(() => {
    setMode(theme)
  }, [theme, setMode])
  
  return (
    <>
      <Box display="flex" justifyContent="end" mb="$8">
        <Button
          intent="secondary"
          size="sm"
          attributes={{
            paddingX: 0,
          }}
          onClick={toggleColorMode}
        >
          <Icon name={useColorModeValue('moonLine', 'sunLine')} />
        </Button>
      </Box>
      {/* <CssBaseline /> */}
      <Box textAlign="center">
        <Text as="h2" fontWeight="$bold">
          <Text
            as="span"
            fontSize={{ mobile: '$3xl', tablet: '$8xl', desktop: '$8xl' }}
          >
            Welcome to&nbsp;
          </Text>
          <Text
            as="span"
            fontSize={{ mobile: '$3xl', tablet: '$8xl', desktop: '$8xl' }}
            color={useColorModeValue('$primary500', '$primary200')}
          >
            {stacks.join(' + ')}
          </Text>
        </Text>
      </Box>
    </>
  );
}

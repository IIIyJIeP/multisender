import { useState } from 'react';
import { Divider } from '@interchain-ui/react';
import { ChainName } from 'cosmos-kit';

import { Layout, Wallet, MultisendSection } from '@/components';

export default function Home() {
  const [selectedChain, setSelectedChain] = useState<ChainName>();
  
  return (
    <Layout>
      <Wallet
        chainName={selectedChain}
        isMultiChain
        onChainChange={(chainName) => {
          setSelectedChain(chainName);
        }}
      />
      <Divider height="0.1px" mt="$1" mb="$12" />
      {selectedChain && <MultisendSection chainName={selectedChain} />}
    </Layout>
  );
}

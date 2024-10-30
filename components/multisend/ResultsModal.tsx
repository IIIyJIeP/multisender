import { BasicModal, Box, Button, Divider, Link, Text, ListItem } from '@interchain-ui/react';
import { CsvData } from '.';
import { unparse } from 'papaparse'
import { useChain } from '@cosmos-kit/react';

export type Result = {
    failedSends: CsvData[]
    batchesResults: {
        batchNumber: number
        isSuccess: boolean
        txHash?: string
    }[]
}

type ResultModalProps = {
    isOpen: boolean
    onClose: () => void
    chainName: string
    tokenSymbol?: string
    result: Result
}

type ResultItemProps = {
    batchNumber: number
    isSuccess: boolean
    txHash?: string
    txExplorerUrl?:string
}

const downloadCsv = (data: { address: string, amount: number }[], chainName: string, symbol?: string) => {
    const csv = unparse(data, {header: false})
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    let fileName = 'failed_sendings'+ '_' + chainName
    if(symbol) fileName += '_' + symbol
    link.download = fileName + '.csv'
    link.click()
    window.URL.revokeObjectURL(url)
}

const ResultItem = ({batchNumber, isSuccess, txHash, txExplorerUrl}: ResultItemProps) => {
    const status = isSuccess ? 'Success' : 'Fail'
    const statusColor = isSuccess ? '$textSuccess' : '$textDanger'
    const txLink = txExplorerUrl && txHash ? txExplorerUrl + txHash : undefined

    return (<Box display='flex' flexDirection='row' gap='$6'>
        <Text fontSize='medium'>{`Batch #${batchNumber}:`}</Text>
        <Text fontSize='medium' fontWeight='$bold' color={statusColor}>{`${status}`}</Text>
        {txLink && <Link 
            attributes={{ fontSize: 'medium' }} 
            target='_blank' 
            href={txLink}
        >
            Tx Link
        </Link>}
    </Box>)
    
}

export const ResultModal = ({ 
    isOpen,
    onClose,
    chainName,
    tokenSymbol,
    result
}: ResultModalProps) => {
    const {chain} = useChain(chainName)
    const txExplorerUrl = chain.explorers?.find(exp => exp.kind === 'mintscan')?.tx_page?.replace('${txHash}', '')
    
    return (
        <BasicModal
            title="Multisend Results"
            isOpen={isOpen}
            renderCloseButton={()=>{}}
            closeOnClickaway={false}
        >
            <Box
                width={{ mobile: '100%' }}
                display="flex"
                flexDirection="column"
                gap="$9"
            >
                {/* Batches results */}
                <Box
                    mt='$5'
                    display='flex'
                    flexDirection='column'
                    maxHeight='15em'
                    overflowY='auto'
                >
                    {result.batchesResults.map(batch => {
                        return (<ListItem key={batch.batchNumber}>
                            <ResultItem
                                batchNumber={batch.batchNumber}
                                isSuccess={batch.isSuccess}
                                txExplorerUrl={txExplorerUrl}
                                txHash={batch.txHash}
                            />
                        </ListItem>)    
                    })}
                </Box>
                {/* Download failed sends CSV */}
                {result.failedSends.length > 0 && <Box
                    maxWidth='36rem'
                >
                    <Divider height="0.2px" mt="$2" mb="$4" />
                    <Text>
                        You can download the CSV file with failed sendings to be able to retry sending assets to these recipients.
                    </Text>
                    <Box
                        mt='$4'
                        display='flex'
                        flexDirection='row'
                        flexWrap='nowrap'
                        alignItems='center'
                        gap='$2'
                        justifyContent='flex-end'
                    >
                        <Text fontSize='medium' color='$textDanger'>Failed Sendings:</Text>
                        <Button
                            size='sm'
                            intent='tertiary'
                            onClick={() => { downloadCsv(result.failedSends, chainName, tokenSymbol) }}
                        >
                            Download CSV
                        </Button>
                    </Box>
                </Box>}
                {/* Close Button */}
                <Box width="$full">
                    <Button
                        fluidWidth
                        intent="tertiary"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </Box>
            </Box>
        </BasicModal>
    )
};

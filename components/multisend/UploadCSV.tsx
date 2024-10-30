import { Box, Button, Stack, useColorModeValue, Link, Tooltip, Text } from "@interchain-ui/react"
import { useRef, useState } from "react"
import Papa from 'papaparse'
import { Warning } from "../wallet/Warning"
import { fromBech32 } from '@cosmjs/encoding'
import { useChain } from "@cosmos-kit/react"
import { useToast } from "@/hooks"

export type CsvData = {
    address: string
    amount: number
}

type UploadCsvProps = {
    chainName: string
    assetDigits: number
    onDataRecieve?: (data: CsvData[]) => void
}

export const UploadCSV = ({ chainName, assetDigits, onDataRecieve }: UploadCsvProps) => {
    const { chain } = useChain(chainName)
    const { toast } = useToast()
    const backgroundColor = useColorModeValue('$white', '$blackAlpha500')
    const tooltipTextColor = useColorModeValue('$white', '$black')
    const boxShadow = useColorModeValue(
        '0 0 2px #dfdfdf, 0 0 6px -2px #d3d3d3',
        '0 0 2px #363636, 0 0 8px -2px #4f4f4f'
    )
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [errors, setErrors] = useState<string[]>([])

    const handleButtonClick = () => {
        setErrors([])
        fileInputRef.current?.click()
    }

    // Parse and validate CSV file
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const parseErrors: string[] = []
        if (file) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedData = (results.data as string[][]).map((row, index) => {
                        if (row.length !== 2) {
                            const errorMsg = `Error in row #${index + 1}! There must be exactly 2 columns!`
                            parseErrors.push(errorMsg)
                            return null
                        }

                        const [address, amount] = row
                        if (!address || isNaN(Number(amount))) {
                            const errorMsg = `Error in row #${index + 1}! The first field must be text and the second field must be a number!`;
                            parseErrors.push(errorMsg)
                            return null
                        }
                        let errorMsg = ''
                        try {
                            const res = fromBech32(address)
                            if (!address.startsWith(chain.bech32_prefix)) {
                                errorMsg = `Invalid address in row #${index + 1}: Unexpected prefix (expected: ${chain.bech32_prefix}, actual: ${res.prefix})!`;
                            }
                        } catch (error) {
                            errorMsg = `Invalid address in row #${index + 1}! Amount must not be equal to zero (Или указано дробное число для неделимого токена)!`
                        } finally {
                            if (errorMsg) {
                                parseErrors.push(errorMsg)
                                return null
                            }
                        }
                        
                        const uAmount = Math.floor(
                            parseFloat(amount) * Math.pow(10, assetDigits)
                        )
                        
                        if(!uAmount) {
                            errorMsg = `Invalid amount in row #${index + 1}!`
                            parseErrors.push(errorMsg)
                            return null
                        }

                        return {
                            address: address.trim(),
                            amount: uAmount,
                        }
                    }).filter((item): item is CsvData => item !== null)

                    if (parseErrors.length === 0) {
                        onDataRecieve && onDataRecieve(parsedData)
                        toast({
                            title: 'Uploading Successful',
                            type: 'success',
                        })
                    } else {
                        setErrors(parseErrors)
                    }

                    if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                    }
                },
                error: (error) => {
                    const errorMsg = 'Error parsing CSV file: ' + error.message
                    setErrors([errorMsg])
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                    }
                },
            })
        }
    }

    return (
        <Box
            display='flex'
            flexDirection='column'
            borderRadius='$lg'
            backgroundColor={backgroundColor}
            boxShadow={boxShadow}
            maxWidth={{ mobile: '20rem', tablet: '32rem' }}
            mx='auto'

        >
            <Box 
                display='flex'
                justifyContent='end'
                pr='$2'
                // backgroundColor='Red'

            >
                <Tooltip title={<Text color={tooltipTextColor} attributes={{ maxWidth: '30rem' }}>
                    The CSV file must not contain a header line.
                    Each line must contain exactly two fields.
                    The first field is the recipient&apos;s address, the second is the amount of the asset.
                    The digits of the number in the amount field must be separated by a period, not a comma.
                    The comma in the CSV is reserved for separating fields.
                    You can download a sample file.
                </Text>}><Text fontWeight='$bold' color='$blue500'>  (¡) </Text>
                </Tooltip>
            </Box>
            <Stack
                attributes={{
                    display: 'grid',
                    gridTemplateColumns: { mobile: '1fr', tablet: '2fr 3fr' },
                    px: '$8',
                    py: '$5',
                }}
            >
                <Box
                    ml={{ mobile: '$0', tablet: '$4' }}
                    display='flex'
                    flexDirection="column"
                >
                    <Button
                        intent="tertiary"
                        isLoading={false}
                        disabled={false}
                        onClick={handleButtonClick}
                    >
                        Upload CSV
                    </Button>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                </Box>

                <Box
                    display='flex'
                    flexDirection='column'
                    minHeight='$14'
                    alignItems='center'
                    justifyContent='center'
                >
                    <Link
                        href='/file/sample.csv'
                        underline={true}
                        attributes={{ fontSize: 'medium' }}
                    >
                        Download Sample CSV
                    </Link>
                </Box>
            </Stack>
            {errors.length > 0 && <Warning text={
                errors.reduce(
                    (accumulator, currentValue, i) => accumulator + ` ${i + 1}) ` + currentValue,
                    'Warning!',
                ) + ' Please make corrections to the CSV file and try again.'
            } />}
        </Box>
    )
}
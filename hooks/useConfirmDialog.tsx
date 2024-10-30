import { BasicModal, Box, Button, Text } from '@interchain-ui/react'
import { useState } from 'react'

type UserAction = 'retry' | 'skip' | 'stop'

interface ConfirmDialogProps {
  isOpen: boolean
  message: string
  onRetry: () => void
  onSkip: () => void
  onStop: () => void
}

const ConfirmDialog = ({ isOpen, message, onRetry, onSkip, onStop }: ConfirmDialogProps) => {
  if (!isOpen) return null

  return (
    <BasicModal
      isOpen
      title='Warning!'
      closeOnClickaway={false}
      renderCloseButton={()=>{}}
    >
      <Text
        fontSize='medium'
        fontWeight='$bold'
        color='$textDanger'
        attributes={{my: '$10', maxWidth: '30rem'}}
      >
        {message}
      </Text>
      <Box
        display='flex'
        flexWrap='wrap'
        justifyContent='center'
        gap='$4'
      >
        <Button
          intent="tertiary"
          onClick={onRetry}
        >
          Retry Tx
        </Button>
        <Button
          intent="tertiary"
          onClick={onSkip}
        >
          Skip Batch
        </Button>
        <Button
          intent="tertiary"
          onClick={onStop}
        >
          Stop Sending
        </Button>
      </Box>
    </BasicModal>
  )
}

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [resolvePromise, setResolvePromise] = useState<((value: UserAction) => void) | null>(null)

  const openDialog = (msg: string): Promise<UserAction> => {
    setMessage(msg)
    setIsOpen(true)
    return new Promise<UserAction>((resolve) => setResolvePromise(() => resolve))
  }

  const handleRetry = () => {
    setIsOpen(false)
    if (resolvePromise) resolvePromise('retry')
  }

  const handleSkip = () => {
    setIsOpen(false)
    if (resolvePromise) resolvePromise('skip')
  }

  const handleStop = () => {
    setIsOpen(false)
    if (resolvePromise) resolvePromise('stop')
  }

  const ConfirmDialogComponent = (
    <ConfirmDialog
      isOpen={isOpen}
      message={message}
      onRetry={handleRetry}
      onSkip={handleSkip}
      onStop={handleStop}
    />
  )

  return { openDialog, ConfirmDialogComponent }
}
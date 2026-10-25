import {
  Button,
  Modal,
  ModalContent,
  ModalContentCentered,
  ModalDescription,
  ModalTitle,
} from "@doska/ui-kit"

interface IProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean
  onConfirm: () => void
}

/** A small "are you sure?" modal, for destructive actions by default. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
}: IProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="md:max-w-sm md:p-6">
        <ModalContentCentered>
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              className={
                destructive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmLabel}
            </Button>
          </div>
        </ModalContentCentered>
      </ModalContent>
    </Modal>
  )
}

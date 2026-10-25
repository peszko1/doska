import { CardContent, Modal, ModalContent, ModalHeader } from "@doska/ui-kit"
import { useTags } from "@doska/core"
import { TagRow } from "./tag-row"
import { setTagsModalOpen, useTagsModalOpen } from "./tags-modal-store"

/** Every tag across every board: recolor, rename or pin one everywhere at once. */
export function TagsModal() {
  const open = useTagsModalOpen()
  const { data: tags = [] } = useTags()

  return (
    <Modal open={open} onOpenChange={setTagsModalOpen}>
      <ModalContent className="md:max-w-sm">
        <ModalHeader onClose={() => setTagsModalOpen(false)}>Tags</ModalHeader>
        <CardContent className="max-h-[60vh] overflow-y-auto px-0 py-2">
          {tags.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tags yet. Add one from a card's menu.
            </p>
          ) : (
            <ul className="flex flex-col">
              {tags.map((tag) => (
                <TagRow key={tag.name.toLowerCase()} tag={tag} />
              ))}
            </ul>
          )}
        </CardContent>
      </ModalContent>
    </Modal>
  )
}

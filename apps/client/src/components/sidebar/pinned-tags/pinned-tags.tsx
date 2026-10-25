import {
  Button,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@doska/ui-kit"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import { useMovePinnedTag, usePinnedTags } from "@doska/core"
import { Settings2 } from "lucide-react"
import { DROP_ANIMATION_MS } from "@/lib/hooks"
import { setTagsModalOpen } from "../../tags/tags-modal-store"
import { PinnedTagItem } from "./pinned-tag-item"

/** The tags pinned from the tags modal, each opening the global board
 * filtered to it. Hidden until something is pinned. */
export function PinnedTags() {
  const { data: tags = [] } = usePinnedTags()
  const { mutate: move } = useMovePinnedTag()
  if (tags.length === 0) return null

  return (
    <SidebarGroup className="mt-4">
      <SidebarGroupLabel className="mb-1 gap-1 rounded-none pr-0">
        <span className="flex-1 text-sm">Tags</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Manage tags"
          className="text-muted-foreground"
          onClick={() => setTagsModalOpen(true)}
        >
          <Settings2 />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <DragDropContext
          onDragEnd={({ source, destination, draggableId }) => {
            if (!destination || destination.index === source.index) return
            const tag = tags.find((t) => t.id === draggableId)
            if (tag) move({ name: tag.name, index: destination.index })
          }}
        >
          <Droppable droppableId="pinned-tags">
            {(provided) => (
              <SidebarMenu
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="-mt-1 space-y-0"
              >
                {tags.map((tag, index) => (
                  <Draggable key={tag.id} draggableId={tag.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <SidebarMenuItem
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        role="listitem"
                        className="pt-1"
                        style={{
                          ...dragProvided.draggableProps.style,
                          ...(snapshot.isDropAnimating && {
                            transitionDuration: `${DROP_ANIMATION_MS}ms`,
                          }),
                        }}
                      >
                        <div
                          className={
                            snapshot.isDragging
                              ? "rounded-md bg-sidebar shadow-e2"
                              : undefined
                          }
                        >
                          <PinnedTagItem tag={tag} />
                        </div>
                      </SidebarMenuItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </SidebarMenu>
            )}
          </Droppable>
        </DragDropContext>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

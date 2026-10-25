import { Droppable } from "@hello-pangea/dnd"
import { useState, type ReactNode } from "react"
import { GLOBAL_STAGE_TITLES, type GlobalStage } from "@doska/core"
import { ColumnView } from "../column/column-view"

interface IProps {
  stage: GlobalStage
  /** Where adding a card asks which board it goes to. */
  addCard?: ReactNode
  children: (showBody: boolean) => ReactNode
}

/** One of the global board's lanes: a column with no board of its own. */
export function GlobalLane({ stage, addCard, children }: IProps) {
  const [showBody, setShowBody] = useState(stage !== "done")

  return (
    <Droppable droppableId={stage}>
      {(provided, snapshot) => (
        <ColumnView
          title={GLOBAL_STAGE_TITLES[stage]}
          color=""
          done={stage === "done"}
          showBody={showBody}
          onToggleBody={() => setShowBody((show) => !show)}
          addCard={addCard}
          isDraggingOver={snapshot.isDraggingOver}
          listRef={provided.innerRef}
          listProps={provided.droppableProps}
        >
          {children(showBody)}
          {provided.placeholder}
        </ColumnView>
      )}
    </Droppable>
  )
}

import { cn } from "@doska/ui-kit"

interface IProps {
  days: string[]
  today: string
  gridTemplateColumns: string
}

const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

const weekdayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "narrow",
  timeZone: "UTC",
})
const monthFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  timeZone: "UTC",
})
const fullFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeZone: "UTC",
})

/** The grid's column heads: a weekday letter and the day, the month where it
 * starts. */
export function HabitDaysHeader({ days, today, gridTemplateColumns }: IProps) {
  return (
    <div
      className="grid items-end pb-1.5 text-[11px] tabular-nums"
      style={{ gridTemplateColumns }}
      aria-hidden
    >
      <span />
      {days.map((day, index) => {
        const date = asDate(day)
        const isToday = day === today
        const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
        return (
          <span
            key={day}
            title={fullFormat.format(date)}
            className={cn(
              "flex flex-col items-center rounded-t-md pt-1 leading-tight",
              isToday
                ? "bg-accent font-semibold text-foreground"
                : weekend
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground"
            )}
          >
            <span className="h-3.5 text-[10px] uppercase">
              {(index === 0 || day.endsWith("-01")) && monthFormat.format(date)}
            </span>
            <span className="uppercase">{weekdayFormat.format(date)}</span>
            <span>{date.getUTCDate()}</span>
          </span>
        )
      })}
    </div>
  )
}

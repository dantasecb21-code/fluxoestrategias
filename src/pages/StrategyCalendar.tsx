import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import { formatDateBR, shortName } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, UserCheck, ChevronRight } from "lucide-react";
import { parseISO, isSameDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StrategyCalendar() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { strategies, loading } = useDbStrategies();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const isOperational = role === "operational";

  const activeStrategies = useMemo(
    () => strategies.filter((s) => deriveStrategyDisplayStatus(s) !== "completed"),
    [strategies]
  );

  const deadlineDates = useMemo(() => {
    const dates: Date[] = [];
    activeStrategies.forEach((s) => {
      if (s.deadline) dates.push(parseISO(s.deadline));
    });
    return dates;
  }, [activeStrategies]);

  const filteredStrategies = useMemo(() => {
    if (!selectedDate) return activeStrategies;
    return activeStrategies.filter(
      (s) => s.deadline && isSameDay(parseISO(s.deadline), selectedDate)
    );
  }, [activeStrategies, selectedDate]);

  const strategiesByDate = useMemo(() => {
    const map: Record<string, typeof activeStrategies> = {};
    filteredStrategies.forEach((s) => {
      const key = s.deadline || "sem-prazo";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (a === "sem-prazo") return 1;
      if (b === "sem-prazo") return -1;
      return a.localeCompare(b);
    });
  }, [filteredStrategies]);

  const handleNavigate = (id: string) => {
    if (isOperational) {
      navigate(`/operacional/${id}`);
    } else {
      navigate(`/estrategia/${id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            <span className="text-primary">Calendário</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Visualize os prazos das estratégias no calendário.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        {/* Calendar */}
        <Card className="p-4 w-fit self-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            modifiers={{ hasDeadline: deadlineDates }}
            modifiersClassNames={{
              hasDeadline: "bg-primary/20 font-bold text-primary",
            }}
            className="pointer-events-auto"
          />
          {selectedDate && (
            <button
              className="mt-2 text-xs text-muted-foreground hover:text-foreground w-full text-center"
              onClick={() => setSelectedDate(undefined)}
            >
              Limpar seleção
            </button>
          )}
        </Card>

        {/* Strategy list */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selectedDate
              ? `${filteredStrategies.length} estratégia(s) em ${format(selectedDate, "dd/MM/yyyy")}`
              : `${filteredStrategies.length} estratégia(s) pendente(s)`}
          </p>

          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : filteredStrategies.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {selectedDate
                  ? "Nenhuma estratégia nesta data."
                  : "Nenhuma estratégia pendente."}
              </p>
            </Card>
          ) : (
            strategiesByDate.map(([dateKey, items]) => (
              <div key={dateKey}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  {dateKey === "sem-prazo"
                    ? "Sem prazo definido"
                    : formatDateBR(dateKey)}
                </h3>
                <div className="space-y-2">
                  {items.map((s) => {
                    const displayStatus = deriveStrategyDisplayStatus(s);
                    const badgeProps = getStatusBadgeProps(displayStatus);
                    const isOverdue =
                      s.deadline && new Date(s.deadline) < new Date();

                    return (
                      <Card
                        key={s.id}
                        className={`p-4 hover:border-primary/30 transition-colors cursor-pointer ${
                          isOverdue ? "border-destructive/30" : ""
                        }`}
                        onClick={() => handleNavigate(s.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground truncate">
                                {s.store_name || "Sem nome"}
                              </h4>
                              <Badge
                                variant={badgeProps.variant}
                                className={`text-[10px] py-0 px-1.5 h-4 shrink-0 ${badgeProps.className}`}
                              >
                                {getStatusLabel(displayStatus)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                              {s.operational_manager && (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  {shortName(s.operational_manager)}
                                </span>
                              )}
                              {s.deadline && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    isOverdue ? "text-destructive" : ""
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  Prazo: {formatDateBR(s.deadline)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import { formatDateBR, shortName } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, UserCheck, ChevronRight, Users } from "lucide-react";
import { parseISO, isSameDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StrategyCalendar() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { strategies, loading } = useDbStrategies();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [filterManager, setFilterManager] = useState("all");

  const isOperational = role === "operational";
  const canFilter = role === "admin" || role === "strategic";

  const activeStrategies = useMemo(
    () => strategies.filter((s) => deriveStrategyDisplayStatus(s) !== "completed"),
    [strategies]
  );

  const operationalManagers = useMemo(() => {
    const names = [...new Set(activeStrategies.map((s) => (s.operational_manager || "").trim()).filter(Boolean))];
    return names.sort();
  }, [activeStrategies]);

  const managerFiltered = useMemo(() => {
    if (filterManager === "all") return activeStrategies;
    return activeStrategies.filter((s) => (s.operational_manager || "").trim() === filterManager);
  }, [activeStrategies, filterManager]);

  const deadlineDates = useMemo(() => {
    const dates: Date[] = [];
    managerFiltered.forEach((s) => {
      if (s.deadline) dates.push(parseISO(s.deadline));
    });
    return dates;
  }, [managerFiltered]);

  const filteredStrategies = useMemo(() => {
    if (!selectedDate) return [];
    return managerFiltered.filter(
      (s) => s.deadline && isSameDay(parseISO(s.deadline), selectedDate)
    );
  }, [managerFiltered, selectedDate]);

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
          Clique em uma data para ver as lojas com prazo nesse dia.
        </p>
      </div>

      {canFilter && operationalManagers.length > 0 && (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={filterManager} onValueChange={setFilterManager}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por gestor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gestores</SelectItem>
              {operationalManagers.map((name) => (
                <SelectItem key={name} value={name}>{shortName(name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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

        {/* Store list */}
        <div className="space-y-2">
          {!selectedDate ? (
            <Card className="p-8 text-center border-dashed">
              <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Selecione uma data no calendário para ver as lojas.
              </p>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {filteredStrategies.length} loja(s) em {format(selectedDate, "dd/MM/yyyy")}
              </p>
              {filteredStrategies.length === 0 ? (
                <Card className="p-6 text-center border-dashed">
                  <p className="text-muted-foreground">Nenhuma loja com prazo nesta data.</p>
                </Card>
              ) : (
                filteredStrategies.map((s) => {
                  const isOverdue = s.deadline && new Date(s.deadline) < new Date();
                  const displayStatus = deriveStrategyDisplayStatus(s);
                  const badgeProps = getStatusBadgeProps(displayStatus);
                  return (
                    <Card
                      key={s.id}
                      className={`p-3 hover:border-primary/30 transition-colors cursor-pointer ${isOverdue ? "border-destructive/30" : ""}`}
                      onClick={() => handleNavigate(s.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground text-sm truncate">
                            {s.store_name || "Sem nome"}
                          </span>
                          <Badge
                            variant={badgeProps.variant}
                            className={`text-[10px] py-0 px-1.5 h-4 shrink-0 ${badgeProps.className}`}
                          >
                            {getStatusLabel(displayStatus)}
                          </Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </div>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

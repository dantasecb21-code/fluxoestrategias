import { useStrategies } from "@/hooks/useStrategies";
import { Dashboard } from "@/pages/Dashboard";

const Index = () => {
  const { strategies, createStrategy, updateStrategy, deleteStrategy, duplicateStrategy } = useStrategies();

  return (
    <Dashboard
      strategies={strategies}
      deleteStrategy={deleteStrategy}
      duplicateStrategy={duplicateStrategy}
    />
  );
};

export default Index;

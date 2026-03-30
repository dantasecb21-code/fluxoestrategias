import { useStrategies } from "@/hooks/useStrategies";
import { StrategyBuilder } from "@/pages/StrategyBuilder";

const StrategyPage = () => {
  const { strategies, createStrategy, updateStrategy } = useStrategies();

  return (
    <StrategyBuilder
      strategies={strategies}
      createStrategy={createStrategy}
      updateStrategy={updateStrategy}
    />
  );
};

export default StrategyPage;

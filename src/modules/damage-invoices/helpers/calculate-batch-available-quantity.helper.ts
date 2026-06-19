export function calculateBatchAvailableQuantity(batch: {
  initialQuantity: number;
  soldQuantity: number;
}) {
  return (
    batch.initialQuantity -
    batch.soldQuantity 
  );
}
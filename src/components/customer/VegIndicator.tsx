export function VegIndicator({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
      aria-label={isVeg ? "Vegetarian" : "Non-Vegetarian"}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] ${
        isVeg ? "border-emerald-600" : "border-rose-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isVeg ? "bg-emerald-600" : "bg-rose-600"
        }`}
      />
    </span>
  );
}

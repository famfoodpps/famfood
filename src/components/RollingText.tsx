export function RollingText() {
  const phrase = "FAMFOOD · SEAFOOD SUPPLY · RESTAURANT CATALOG · FROZEN FOOD · ";
  const text = Array.from({ length: 12 }, (_, index) => <span key={index}>{phrase}</span>);

  return (
    <section className="overflow-hidden border-y border-[#ddd7cc] bg-[#f7f2e8] py-6">
      <div className="rolling-track display-serif flex w-max whitespace-nowrap text-4xl font-medium uppercase tracking-[0.08em] text-[#07586b]/18 md:text-6xl">
        {text}
      </div>
    </section>
  );
}

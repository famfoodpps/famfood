import Image from "next/image";

export function PageHero({
  title,
  eyebrow,
  image = "/sample-assets/seafood-table.jpg",
}: {
  title: string;
  eyebrow: string;
  image?: string;
}) {
  return (
    <section className="relative h-[360px] overflow-hidden bg-[#043f4f] pt-[78px] text-white md:h-[450px]">
      <Image src={image} alt={title} fill priority sizes="100vw" className="object-cover opacity-55" />
      <div className="absolute inset-0 bg-black/42" />
      <div className="section-shell relative flex h-full items-center justify-center text-center">
        <div>
          <h1 className="ff-page-title text-white">{title}</h1>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-white/78">{eyebrow}</p>
        </div>
      </div>
    </section>
  );
}

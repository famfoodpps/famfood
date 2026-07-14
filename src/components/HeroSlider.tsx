"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { heroSlides } from "@/data/catalog";
import { useLanguage } from "@/hooks/useLanguage";

const proposalCapture = process.env.NEXT_PUBLIC_PROPOSAL_CAPTURE === "1";

function AnimatedHeroTitle({ title }: { title: string }) {
  return title.split(" ").map((word, wordIndex) => (
    <span key={`${word}-${wordIndex}`} className="hero-word-group">
      {Array.from(word).map((letter, letterIndex) => (
        <span key={`${letter}-${wordIndex}-${letterIndex}`} className="hero-letter">
          {letter}
        </span>
      ))}
    </span>
  ));
}

export function HeroSlider() {
  const root = useRef<HTMLDivElement>(null);
  const { pick } = useLanguage();

  useLayoutEffect(() => {
    if (!root.current) return;
    if (proposalCapture) {
      gsap.set([".hero-brand", ".hero-letter", ".hero-word", ".hero-actions"], { opacity: 1, y: 0 });
      return;
    }
    const context = gsap.context(() => {
      gsap.fromTo(".hero-brand", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.25, ease: "power3.out" });
      gsap.fromTo(".hero-letter", { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: 0.85, stagger: 0.035, delay: 0.45, ease: "power3.out" });
      gsap.fromTo(".hero-word", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.85, delay: 0.75, ease: "power3.out" });
      gsap.fromTo(".hero-actions", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.85, delay: 1.05, ease: "power3.out" });
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={root}
      className={`ff-hero relative min-h-screen overflow-hidden bg-[#043f4f] text-white${proposalCapture ? " proposal-capture" : ""}`}
    >
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={proposalCapture ? false : { delay: 5200, disableOnInteraction: false }}
        loop={!proposalCapture}
        navigation={!proposalCapture}
        pagination={proposalCapture ? false : { clickable: true }}
        speed={proposalCapture ? 0 : 1050}
        className="min-h-screen"
      >
        {heroSlides.map((slide) => (
          <SwiperSlide key={slide.image}>
            <div className="relative min-h-screen">
              <Image src={slide.image} alt={pick(slide.title)} fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-black/22" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/18 to-transparent" />
              <div className="section-shell relative flex min-h-screen items-center pt-20">
                <div
                  className="w-full max-w-4xl pb-12"
                  style={proposalCapture ? { maxWidth: "min(56rem, calc(100vw - 32px))", minWidth: 0 } : undefined}
                >
                  <p className="hero-brand hero-copy-shadow ff-eyebrow">{pick(slide.eyebrow)}</p>
                  <h1 className="hero-title mt-5 max-w-[920px] text-[clamp(2.4rem,5.2vw,5rem)] uppercase leading-[1.06] tracking-[0.02em] text-white">
                    <AnimatedHeroTitle title={pick(slide.title)} />
                  </h1>
                  <p
                    className="hero-word hero-copy-shadow mt-6 w-full max-w-2xl whitespace-normal text-base leading-8 text-white/92 md:text-lg"
                    style={proposalCapture ? { maxWidth: "min(42rem, calc(100vw - 32px))", overflowWrap: "break-word" } : undefined}
                  >
                    {proposalCapture ? (
                      <span className="proposal-capture-subtitle">
                        <span>Premium frozen seafood and food supply</span>{" "}
                        <span>for every family and restaurant.</span>
                      </span>
                    ) : (
                      pick(slide.subtitle)
                    )}
                  </p>
                  <div className="hero-actions mt-10 flex flex-col gap-4 sm:flex-row">
                    <Link href="/products" className="ff-button ff-button-light">
                      Product Center
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/restaurant/login" className="ff-button border border-white/55 text-white hover:bg-white hover:text-[#07586b]">
                      Restaurant Login
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="pointer-events-none absolute bottom-12 left-1/2 z-10 hidden -translate-x-1/2 text-center text-xs font-black uppercase tracking-[0.18em] text-white/80 md:block">
        <div className="scroll-cue-line mx-auto mb-3 h-12 w-px bg-white/80" />
        Scroll Down
      </div>
    </section>
  );
}

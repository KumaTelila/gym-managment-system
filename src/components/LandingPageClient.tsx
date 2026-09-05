"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Play,
  ArrowRight,
  CheckCircle2,
  Users,
  ChevronRight,
  Phone,
  MapPin,
  Clock,
  Menu,
  X,
  User,
  Zap,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  priceETB: string | number;
  description: string | null;
}

interface Branding {
  facility_name: string;
  facility_tagline: string;
  facility_address: string;
  facility_phone: string;
  facility_email: string;
  facility_logo_url: string;
}

interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "FINANCE_OWNER" | "RECEPTIONIST" | "MEMBER";
  memberId?: string;
}

export function LandingPageClient({
  plans,
  branding,
  session,
}: {
  plans: Plan[];
  branding: Branding;
  session: SessionUser | null;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white overflow-x-hidden">
      {/* 1. TOP NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/blow.png"
              alt="Blow Fitness"
              className="h-11 w-11 object-contain group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 block leading-none">
                BLOW FITNESS
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase block mt-1">
                Addis Ababa
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#home" className="hover:text-slate-900 transition-colors">
              Home
            </a>
            <a href="#about" className="hover:text-slate-900 transition-colors">
              About
            </a>
            <a href="#programs" className="hover:text-slate-900 transition-colors">
              Programs
            </a>
            <a href="#facility" className="hover:text-slate-900 transition-colors">
              Facility
            </a>
            <a href="#memberships" className="hover:text-slate-900 transition-colors">
              Memberships
            </a>
            <a href="#contact" className="hover:text-slate-900 transition-colors">
              Contact
            </a>
          </div>

          {/* Desktop Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Link href={session.role === "MEMBER" ? "/portal" : "/dashboard"}>
                <Button className="h-10 text-xs font-bold px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full">
                  <User className="h-3.5 w-3.5 mr-2 text-slate-300" />
                  {session.role === "MEMBER" ? "Athlete Portal" : "Staff Dashboard"}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="h-10 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full px-4"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="h-10 text-xs font-bold px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 uppercase tracking-wide">
                    Join With Us
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Home
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              About
            </a>
            <a
              href="#programs"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Programs
            </a>
            <a
              href="#facility"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Facility
            </a>
            <a
              href="#memberships"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Memberships
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              Contact
            </a>
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 rounded-full uppercase">
                  Join With Us
                </Button>
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-10 rounded-full"
                >
                  Member & Staff Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section id="home" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 uppercase leading-[1.08]">
                Get a Healthy Body <br />
                Through the Ideal <br />
                <span className="text-slate-900">Workouts</span>
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Transform your physique and discipline with science-backed training, Olympic lifting platforms,
                smart digital attendance, and certified master trainers at Blow Fitness.
              </p>

              {/* Social Proof Member Stack */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
                <div className="flex items-center -space-x-2">
                  <div className="h-9 w-9 rounded-full border-2 border-white bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-700">
                    BK
                  </div>
                  <div className="h-9 w-9 rounded-full border-2 border-white bg-slate-300 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-700">
                    TM
                  </div>
                  <div className="h-9 w-9 rounded-full border-2 border-white bg-slate-400 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white">
                    SL
                  </div>
                  <div className="h-9 w-9 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                    +2.5k
                  </div>
                </div>
                <div className="text-xs text-left">
                  <span className="font-bold text-slate-900 block leading-tight">+2,500 Members</span>
                  <span className="text-slate-500 text-[11px]">★ 4.9/5 Rating (850+ Google Reviews)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-3">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                    Join With Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setVideoModalOpen(true)}
                  className="w-full sm:w-auto h-12 px-6 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-colors shadow-xs"
                >
                  <div className="h-6 w-6 rounded-full bg-slate-900 flex items-center justify-center text-white">
                    <Play className="h-3 w-3 fill-white ml-0.5" />
                  </div>
                  Watch Facility Tour
                </button>
              </div>

              {/* Stat Counters Row */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 max-w-lg mx-auto lg:mx-0">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono block">15+</span>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mt-0.5">
                    Expert Trainers
                  </span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono block">2,500+</span>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mt-0.5">
                    Members Enrolled
                  </span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono block">40+</span>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mt-0.5">
                    Weekly Programs
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual (5 Cols) */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-none">
                {/* Athletic Hero Image */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
                  <img
                    src="/images/blow_gym_hero.jpg"
                    alt="Blow Fitness Athletes"
                    className="w-full h-auto object-cover transform hover:scale-102 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PARTNERS & METRICS RIBBON (Clean, Minimalist Light Strip) */}
      <div className="w-full bg-slate-50 border-y border-slate-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-6 text-slate-700">
          <div className="flex items-center gap-2.5">
            <span className="font-black font-mono text-xl sm:text-2xl tracking-tight text-slate-900">980k+</span>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 leading-tight">
              Workouts <br /> Completed
            </span>
          </div>

          <div className="h-8 w-px bg-slate-300 hidden sm:block" />

          {/* Athletic Brands */}
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs sm:text-sm text-slate-600">
            <span>TECHNOGYM ELITE</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs sm:text-sm text-slate-600">
            <span>SPOTIFY FITNESS AUDIO</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs sm:text-sm text-slate-600">
            <span>PUMA ATHLETICS</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs sm:text-sm text-slate-600">
            <span>TELEBIRR DIRECT PAY</span>
          </div>
        </div>
      </div>

      {/* 4. FACILITY & JOURNEY SPOTLIGHT SECTION */}
      <section id="facility" className="py-20 md:py-28 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                Facility & Performance
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tight leading-[1.1]">
                Elevate Your Fitness Journey With <br />
                <span>Blow Fitness</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Our 1,200 sq. meter facility features zoned hypertrophy suites, free-weight dumbbell bays up to
                50kg, dedicated Olympic lifting deadlift platforms, and dedicated male & female smart locker rooms.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">World-Class Equipment</span>
                    <span className="text-[11px] text-slate-500">Biomechanically optimized selectorized machines and free weights.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Smart Locker & Digital Turnstiles</span>
                    <span className="text-[11px] text-slate-500">Secured digital locker management and QR-based attendance tracking.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Protein Bar & Supplements</span>
                    <span className="text-[11px] text-slate-500">Post-workout protein shakes, cold energy drinks, and hydration on-site.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/register">
                  <Button className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-sm">
                    Explore Membership Options
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Video / Facility Image Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setVideoModalOpen(true)}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src="/images/blow_gym_facility.jpg"
                  alt="Blow Gym Training Zone"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/15 transition-colors flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-5 w-5 fill-slate-900 ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-900 block">Hypertrophy & Dumbbell Suite</span>
                  <span className="text-[10px] text-slate-500">Premium weights, dumbbells & power racks</span>
                </div>
              </div>

              <div className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 shadow-sm hover:shadow-md transition-shadow">
                <img
                  src="/images/blow_gym_hero.jpg"
                  alt="Blow Gym Coaching"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-4">
                  <span className="text-xs font-bold text-white block">Certified Master Trainers</span>
                  <span className="text-[10px] text-slate-200">1-on-1 personalized form correction & plans</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PROGRAMS SECTION */}
      <section id="programs" className="py-20 md:py-28 bg-slate-50 relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Tailored Training Regimes
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tight">
                The Best Programs We Offer For You
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md font-normal">
              Whether you are an aspiring athlete, powerlifter, or fitness newcomer, our structured tracks provide the
              blueprint for consistent physical evolution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Program 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">Body Building & Hypertrophy</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Progressive overload routines targeting maximum muscle stimulation, symmetric aesthetics, and strength.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                <span>Learn Details</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Program 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Flame className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">Weight Loss & Shredding</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  High-burn metabolic conditioning, caloric deficits, and cardio circuits engineered to melt stubborn fat.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                <span>Learn Details</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Program 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">Powerlifting & Strength</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Heavy compound lift masterclasses focused on squat, bench press, and deadlift biomechanics.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                <span>Learn Details</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Program 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">1-on-1 Master Coaching</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dedicated personal coaching with tailored nutrition planning, weekly weigh-ins, and accountability.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                <span>Learn Details</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. MEMBERSHIP TIERS & PRICING */}
      <section id="memberships" className="py-20 md:py-28 bg-white relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tight">
              Flexible Membership Tiers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Select a membership tier that aligns with your fitness ambitions. Register online today and activate your
              digital pass via Telebirr or CBE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl p-7 border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                        <span className="inline-block text-[11px] text-slate-500 font-semibold mt-1">
                          {plan.durationDays} Days Full Access
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 mb-6">
                      <span className="font-mono text-3xl sm:text-4xl font-black text-slate-900">
                        {Number(plan.priceETB).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold ml-1.5 uppercase">ETB</span>
                    </div>

                    <p className="text-xs text-slate-600 pb-6 border-b border-slate-100 min-h-[48px]">
                      {plan.description || "Unrestricted daily gym floor & cardio floor access."}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-3 pt-6 text-xs text-slate-700">
                      <li className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                        <span>All Strength & Cardio zones included</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                        <span>Digital Membership Pass with Turnstile QR</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                        <span>Personal Athlete Portal Access (`/portal`)</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                        <span>Dedicated Locker Rental Options</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    <Link href={`/register`}>
                      <Button className="w-full h-11 text-xs font-bold uppercase tracking-wider rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xs">
                        Register Online Now
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. LOCATION & CONTACT SECTION */}
      <section id="contact" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                Find Us in Addis Ababa
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
                Visit the Gym & <br />
                Start Today
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Conveniently situated in the heart of Bole, Blow Fitness provides ample parking, climate-controlled
                training floors, and quick access from all major avenues.
              </p>

              <div className="space-y-4 text-xs text-slate-700 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Location</span>
                    <span>{branding.facility_address || "Bole Medhanialem, Camoros St, Addis Ababa"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Reception Desk</span>
                    <span className="font-mono">{branding.facility_phone || "+251 91 100 2233"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Gym Operating Hours</span>
                    <span>Monday &ndash; Saturday: 5:30 AM &ndash; 10:00 PM</span> <br />
                    <span>Sunday: 6:00 AM &ndash; 8:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ready for your first session?</h3>
                  <span className="text-[11px] text-slate-500">Register online and skip the front desk queues.</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Fast Registration</span>
                  <span className="text-slate-900 font-semibold">Under 2 Minutes</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Supported Mobile Pay</span>
                  <span className="text-slate-900 font-semibold">Telebirr & CBE Birr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Instant Pass</span>
                  <span className="text-slate-900 font-semibold">Digital QR Check-in</span>
                </div>
              </div>

              <Link href="/register">
                <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-sm">
                  Join Blow Fitness Today →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img src="/blow.png" alt="Blow Fitness" className="h-9 w-9 object-contain" />
            <div>
              <span className="font-black text-sm text-slate-900 tracking-tight">
                BLOW FITNESS
              </span>
              <span className="block text-[10px] text-slate-500">Addis Ababa Premier Gym</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/register" className="hover:text-slate-900 transition-colors">
              Online Registration
            </Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Athlete Portal Login
            </Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Staff Portal
            </Link>
          </div>

          <div className="text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} {branding.facility_name || "Blow Fitness"}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Video Tour Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center mx-auto">
              <Play className="h-6 w-6 fill-slate-900 ml-0.5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 uppercase">Blow Fitness Gym Tour</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Welcome to Blow Fitness Bole. Visit our front desk for an in-person walk-through of the hypertrophy floor,
              cardio deck, and shower suites.
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src="/images/blow_gym_facility.jpg" alt="Blow Fitness" className="w-full h-64 object-cover" />
            </div>
            <Button
              onClick={() => setVideoModalOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase px-6 rounded-full"
            >
              Close Tour
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
